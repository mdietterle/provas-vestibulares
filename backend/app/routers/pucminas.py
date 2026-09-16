from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db, SessionLocal
from app.models import PucminasQuestion, PucminasQuestionOption, User
from app.schemas import PucminasQuestionSchema
from app.services.pucminas.pdf_import import import_all_pucminas_exams
from app.routers.auth import get_current_user

router = APIRouter(prefix="/pucminas", tags=["PUCMINAS"])

@router.get("/questions", response_model=List[PucminasQuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(PucminasQuestion).all()
    return questions

def _run_import_all(task_id: str, since_year: Optional[int], until_year: Optional[int]):
    """Roda em background com sua própria sessão de DB (a sessão da
    requisição já foi fechada quando isto executa).

    Precisa ser uma função SÍNCRONA (não `async def`): import_all_pucminas_exams
    é bloqueante de verdade (requests + fitz, dezenas de PDFs baixados e
    parseados em sequência). BackgroundTasks do Starlette executa callables
    `async` diretamente no event loop principal, sem thread pool — como o
    Render roda só 1 worker (WEB_CONCURRENCY=1), isso travava o processo
    inteiro (nenhuma outra requisição era atendida) pela duração completa da
    importação, só liberando quando ela terminava ou o serviço era
    reiniciado. Uma função sync passada pro BackgroundTasks é automaticamente
    despachada pro thread pool do Starlette, sem esse problema."""
    db = SessionLocal()
    try:
        import_all_pucminas_exams(since_year=since_year, until_year=until_year, db=db, task_id=task_id)
    finally:
        db.close()


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
    background_tasks.add_task(run_import_with_timeout, _run_import_all, task_id, since_year, until_year, task_id=task_id)
    return {"ok": True, "task_id": task_id}
