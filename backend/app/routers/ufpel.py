import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    UfpelQuestion,
    User,
)
from app.schemas import QuestionOut, UfpelImportRequest, UfpelQuestionOut

router = APIRouter(prefix="/ufpel-questions", tags=["ufpel"])


@router.post("/admin/import-all", status_code=200)
def import_all_ufpel(
    background_tasks: BackgroundTasks,
    since_year: int = Query(2013, description="Importa a partir desse ano (padrão: 2013)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: importa as provas do PAVE (vestibular seriado próprio da
    UFPel), 3 etapas por ano.

    O domínio ufpel.edu.br está atrás de um WAF que bloqueia requisições
    automatizadas — este importador acessa a página e os PDFs através do
    Wayback Machine (web.archive.org). 32 questões objetivas por etapa (9
    Ciências da Natureza, 9 Ciências Humanas, 5 Matemática, 9 Linguagens); a
    redação/discursiva não é importada. Cada questão tem 6 alternativas
    impressas, "(a)" a "(f)" — "(f)" é sempre "I.R." (item removido/anulado),
    descartada, ficam as 5 reais.

    ⚠️ Cobertura real depende do que o Wayback Machine tem arquivado: 2024
    valida perfeito (32/32 nas 3 etapas). Anos com prova maior que ~1 MiB às
    vezes vêm truncados na captura do Wayback (PDF corrompido, não tem como
    contornar baixando de novo) e o Wayback também aplica rate-limiting em
    requisições rápidas — ambos detectados automaticamente e reportados como
    pulados, sem travar o lote. Rodar de novo mais tarde pode ter resultado
    diferente (o rate-limiting é transitório, a captura truncada não)."""
    from app.services.ufpel.seed import import_all_ufpel_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_ufpel_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[UfpelQuestionOut])
def list_ufpel_questions(
    year: Optional[int] = Query(None),
    stage: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(UfpelQuestion)
    if year:
        q = q.filter(UfpelQuestion.year == year)
    if stage:
        q = q.filter(UfpelQuestion.stage == stage)
    if area:
        q = q.filter(UfpelQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(UfpelQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UfpelQuestion.year.desc(), UfpelQuestion.stage, UfpelQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UfpelQuestion.year).distinct().order_by(UfpelQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UfpelQuestion.area)
        .distinct()
        .filter(UfpelQuestion.area.isnot(None))
        .order_by(UfpelQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UfpelQuestionOut)
def get_ufpel_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UfpelQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_ufpel_question(
    payload: UfpelImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UFPel para o banco de questões da escola do professor."""
    ufpel_q = db.get(UfpelQuestion, payload.ufpel_question_id)
    if not ufpel_q:
        raise HTTPException(404, "Questão UFPel não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{ufpel_q.statement}\n\n[UFPel PAVE {ufpel_q.year} – Etapa {ufpel_q.stage} – Q{ufpel_q.number}]"

    images = sorted(ufpel_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else ufpel_q.image_base64

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

    for opt in sorted(ufpel_q.options, key=lambda o: o.order):
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
