"""Painel do owner pra questões reportadas por alunos (ver app/routers/
simulados.py:report_question) — revisar, corrigir enunciado/alternativas e
liberar de volta pro sorteio, ou excluir a questão em definitivo."""
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_owner
from app.models import QuestionReport, User
from app.routers.simulados import EXAM_TYPE_MODELS, REPORT_REASONS, _option_letter

router = APIRouter(prefix="/owner/question-reports", tags=["owner"])


def _get_question(exam_type: str, question_id: int, db: Session):
    model = EXAM_TYPE_MODELS.get(exam_type)
    if model is None:
        raise HTTPException(404, f"Banco desconhecido: {exam_type}")
    q = db.get(model, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada (já deve ter sido excluída)")
    return q


def _serialize_question(q) -> dict:
    return {
        "statement": q.statement,
        "area": getattr(q, "area", None),
        "question_type": getattr(q, "question_type", "single"),
        "answer": getattr(q, "answer", None),
        "options": [
            {
                "id": opt.id,
                "letter": _option_letter(opt),
                "text": opt.text,
                "is_correct": opt.is_correct,
                "order": opt.order,
                "value": getattr(opt, "value", None),
            }
            for opt in sorted(q.options, key=lambda o: o.order)
        ],
    }


@router.get("")
def list_reports(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Agrupado por questão (exam_type + question_id) — várias denúncias da
    mesma questão viram uma linha só, com a contagem e os motivos."""
    query = db.query(QuestionReport)
    if status:
        query = query.filter(QuestionReport.status == status)
    reports = query.order_by(QuestionReport.created_at.desc()).all()

    groups: dict[tuple[str, int], dict[str, Any]] = {}
    for r in reports:
        key = (r.exam_type, r.question_id)
        if key not in groups:
            groups[key] = {
                "exam_type": r.exam_type,
                "question_id": r.question_id,
                "status": r.status,
                "count": 0,
                "reasons": [],
                "latest_details": None,
                "last_reported_at": r.created_at.isoformat() if r.created_at else None,
                "statement_preview": None,
            }
        g = groups[key]
        g["count"] += 1
        g["reasons"].append(REPORT_REASONS.get(r.reason, r.reason))
        if r.details and not g["latest_details"]:
            g["latest_details"] = r.details

    result = list(groups.values())
    for g in result:
        try:
            q = _get_question(g["exam_type"], g["question_id"], db)
            g["statement_preview"] = (q.statement or "")[:200]
        except HTTPException:
            g["statement_preview"] = "(questão já excluída)"

    return result


@router.get("/{exam_type}/{question_id}")
def get_report_detail(
    exam_type: str,
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    q = _get_question(exam_type, question_id, db)
    reports = (
        db.query(QuestionReport)
        .filter(QuestionReport.exam_type == exam_type, QuestionReport.question_id == question_id)
        .order_by(QuestionReport.created_at.desc())
        .all()
    )
    return {
        "question": _serialize_question(q),
        "reports": [
            {
                "id": r.id,
                "reason": REPORT_REASONS.get(r.reason, r.reason),
                "details": r.details,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ],
    }


class OptionUpdate(BaseModel):
    id: int
    text: str
    is_correct: bool


class QuestionUpdate(BaseModel):
    statement: str
    options: List[OptionUpdate]


@router.put("/{exam_type}/{question_id}/question")
def update_question(
    exam_type: str,
    question_id: int,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Corrige enunciado e/ou texto e gabarito das alternativas existentes.
    Não adiciona/remove alternativa — só edita o que já existe."""
    q = _get_question(exam_type, question_id, db)
    q.statement = payload.statement.strip()

    opts_by_id = {opt.id: opt for opt in q.options}
    for upd in payload.options:
        opt = opts_by_id.get(upd.id)
        if not opt:
            raise HTTPException(400, f"Alternativa {upd.id} não pertence a esta questão")
        opt.text = upd.text.strip()
        opt.is_correct = upd.is_correct

    db.commit()
    return {"ok": True, "question": _serialize_question(q)}


@router.post("/{exam_type}/{question_id}/release")
def release_question(
    exam_type: str,
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Marca todas as denúncias pendentes desta questão como resolvidas —
    ela volta a poder ser sorteada em novos simulados."""
    reports = (
        db.query(QuestionReport)
        .filter(
            QuestionReport.exam_type == exam_type,
            QuestionReport.question_id == question_id,
            QuestionReport.status == "pending",
        )
        .all()
    )
    if not reports:
        raise HTTPException(404, "Nenhuma denúncia pendente para esta questão")
    for r in reports:
        r.status = "resolved"
        r.resolved_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "resolved": len(reports)}


@router.delete("/{exam_type}/{question_id}/question")
def delete_question(
    exam_type: str,
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Exclui a questão em definitivo (cascade remove as alternativas) e
    resolve as denúncias associadas — sem a questão, ela nunca mais é
    sorteada de qualquer forma."""
    q = _get_question(exam_type, question_id, db)
    db.delete(q)
    (
        db.query(QuestionReport)
        .filter(
            QuestionReport.exam_type == exam_type,
            QuestionReport.question_id == question_id,
            QuestionReport.status == "pending",
        )
        .update({"status": "resolved", "resolved_at": datetime.utcnow()})
    )
    db.commit()
    return {"ok": True}
