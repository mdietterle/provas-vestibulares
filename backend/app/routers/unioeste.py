from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import UnioesteQuestion, User
from app.schemas import UnioesteQuestionSchema
from app.routers.auth import get_current_user

router = APIRouter(prefix="/unioeste", tags=["UNIOESTE"])

@router.get("/questions", response_model=List[UnioesteQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UnioesteQuestion).all()
    return questions


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """Owner-only: varre o site oficial da UNIOESTE (2021 em diante) e
    importa a edição 'Padrão' de cada vestibular (caderno Tarde + caderno
    Manhã-Espanhol + gabarito oficial). Roda em background — cada ano é
    tentado de forma independente, então uma falha isolada não trava o lote.
    `since_year`/`until_year` permitem restringir o intervalo."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    from app.services.unioeste.pdf_import import import_all_unioeste_exams
    task_id = create_task()
    background_tasks.add_task(
        run_import_with_timeout, import_all_unioeste_exams, since_year=since_year, until_year=until_year, task_id=task_id
    )
    return {"ok": True, "task_id": task_id}
