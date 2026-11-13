from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def is_student(user) -> bool:
    """Check if user has STUDENT role."""
    from app.models import UserRole
    return getattr(user, "role", None) == UserRole.STUDENT


def filter_exam_response_for_student(exam_data: dict, submission_status=None) -> dict:
    """Strip answer keys from exam response when user is a student and exam not released.
    
    Removes is_correct from question options and correct_option/answer fields
    unless the submission status is RELEASED (grade visible to student).
    """
    from app.models import SubmissionStatus
    
    # If submission is released, show everything
    if submission_status == SubmissionStatus.RELEASED:
        return exam_data
    
    # Strip is_correct from exam_questions -> question -> options
    if "exam_questions" in exam_data:
        for eq in exam_data["exam_questions"]:
            if isinstance(eq, dict):
                question = eq.get("question", {})
                if isinstance(question, dict):
                    options = question.get("options", [])
                    for opt in options:
                        if isinstance(opt, dict):
                            opt.pop("is_correct", None)
    
    # Strip is_correct from exam_vestibular_questions -> vestibular_question -> options
    if "exam_vestibular_questions" in exam_data:
        for evq in exam_data["exam_vestibular_questions"]:
            if isinstance(evq, dict):
                vq = evq.get("vestibular_question", {})
                if isinstance(vq, dict):
                    options = vq.get("options", [])
                    for opt in options:
                        if isinstance(opt, dict):
                            opt.pop("is_correct", None)
                    # Also strip correct_option and answer fields
                    vq.pop("correct_option", None)
                    vq.pop("answer", None)
    
    return exam_data


# ── Cookie de sessão ──────────────────────────────────────────────────────────
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]", "testserver"}


def _cookie_secure(request) -> bool:
    mode = (settings.SESSION_COOKIE_SECURE or "auto").strip().lower()
    if mode in ("true", "1", "yes"):
        return True
    if mode in ("false", "0", "no"):
        return False
    host = (getattr(request, "url", None) and request.url.hostname) or ""
    host = host.lower()
    return not (host in _LOCAL_HOSTS or host.endswith(".localhost"))


def set_session_cookie(response, token: str, request) -> None:
    """Grava o JWT num cookie HttpOnly (não acessível via JavaScript)."""
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=_cookie_secure(request),
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )


def clear_session_cookie(response, request) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        secure=_cookie_secure(request),
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )
