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
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import VestibularQuestion, VestibularQuestionOption, VestibularQuestionImage
from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.r2_storage import upload_image


def save_vestibular_question(
    db: Session,
    *,
    exam_type: str,
    exam_name: Optional[str],
    year: int,
    number: int,
    statement: str,
    options: List[Dict[str, Any]],
    images: Optional[List[Dict[str, Any]]] = None,
    html_statement: Optional[str] = None,
    image_base64: Optional[str] = None,
    answer: Optional[str] = None,
    is_annulled: bool = False,
    correct_option: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> tuple[Optional[VestibularQuestion], bool]:
    """Unified output adapter for all vestibular importers.

    Writes to `vestibular_questions` + options/images tables. Returns
    (question, created). If question already exists (same exam_type +
    exam_name + number), returns (existing, False) without modifying data.

    Images are uploaded to R2 automatically; only URLs are stored in DB.
    Pass `image_base64` for the main question image or `images` list for
    additional figures — both accept raw bytes or base64 strings.

    Importers should call this instead of creating legacy per-exam models.
    Exam-specific fields (color, phase, day, module, area, subject, etc.)
    go in `metadata` JSONB dict.
    """
    existing = (
        db.query(VestibularQuestion)
        .filter_by(exam_type=exam_type, exam_name=exam_name, number=number)
        .first()
    )
    if existing:
        return existing, False

    # Upload main question image to R2 if provided
    image_url = None
    if image_base64:
        try:
            image_url = upload_image(
                image_base64,
                exam_type=exam_type,
                year=year,
                number=number,
            )
        except Exception:
            image_url = None  # Graceful degradation: question saved without image

    vq = VestibularQuestion(
        exam_type=exam_type,
        exam_name=exam_name,
        year=year,
        number=number,
        statement=statement,
        html_statement=html_statement,
        image_url=image_url,
        answer=answer,
        is_annulled=is_annulled,
        correct_option=correct_option,
        metadata=metadata or {},
    )
    db.add(vq)
    db.flush()

    for opt in options:
        db.add(VestibularQuestionOption(question_id=vq.id, **opt))

    # Upload additional images to R2 and store URLs
    for idx, img in enumerate(images or []):
        img_data = img.get("image_base64") or img.get("data")
        if img_data:
            try:
                url = upload_image(
                    img_data,
                    exam_type=exam_type,
                    year=year,
                    number=number,
                    suffix=f"_fig{idx}",
                )
                db.add(VestibularQuestionImage(
                    question_id=vq.id,
                    image_url=url,
                    order=img.get("order", idx),
                ))
            except Exception:
                pass  # Skip failed image uploads, don't block question creation
        elif img.get("image_url"):
            # Already a URL (e.g., from re-import or external source)
            db.add(VestibularQuestionImage(
                question_id=vq.id,
                image_url=img["image_url"],
                order=img.get("order", idx),
            ))

    return vq, True


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
