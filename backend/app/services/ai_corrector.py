"""AI correction service using Groq online model (openai/gpt-oss-120b para texto, llama-4-scout para visão)."""
import json
import re
from typing import Optional

from app.core.config import settings


def _get_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _call_groq(prompt: str, json_mode: bool = True) -> str:
    """`json_mode=True` (padrão, usado pela correção de redação/prova) força
    response_format json_object — a API do Groq EXIGE que o prompt mencione
    "json" nesse modo, senão o request falha. Quem pede texto/HTML solto
    (ex.: formatação de enunciado de simulado) precisa chamar com
    `json_mode=False`, senão a chamada falha sempre (silenciosamente, do
    lado de quem chama) e o texto nunca é formatado."""
    try:
        client = _get_client()
        kwargs = {"response_format": {"type": "json_object"}} if json_mode else {}
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            **kwargs,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        raise RuntimeError(f"Erro ao chamar Groq: {e}")


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def correct_essay(
    question_statement: str,
    criteria: Optional[str],
    student_answer: str,
    max_points: float,
) -> dict:
    """Returns {"score": float, "feedback": str}"""
    if not student_answer or not student_answer.strip():
        return {"score": 0.0, "feedback": "Resposta em branco."}

    criteria_block = (
        f"\nCritérios de correção definidos pelo professor:\n{criteria}"
        if criteria
        else "\nNão há critérios específicos — use seu julgamento pedagógico."
    )

    prompt = f"""Você é um professor corrigindo uma prova dissertativa em português.

Questão: {question_statement}
{criteria_block}

Resposta do aluno:
\"\"\"{student_answer}\"\"\"

Pontuação máxima desta questão: {max_points} pontos.

Avalie a resposta considerando:
1. Correção e precisão do conteúdo
2. Completude (o aluno abordou os pontos essenciais?)
3. Clareza e organização das ideias

Responda SOMENTE com um objeto JSON válido neste formato exato:
{{"score": <número decimal entre 0 e {max_points}>, "feedback": "<comentário construtivo em português, máximo 3 frases>"}}"""

    raw = _strip_thinking(_call_groq(prompt))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*?"score".*?\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            return {
                "score": max_points / 2,
                "feedback": f"Não foi possível interpretar a resposta da IA. Revisão manual necessária.",
            }

    score = float(data.get("score", max_points / 2))
    score = max(0.0, min(score, max_points))
    feedback = str(data.get("feedback", "Sem feedback."))
    return {"score": round(score, 2), "feedback": feedback}


