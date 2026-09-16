"""AI question generation service using Groq."""
import json
import re

from app.core.config import settings


def _get_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


TYPE_LABELS = {
    "multiple_choice": "múltipla escolha (4 alternativas, apenas uma correta)",
    "true_false": "verdadeiro ou falso (2 alternativas: Verdadeiro e Falso)",
    "essay": "dissertativa (sem alternativas, apenas enunciado)",
    "summation": "somatório (6 proposições numeradas 01/02/04/08/16/32, cada uma pode ser verdadeira ou falsa)",
}

DIFFICULTY_LABELS = {
    "easy": "fácil (conceitos básicos, direta ao ponto)",
    "medium": "médio (requer compreensão e aplicação do conteúdo)",
    "hard": "difícil (análise crítica, raciocínio aprofundado)",
}


def generate_questions(
    subject: str,
    topic: str,
    question_type: str,
    difficulty: str,
    count: int,
    context: str = "",
    image_base64: str | None = None,
) -> list[dict]:
    """
    Returns a list of generated question dicts:
      { statement, question_type, difficulty, options: [{text, is_correct, order}] }
    """
    type_label = TYPE_LABELS.get(question_type, question_type)
    diff_label = DIFFICULTY_LABELS.get(difficulty, difficulty)

    context_block = f"\nContexto/instruções adicionais do professor:\n{context}" if context.strip() else ""

    example_mc = json.dumps({
        "statement": "Qual é a capital do Brasil?",
        "options": [
            {"text": "São Paulo", "is_correct": False, "order": 1},
            {"text": "Rio de Janeiro", "is_correct": False, "order": 2},
            {"text": "Brasília", "is_correct": True, "order": 3},
            {"text": "Salvador", "is_correct": False, "order": 4},
        ],
    }, ensure_ascii=False)

    example_tf = json.dumps({
        "statement": "A água pura é um bom condutor elétrico.",
        "options": [
            {"text": "Verdadeiro", "is_correct": False, "order": 1},
            {"text": "Falso", "is_correct": True, "order": 2},
        ],
    }, ensure_ascii=False)

    example_essay = json.dumps({
        "statement": "Explique o conceito de fotossíntese e sua importância para os ecossistemas.",
        "options": [],
    }, ensure_ascii=False)

    example_summation = json.dumps({
        "statement": "Sobre o sistema digestório humano, analise as proposições e some os valores das corretas:",
        "options": [
            {"text": "A boca é o primeiro órgão do sistema digestório.", "is_correct": True, "order": 1},
            {"text": "O estômago produz insulina.", "is_correct": False, "order": 2},
            {"text": "O fígado produz bile para a digestão de gorduras.", "is_correct": True, "order": 4},
            {"text": "O intestino delgado é responsável pela absorção de nutrientes.", "is_correct": True, "order": 8},
            {"text": "O pâncreas não tem nenhuma função digestiva.", "is_correct": False, "order": 16},
            {"text": "O intestino grosso absorve água e forma as fezes.", "is_correct": True, "order": 32},
        ],
    }, ensure_ascii=False)

    if question_type == "essay":
        example = example_essay
    elif question_type == "true_false":
        example = example_tf
    elif question_type == "summation":
        example = example_summation
    else:
        example = example_mc

    summation_rule = (
        "- Para somatório: EXATAMENTE 6 proposições com order obrigatoriamente 1, 2, 4, 8, 16, 32 (nessa ordem)."
        " Cada proposição é uma afirmação sobre o tópico que pode ser verdadeira (is_correct: true) ou falsa (is_correct: false)."
        " O enunciado deve instruir o aluno a 'some os valores das proposições corretas'."
        " Varie a quantidade de proposições corretas (entre 2 e 5 corretas por questão)."
    ) if question_type == "summation" else ""

    prompt = f"""Você é um professor especialista criando questões de prova em português do Brasil.

Matéria: {subject}
Tópico: {topic}
Tipo de questão: {type_label}
Dificuldade: {diff_label}
Quantidade de questões: {count}{context_block}

Gere exatamente {count} questão(ões) do tipo especificado.

Regras obrigatórias:
- Todas as questões devem ser em português do Brasil
- Os enunciados devem ser claros, objetivos e pedagogicamente corretos
- Para múltipla escolha: exatamente 4 alternativas, somente 1 correta
- Para verdadeiro/falso: exatamente 2 alternativas (Verdadeiro e Falso)
- Para dissertativa: sem alternativas (options: [])
{summation_rule}
- As alternativas incorretas devem ser plausíveis (não óbvias)
- Não repita questões semelhantes

Exemplo de formato para uma questão:
{example}

Responda SOMENTE com um array JSON válido contendo {count} objeto(s) com as chaves: statement, options.
Não inclua question_type, difficulty ou qualquer outra chave."""

    try:
        client = _get_client()
        if image_base64:
            # Detect image format from base64 header or default to jpeg
            if image_base64.startswith("/9j/"):
                mime = "image/jpeg"
            elif image_base64.startswith("iVBOR"):
                mime = "image/png"
            else:
                mime = "image/jpeg"
            content = [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_base64}"}},
                {"type": "text", "text": prompt},
            ]
            model = settings.GROQ_VISION_MODEL
        else:
            content = prompt
            model = settings.GROQ_MODEL
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": content}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        raw = _strip_thinking(resp.choices[0].message.content or "")
    except Exception as e:
        raise RuntimeError(f"Erro ao chamar Groq: {e}")

    # The model may return {"questions": [...]} or just [...]
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            raise RuntimeError("A IA retornou um formato inválido. Tente novamente.")

    if isinstance(parsed, dict):
        # unwrap common wrappers: {"questions": [...]} or {"data": [...]}
        for key in ("questions", "data", "items", "result", "results"):
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break
        else:
            # single question object
            if "statement" in parsed:
                parsed = [parsed]
            else:
                raise RuntimeError("Formato de resposta inesperado da IA.")

    result = []
    for item in parsed[:count]:
        options = item.get("options", [])
        # Normalize options
        normalized = []
        for i, opt in enumerate(options):
            normalized.append({
                "text": str(opt.get("text", "")),
                "is_correct": bool(opt.get("is_correct", False)),
                "order": opt.get("order", i + 1),
            })
        result.append({
            "statement": str(item.get("statement", "")),
            "question_type": question_type,
            "difficulty": difficulty,
            "options": normalized,
        })

    return result
