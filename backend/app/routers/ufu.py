import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db, SessionLocal
from app.models import UfuQuestion, UfuQuestionOption, User
from app.schemas import UfuQuestionSchema
from app.services.ufu.pdf_import import import_all
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ufu", tags=["UFU"])

@router.get("/questions", response_model=List[UfuQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(UfuQuestion).all()
    return questions

async def _run_import_all(task_id: str, since_year: Optional[int], until_year: Optional[int]):
    """Runs in the background with its own DB session — the request's session
    is already closed by the time this executes, so it cannot be reused here."""
    db = SessionLocal()
    try:
        await import_all(since_year=since_year, until_year=until_year, db=db, task_id=task_id)
    finally:
        db.close()


@router.post("/import")
async def start_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só edições desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só edições até esse ano"),
    current_user: User = Depends(get_current_user),
):
    """Owner-only: varre portalselecao.ufu.br/servicos/Edital/listar/vestibular,
    baixa os 4 cadernos (Tipo 1-4) + gabarito de cada edição encontrada e
    importa as questões. Roda em background (cria sua própria sessão de DB,
    igual aos demais importadores "de verdade" deste repo — ver `import_all`
    em app/services/ufu/pdf_import.py)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.services.progress import create_task, run_import_with_timeout
    task_id = create_task()
    background_tasks.add_task(run_import_with_timeout, _run_import_all, task_id, since_year, until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
