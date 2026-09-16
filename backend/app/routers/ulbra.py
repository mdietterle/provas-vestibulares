from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import UlbraQuestion, User
from app.routers.auth import get_current_user
from app.schemas import UlbraQuestionSchema
from app.services.ulbra.pdf_import import import_all

router = APIRouter(prefix="/ulbra", tags=["ULBRA"])


@router.get("/questions", response_model=List[UlbraQuestionSchema])
def list_questions(
    year: Optional[int] = Query(None),
    edition: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(UlbraQuestion)
    if year:
        q = q.filter(UlbraQuestion.year == year)
    if edition:
        q = q.filter(UlbraQuestion.edition == edition)
    if search:
        q = q.filter(UlbraQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UlbraQuestion.year.desc(), UlbraQuestion.edition, UlbraQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/questions/years", response_model=List[int])
def list_years(db: Session = Depends(get_db)):
    rows = db.query(UlbraQuestion.year).distinct().order_by(UlbraQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/questions/{question_id}", response_model=UlbraQuestionSchema)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(UlbraQuestion, question_id)
    if not question:
        raise HTTPException(404, "Questão não encontrada")
    return question


async def _run_import_all(task_id: str, since_year: Optional[int] = None, until_year: Optional[int] = None):
    """Roda em background com sua própria sessão de DB — a sessão do
    request já está fechada quando isso executa."""
    db = SessionLocal()
    try:
        await import_all(db=db, task_id=task_id, since_year=since_year, until_year=until_year)
    finally:
        db.close()


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """Owner-only: importa da ULBRA/Canoas (2016-2019 — ver `_EDITIONS` em
    app/services/ulbra/pdf_import.py; edições mais antigas não estão
    listadas na página, e 2015 tem link morto) a prova completa + gabarito
    oficial de cada edição. Roda em background — cada edição é tentada de
    forma independente. `since_year`/`until_year` permitem restringir o
    intervalo."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(run_import_with_timeout, _run_import_all, task_id, since_year, until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
