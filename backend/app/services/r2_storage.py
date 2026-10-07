"""Cloudflare R2 object storage adapter for question images.

Uploads base64 or raw bytes to R2 bucket, returns public URL.
Replaces inline base64 storage in database with CDN-backed URLs.
"""
from __future__ import annotations

import base64
import hashlib
import uuid
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings


def _get_client():
    """Create S3-compatible client for Cloudflare R2."""
    if not settings.R2_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID:
        raise RuntimeError(
            "R2 credentials not configured. Set R2_ACCOUNT_ID, "
            "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env"
        )
    endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=BotoConfig(signature_version="s3v4"),
    )


def upload_image(
    data: bytes | str,
    *,
    exam_type: str,
    year: int,
    number: int,
    content_type: str = "image/png",
    suffix: str = "",
) -> str:
    """Upload image to R2 and return public URL.

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

    client = _get_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=raw,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )

    public_url = settings.R2_PUBLIC_URL.rstrip("/")
    return f"{public_url}/{key}"


def delete_image(url: str) -> None:
    """Delete an image from R2 by its public URL."""
    prefix = settings.R2_PUBLIC_URL.rstrip("/") + "/"
    if not url.startswith(prefix):
        return  # Not our bucket
    key = url[len(prefix):]
    client = _get_client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)