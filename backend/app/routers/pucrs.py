import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    PucrsQuestion,
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    User,
)
from app.schemas import PucrsImportRequest, PucrsQuestionOut, QuestionOut

router = APIRouter(prefix="/pucrs-questions", tags=["pucrs"])


@router.post("/admin/import-all", status_code=200)
def import_all_pucrs(
    background_tasks: BackgroundTasks,
    since_year: int = Query(2015, description="Importa a partir desse ano (padrão: 2015)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre portal.pucrs.br/.../provas-anteriores/ e importa a
    prova de Medicina de cada edição com prova+gabarito publicados (o
    vestibular "Demais Cursos" não tem prova objetiva própria).

    No momento (2026) só existem 2 edições disponíveis (Verão 2022 e Verão
    2023) — validadas contra o site real, com boa taxa de acerto de
    gabarito. 70 questões objetivas por edição, em 6 grupos de faixa fixa:
    Língua Estrangeira (Espanhol/Inglês, 1-10 compartilhado), Matemática
    (11-20), Português (21-30), Física/Química/Biologia (31-50),
    Literatura/História/Geografia (51-70). A redação (discursiva) não é
    importada."""
    from app.services.pucrs.seed import import_all_pucrs_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_pucrs_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[PucrsQuestionOut])
def list_pucrs_questions(
    year: Optional[int] = Query(None),
    season: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PucrsQuestion)
    if year:
        q = q.filter(PucrsQuestion.year == year)
    if season:
        q = q.filter(PucrsQuestion.season == season)
    if area:
        q = q.filter(PucrsQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(PucrsQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(PucrsQuestion.year.desc(), PucrsQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(PucrsQuestion.year).distinct().order_by(PucrsQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(PucrsQuestion.area)
        .distinct()
        .filter(PucrsQuestion.area.isnot(None))
        .order_by(PucrsQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=PucrsQuestionOut)
def get_pucrs_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(PucrsQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_pucrs_question(
    payload: PucrsImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão PUCRS para o banco de questões da escola do professor."""
    pucrs_q = db.get(PucrsQuestion, payload.pucrs_question_id)
    if not pucrs_q:
        raise HTTPException(404, "Questão PUCRS não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{pucrs_q.statement}\n\n[PUCRS {pucrs_q.season} {pucrs_q.year} – Q{pucrs_q.number}]"

    images = sorted(pucrs_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else pucrs_q.image_base64

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

    for opt in sorted(pucrs_q.options, key=lambda o: o.order):
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
