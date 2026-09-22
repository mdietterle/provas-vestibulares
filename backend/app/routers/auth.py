import base64
import secrets
from datetime import datetime, timedelta

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import Institution, User, UserRole
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


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: StudentRegister, db: Session = Depends(get_db)):
    """Auto-cadastro de aluno: cria a conta já ativa e verificada (confirmação de e-mail
    desativada — a conta nasce já confirmada) e permite login imediato.

    A instituição pode ser referenciada por id (selecionada numa busca já existente) ou por
    nome livre (institution_name) — nesse caso, se nenhuma instituição com esse nome existir
    ainda, ela é criada na hora, ficando disponível depois para outros alunos e para o painel
    administrativo (web) buscarem/selecionarem.
    """
    institution: Optional[Institution] = None
    pending_institution_name: Optional[str] = None
    if payload.institution_id:
        institution = db.get(Institution, payload.institution_id)
        if not institution:
            raise HTTPException(status_code=400, detail="Instituição inválida")
    elif payload.institution_name and payload.institution_name.strip():
        name = payload.institution_name.strip()
        institution = db.query(Institution).filter(func.lower(Institution.name) == name.lower()).first()
        if not institution:
            # Escola não cadastrada: não cria uma Institution fantasma, só guarda o
            # nome digitado no próprio aluno até um admin confirmar/cadastrar a escola.
            pending_institution_name = name
    else:
        raise HTTPException(status_code=400, detail="Informe a instituição")

    existing = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail")

    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="A senha deve ter no mínimo 6 caracteres")

    # Confirmação de e-mail está desativada temporariamente (envio via Resend exige domínio
    # verificado, ainda não configurado) — a conta já nasce verificada e pode logar direto.
    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.STUDENT,
        institution_id=institution.id if institution else None,
        pending_institution_name=pending_institution_name,
        is_active=True,
        email_verified_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Cadastro realizado com sucesso."}


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
    institution_id: Optional[int] = None


@router.post("/google", response_model=Token)
def google_login(payload: GoogleLoginPayload, db: Session = Depends(get_db)):
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
        if not payload.institution_id:
            raise HTTPException(status_code=400, detail="Selecione a instituição para concluir o cadastro")
        institution = db.get(Institution, payload.institution_id)
        if not institution:
            raise HTTPException(status_code=400, detail="Instituição inválida")
        user = User(
            name=name,
            email=email,
            hashed_password=get_password_hash(secrets.token_hex(32)),
            role=UserRole.STUDENT,
            institution_id=institution.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.deleted_at:
        raise HTTPException(status_code=401, detail="Conta removida. Entre em contato com o administrador.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    _ensure_institution_active(db, user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


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
    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(content).decode()
    current_user.avatar = f"data:{mime};base64,{b64}"
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
