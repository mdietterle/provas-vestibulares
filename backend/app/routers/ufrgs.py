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
    UfrgsQuestion,
    UfrgsQuestionOption,
    User,
)
from app.schemas import QuestionOut, UfrgsImportRequest, UfrgsQuestionOut

router = APIRouter(prefix="/ufrgs-questions", tags=["ufrgs"])


@router.post("/admin/import-all", status_code=200)
def import_all_ufrgs(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano (padrão: 2011)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (padrão: 2026)"),
    language: str = Query("Inglês", description="Variante de Língua Estrangeira Moderna a importar quando o dia tiver mais de uma opção"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre ufrgs.br/coperse/aquisicao-de-provas/ (2011-2026,
    exceto 2021, que não existe) e importa a prova de cada dia de cada ano,
    junto com o gabarito lido automaticamente de
    vestibular.ufrgs.br/cvANO/gabaritos/ (tabela HTML, sem precisar colar
    nada manualmente). Quando o dia tem variantes de idioma (Inglês,
    Espanhol, Alemão, Francês, Italiano), importa só uma (`language`,
    padrão Inglês) — as demais têm o mesmo conteúdo nas outras matérias."""
    from app.services.ufrgs.pdf_import import import_all_ufrgs_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_ufrgs_exams, since_year=since_year, until_year=until_year, language=language, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[UfrgsQuestionOut])
def list_ufrgs_questions(
    year: Optional[int] = Query(None),
    day: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(UfrgsQuestion)
    if year:
        q = q.filter(UfrgsQuestion.year == year)
    if day:
        q = q.filter(UfrgsQuestion.day == day)
    if area:
        q = q.filter(UfrgsQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(UfrgsQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UfrgsQuestion.year.desc(), UfrgsQuestion.day, UfrgsQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UfrgsQuestion.year).distinct().order_by(UfrgsQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UfrgsQuestion.area)
        .distinct()
        .filter(UfrgsQuestion.area.isnot(None))
        .order_by(UfrgsQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UfrgsQuestionOut)
def get_ufrgs_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UfrgsQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_ufrgs_question(
    payload: UfrgsImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UFRGS para o banco de questões da escola do professor."""
    ufrgs_q = db.get(UfrgsQuestion, payload.ufrgs_question_id)
    if not ufrgs_q:
        raise HTTPException(404, "Questão UFRGS não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{ufrgs_q.statement}\n\n[UFRGS {ufrgs_q.year} – Dia {ufrgs_q.day} – Q{ufrgs_q.number}]"

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=ufrgs_q.image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(ufrgs_q.options, key=lambda o: o.order):
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
