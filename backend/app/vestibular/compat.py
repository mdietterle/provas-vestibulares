"""Compatibility layer: map unified VestibularQuestion ↔ legacy per-exam schemas.
Used during Phase 2-3 dual-read/dual-write transition.
"""
from typing import Any, Dict, Optional
from app.vestibular.models import VestibularQuestion
from app.vestibular.registry import get_exam_config


def to_legacy_dict(vq: VestibularQuestion) -> Dict[str, Any]:
    """Flatten unified model back to legacy per-exam shape.

    Returns dict with all common fields + metadata keys expanded as top-level.
    Consumers (legacy routers) select only fields they need.
    """
    out: Dict[str, Any] = {
        "id": vq.id,
        "exam_name": vq.exam_name,
        "year": vq.year,
        "number": vq.number,
        "statement": vq.statement,
        "created_at": vq.created_at,
        "image_base64": vq.image_base64,
        "answer": vq.answer,
        "is_annulled": vq.is_annulled,
        "correct_option": vq.correct_option,
    }
    # Expand JSONB metadata into top-level keys
    if vq.extra_data:
        for k, v in vq.extra_data.items():
            out[k] = v
    # Options
    out["options"] = [
        {
            "id": o.id,
            "letter": o.letter,
            "value": o.value,
            "text": o.text,
            "is_correct": o.is_correct,
            "order": o.order,
        }
        for o in sorted(vq.options, key=lambda x: x.order)
    ]
    # Images
    out["images"] = [
        {"id": i.id, "image_base64": i.image_base64, "order": i.order}
        for i in sorted(vq.images, key=lambda x: x.order)
    ]
    return out


def from_legacy_row(row: Dict[str, Any], exam_type: str) -> Dict[str, Any]:
    """Convert legacy per-exam row dict into unified vestibular_questions insert shape.

    Extracts known metadata keys per exam config; everything else stays as-is.
    """
    config = get_exam_config(exam_type)
    metadata_keys = config.metadata_keys if config else []

    metadata: Dict[str, Any] = {}
    clean: Dict[str, Any] = {}

    skip_keys = {"id", "options", "images"}
    core_keys = {
        "exam_name", "year", "number", "statement", "html_statement",
        "image_base64", "answer", "is_annulled", "correct_option", "created_at",
    }

    for k, v in row.items():
        if k in skip_keys:
            continue
        if k in metadata_keys:
            if v is not None:
                metadata[k] = v
        elif k in core_keys:
            clean[k] = v
        else:
            # Unknown column → shove into metadata to avoid data loss
            if v is not None:
                metadata[k] = v

    clean["exam_type"] = exam_type
    clean["metadata"] = metadata
    clean["options"] = row.get("options", [])
    clean["images"] = row.get("images", [])
    return clean