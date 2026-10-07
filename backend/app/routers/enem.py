import uuid
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    EnemQuestion,
    EnemQuestionOption,
    Question,
    QuestionOption,
    QuestionType,
    Subject,
    User,
    VestibularQuestion,
)

from app.schemas import EnemImportRequest, EnemQuestionOut, QuestionOut

router = APIRouter(prefix="/enem-questions", tags=["enem"])


@router.post("/admin/run-seed", status_code=200)
def run_enem_seed(
    background_tasks: BackgroundTasks,
_: User = Depends(require_owner)):
    """Owner-only: cria as tabelas ENEM e importa questões dos JSONs locais."""
    from app.services.enem.seed import seed_enem
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, seed_enem, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro no seed: {e}")


@router.post("/admin/import-all", status_code=200)
def import_all_enem(
    background_tasks: BackgroundTasks,
    since_year: int = Query(2015, description="Importa a partir desse ano (padrão: 2015 — limite de estabilidade do padrão de nome de arquivo reconhecido)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (padrão: 2025)"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre gov.br/inep/.../enem/provas-e-gabaritos/{ano} de
    `until_year` até `since_year` e importa a prova regular impressa de cada
    dia de cada ano (uma cor por dia — todas têm as mesmas questões
    embaralhadas). Anos anteriores a ~2015 usam nomes de arquivo que este
    scraper não reconhece e são pulados, reportados em vez de interromper o
    lote. Classificação de matéria/dificuldade via Groq, com rate limit —
    pode demorar bastante para vários anos de uma vez."""
    from app.services.enem.pdf_import import import_all_enem_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, import_all_enem_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.post("/admin/import-pdf", status_code=200)
async def import_enem_pdf_endpoint(
    year: int = Form(...),
    day: int = Form(1),
    color: Optional[str] = Form(None),
    module: Optional[str] = Form(None),
    prova: Optional[UploadFile] = File(None),
    gabarito: Optional[UploadFile] = File(None),
    prova_url: Optional[str] = Form(None),
    gabarito_url: Optional[str] = Form(None),
    mec_page_url: Optional[str] = Form(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDFs de prova (+ gabarito opcional) do ENEM ou busca
    automaticamente provas públicas no site oficial do MEC."""
    if prova is not None and prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")
    if not prova and not prova_url and not mec_page_url:
        raise HTTPException(400, "Envie um PDF da prova, uma URL pública da prova ou a página do MEC.")

    from app.services.enem.pdf_import import import_enem_pdf

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = None
        if prova is not None:
            prova_path = tmp_path / "prova.pdf"
            prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            gabarito_path = tmp_path / "gabarito.pdf"
            gabarito_path.write_bytes(await gabarito.read())

        try:
            result = import_enem_pdf(
                prova_path=prova_path,
                gabarito_path=gabarito_path,
                year=year,
                day=day,
                color=color or None,
                module_label=module or None,
                prova_url=prova_url or None,
                gabarito_url=gabarito_url or None,
                mec_page_url=mec_page_url or None,
            )
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF: {e}")

    return {"ok": True, **result}


@router.get("", response_model=List[EnemQuestionOut])
def list_enem_questions(
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    day: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(EnemQuestion)
    if year:
        q = q.filter(EnemQuestion.year == year)
    if area:
        q = q.filter(EnemQuestion.area.ilike(f"%{area}%"))
    if color:
        q = q.filter(EnemQuestion.color.ilike(f"%{color}%"))
    if day:
        q = q.filter(EnemQuestion.module.ilike(f"%{day}%"))
    if search:
        q = q.filter(EnemQuestion.statement.ilike(f"%{search}%"))
    return q.order_by(EnemQuestion.year.desc(), EnemQuestion.number).offset(skip).limit(limit).all()


@router.get("/colors", response_model=List[str])
def list_colors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(EnemQuestion.color).distinct().filter(EnemQuestion.color.isnot(None)).order_by(EnemQuestion.color).all()
    return [r[0] for r in rows]


@router.get("/days", response_model=List[str])
def list_days(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(EnemQuestion.module).distinct().filter(EnemQuestion.module.isnot(None)).order_by(EnemQuestion.module).all()
    return [r[0] for r in rows]


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(EnemQuestion.year).distinct().order_by(EnemQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(EnemQuestion.area)
        .distinct()
        .filter(EnemQuestion.area.isnot(None))
        .order_by(EnemQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=EnemQuestionOut)
def get_enem_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(EnemQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_enem_question(
    payload: EnemImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copy an ENEM question into the professor's institution question bank."""
    vq = db.get(VestibularQuestion, payload.vestibular_question_id)
    if not vq or vq.exam_type != "enem":
        raise HTTPException(404, "Questão ENEM não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    # Build statement with ENEM source attribution
    statement = f"{vq.statement}\n\n[ENEM {vq.year} – Q{vq.number}]"

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=vq.image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(vq.options, key=lambda o: o.order):
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
