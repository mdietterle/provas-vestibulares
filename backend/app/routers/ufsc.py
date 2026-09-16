import uuid
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    UfscQuestion,
    UfscQuestionOption,
    User,
)
from app.schemas import QuestionOut, UfscImportRequest, UfscQuestionOut

router = APIRouter(prefix="/ufsc-questions", tags=["ufsc"])


@router.post("/admin/run-seed", status_code=200)
def run_ufsc_seed(
    background_tasks: BackgroundTasks,
_: User = Depends(require_owner)):
    """Owner-only: cria as tabelas UFSC e importa as questões dos PDFs locais."""
    from app.services.ufsc.seed import seed_ufsc
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, seed_ufsc, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro no seed: {e}")


@router.post("/admin/import-all", status_code=200)
def import_all_ufsc(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só provas desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só provas até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre vestibularunificado2025.ufsc.br/provas-anteriores/,
    encontra todos os pares prova+gabarito (cerca de 200, de 2003 a 2024) e
    importa cada um. Provas muito antigas (escaneadas, sem texto extraível) ou
    hosts fora do ar não interrompem o lote — são só reportados como pulados.
    Pode demorar bastante (muitos PDFs baixados e processados em sequência);
    use `since_year`/`until_year` para importar em partes menores — no plano
    gratuito do Render, importar todas as ~200 provas de uma vez estoura o
    limite de memória do processo (confirmado em produção)."""
    from app.services.ufsc.pdf_import import import_all_ufsc_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_ufsc_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.post("/admin/import-pdf", status_code=200)
async def import_ufsc_pdf_endpoint(
    year: int = Form(...),
    phase: str = Form("1"),
    color: Optional[str] = Form(None),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional, PDF ou HTML) da
    UFSC/IFSC/IFC, extrai as questões somatórias e grava no banco."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    from app.services.ufsc.pdf_import import import_ufsc_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            ext = ".html" if (gabarito.filename or "").lower().endswith((".html", ".htm")) else ".pdf"
            gabarito_path = tmp_path / f"gabarito{ext}"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_ufsc_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                phase=phase,
                color=color or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[UfscQuestionOut])
def list_ufsc_questions(
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
    q = db.query(UfscQuestion)
    if year:
        q = q.filter(UfscQuestion.year == year)
    if phase:
        q = q.filter(UfscQuestion.phase == phase)
    if area:
        q = q.filter(UfscQuestion.area.ilike(f"%{area}%"))
    if question_type:
        q = q.filter(UfscQuestion.question_type == question_type)
    if search:
        q = q.filter(UfscQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UfscQuestion.year.desc(), UfscQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UfscQuestion.year).distinct().order_by(UfscQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UfscQuestion.area)
        .distinct()
        .filter(UfscQuestion.area.isnot(None))
        .order_by(UfscQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UfscQuestionOut)
def get_ufsc_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UfscQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_ufsc_question(
    payload: UfscImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UFSC para o banco de questões da escola do professor."""
    ufsc_q = db.get(UfscQuestion, payload.ufsc_question_id)
    if not ufsc_q:
        raise HTTPException(404, "Questão UFSC não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    phase_label = f"Fase {ufsc_q.phase}" if ufsc_q.phase else ""
    statement = f"{ufsc_q.statement}\n\n[UFSC {ufsc_q.year} {phase_label}– Q{ufsc_q.number}]".strip()

    images = sorted(ufsc_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else ufsc_q.image_base64

    q_type = QuestionType.MULTIPLE_CHOICE
    if ufsc_q.question_type == "summation":
        q_type = QuestionType.SUMMATION
    elif ufsc_q.question_type == "discursive":
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

    for opt in sorted(ufsc_q.options, key=lambda o: o.order):
        db.add(
            QuestionOption(
                question_id=question.id,
                text=f"{opt.value}. {opt.text}",
                is_correct=opt.is_correct,
                order=opt.order,
            )
        )

    db.commit()
    db.refresh(question)
    return question
