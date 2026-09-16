import asyncio
import gc
import inspect
import threading
import uuid
import time
from typing import Dict, Any, List

# In-memory store for task progress.
# Format: 
# {
#   "task_id": {
#       "status": "running" | "completed" | "error",
#       "current": int,
#       "total": int,
#       "logs": [{"time": float, "message": str}, ...],
#       "result": dict | None,
#       "error": str | None
#   }
# }
TASKS: Dict[str, Any] = {}

def create_task(total: int = 1) -> str:
    task_id = str(uuid.uuid4())
    TASKS[task_id] = {
        "status": "running",
        "current": 0,
        "total": total,
        "items_done": None,
        "logs": [],
        "result": None,
        "error": None,
    }
    return task_id

def update_task_progress(task_id: str, current: int = None, total: int = None, log: str = None, items_done: int = None):
    if task_id not in TASKS:
        return

    if current is not None:
        TASKS[task_id]["current"] = current
    if total is not None:
        TASKS[task_id]["total"] = total
    if items_done is not None:
        TASKS[task_id]["items_done"] = items_done

    if log:
        TASKS[task_id]["logs"].append({
            "time": time.time(),
            "message": log
        })

def complete_task(task_id: str, result: dict):
    if task_id not in TASKS:
        return
    TASKS[task_id]["status"] = "completed"
    TASKS[task_id]["result"] = result
    TASKS[task_id]["current"] = TASKS[task_id]["total"]

def fail_task(task_id: str, error: str):
    if task_id not in TASKS:
        return
    TASKS[task_id]["status"] = "error"
    TASKS[task_id]["error"] = error
    TASKS[task_id]["logs"].append({
        "time": time.time(),
        "message": f"ERRO: {error}"
    })

def get_task_status(task_id: str) -> dict:
    return TASKS.get(task_id)


DEFAULT_IMPORT_TIMEOUT_SECONDS = 8 * 60  # 8 minutos — suficiente pra provas difíceis (muitos anos/PDFs grandes)


def _accepts_task_id(func) -> bool:
    """True se `func` recebe `task_id` (explicitamente ou via **kwargs)."""
    try:
        params = inspect.signature(func).parameters
    except (TypeError, ValueError):
        return False
    if any(p.kind is inspect.Parameter.VAR_KEYWORD for p in params.values()):
        return True
    return "task_id" in params


def _task_id_in_args(func, args: tuple) -> bool:
    """True se algum argumento POSICIONAL já ocupa o parâmetro `task_id` —
    é o caso dos routers que chamam `_run_import_all(task_id, since, until)`."""
    try:
        names = list(inspect.signature(func).parameters)
    except (TypeError, ValueError):
        return False
    return "task_id" in names[: len(args)]


def run_import_with_timeout(func, *args, task_id: str = None, timeout_seconds: int = DEFAULT_IMPORT_TIMEOUT_SECONDS, **kwargs):
    """Roda um importador (`func`, sync ou async) numa thread separada e dá
    a tarefa por encerrada (`fail_task`) se ela não terminar dentro de
    `timeout_seconds` — evita que uma importação travada (site fora do ar,
    download pendurado, loop preso num PDF ruim) deixe o polling do
    frontend esperando pra sempre um status que nunca chega.

    Best-effort: não existe como matar de verdade uma thread Python presa
    em I/O bloqueante, então se `func` estiver mesmo travada (não só lenta)
    a thread interna continua rodando em segundo plano depois do timeout —
    mas o `task_id` já é marcado como erro, então o usuário para de ficar
    esperando um progresso que nunca avança."""
    # `task_id` é parâmetro nomeado DESTE wrapper, então ele não chega em
    # `func` junto com o resto de **kwargs — e sem receber o task_id o
    # importador não tem como chamar `update_task_progress`/`complete_task`,
    # deixando a tarefa presa em "running" pra sempre (o polling do frontend
    # nunca terminava, mesmo com a importação já concluída). Repassa
    # explicitamente, mas só pra quem aceita o argumento: os routers que já
    # passam o task_id posicionalmente (via um `_run_import_all` local)
    # receberiam duas vezes e estourariam TypeError.
    call_kwargs = dict(kwargs)
    if task_id and _accepts_task_id(func) and "task_id" not in call_kwargs and not _task_id_in_args(func, args):
        call_kwargs["task_id"] = task_id

    def _target():
        try:
            if inspect.iscoroutinefunction(func):
                asyncio.run(func(*args, **call_kwargs))
            else:
                func(*args, **call_kwargs)
        except Exception as e:
            if task_id:
                fail_task(task_id, str(e))
        finally:
            # Cada importação abre PDFs inteiros (fitz) e monta listas grandes
            # de questões na memória; o processo do backend é de vida longa
            # (plano free, 512 MB) e uma importação encadeada logo depois da
            # outra não dá tempo do GC do ciclo rodar sozinho — foi isso que
            # já derrubou o serviço por OOM (ver nota em import_all_universities.py
            # sobre o importador da UFSC). Forçar aqui, assim que a importação
            # termina (sucesso ou erro), libera essa memória antes da próxima.
            gc.collect()

    thread = threading.Thread(target=_target, daemon=True)
    thread.start()
    thread.join(timeout_seconds)

    if thread.is_alive() and task_id:
        task = TASKS.get(task_id)
        if task and task["status"] == "running":
            fail_task(
                task_id,
                f"Importação encerrada automaticamente: excedeu o limite de {timeout_seconds // 60} minutos "
                "(site lento/travado ou download pendurado). Tente novamente com um intervalo de anos menor.",
            )
