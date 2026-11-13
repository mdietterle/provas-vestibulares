from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.database import get_db
from app.models import User, UserRole

# auto_error=False: a ausência do header não é erro, pois a sessão pode vir do cookie.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_HEADER = "x-requested-with"


def _check_csrf(request: Optional[Request]) -> None:
    """Proteção CSRF para requisições autenticadas pelo cookie de sessão.

    Formulários e navegações cross-site não conseguem enviar headers
    customizados, e um fetch cross-origin com header customizado dispara
    preflight CORS. Exigir `X-Requested-With` em métodos que alteram estado
    (combinado com SameSite=Lax no cookie) bloqueia CSRF. Requisições com
    `Authorization: Bearer` (mobile, scripts) não usam cookie e não são afetadas.
    """
    if request is None or request.method.upper() not in _UNSAFE_METHODS:
        return
    if not request.headers.get(CSRF_HEADER):
        raise HTTPException(status_code=403, detail="Requisição bloqueada (proteção CSRF).")


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    request: Request = None,  # injetado pelo FastAPI; opcional em chamadas diretas
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Header explícito (mobile/scripts/testes) tem prioridade; senão, cookie httpOnly.
    if not isinstance(token, str) or not token:
        cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME) if request is not None else None
        if not cookie_token:
            raise credentials_exception
        _check_csrf(request)
        token = cookie_token
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.get(User, int(user_id))
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user


def require_professor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.ADMIN, UserRole.PROFESSOR):
        raise HTTPException(status_code=403, detail="Acesso restrito a professores")
    return current_user


def require_owner(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Acesso restrito ao proprietário do sistema")
    return current_user
