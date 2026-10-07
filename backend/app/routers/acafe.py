import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    AcafeQuestion,
    AcafeQuestionOption,
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    User,
    VestibularQuestion,
)

from app.schemas import AcafeImportRequest, AcafeQuestionOut, AcafeUrlImportRequest, QuestionOut

router = APIRouter(prefix="/acafe-questions", tags=["acafe"])


@router.post("/admin/import-url", status_code=200)
def import_acafe_url(
    payload: AcafeUrlImportRequest,
    _: User = Depends(require_owner),
):
    """Owner-only: baixa o PDF oficial de uma prova ACAFE a partir de uma URL
    pública (ex.: storage.acafe.org.br/.../Prova objetiva oficial - comentada.pdf)
    e extrai as questões automaticamente, sem precisar commitar o arquivo no repo."""
    from app.services.acafe.seed import import_acafe_from_url
    try:
        result = import_acafe_from_url(payload.url, year=payload.year, period=payload.period)
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar PDF: {e}")


@router.post("/admin/run-seed", status_code=200)
def run_acafe_seed(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano (padrão: 2014)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (padrão: 2026)"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre storage.acafe.org.br (vestibular de Medicina ACAFE)
    de `until_year` até `since_year`, ano a ano e semestre a semestre (Verão
    e Inverno), e importa cada edição encontrada."""
    from app.services.acafe.seed import import_all_acafe_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_acafe_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro no seed: {e}")


@router.get("", response_model=List[AcafeQuestionOut])
def list_acafe_questions(
    year: Optional[int] = Query(None),
    period: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(AcafeQuestion)
    if year:
        q = q.filter(AcafeQuestion.year == year)
    if period:
        q = q.filter(AcafeQuestion.period == period)
    if area:
        q = q.filter(AcafeQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(AcafeQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(AcafeQuestion.year.desc(), AcafeQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(AcafeQuestion.year).distinct().order_by(AcafeQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/periods", response_model=List[str])
def list_periods(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(AcafeQuestion.period)
        .distinct()
        .filter(AcafeQuestion.period.isnot(None))
        .order_by(AcafeQuestion.period)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(AcafeQuestion.area)
        .distinct()
        .filter(AcafeQuestion.area.isnot(None))
        .order_by(AcafeQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=AcafeQuestionOut)
def get_acafe_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(AcafeQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_acafe_question(
    payload: AcafeImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão ACAFE para o banco de questões da escola do professor."""
    acafe_q = db.get(AcafeQuestion, payload.acafe_question_id)
    if not acafe_q:
        raise HTTPException(404, "Questão ACAFE não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    source = f"ACAFE {acafe_q.period or ''} {acafe_q.year}".replace("  ", " ").strip()
    statement = f"{acafe_q.statement}\n\n[{source} – Q{acafe_q.number}]"

    # Carrega a primeira imagem da questão (o banco do professor tem um único
    # campo de imagem). Cai no image_base64 legado se a relação estiver vazia.
    images = sorted(acafe_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else acafe_q.image_base64

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(acafe_q.options, key=lambda o: o.order):
        db.add(
            QuestionOption(
                question_id=question.id,
                text=opt.text,
                is_correct=opt.is_correct,
                order=opt.order,
            )
        )

    db.commit()
    db.refresh(question)
    return question
