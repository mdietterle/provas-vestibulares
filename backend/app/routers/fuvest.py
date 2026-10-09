import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    FuvestQuestion,
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    User,
)
from app.schemas import FuvestImportRequest, FuvestQuestionOut, QuestionOut

router = APIRouter(prefix="/fuvest-questions", tags=["fuvest"])


@router.post("/admin/import-all", status_code=200)
def import_all_fuvest(
    background_tasks: BackgroundTasks,
    since_year: int = Query(2015, description="Importa a partir desse ano (padrão: 2015)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (padrão: ano mais recente listado no acervo)"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre fuvest.br/acervo-vestibular e importa a prova
    objetiva (1ª fase) de cada ano, junto com o gabarito. Cada edição
    publica a prova em várias "versões" (mesmas questões embaralhadas) —
    importa só a primeira versão listada.

    Validado (~90/90 questões, gabarito conferido) em 2019, 2022-2026;
    parcial (67-83/90) em 2016-2017 e 2020. 2015, 2018 e 2021 usam PDFs
    gerados de um jeito que não expõe o número da questão como texto
    legível (fonte customizada, ou texto extraído sem espaços entre
    palavras) — não reconhecidos por este parser, pulados e reportados."""
    from app.services.fuvest.seed import import_all_fuvest_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_fuvest_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[FuvestQuestionOut])
def list_fuvest_questions(
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(FuvestQuestion)
    if year:
        q = q.filter(FuvestQuestion.year == year)
    if area:
        q = q.filter(FuvestQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(FuvestQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(FuvestQuestion.year.desc(), FuvestQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(FuvestQuestion.year).distinct().order_by(FuvestQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(FuvestQuestion.area)
        .distinct()
        .filter(FuvestQuestion.area.isnot(None))
        .order_by(FuvestQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=FuvestQuestionOut)
def get_fuvest_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(FuvestQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_fuvest_question(
    payload: FuvestImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão FUVEST para o banco de questões da escola do professor."""
    fuvest_q = db.get(VestibularQuestion, payload.vestibular_question_id)
    if not fuvest_q:
        raise HTTPException(404, "Questão FUVEST não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{fuvest_q.statement}\n\n[FUVEST {fuvest_q.year} – Q{fuvest_q.number}]"

    images = sorted(fuvest_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else fuvest_q.image_base64

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

    for opt in sorted(fuvest_q.options, key=lambda o: o.order):
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
