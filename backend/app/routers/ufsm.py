import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db, SessionLocal
from app.models import UfsmQuestion, UfsmQuestionOption, User
from app.schemas import UfsmQuestionSchema
from app.services.ufsm.pdf_import import import_all
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ufsm", tags=["UFSM"])

@router.get("/questions", response_model=List[UfsmQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UfsmQuestion).all()
    return questions

async def _run_import_all(task_id: str, since_year: Optional[int] = None, until_year: Optional[int] = None):
    """Runs in the background with its own DB session — the request's session
    is already closed by the time this executes, so it cannot be reused here."""
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
    """Owner-only: importa da COPERVES-UFSM (2011 — ver `_EDITIONS` em
    app/services/ufsm/pdf_import.py; outras edições não têm gabarito em
    texto publicado/legível, ou não existiram) a prova + gabarito de cada caderno
    (PS1/PS2/PS3). Roda em background — cada ano é tentado de forma
    independente. `since_year`/`until_year` permitem restringir o
    intervalo."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(run_import_with_timeout, _run_import_all, task_id, since_year, until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
