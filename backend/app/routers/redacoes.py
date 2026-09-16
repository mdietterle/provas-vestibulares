"""Router for CAR – Correção Automática de Redações."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_professor
from app.models import Institution, Redacao, RedacaoCriterionScore, RedacaoStatus, User, UserRole
from app.services.redacao_corrector import correct_redacao_ai

router = APIRouter(prefix="/redacoes", tags=["redacoes"])

# ── Pydantic schemas ───────────────────────────────────────────────────────────


class SubmitRedacaoRequest(BaseModel):
    theme: str = Field(..., min_length=5, max_length=500)
    body: str = Field(..., min_length=50)
    rubric: Optional[str] = None
    max_score: float = Field(default=10.0, ge=1.0, le=100.0)
    professor_id: Optional[int] = None  # if None, any professor of the institution can review


class ReviewCriterionItem(BaseModel):
    criterion_score_id: int
    final_score: float
    professor_note: Optional[str] = None


class ReviewRedacaoRequest(BaseModel):
    criteria: List[ReviewCriterionItem]
    professor_comment: Optional[str] = None


class CreateThemeRequest(BaseModel):
    theme: str = Field(..., min_length=5, max_length=500)
    rubric: Optional[str] = None
    max_score: float = Field(default=10.0, ge=1.0, le=100.0)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _check_car_plan(institution: Institution):
    """Raise 403 if institution does not have CAR enabled."""
    if not institution.car_enabled:
        raise HTTPException(
            403,
            "O módulo CAR (Correção Automática de Redações) não está ativado para esta instituição. "
            "Entre em contato com o proprietário do sistema para habilitar.",
        )


def _serialize_criterion(cs: RedacaoCriterionScore) -> Dict[str, Any]:
    effective = cs.final_score if cs.final_score is not None else cs.ai_score
    return {
        "id": cs.id,
        "criterion": cs.criterion,
        "max_points": cs.max_points,
        "ai_score": cs.ai_score,
        "ai_comment": cs.ai_comment,
        "final_score": cs.final_score,
        "professor_note": cs.professor_note,
        "effective_score": effective,
    }


def _serialize_redacao(r: Redacao, include_criteria: bool = True) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": r.id,
        "theme": r.theme,
        "body": r.body,
        "rubric": r.rubric,
        "max_score": r.max_score,
        "status": r.status,
        "ai_total_score": r.ai_total_score,
        "ai_feedback": r.ai_feedback,
        "final_score": r.final_score,
        "professor_comment": r.professor_comment,
        "student": {"id": r.student_id, "name": r.student.name if r.student else None},
        "professor": {"id": r.professor_id, "name": r.professor.name if r.professor else None} if r.professor_id else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "corrected_at": r.corrected_at.isoformat() if r.corrected_at else None,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
    }
    if include_criteria:
        out["criteria_scores"] = [_serialize_criterion(cs) for cs in r.criteria_scores]
    return out


# ── Student endpoints ──────────────────────────────────────────────────────────


@router.post("", status_code=201)
def submit_redacao(
    payload: SubmitRedacaoRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits an essay. Triggers AI correction immediately."""
    institution = db.get(Institution, current_user.institution_id)
    if not institution:
        raise HTTPException(404, "Instituição não encontrada")
    _check_car_plan(institution)

    if current_user.role not in (UserRole.STUDENT, UserRole.ADMIN, UserRole.PROFESSOR):
        raise HTTPException(403, "Apenas alunos podem submeter redações")

    professor_id = payload.professor_id

    redacao = Redacao(
        institution_id=current_user.institution_id,
        student_id=current_user.id,
        professor_id=professor_id,
        theme=payload.theme,
        rubric=payload.rubric,
        max_score=payload.max_score,
        body=payload.body,
        status=RedacaoStatus.CORRECTING,
    )
    db.add(redacao)
    db.commit()
    db.refresh(redacao)

    background_tasks.add_task(correct_redacao_ai, redacao.id)
    return _serialize_redacao(redacao, include_criteria=False)


