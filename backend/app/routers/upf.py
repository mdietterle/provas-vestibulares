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
    UpfQuestion,
    User,
)
from app.schemas import QuestionOut, UpfImportRequest, UpfQuestionOut

router = APIRouter(prefix="/upf-questions", tags=["upf"])


@router.post("/admin/import-all", status_code=200)
def import_all_upf(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre upf.br/ingresso/provas/vestibulares-anteriores e
    importa o caderno "Tipo A" + gabarito de cada edição (Verão/Inverno)
    encontrada.

    Questões de Língua Estrangeira reaproveitam a mesma numeração (17-24)
    pra Inglês e Espanhol — diferenciadas pelo campo `area`. Validado
    contra o Vestibular de Verão 2025/1: 79 de 80 questões reconhecidas
    (a exceção é uma questão cujas alternativas são impressas sem o
    marcador "a)".."e)" no PDF, pulada sem travar o lote). Edições sem
    link "Tipo A" ou "Gabarito" reconhecível também são puladas e
    reportadas."""
    from app.services.upf.seed import import_all_upf_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_upf_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[UpfQuestionOut])
def list_upf_questions(
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(UpfQuestion)
    if year:
        q = q.filter(UpfQuestion.year == year)
    if area:
        q = q.filter(UpfQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(UpfQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UpfQuestion.year.desc(), UpfQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UpfQuestion.year).distinct().order_by(UpfQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UpfQuestion.area)
        .distinct()
        .filter(UpfQuestion.area.isnot(None))
        .order_by(UpfQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UpfQuestionOut)
def get_upf_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UpfQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_upf_question(
    payload: UpfImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UPF para o banco de questões da escola do professor."""
    upf_q = db.get(UpfQuestion, payload.upf_question_id)
    if not upf_q:
        raise HTTPException(404, "Questão UPF não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{upf_q.statement}\n\n[UPF {upf_q.exam_name} – Q{upf_q.number}]"

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(upf_q.options, key=lambda o: o.order):
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
