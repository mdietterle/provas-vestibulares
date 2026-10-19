from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from app.deps import require_owner
from app.models import User
from app.services.uerj.pdf_import import import_all_uerj_exams

router = APIRouter(prefix="/uerj", tags=["uerj"])

@router.post("/import")
def run_uerj_import(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    _: User = Depends(require_owner),
):
    """
    Owner-only: roda o importador automatizado da UERJ buscando provas e gabaritos
    diretamente da página oficial.
    """
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        # No `db` passed in: the service opens its own session, since this runs
        # in the background after the request (and its session) has ended.
        background_tasks.add_task(run_import_with_timeout, import_all_uerj_exams, since_year=since_year, until_year=until_year, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/exam-versions", response_model=List[str])
def list_exam_versions(
    year: Optional[int] = Query(None, description="Filtra por ano"),
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Owner-only: lista exam_name distintos da UERJ no banco, opcionalmente por ano."""
    from app.vestibular.models import VestibularQuestion
    q = db.query(VestibularQuestion.exam_name).filter(
        VestibularQuestion.exam_type == "uerj",
        VestibularQuestion.exam_name.isnot(None),
    )
    if year is not None:
        q = q.filter(VestibularQuestion.year == year)
    rows = q.distinct().order_by(VestibularQuestion.exam_name).all()
    return [r[0] for r in rows if r[0]]