@router.get("/mine")
def list_my_redacoes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all redações submitted by the current student."""
    redacoes = (
        db.query(Redacao)
        .filter(Redacao.student_id == current_user.id)
        .order_by(Redacao.created_at.desc())
        .all()
    )
    return [_serialize_redacao(r, include_criteria=False) for r in redacoes]


@router.get("/{redacao_id}")
def get_redacao(
    redacao_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single redação. Students see only their own; professors see institution's."""
    redacao = db.get(Redacao, redacao_id)
    if not redacao:
        raise HTTPException(404, "Redação não encontrada")

    is_own = redacao.student_id == current_user.id
    is_prof = current_user.role in (UserRole.PROFESSOR, UserRole.ADMIN)
    is_same_institution = redacao.institution_id == current_user.institution_id

    if not is_own and not (is_prof and is_same_institution):
        raise HTTPException(403, "Acesso negado")

    return _serialize_redacao(redacao)


# ── Professor / admin endpoints ────────────────────────────────────────────────


@router.get("")
def list_redacoes(
    status: Optional[str] = None,
    student_id: Optional[int] = None,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    """List all redações for the institution (professor/admin only)."""
    q = db.query(Redacao).filter(Redacao.institution_id == current_user.institution_id)
    if status:
        q = q.filter(Redacao.status == status)
    if student_id:
        q = q.filter(Redacao.student_id == student_id)
    redacoes = q.order_by(Redacao.created_at.desc()).all()
    return [_serialize_redacao(r, include_criteria=False) for r in redacoes]


@router.put("/{redacao_id}/review")
def review_redacao(
    redacao_id: int,
    payload: ReviewRedacaoRequest,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    """Professor validates/overrides AI scores per criterion."""
    redacao = db.get(Redacao, redacao_id)
    if not redacao:
        raise HTTPException(404, "Redação não encontrada")
    if redacao.institution_id != current_user.institution_id:
        raise HTTPException(403, "Acesso negado")
    if redacao.status not in (RedacaoStatus.AI_DONE, RedacaoStatus.REVIEWED):
        raise HTTPException(400, f"Redação não está pronta para revisão (status: {redacao.status})")

    cs_map = {cs.id: cs for cs in redacao.criteria_scores}
    total = 0.0

    for item in payload.criteria:
        cs = cs_map.get(item.criterion_score_id)
        if not cs:
            raise HTTPException(400, f"Critério {item.criterion_score_id} não pertence a esta redação")
        capped = max(0.0, min(float(item.final_score), cs.max_points))
        cs.final_score = round(capped, 2)
        cs.professor_note = item.professor_note
        total += capped

    # For any criterion not in the payload, use effective (ai_score or existing final_score)
    reviewed_ids = {item.criterion_score_id for item in payload.criteria}
    for cs in redacao.criteria_scores:
        if cs.id not in reviewed_ids:
            total += cs.final_score if cs.final_score is not None else (cs.ai_score or 0.0)

    redacao.final_score = round(total, 2)
    redacao.professor_comment = payload.professor_comment
    redacao.professor_id = current_user.id
    redacao.status = RedacaoStatus.REVIEWED
    redacao.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(redacao)
    return _serialize_redacao(redacao)


@router.post("/{redacao_id}/recorrect")
def recorrect_redacao(
    redacao_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    """Re-trigger AI correction (e.g. after changing rubric)."""
    redacao = db.get(Redacao, redacao_id)
    if not redacao:
        raise HTTPException(404, "Redação não encontrada")
    if redacao.institution_id != current_user.institution_id:
        raise HTTPException(403, "Acesso negado")

    # Clear old criterion scores
    for cs in redacao.criteria_scores:
        db.delete(cs)
    redacao.status = RedacaoStatus.CORRECTING
    redacao.ai_total_score = None
    redacao.ai_feedback = None
    redacao.final_score = None
    redacao.corrected_at = None
    redacao.reviewed_at = None
    db.commit()

    background_tasks.add_task(correct_redacao_ai, redacao_id)
    return {"status": "correcting", "redacao_id": redacao_id}
