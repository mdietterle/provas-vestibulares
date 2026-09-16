import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import UnaerpQuestion, UnaerpQuestionOption, User
from app.schemas import UnaerpQuestionSchema
from app.services.unaerp.pdf_import import import_all_unaerp_exams
from app.routers.auth import get_current_user

router = APIRouter(prefix="/unaerp", tags=["UNAERP"])

@router.get("/questions", response_model=List[UnaerpQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UnaerpQuestion).all()
    return questions


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só edições desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só edições até esse ano"),
    current_user: User = Depends(get_current_user),
):
    """Owner-only: varre conteudo.unaerp.br/provas-anteriores, baixa prova(s)
    + gabarito de cada edição encontrada e importa as questões. Roda em
    background (cria sua própria sessão de DB, igual aos demais
    importadores "de verdade" deste repo — ver `import_all_unaerp_exams`)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(run_import_with_timeout, import_all_unaerp_exams, since_year=since_year, until_year=until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
