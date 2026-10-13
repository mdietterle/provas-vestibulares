"""Supabase Storage adapter for question images.

Uploads base64 or raw bytes to Supabase Storage bucket, returns public URL.
Replaces inline base64 storage in database with CDN-backed URLs.
"""
from __future__ import annotations

import base64
import hashlib
from typing import Optional

import requests

from app.core.config import settings


def _get_headers() -> dict[str, str]:
    """Build auth headers for Supabase Storage API."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase Storage not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY in .env"
        )
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }


def upload_image(
    data: bytes | str,
    *,
    exam_type: str,
    year: int,
    number: int,
    content_type: str = "image/png",
    suffix: str = "",
) -> str:
    """Upload image to Supabase Storage and return public URL.

    Args:
        data: Raw bytes or base64-encoded string (with or without data URI prefix).
        exam_type: e.g. "enem", "ufsc" — used in key path.
        year: Exam year — used in key path.
        number: Question number — used in key path.
        content_type: MIME type for the object.
        suffix: Optional extra identifier (e.g. "_fig1") for multi-image questions.

    Returns:
        Public URL of the uploaded object.
    """
    # Decode base64 if needed
    if isinstance(data, str):
        # Strip data URI prefix if present
        if "," in data[:80]:
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
    else:
        raw = data

    # Deterministic key: exam_type/year/number_hash_suffix.ext
    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    content_hash = hashlib.sha256(raw).hexdigest()[:8]
    key = f"questions/{exam_type}/{year}/{number}{suffix}_{content_hash}.{ext}"

    bucket = settings.SUPABASE_STORAGE_BUCKET
    base_url = settings.SUPABASE_URL.rstrip("/")
    upload_url = f"{base_url}/storage/v1/object/{bucket}/{key}"

    resp = requests.post(
        upload_url,
        headers={
            **_get_headers(),
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=31536000, immutable",
            "x-upsert": "true",
        },
        data=raw,
        timeout=30,
    )
    resp.raise_for_status()

    public_url = f"{base_url}/storage/v1/object/public/{bucket}/{key}"
    return public_url


def delete_image(url: str) -> None:
    """Delete an image from Supabase Storage by its public URL."""
    base_url = settings.SUPABASE_URL.rstrip("/")
    bucket = settings.SUPABASE_STORAGE_BUCKET
    prefix = f"{base_url}/storage/v1/object/public/{bucket}/"
    if not url.startswith(prefix):
        return  # Not our bucket
    key = url[len(prefix):]
    delete_url = f"{base_url}/storage/v1/object/{bucket}/{key}"
    resp = requests.delete(delete_url, headers=_get_headers(), timeout=10)
    resp.raise_for_status()