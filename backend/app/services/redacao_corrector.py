"""AI correction service for Redações (CAR module).

Flow:
  1. Student submits essay → status = PENDING
  2. Background task calls correct_redacao_ai() → status = AI_DONE
  3. Professor reviews → PUT /redacoes/{id}/review → status = REVIEWED
"""
import json
import re
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import SessionLocal


DEFAULT_CRITERIA = [
    {"criterion": "Competência temática", "max_points": 2.0,
     "description": "Domínio do tema proposto e pertinência das ideias desenvolvidas."},
    {"criterion": "Coesão e coerência", "max_points": 2.0,
     "description": "Encadeamento lógico das ideias, uso de conectivos e progressão textual."},
    {"criterion": "Norma culta", "max_points": 2.0,
     "description": "Observância das regras gramaticais, ortografia e pontuação."},
    {"criterion": "Argumentação", "max_points": 2.0,
     "description": "Qualidade e consistência dos argumentos apresentados."},
    {"criterion": "Proposta de intervenção", "max_points": 2.0,
     "description": "Proposta de solução detalhada, viável e respeitosa aos direitos humanos."},
]


def _get_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _call_groq_json(prompt: str) -> dict:
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = _strip_thinking(resp.choices[0].message.content or "")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group())
        raise RuntimeError(f"JSON inválido na resposta da IA: {raw[:200]}")


def build_criteria_from_rubric(rubric: Optional[str], max_score: float) -> list[dict]:
    """Return criteria list. If rubric is provided, use it. Otherwise use defaults scaled to max_score."""
    if rubric:
        # Try to parse rubric as JSON list
        try:
            parsed = json.loads(rubric)
            if isinstance(parsed, list) and parsed:
                return parsed
        except Exception:
            pass

    # Scale defaults proportionally
    default_sum = sum(c["max_points"] for c in DEFAULT_CRITERIA)
    return [
        {**c, "max_points": round(c["max_points"] * max_score / default_sum, 2)}
        for c in DEFAULT_CRITERIA
    ]


def correct_redacao_ai(redacao_id: int) -> None:
    """Background task: call AI and persist per-criterion scores."""
    db: Session = SessionLocal()
    try:
        from app.models import Redacao, RedacaoCriterionScore, RedacaoStatus

        redacao = db.get(Redacao, redacao_id)
        if not redacao:
            print(f"⚠️  correct_redacao_ai: redacao {redacao_id} não encontrada")
            return

        criteria = build_criteria_from_rubric(redacao.rubric, redacao.max_score)

        criteria_block = "\n".join(
            f'  - {c["criterion"]} (máx {c["max_points"]} pts): {c.get("description", "")}'
            for c in criteria
        )

        prompt = f"""Você é um professor experiente corrigindo uma redação de vestibular em português do Brasil.

Tema: {redacao.theme}

Critérios de avaliação:
{criteria_block}

Redação do aluno:
\"\"\"{redacao.body}\"\"\"

Avalie cada critério e retorne APENAS um objeto JSON válido neste formato exato:
{{
  "criteria": [
    {{
      "criterion": "<nome exato do critério>",
      "score": <número decimal entre 0 e a pontuação máxima do critério>,
      "comment": "<feedback construtivo em 1-2 frases>"
    }}
  ],
  "overall_feedback": "<feedback geral da redação em 2-3 frases, destacando pontos fortes e a principal área de melhoria>"
}}

IMPORTANTE: os nomes dos critérios no JSON devem ser idênticos aos fornecidos acima."""

        data = _call_groq_json(prompt)

        ai_criteria = {item["criterion"]: item for item in data.get("criteria", [])}
        total = 0.0

        # Persist criterion scores
        for c in criteria:
            name = c["criterion"]
            ai_item = ai_criteria.get(name, {})
            raw_score = float(ai_item.get("score", 0.0))
            capped = max(0.0, min(raw_score, c["max_points"]))
            total += capped

            cs = RedacaoCriterionScore(
                redacao_id=redacao_id,
                criterion=name,
                max_points=c["max_points"],
                ai_score=round(capped, 2),
                ai_comment=str(ai_item.get("comment", "")),
                final_score=None,
            )
            db.add(cs)

        redacao.ai_total_score = round(total, 2)
        redacao.final_score = round(total, 2)
        redacao.ai_feedback = str(data.get("overall_feedback", ""))
        redacao.status = RedacaoStatus.AI_DONE
        redacao.corrected_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        print(f"✅  Redação {redacao_id} corrigida pela IA: {total:.2f}/{redacao.max_score}")

    except Exception as e:
        db.rollback()
        from app.models import Redacao, RedacaoStatus
        try:
            redacao = db.get(Redacao, redacao_id)
            if redacao:
                redacao.status = RedacaoStatus.AI_DONE
                redacao.ai_feedback = f"Erro na correção automática: {e}. Revisão manual necessária."
                db.commit()
        except Exception:
            pass
        print(f"❌  Erro ao corrigir redação {redacao_id}: {e}")
    finally:
        db.close()
