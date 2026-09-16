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
    UdescQuestion,
    User,
)
from app.schemas import QuestionOut, UdescImportRequest, UdescQuestionOut

router = APIRouter(prefix="/udesc-questions", tags=["udesc"])


@router.post("/admin/import-all", status_code=200)
def import_all_udesc(
    background_tasks: BackgroundTasks,
    since_year: int = Query(2015, description="Importa a partir desse ano (padrão: 2015)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre udesc.br/vestibular/provasanteriores e importa as
    provas de cada edição (ano.semestre). Cada edição tem 2 turnos —
    Matutino (Matemática, Biologia, Língua Estrangeira, Língua Portuguesa e
    Literatura) e Vespertino (Física, Química, História, Geografia) — que
    são provas DIFERENTES (não variantes embaralhadas da mesma), então as
    duas são importadas. O gabarito é único por edição, compartilhado pelos
    2 turnos.

    Validado contra o site real (sem gravar no banco): 2015-2020 e 2023.2
    com ótima taxa de acerto de gabarito (a maioria 46-50 de 50 por turno).
    Hiato entre 2020-2 e 2023-1 (edições não publicadas, provavelmente
    pandemia). A partir de 2024 os cadernos passaram a ser gerados de um
    jeito que não expõe texto extraível (nem imagem simples, só vetor) —
    detectado automaticamente (menos de ~15 questões reconhecidas) e
    pulado, reportado sem travar o lote. Uma única edição (2019.1
    Vespertino) também veio inteiramente sem texto, tratada do mesmo jeito."""
    from app.services.udesc.seed import import_all_udesc_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_udesc_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[UdescQuestionOut])
def list_udesc_questions(
    year: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    shift: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(UdescQuestion)
    if year:
        q = q.filter(UdescQuestion.year == year)
    if semester:
        q = q.filter(UdescQuestion.semester == semester)
    if shift:
        q = q.filter(UdescQuestion.shift == shift)
    if area:
        q = q.filter(UdescQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(UdescQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UdescQuestion.year.desc(), UdescQuestion.semester.desc(), UdescQuestion.shift, UdescQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UdescQuestion.year).distinct().order_by(UdescQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UdescQuestion.area)
        .distinct()
        .filter(UdescQuestion.area.isnot(None))
        .order_by(UdescQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UdescQuestionOut)
def get_udesc_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UdescQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_udesc_question(
    payload: UdescImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UDESC para o banco de questões da escola do professor."""
    udesc_q = db.get(UdescQuestion, payload.udesc_question_id)
    if not udesc_q:
        raise HTTPException(404, "Questão UDESC não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{udesc_q.statement}\n\n[UDESC {udesc_q.year}.{udesc_q.semester} – {udesc_q.shift} – Q{udesc_q.number}]"

    images = sorted(udesc_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else udesc_q.image_base64

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

    for opt in sorted(udesc_q.options, key=lambda o: o.order):
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
