from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import UtfprQuestion, User
from app.schemas import UtfprQuestionSchema
from app.routers.auth import get_current_user

router = APIRouter(prefix="/utfpr", tags=["UTFPR"])

@router.get("/questions", response_model=List[UtfprQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UtfprQuestion).all()
    return questions

@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    force_reimport: bool = Query(False, description="Se true, reimporta questões já existentes"),
    current_user: User = Depends(get_current_user),
):
    """Owner-only: varre .../vestibular/edicoes/ da UTFPR (2023/2 em diante)
    e importa cada edição (caderno + gabarito definitivo). Roda em
    background — cada edição é tentada de forma independente, então uma
    falha isolada não trava o lote. `since_year`/`until_year` permitem
    restringir o intervalo."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    from app.services.utfpr.pdf_import import import_all_utfpr_exams
    task_id = create_task()
    background_tasks.add_task(
        run_import_with_timeout, import_all_utfpr_exams, since_year=since_year, until_year=until_year, force_reimport=force_reimport, task_id=task_id
    )
    return {"ok": True, "task_id": task_id}


@router.get("/admin/exam-versions", response_model=List[str])
def list_exam_versions(
    year: Optional[int] = Query(None, description="Filtra por ano"),
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Owner-only: lista exam_name distintos da UTFPR no banco, opcionalmente por ano."""
    from app.models import UtfprQuestion
    q = db.query(UtfprQuestion.exam_name).filter(
        UtfprQuestion.exam_name.isnot(None),
    )
    if year is not None:
        q = q.filter(UtfprQuestion.year == year)
    rows = q.distinct().order_by(UtfprQuestion.exam_name).all()
    return [r[0] for r in rows if r[0]]
