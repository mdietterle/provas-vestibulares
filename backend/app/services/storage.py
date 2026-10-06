"""Cloudflare R2 object storage client (S3-compatible API)."""
import uuid
from typing import Optional

import boto3
from botocore.config import Config

from app.core.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        if not settings.R2_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID:
            raise RuntimeError(
                "R2 credentials not configured. Set R2_ACCOUNT_ID, "
                "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env"
            )
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
        )
    return _client


def upload_image(data: bytes, content_type: str = "image/png", prefix: str = "questions") -> str:
    """Upload image bytes to R2, return public URL."""
    ext = content_type.split("/")[-1] if "/" in content_type else "png"
    key = f"{prefix}/{uuid.uuid4().hex[:12]}.{ext}"
    client = _get_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    base = settings.R2_PUBLIC_URL.rstrip("/")
    return f"{base}/{key}"


def delete_image(url: str) -> None:
    """Delete object from R2 by public URL."""
    base = settings.R2_PUBLIC_URL.rstrip("/")
    if not url.startswith(base):
        return
    key = url[len(base):].lstrip("/")
    _get_client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)


def get_presigned_url(key: str, expires: int = 3600) -> Optional[str]:
    """Generate presigned GET URL for private objects."""
    try:
        return _get_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key},
            ExpiresIn=expires,
        )
    except Exception:
        return None