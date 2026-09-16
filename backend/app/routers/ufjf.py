import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db, SessionLocal
from app.models import UfjfQuestion, UfjfQuestionOption, User
from app.schemas import UfjfQuestionSchema
from app.services.ufjf.pdf_import import import_all_ufjf_exams
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ufjf", tags=["UFJF"])

@router.get("/questions", response_model=List[UfjfQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UfjfQuestion).all()
    return questions

def _run_import_all(task_id: str, since_year: Optional[int] = None, until_year: Optional[int] = None):
    """Runs in the background with its own DB session — the request's session
    is already closed by the time this executes, so it cannot be reused here."""
    db = SessionLocal()
    try:
        import_all_ufjf_exams(since_year=since_year, until_year=until_year, db=db, task_id=task_id)
    finally:
        db.close()


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só edições desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só edições até esse ano"),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(run_import_with_timeout, _run_import_all, task_id, since_year, until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
