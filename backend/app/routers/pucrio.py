import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    PucRioQuestion,
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    User,
)
from app.schemas import PucRioImportRequest, PucRioQuestionOut, QuestionOut

router = APIRouter(prefix="/pucrio-questions", tags=["pucrio"])


@router.post("/admin/import-all", status_code=200)
def import_all_pucrio(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre puc-rio.br/vestibular/repositorio/ e importa, por
    edição, só 2 dos vários cadernos publicados (mesmo espírito da PUCRS, que
    só importa Medicina): 1º Dia (Língua Estrangeira, comum a todos os
    grupos) e 2º Dia Grupo 1 (Ciências da Natureza + Ciências Humanas).

    O gabarito da PUC-Rio é o próprio caderno de prova com a alternativa
    certa sublinhada em cor (varia por edição, nunca preto/branco/cinza) —
    o parser detecta esse sublinhado, não precisa de gabarito separado.

    Os nomes de arquivo mudam de formato livremente ano a ano (sem padrão
    fixo) — localizamos os PDFs por palavras-chave no link, então edições
    com nomenclatura muito diferente do padrão atual (sobretudo ~2020-2022)
    ou que só publicam um ZIP único podem não ser reconhecidas e são
    puladas, reportadas em `skipped`."""
    from app.services.pucrio.seed import import_all_pucrio_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_pucrio_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[PucRioQuestionOut])
def list_pucrio_questions(
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PucRioQuestion)
    if year:
        q = q.filter(PucRioQuestion.year == year)
    if area:
        q = q.filter(PucRioQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(PucRioQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(PucRioQuestion.year.desc(), PucRioQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(PucRioQuestion.year).distinct().order_by(PucRioQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(PucRioQuestion.area)
        .distinct()
        .filter(PucRioQuestion.area.isnot(None))
        .order_by(PucRioQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=PucRioQuestionOut)
def get_pucrio_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(PucRioQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_pucrio_question(
    payload: PucRioImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão PUC-Rio para o banco de questões da escola do professor."""
    pucrio_q = db.get(PucRioQuestion, payload.pucrio_question_id)
    if not pucrio_q:
        raise HTTPException(404, "Questão PUC-Rio não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{pucrio_q.statement}\n\n[PUC-Rio {pucrio_q.year} – Q{pucrio_q.number}]"

    images = sorted(pucrio_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else pucrio_q.image_base64

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

    for opt in sorted(pucrio_q.options, key=lambda o: o.order):
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