def _preprocess_essay_image(image_base64: str) -> tuple[str, str]:
    """Pré-processa a imagem para maximizar a legibilidade do manuscrito.
    Cinza + contraste + nitidez, sem binarização (evita apagar partes de letras finas).
    Retorna (raw_b64_processado, media_type).
    """
    import base64
    import io
    from PIL import Image, ImageEnhance, ImageFilter

    raw_b64 = image_base64
    if image_base64.startswith("data:"):
        _, raw_b64 = image_base64.split(",", 1)

    img_bytes = base64.b64decode(raw_b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # Redimensiona mantendo proporção (máx 1600px no lado maior)
    max_dim = 1600
    w, h = img.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Cinza → contraste alto → nitidez → passa filtro de realce de bordas suave
    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(2.0)
    img = ImageEnhance.Sharpness(img).enhance(2.5)
    img = img.filter(ImageFilter.SHARPEN)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"


def correct_essay_from_image(
    question_statement: str,
    criteria: Optional[str],
    image_base64: str,
    max_points: float,
) -> dict:
    """Corrige uma redação a partir de uma imagem (foto/scan) usando Groq vision.
    Etapa 0: pré-processa imagem (P&B, contraste, nitidez, binarização Otsu).
    Etapa 1: transcrição fiel via modelo de visão (texto puro, sem JSON).
    Etapa 2: avaliação via modelo de texto convencional.
    Retorna {"score": float, "feedback": str, "transcription": str}
    """
    # ── Etapa 0: pré-processamento ────────────────────────────────────────────
    import re as _re
    # Extrai imagem original em base64 puro
    orig_b64 = image_base64
    orig_mime = "image/jpeg"
    if image_base64.startswith("data:"):
        mt = _re.search(r"data:([^;]+);", image_base64)
        if mt:
            orig_mime = mt.group(1)
        _, orig_b64 = image_base64.split(",", 1)

    try:
        proc_b64, proc_mime = _preprocess_essay_image(image_base64)
    except Exception:
        proc_b64, proc_mime = orig_b64, orig_mime

    client = _get_client()

    # ── Etapa 1: transcrição fiel ─────────────────────────────────────────────
    # Enviamos duas versões da imagem (original + processada em cinza/contraste)
    # para o modelo ter mais contexto. Usamos chain-of-thought forçado: o modelo
    # primeiro lista cada linha numerada, depois apresenta o texto final —
    # isso impede que ele "resuma" ou pule linhas.
    try:
        resp_ocr = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a mechanical OCR system. You transcribe handwritten text images character by character.\n\n"
                                "You will receive two versions of the same image: the original and a contrast-enhanced grayscale version. Use both to read every character accurately.\n\n"
                                "## STEP 1 — Read each line\n"
                                "Go through the image top to bottom. For each line of handwriting, write:\n"
                                "L01: <exact content of line 1>\n"
                                "L02: <exact content of line 2>\n"
                                "... and so on for every line.\n\n"
                                "## STEP 2 — Identify paragraph breaks\n"
                                "Note which line numbers start a new paragraph (visible indentation or blank line in the manuscript).\n\n"
                                "## STEP 3 — Output the final transcription\n"
                                "After listing all lines, write a separator line containing only: ---\n"
                                "Then output the complete transcription, joining lines within each paragraph naturally, and inserting a blank line between paragraphs.\n\n"
                                "## ABSOLUTE RULES\n"
                                "- Copy every word EXACTLY as the student wrote it — do NOT fix spelling, grammar, or punctuation\n"
                                "- Do NOT substitute, improve, or paraphrase ANY word\n"
                                "- Numbers and dates must be copied verbatim (e.g. if student wrote '2001', output '2001' — not '2000')\n"
                                "- Phrases must be copied verbatim (e.g. if student wrote 'Tendo a aparência', output 'Tendo a aparência' — not 'Com a aparência')\n"
                                "- If a word is truly illegible after examining both images, write [ilegível]\n"
                                "- Do NOT add any commentary, explanation, or metadata"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{orig_mime};base64,{orig_b64}"},
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{proc_mime};base64,{proc_b64}"},
                        },
                    ],
                }
            ],
            temperature=0.0,
        )
        raw_ocr = _strip_thinking(resp_ocr.choices[0].message.content or "").strip()
        # Extrai apenas o bloco após o separador "---"
        if "---" in raw_ocr:
            transcription = raw_ocr.split("---", 1)[1].strip()
        else:
            # Fallback: remove linhas "L##:" se o modelo não colocou separador
            lines = [l for l in raw_ocr.splitlines() if not _re.match(r"^L\d+:", l.strip())]
            transcription = "\n".join(lines).strip()
    except Exception as e:
        raise RuntimeError(f"Erro na transcrição (etapa 1): {e}")

    if not transcription:
        return {
            "score": max_points / 2,
            "feedback": "Não foi possível transcrever a imagem. Revisão manual necessária.",
            "transcription": "",
        }

    # ── Etapa 2: avaliação do texto transcrito ────────────────────────────────
    criteria_block = (
        f"\nCritérios de correção definidos pelo professor:\n{criteria}"
        if criteria
        else "\nNão há critérios específicos — use seu julgamento pedagógico."
    )

    try:
        resp_eval = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Você é um professor corrigindo uma redação em português.\n\n"
                        f"Proposta/Instruções: {question_statement}\n"
                        f"{criteria_block}\n\n"
                        f"Pontuação máxima: {max_points} pontos.\n\n"
                        f"Texto do aluno (transcrição fiel do manuscrito):\n{transcription}\n\n"
                        "Avalie a redação considerando:\n"
                        "1. Adequação ao tema proposto\n"
                        "2. Coesão e coerência textual\n"
                        "3. Norma culta (gramática e ortografia)\n"
                        "4. Desenvolvimento argumentativo\n"
                        "5. Proposta de intervenção (se aplicável)\n\n"
                        "Responda SOMENTE com JSON válido neste formato:\n"
                        f'{{"score": <decimal 0-{max_points}>, "feedback": "<comentário construtivo em 3-4 frases>"}}'
                    ),
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        eval_raw = _strip_thinking(resp_eval.choices[0].message.content or "")
        eval_data = json.loads(eval_raw)
    except Exception as e:
        raise RuntimeError(f"Erro na avaliação (etapa 2): {e}")

    score = float(eval_data.get("score", max_points / 2))
    score = max(0.0, min(score, max_points))
    return {
        "score": round(score, 2),
        "feedback": str(eval_data.get("feedback", "Sem feedback.")),
        "transcription": transcription,
    }


def groq_is_available() -> bool:
    return bool(settings.GROQ_API_KEY)


# Keep old name as alias for backward compatibility with submissions.py
ollama_is_available = groq_is_available
