from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.deps import get_current_user, require_owner
from app.models import ConcursoFepeseQuestion, User
from app.schemas import ConcursoFepeseCargoIn, ConcursoFepeseImportRequest, ConcursoFepeseQuestionOut
from app.services.concurso_fepese.pdf_import import import_fepese_concurso
from app.services.progress import create_task, run_import_with_timeout

router = APIRouter(prefix="/concurso-fepese", tags=["concurso-fepese"])


def _run_import(payload_cargos: list[dict], concurso_slug: str, orgao: str, edital: str, year: int, exam_type: Optional[str], task_id: str):
    db = SessionLocal()
    try:
        result = import_fepese_concurso(
            db, concurso_slug=concurso_slug, orgao=orgao, edital=edital, year=year,
            cargos=payload_cargos, exam_type=exam_type,
        )
        from app.services.progress import complete_task
        complete_task(task_id, result)
    except Exception as e:
        from app.services.progress import fail_task
        fail_task(task_id, str(e))
    finally:
        db.close()


@router.post("/admin/import", status_code=200)
def import_concurso(
    background_tasks: BackgroundTasks,
    payload: ConcursoFepeseImportRequest,
    _: User = Depends(require_owner),
):
    """Owner-only: importa um ou mais cargos de um concurso FEPESE já
    publicado (prova + gabarito provisório embutido no caderno). Não há
    descoberta automática de concursos/cargos — `cargos` precisa ser
    levantado manualmente na página `?go=provas&edital=N` do concurso."""
    task_id = create_task()
    cargos = [c.model_dump() for c in payload.cargos]
    background_tasks.add_task(
        run_import_with_timeout, _run_import, cargos, payload.concurso_slug, payload.orgao,
        payload.edital, payload.year, payload.exam_type, task_id, task_id=task_id,
    )
    return {"ok": True, "task_id": task_id}


@router.get("", response_model=List[ConcursoFepeseQuestionOut])
def list_concurso_fepese_questions(
    concurso_slug: Optional[str] = Query(None),
    cargo_code: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(ConcursoFepeseQuestion)
    if concurso_slug:
        q = q.filter(ConcursoFepeseQuestion.concurso_slug == concurso_slug)
    if cargo_code:
        q = q.filter(ConcursoFepeseQuestion.cargo_code == cargo_code)
    if subject:
        q = q.filter(ConcursoFepeseQuestion.subject.ilike(f"%{subject}%"))
    if search:
        q = q.filter(ConcursoFepeseQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(ConcursoFepeseQuestion.concurso_slug, ConcursoFepeseQuestion.cargo_code, ConcursoFepeseQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/concursos", response_model=List[str])
def list_concursos(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(ConcursoFepeseQuestion.concurso_slug).distinct().order_by(ConcursoFepeseQuestion.concurso_slug).all()
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=ConcursoFepeseQuestionOut)
def get_concurso_fepese_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(ConcursoFepeseQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q
