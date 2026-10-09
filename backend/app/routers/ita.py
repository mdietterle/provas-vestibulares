from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile, BackgroundTasks
import tempfile
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    ItaQuestion,
    User,
)
from app.schemas import QuestionOut, ItaImportRequest, ItaQuestionOut

router = APIRouter(prefix="/ita-questions", tags=["ita"])


@router.post("/admin/import-all", status_code=200)
def import_all_ita(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (inclusive)"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre a página de provas anteriores do ITA e importa provas em lote,
    retornando um task_id. Aceita `until_year` pra quem chama poder fatiar por ano e
    esperar cada um terminar antes de pedir o seguinte, em vez de uma tarefa só varrendo
    todos os anos disponíveis de uma vez (fatiado assim porque cada prova é bem pesada:
    ITA tem 2 fases + até 4 disciplinas por ano)."""
    from app.services.ita.pdf_import import import_all_ita_exams
    from app.services.progress import create_task, run_import_with_timeout

    task_id = create_task()
    background_tasks.add_task(
        run_import_with_timeout, import_all_ita_exams, since_year, until_year, task_id, task_id=task_id
    )
    return {"ok": True, "task_id": task_id}


@router.post("/admin/import-pdf", status_code=200)
async def import_ita_pdf_endpoint(
    year: int = Form(...),
    phase: str = Form("1"),
    subject: Optional[str] = Form(None),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional, PDF) do ITA,
    extrai as questões e grava no banco."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    from app.services.ita.pdf_import import import_ita_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            gabarito_path = tmp_path / "gabarito.pdf"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_ita_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                phase=phase,
                subject=subject or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[ItaQuestionOut])
def list_ita_questions(
    year: Optional[int] = Query(None),
    phase: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(ItaQuestion)
    if year:
        q = q.filter(ItaQuestion.year == year)
    if phase:
        q = q.filter(ItaQuestion.phase == phase)
    if area:
        q = q.filter(ItaQuestion.area.ilike(f"%{area}%"))
    if question_type:
        q = q.filter(ItaQuestion.question_type == question_type)
    if search:
        q = q.filter(ItaQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(ItaQuestion.year.desc(), ItaQuestion.phase, ItaQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(ItaQuestion.year).distinct().order_by(ItaQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(ItaQuestion.area)
        .distinct()
        .filter(ItaQuestion.area.isnot(None))
        .order_by(ItaQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=ItaQuestionOut)
def get_ita_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(ItaQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_ita_question(
    payload: ItaImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão ITA para o banco de questões da escola do professor."""
    ita_q = db.get(VestibularQuestion, payload.vestibular_question_id)
    if not ita_q:
        raise HTTPException(404, "Questão ITA não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    phase_label = f"Fase {ita_q.phase}" if ita_q.phase else ""
    statement = f"{ita_q.statement}\n\n[ITA {ita_q.year} {phase_label}– Q{ita_q.number}]".strip()

    images = sorted(ita_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else ita_q.image_base64

    q_type = QuestionType.MULTIPLE_CHOICE
    if ita_q.question_type == "discursive":
        q_type = QuestionType.ESSAY

    question = Question(
        statement=statement,
        question_type=q_type,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(ita_q.options, key=lambda o: o.order):
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
