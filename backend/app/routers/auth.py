import base64
import secrets
from datetime import datetime, timedelta

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.security import (
    clear_session_cookie,
    create_access_token,
    get_password_hash,
    set_session_cookie,
    verify_password,
)
from app.database import get_db
from app.deps import get_current_user
from app.models import Institution, StudentClass, User, UserRole
from app.routers.classes import find_class_by_join_code
from app.schemas import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    StudentRegister,
    Token,
    UserOut,
)
from app.services import email as email_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_institution_active(db: Session, user: User) -> None:
    """Bloqueia login de usuários de instituições desativadas pelo owner.
    O papel OWNER (dono da plataforma) nunca é bloqueado por essa checagem."""
    if user.role == UserRole.OWNER:
        return
    institution = db.get(Institution, user.institution_id)
    if institution and not institution.is_active:
        raise HTTPException(status_code=403, detail="Esta instituição foi desativada. Entre em contato com o suporte.")


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


def _resolve_class_code(db: Session, code: Optional[str]):
    """Valida o código de turma e devolve (turma, instituição) ou levanta 400."""
    if not code or not code.strip():
        raise HTTPException(status_code=400, detail="Informe o código da turma fornecido pela sua escola.")
    class_ = find_class_by_join_code(db, code)
    institution = db.get(Institution, class_.institution_id) if class_ else None
    if not class_ or not institution:
        raise HTTPException(status_code=400, detail="Código de turma inválido. Confira o código com seu professor.")
    if not institution.is_active:
        raise HTTPException(status_code=400, detail="Esta instituição está desativada. Entre em contato com a escola.")
    return class_, institution


def _issue_session(user: User, request: Request, response: Response) -> dict:
    """Gera o JWT, grava no cookie httpOnly e devolve o corpo legado (mobile usa access_token)."""
    token = create_access_token({"sub": str(user.id)})
    set_session_cookie(response, token, request)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(
    request: Request,
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(func.lower(User.email) == form.username.strip().lower()).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.deleted_at:
        raise HTTPException(status_code=401, detail="Conta removida. Entre em contato com o administrador.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    _ensure_institution_active(db, user)
    return _issue_session(user, request, response)


@router.post("/logout")
def logout(request: Request, response: Response):
    """Encerra a sessão do navegador apagando o cookie httpOnly."""
    clear_session_cookie(response, request)
    return {"message": "Sessão encerrada"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: StudentRegister, db: Session = Depends(get_db)):
    """Auto-cadastro de aluno: requer o código da turma (Class.join_code).

    A conta é criada na instituição da turma e o aluno já fica matriculado nela.
    """
    class_, institution = _resolve_class_code(db, payload.class_code)

    existing = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail")

    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="A senha deve ter no mínimo 6 caracteres")

    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=422, detail="Informe seu nome")

    # TODO: exigir verificação de e-mail quando o domínio do Resend estiver configurado.
    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.STUDENT,
        institution_id=institution.id,
        is_active=True,
        email_verified_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()
    db.add(StudentClass(student_id=user.id, class_id=class_.id))
    db.commit()

    return {"message": "Cadastro realizado com sucesso. Você já pode entrar com seu e-mail e senha."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Envia um link de redefinição de senha por e-mail, se a conta existir."""
    generic_response = {
        "message": "Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha."
    }
    user = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()
    # Não revela se o e-mail existe, nem envia para contas removidas/inativas
    if not user or user.deleted_at or not user.is_active:
        return generic_response

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_sent_at = datetime.utcnow()
    db.commit()

    try:
        email_service.send_password_reset(to_email=user.email, name=user.name, token=token)
    except Exception as e:
        print(f"⚠️   Falha ao enviar e-mail de redefinição de senha para {user.email}: {e}")
    return generic_response


@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Verifica se o token de redefinição de senha é válido, antes de exibir o formulário."""
    user = db.query(User).filter(User.password_reset_token == token).first()
    if not user or user.deleted_at or not user.is_active:
        raise HTTPException(404, "Link de redefinição inválido ou já utilizado")

    expire_hours = settings.PASSWORD_RESET_EXPIRE_HOURS
    if user.password_reset_sent_at:
        expires_at = user.password_reset_sent_at + timedelta(hours=expire_hours)
        if datetime.utcnow() > expires_at:
            raise HTTPException(400, f"Link de redefinição expirado (válido por {expire_hours}h). Solicite um novo.")

    return {"valid": True, "name": user.name, "email": user.email}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Define uma nova senha a partir do token enviado por e-mail."""
    user = db.query(User).filter(User.password_reset_token == payload.token).first()
    if not user or user.deleted_at or not user.is_active:
        raise HTTPException(404, "Link de redefinição inválido ou já utilizado")

    expire_hours = settings.PASSWORD_RESET_EXPIRE_HOURS
    if user.password_reset_sent_at:
        expires_at = user.password_reset_sent_at + timedelta(hours=expire_hours)
        if datetime.utcnow() > expires_at:
            raise HTTPException(400, f"Link de redefinição expirado (válido por {expire_hours}h). Solicite um novo.")

    if len(payload.password) < 6:
        raise HTTPException(422, "A senha deve ter no mínimo 6 caracteres")

    user.hashed_password = get_password_hash(payload.password)
    user.password_reset_token = None
    db.commit()
    return {"message": "Senha redefinida com sucesso. Você já pode fazer login."}


class GoogleLoginPayload(BaseModel):
    access_token: str
    # Obrigatório apenas quando a conta ainda não existe (mesma regra do /register).
    class_code: Optional[str] = None
    institution_id: Optional[int] = None  # legado, ignorado


@router.post("/google", response_model=Token)
def google_login(
    payload: GoogleLoginPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Exchange a Google OAuth access token for a platform JWT."""
    resp = http_requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        params={"access_token": payload.access_token},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token do Google inválido ou expirado")

    info = resp.json()
    email: str = info.get("email", "")
    name: str = info.get("name") or email.split("@")[0]

    if not email:
        raise HTTPException(status_code=400, detail="Não foi possível obter o email do Google")

    user = db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

    if not user:
        class_, institution = _resolve_class_code(db, payload.class_code)
        user = User(
            name=name,
            email=email,
            hashed_password=get_password_hash(secrets.token_hex(32)),
            role=UserRole.STUDENT,
            institution_id=institution.id,
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(StudentClass(student_id=user.id, class_id=class_.id))
        db.commit()
        db.refresh(user)

    if user.deleted_at:
        raise HTTPException(status_code=401, detail="Conta removida. Entre em contato com o administrador.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    _ensure_institution_active(db, user)
    return _issue_session(user, request, response)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.refresh(current_user)  # ensures institution relationship is loaded
    return UserOut.from_user(current_user)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name and payload.name.strip():
        current_user.name = payload.name.strip()

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(400, "Informe a senha atual")
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(400, "Senha atual incorreta")
        current_user.hashed_password = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.size and file.size > 2 * 1024 * 1024:
        raise HTTPException(400, "Imagem muito grande. Máximo 2 MB.")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(400, "Imagem muito grande. Máximo 2 MB.")
    from app.services.storage import upload_image
    mime = file.content_type or "image/jpeg"
    try:
        current_user.avatar = upload_image(content, content_type=mime, prefix="avatars")
    except Exception as e:
        raise HTTPException(400, f"Falha ao fazer upload do avatar: {e}")
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserOut)
def remove_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.avatar = None
    db.commit()
    db.refresh(current_user)
    return current_user
