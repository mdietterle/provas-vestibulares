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
    User,
)
from app.schemas import QuestionOut, UnicampImportRequest
from app.vestibular.models import VestibularQuestion
from app.vestibular.schemas import VestibularQuestionOut

router = APIRouter(prefix="/unicamp-questions", tags=["unicamp"])


@router.post("/admin/import-all", status_code=200)
def import_all_unicamp(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano"),
    force_reimport: bool = Query(False, description="Se True, deleta questões existentes antes de reimportar"),
    exam_name: Optional[str] = Query(None, description="Se informado, importa só essa versão da prova"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre a página de provas anteriores do UNICAMP e importa provas em lote."""
    from app.services.unicamp.pdf_import import import_all_unicamp_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_unicamp_exams, since_year=since_year, until_year=until_year, force_reimport=force_reimport, exam_name=exam_name, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.post("/admin/import-pdf", status_code=200)
async def import_unicamp_pdf_endpoint(
    year: int = Form(...),
    phase: str = Form("1"),
    subject: Optional[str] = Form(None),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional, PDF) do UNICAMP,
    extrai as questões e grava no banco."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    from app.services.unicamp.pdf_import import import_unicamp_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            gabarito_path = tmp_path / "gabarito.pdf"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_unicamp_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                phase=phase,
                subject=subject or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[VestibularQuestionOut])
def list_unicamp_questions(
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
    from sqlalchemy import cast, String
    q = db.query(VestibularQuestion).filter(VestibularQuestion.exam_type == "unicamp")
    if year:
        q = q.filter(VestibularQuestion.year == year)
    if phase:
        q = q.filter(cast(VestibularQuestion.metadata["phase"], String) == phase)
    if area:
        q = q.filter(cast(VestibularQuestion.metadata["area"], String).ilike(f"%{area}%"))
    if question_type:
        q = q.filter(cast(VestibularQuestion.metadata["question_type"], String) == question_type)
    if search:
        q = q.filter(VestibularQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(VestibularQuestion.year.desc(), VestibularQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(VestibularQuestion.year)
        .filter(VestibularQuestion.exam_type == "unicamp")
        .distinct()
        .order_by(VestibularQuestion.year.desc())
        .all()
    )
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import cast, String
    area_col = cast(VestibularQuestion.metadata["area"], String)
    rows = (
        db.query(area_col)
        .filter(VestibularQuestion.exam_type == "unicamp")
        .distinct()
        .filter(area_col.isnot(None))
        .order_by(area_col)
        .all()
    )
    return [r[0] for r in rows if r[0]]


@router.get("/{question_id}", response_model=VestibularQuestionOut)
def get_unicamp_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(VestibularQuestion).filter(
        VestibularQuestion.id == question_id,
        VestibularQuestion.exam_type == "unicamp",
    ).first()
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_unicamp_question(
    payload: UnicampImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UNICAMP para o banco de questões da escola do professor."""
    unicamp_q = db.get(VestibularQuestion, payload.vestibular_question_id)
    if not unicamp_q:
        raise HTTPException(404, "Questão UNICAMP não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    meta = unicamp_q.metadata or {}
    phase_val = meta.get("phase")
    phase_label = f"Fase {phase_val}" if phase_val else ""
    statement = f"{unicamp_q.statement}\n\n[UNICAMP {unicamp_q.year} {phase_label}– Q{unicamp_q.number}]".strip()

    images = sorted(unicamp_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else unicamp_q.image_base64

    q_type = QuestionType.MULTIPLE_CHOICE
    if meta.get("question_type") == "discursive":
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

    for opt in sorted(unicamp_q.options, key=lambda o: o.order):
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

@router.get("/admin/exam-versions", response_model=List[str])
def list_exam_versions(
    year: Optional[int] = Query(None, description="Filtra por ano"),
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Owner-only: lista exam_name distintos no banco, opcionalmente por ano."""
    from app.vestibular.models import VestibularQuestion
    q = db.query(VestibularQuestion.exam_name).filter(
        VestibularQuestion.exam_type == "unicamp",
        VestibularQuestion.exam_name.isnot(None),
    )
    if year is not None:
        q = q.filter(VestibularQuestion.year == year)
    rows = q.distinct().order_by(VestibularQuestion.exam_name).all()
    return [r[0] for r in rows if r[0]]
