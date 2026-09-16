from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from app.deps import require_owner
from app.models import User
from app.services.ufgd.pdf_import import import_all_ufgd_exams

router = APIRouter(prefix="/ufgd", tags=["ufgd"])

@router.post("/import")
def run_ufgd_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    _: User = Depends(require_owner),
):
    """
    Owner-only: roda o importador automatizado da UFGD buscando provas e gabaritos
    diretamente da página oficial.
    """
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        # No `db` passed in: the service opens its own session, since this runs
        # in the background after the request (and its session) has ended.
        background_tasks.add_task(run_import_with_timeout, import_all_ufgd_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
