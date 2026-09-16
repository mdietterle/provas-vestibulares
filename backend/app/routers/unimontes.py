from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import UnimontesQuestion, UnimontesQuestionOption, User
from app.schemas import UnimontesQuestionSchema
from app.services.unimontes.pdf_import import import_all_unimontes_exams
from app.routers.auth import get_current_user

router = APIRouter(prefix="/unimontes", tags=["UNIMONTES"])

@router.get("/questions", response_model=List[UnimontesQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UnimontesQuestion).all()
    return questions


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só provas desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só provas até esse ano"),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(
        run_import_with_timeout,
        import_all_unimontes_exams,
        since_year=since_year,
        until_year=until_year,
        task_id=task_id,
    )
    return {"ok": True, "task_id": task_id}
