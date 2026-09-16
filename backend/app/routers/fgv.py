import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
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
    FgvQuestion,
    User,
)
from app.schemas import QuestionOut, FgvImportRequest, FgvQuestionOut

router = APIRouter(prefix="/fgv-questions", tags=["fgv"])


@router.post("/admin/import-all", status_code=200)
def import_all_fgv(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre a página de provas anteriores do FGV e importa provas em lote."""
    from app.services.fgv.pdf_import import import_all_fgv_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_fgv_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.post("/admin/import-pdf", status_code=200)
async def import_fgv_pdf_endpoint(
    year: int = Form(...),
    phase: str = Form("1"),
    subject: Optional[str] = Form(None),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional, PDF) do FGV,
    extrai as questões e grava no banco."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    from app.services.fgv.pdf_import import import_fgv_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            gabarito_path = tmp_path / "gabarito.pdf"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_fgv_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                phase=phase,
                subject=subject or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[FgvQuestionOut])
def list_fgv_questions(
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
    q = db.query(FgvQuestion)
    if year:
        q = q.filter(FgvQuestion.year == year)
    if phase:
        q = q.filter(FgvQuestion.phase == phase)
    if area:
        q = q.filter(FgvQuestion.area.ilike(f"%{area}%"))
    if question_type:
        q = q.filter(FgvQuestion.question_type == question_type)
    if search:
        q = q.filter(FgvQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(FgvQuestion.year.desc(), FgvQuestion.phase, FgvQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(FgvQuestion.year).distinct().order_by(FgvQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(FgvQuestion.area)
        .distinct()
        .filter(FgvQuestion.area.isnot(None))
        .order_by(FgvQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=FgvQuestionOut)
def get_fgv_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(FgvQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_fgv_question(
    payload: FgvImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão FGV para o banco de questões da escola do professor."""
    fgv_q = db.get(FgvQuestion, payload.fgv_question_id)
    if not fgv_q:
        raise HTTPException(404, "Questão FGV não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    phase_label = f"Fase {fgv_q.phase}" if fgv_q.phase else ""
    statement = f"{fgv_q.statement}\n\n[FGV {fgv_q.year} {phase_label}– Q{fgv_q.number}]".strip()

    images = sorted(fgv_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else fgv_q.image_base64

    q_type = QuestionType.MULTIPLE_CHOICE
    if fgv_q.question_type == "discursive":
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

    for opt in sorted(fgv_q.options, key=lambda o: o.order):
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
