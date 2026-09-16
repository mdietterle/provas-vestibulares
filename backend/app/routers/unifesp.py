from fastapi import BackgroundTasks, APIRouter, Depends

from app.database import SessionLocal
from app.deps import require_owner
from app.models import User
from app.services.unifesp.pdf_import import seed_unifesp
from app.services.progress import create_task, update_task_progress, complete_task, fail_task, run_import_with_timeout

router = APIRouter(prefix="/unifesp", tags=["UNIFESP"])


def _import_all_unifesp(since_year: int, until_year: int, task_id: str):
    """Runs in the background with its own DB session, independent of the request."""
    db = SessionLocal()
    years = list(range(since_year, until_year + 1))
    results = []
    try:
        for i, year in enumerate(years):
            update_task_progress(task_id, current=i, total=len(years), log=f"Importando UNIFESP {year}...")
            try:
                r = seed_unifesp(db, year)
                results.append({"year": year, **r})
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})
        complete_task(task_id, {"years": results})
    except Exception as e:
        fail_task(task_id, str(e))
    finally:
        db.close()


@router.post("/import")
def import_unifesp(
    background_tasks: BackgroundTasks,
    since_year: int = 2022,
    until_year: int = 2024,
    _: User = Depends(require_owner),
):
    """Owner-only: importa provas UNIFESP (1ª fase) de `since_year` até `until_year`
    (inclusive). Fatiado por ano pra quem chama poder esperar um ano terminar antes
    de pedir o seguinte, em vez de uma tarefa só varrendo todos os anos de uma vez."""
    task_id = create_task()
    background_tasks.add_task(
        run_import_with_timeout, _import_all_unifesp, since_year, until_year, task_id, task_id=task_id
    )
    return {"ok": True, "task_id": task_id}
