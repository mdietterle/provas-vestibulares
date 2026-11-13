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
import logging
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.vestibular.models import VestibularQuestion, VestibularQuestionOption, VestibularQuestionImage
from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.r2_storage import upload_image

logger = logging.getLogger(__name__)


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
    force_reimport: bool = False,
    instructions: Optional[str] = None,
) -> tuple[Optional[VestibularQuestion], bool]:
    """Unified output adapter for all vestibular importers.

    Writes to `vestibular_questions` + options/images tables. Returns
    (question, created). If question already exists (same exam_type +
    exam_name + number) and force_reimport=False, returns (existing, False) without modifying data.
    If force_reimport=True, updates the existing question IN PLACE and returns
    (existing, True): the VestibularQuestion id is kept (it is referenced by
    `exam_vestibular_questions` — ON DELETE CASCADE, so deleting it silently
    removed the question from teachers' exams — and by
    `simulado_questions.vestibular_question_id`), fields and metadata are
    overwritten, options are updated by position (ids kept where the position
    still exists, extra ones added/removed) and images are replaced.

    Images are uploaded to R2 automatically; only URLs are stored in DB.
    Pass `image_base64` for the main question image or `images` list for
    additional figures — both accept raw bytes or base64 strings.

    Importers should call this instead of creating legacy per-exam models.
    Exam-specific fields (color, phase, day, module, area, subject, etc.)
    go in `metadata` JSONB dict.
    """
    existing = _find_existing_question(
        db, exam_type=exam_type, exam_name=exam_name, number=number, metadata=metadata,
    )
    if existing and not force_reimport:
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
        except Exception as exc:
            logger.error(
                "Failed to upload main image for %s/%d q%d: %s",
                exam_type, year, number, exc, exc_info=True,
            )
            image_url = None  # Graceful degradation: question saved without image

    merged_metadata = dict(metadata or {})
    if instructions:
        merged_metadata["instructions"] = instructions

    if existing:
        vq = existing
        vq.year = year
        vq.statement = statement
        vq.html_statement = html_statement
        vq.image_base64 = None  # imagens moram na tabela de imagens
        vq.answer = answer
        vq.is_annulled = is_annulled
        vq.correct_option = correct_option
        vq.metadata_ = merged_metadata
        _update_options_in_place(vq, options)
        # Imagens são substituídas. Se o upload da imagem principal falhou,
        # mantém a imagem principal antiga em vez de deixar a questão sem figura.
        keep_old_main = bool(image_base64) and image_url is None
        for old_img in list(vq.images):
            if keep_old_main and old_img.order == 0:
                continue
            vq.images.remove(old_img)
        db.flush()
    else:
        vq = VestibularQuestion(
            exam_type=exam_type,
            exam_name=exam_name,
            year=year,
            number=number,
            statement=statement,
            html_statement=html_statement,
            answer=answer,
            is_annulled=is_annulled,
            correct_option=correct_option,
            metadata_=merged_metadata,
        )
        db.add(vq)
        db.flush()
        for opt in options:
            db.add(VestibularQuestionOption(question_id=vq.id, **opt))

    # Main question image goes to images table, not model field
    if image_url:
        db.add(VestibularQuestionImage(
            question_id=vq.id,
            image_url=image_url,
            order=0,
        ))

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
            except Exception as exc:
                logger.error(
                    "Failed to upload extra image %s for %s/%d q%d: %s",
                    f"_fig{idx}", exam_type, year, number, exc, exc_info=True,
                )
        elif img.get("image_url"):
            # Already a URL (e.g., from re-import or external source)
            db.add(VestibularQuestionImage(
                question_id=vq.id,
                image_url=img["image_url"],
                order=img.get("order", idx),
            ))

    if existing:
        db.flush()
        # Recarrega as coleções para refletir as imagens adicionadas acima
        # via db.add (o chamador pode ler vq.images na mesma sessão).
        db.expire(vq, ["images", "options"])

    return vq, True


_OPTION_FIELDS = ("letter", "value", "text", "is_correct", "order")
_OPTION_DEFAULTS = {"letter": None, "value": None, "text": "", "is_correct": False}


def _find_existing_question(
    db: Session,
    *,
    exam_type: str,
    exam_name: Optional[str],
    number: int,
    metadata: Optional[Dict[str, Any]],
) -> Optional[VestibularQuestion]:
    """Busca a questão já importada (exam_type + exam_name + number). Se houver
    mais de uma linha (ex.: ENEM Q1-5 em Inglês e Espanhol com o mesmo
    número), prefere a de mesmo `metadata.language`."""
    rows = (
        db.query(VestibularQuestion)
        .filter_by(exam_type=exam_type, exam_name=exam_name, number=number)
        .order_by(VestibularQuestion.id)
        .all()
    )
    if not rows:
        return None
    language = (metadata or {}).get("language")
    if len(rows) > 1 and language is not None:
        for row in rows:
            if (row.metadata_ or {}).get("language") == language:
                return row
    return rows[0]


def _update_options_in_place(vq: VestibularQuestion, options: List[Dict[str, Any]]) -> None:
    """Atualiza as alternativas pela posição (ordem), mantendo os ids onde a
    posição continua existindo; adiciona as que sobrarem e remove as extras."""
    current = sorted(vq.options, key=lambda o: (o.order if o.order is not None else 0, o.id or 0))
    for idx, opt in enumerate(options):
        if idx < len(current):
            target = current[idx]
            for field in _OPTION_FIELDS:
                if field in opt:
                    setattr(target, field, opt[field])
                elif field == "order":
                    target.order = idx
                else:
                    setattr(target, field, _OPTION_DEFAULTS[field])
        else:
            data = dict(opt)
            data.setdefault("order", idx)
            vq.options.append(VestibularQuestionOption(**data))
    for extra in current[len(options):]:
        vq.options.remove(extra)


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
        return res
    except Exception as e:
        raise
