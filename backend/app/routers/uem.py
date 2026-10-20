from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from app.database import get_db

from app.deps import require_owner
from app.models import User
from app.services.uem.pdf_import import import_all_uem_exams

router = APIRouter(prefix="/uem", tags=["uem"])

@router.post("/import")
def run_uem_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    _: User = Depends(require_owner),
):
    """
    Owner-only: roda o importador automatizado da UEM buscando provas e gabaritos
    diretamente da página oficial.
    """
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        # No `db` passed in: the service opens its own session, since this runs
        # in the background after the request (and its session) has ended.
        background_tasks.add_task(run_import_with_timeout, import_all_uem_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/exam-versions", response_model=List[str])
def list_exam_versions(
    year: Optional[int] = Query(None, description="Filtra por ano"),
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Owner-only: lista exam_name distintos da UEM no banco, opcionalmente por ano."""
    from app.models import UemQuestion
    q = db.query(UemQuestion.exam_name).filter(
        UemQuestion.exam_name.isnot(None),
    )
    if year is not None:
        q = q.filter(UemQuestion.year == year)
    rows = q.distinct().order_by(UemQuestion.exam_name).all()
    return [r[0] for r in rows if r[0]]
