"""Instrumentação compartilhada para importadores em lote ("importar todas as
provas de um vestibular"), que rodam como BackgroundTask e reportam
progresso via `task_id` para a tela do Owner.

Esse padrão (loop sobre links, try/except por item, log de progresso,
liberação de memória a cada item) já existia duplicado em cada importador —
alguns o implementavam por completo (ENEM), outros só reportavam 1 log
raso ou nenhum, o que deixa a tela do Owner parecendo travada mesmo com a
importação rodando normalmente. Import em lote de dezenas de provas, cada
uma com PDF + imagens em base64, também acumula bastante memória na
identity map da sessão se ela nunca for liberada — confirmado em produção
como causa de OOM no plano free do Render.
"""

from __future__ import annotations

import gc
from typing import Callable, Optional

from app.services.progress import update_task_progress, complete_task, fail_task


def run_batch_import(
    items: list,
    process_item: Callable[[object], dict],
    *,
    label: Callable[[object], str],
    task_id: Optional[str] = None,
    db=None,
) -> dict:
    """Roda `process_item(item)` para cada item de `items`, reportando
    progresso granular (current/total, log por item, items_done acumulado)
    para `task_id` — mesmo padrão usado por `import_all_enem_exams`.

    `process_item` deve retornar um dict com pelo menos `total_added` (int);
    exceções são capturadas por item (não interrompem o lote) e reportadas
    como `{"skipped": True, "reason": ...}` no resultado daquele item.

    Se `db` for passado, a sessão é esvaziada (`expunge_all`) e o coletor de
    lixo é forçado após cada item — sem isso, um lote de dezenas de provas
    com imagens em base64 mantém tudo vivo na identity map até o fim, o que
    já causou OOM em produção num plano com pouca memória."""
    results = []
    total_added = 0
    total = max(len(items), 1)

    try:
        if task_id:
            update_task_progress(task_id, current=0, total=total, log=f"{len(items)} provas encontradas.")

        for idx, item in enumerate(items):
            item_label = label(item)
            try:
                r = process_item(item)
                results.append(r)
                total_added += r.get("total_added") or 0
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total,
                        log=f"✅ {item_label}: {r.get('total_added', 0)} adicionadas.",
                        items_done=total_added,
                    )
            except Exception as e:
                if db is not None:
                    db.rollback()
                results.append({"exam_name": item_label, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total,
                        log=f"❌ {item_label}: {e}",
                        items_done=total_added,
                    )
            finally:
                if db is not None:
                    db.expunge_all()
                    gc.collect()

        res = {"total_links_found": len(items), "total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, res)
        return res
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
