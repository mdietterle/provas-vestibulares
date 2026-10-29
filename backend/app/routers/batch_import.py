"""Endpoint de importação em lote: importa múltiplos vestibulares de um
mesmo ano em sequência, reportando progresso granular por universidade.

Erros individuais não interrompem o lote — são logados e a próxima
universidade é processada. O frontend polla /owner/tasks/{task_id} para
exibir logs em tempo real."""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from app.database import SessionLocal
from app.deps import require_owner
from app.models import User
from app.services.progress import create_task, update_task_progress, complete_task, fail_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/batch-import", tags=["batch-import"])


# Mapa completo de vestibulares → função de importação.
# Cada entrada usa runSeed ou runImportAll via HTTP interno (mesma lógica
# dos endpoints individuais), mas aqui chamamos diretamente o serviço Python
# para evitar overhead HTTP e permitir controle sequencial + try/except por item.
_BATCH_VESTIBULARES = [
    "enem", "acafe", "ufpr", "ufsc", "ita", "uerj", "ufgd", "uem", "ufms",
    "fuvest", "pucrio", "udesc", "unesp", "cebraspe", "unifesp", "espm",
    "fgv", "pucpr", "pucrs", "ufpel", "ufrgs", "unicamp", "ufg", "ufjf",
    "ufu", "ufpa", "utfpr", "unioeste", "uel", "pucminas", "ufrn", "ufsm",
    "ulbra", "ufam", "puccampinas", "unimontes", "unicentro", "unaerp",
]


def _get_importer_func(vestibular: str):
    """Retorna função de importação para o vestibular dado.
    Padrão real nos serviços: `import_all_{vestibular}_exams` em
    `app.services.{vestibular}.pdf_import`. Alguns módulos também expõem
    `import_all` como alias genérico."""
    import importlib

    # Padrão principal: import_all_{vest}_exams no service module
    try:
        mod = importlib.import_module(f"app.services.{vestibular}.pdf_import")
        # Tenta nome específico primeiro
        func = getattr(mod, f"import_all_{vestibular}_exams", None)
        if func:
            return func
        # Fallback: alias genérico import_all
        func = getattr(mod, "import_all", None)
        if func:
            return func
    except (ImportError, AttributeError):
        pass

    return None


class BatchImportRequest(BaseModel):
    year: int
    vestibulares: List[str]
    force_reimport: bool = False


@router.post("", status_code=200)
async def start_batch_import(
    payload: BatchImportRequest,
    background_tasks: BackgroundTasks,
    _: User = Depends(require_owner),
):
    """Inicia importação sequencial de múltiplos vestibulares para um ano.
    Retorna task_id imediatamente; progresso é acompanhado via polling."""
    invalid = [v for v in payload.vestibulares if v not in _BATCH_VESTIBULARES]
    if invalid:
        from fastapi import HTTPException
        raise HTTPException(400, f"Vestibulares inválidos: {', '.join(invalid)}")

    if not payload.vestibulares:
        from fastapi import HTTPException
        raise HTTPException(400, "Selecione pelo menos um vestibular.")

    task_id = create_task(total=len(payload.vestibulares))
    background_tasks.add_task(
        _run_batch_import,
        task_id=task_id,
        year=payload.year,
        vestibulares=payload.vestibulares,
        force_reimport=payload.force_reimport,
    )

    return {"task_id": task_id}


def _run_batch_import(
    task_id: str,
    year: int,
    vestibulares: List[str],
    force_reimport: bool,
):
    """Executa importações em sequência dentro de uma thread background.
    Cada vestibular é processado independentemente; erros são capturados
    e logados sem interromper o lote."""
    total_added = 0
    errors = []

    try:
        update_task_progress(
            task_id, current=0, total=len(vestibulares),
            log=f"Iniciando importação em lote: {len(vestibulares)} vestibulares, ano {year}.",
        )

        for idx, vest in enumerate(vestibulares):
            label = vest.upper()
            update_task_progress(
                task_id, current=idx, total=len(vestibulares),
                log=f"⏳ Importando {label} ({idx + 1}/{len(vestibulares)})...",
            )

            func = _get_importer_func(vest)
            if func is None:
                msg = f"⚠️ {label}: importador não encontrado, pulando."
                errors.append({"vestibular": vest, "error": "importador não encontrado"})
                update_task_progress(
                    task_id, current=idx + 1, total=len(vestibulares),
                    log=msg, items_done=total_added,
                )
                continue

            db = SessionLocal()
            try:
                import inspect
                sig = inspect.signature(func)
                params = sig.parameters

                kwargs = {}
                # Mapeia parâmetros aceitos pela função do importador
                if "since_year" in params:
                    kwargs["since_year"] = year
                if "until_year" in params:
                    kwargs["until_year"] = year
                if "year" in params and "since_year" not in params:
                    kwargs["year"] = year
                if "force_reimport" in params:
                    kwargs["force_reimport"] = force_reimport
                if "db" in params:
                    kwargs["db"] = db
                if "task_id" in params or any(
                    p.kind == inspect.Parameter.VAR_KEYWORD for p in params.values()
                ):
                    kwargs["task_id"] = None  # Não repassa task_id do lote

                result = func(**kwargs)

                # Extrai total_added do resultado (pode ser dict ou objeto)
                added = 0
                if isinstance(result, dict):
                    added = result.get("total_added", 0)
                elif hasattr(result, "total_added"):
                    added = result.total_added

                total_added += added
                update_task_progress(
                    task_id, current=idx + 1, total=len(vestibulares),
                    log=f"✅ {label}: {added} questões importadas.",
                    items_done=total_added,
                )

            except Exception as e:
                error_msg = str(e)
                errors.append({"vestibular": vest, "error": error_msg})
                logger.error("Batch import error for %s/%d: %s", vest, year, e, exc_info=True)
                update_task_progress(
                    task_id, current=idx + 1, total=len(vestibulares),
                    log=f"❌ {label}: {error_msg}",
                    items_done=total_added,
                )
            finally:
                db.close()

        res = {
            "total_vestibulares": len(vestibulares),
            "total_added": total_added,
            "errors": errors,
            "success_count": len(vestibulares) - len(errors),
        }
        update_task_progress(
            task_id, current=len(vestibulares), total=len(vestibulares),
            log=f"🏁 Lote concluído: {res['success_count']}/{len(vestibulares)} OK, {total_added} questões no total.",
            items_done=total_added,
        )
        complete_task(task_id, res)

    except Exception as e:
        logger.error("Batch import fatal error: %s", e, exc_info=True)
        fail_task(task_id, str(e))