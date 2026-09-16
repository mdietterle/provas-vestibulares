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
    EspmQuestion,
    User,
)
from app.schemas import QuestionOut, EspmImportRequest, EspmQuestionOut

router = APIRouter(prefix="/espm-questions", tags=["espm"])


@router.post("/admin/import-all", status_code=200)
def import_all_espm(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre a página de provas anteriores do ESPM e importa provas em lote."""
    from app.services.espm.pdf_import import import_all_espm_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_espm_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.post("/admin/import-pdf", status_code=200)
async def import_espm_pdf_endpoint(
    year: int = Form(...),
    phase: str = Form("1"),
    subject: Optional[str] = Form(None),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional, PDF) do ESPM,
    extrai as questões e grava no banco."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    from app.services.espm.pdf_import import import_espm_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            gabarito_path = tmp_path / "gabarito.pdf"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_espm_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                phase=phase,
                subject=subject or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[EspmQuestionOut])
def list_espm_questions(
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
    q = db.query(EspmQuestion)
    if year:
        q = q.filter(EspmQuestion.year == year)
    if phase:
        q = q.filter(EspmQuestion.phase == phase)
    if area:
        q = q.filter(EspmQuestion.area.ilike(f"%{area}%"))
    if question_type:
        q = q.filter(EspmQuestion.question_type == question_type)
    if search:
        q = q.filter(EspmQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(EspmQuestion.year.desc(), EspmQuestion.phase, EspmQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(EspmQuestion.year).distinct().order_by(EspmQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(EspmQuestion.area)
        .distinct()
        .filter(EspmQuestion.area.isnot(None))
        .order_by(EspmQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=EspmQuestionOut)
def get_espm_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(EspmQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_espm_question(
    payload: EspmImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão ESPM para o banco de questões da escola do professor."""
    espm_q = db.get(EspmQuestion, payload.espm_question_id)
    if not espm_q:
        raise HTTPException(404, "Questão ESPM não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    phase_label = f"Fase {espm_q.phase}" if espm_q.phase else ""
    statement = f"{espm_q.statement}\n\n[ESPM {espm_q.year} {phase_label}– Q{espm_q.number}]".strip()

    images = sorted(espm_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else espm_q.image_base64

    q_type = QuestionType.MULTIPLE_CHOICE
    if espm_q.question_type == "discursive":
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

    for opt in sorted(espm_q.options, key=lambda o: o.order):
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
