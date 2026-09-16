"""Endpoints para o fluxo de convite de alunos via magic link."""
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import User, UserRole
from app.schemas import InvitationAccept, UserOut
from app.services import email as email_service

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("/{user_id}/resend", response_model=UserOut)
def resend_invitation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reenvia o e-mail de convite para um aluno que ainda não aceitou."""
    student = db.get(User, user_id)
    if not student or student.institution_id != current_user.institution_id:
        raise HTTPException(404, "Aluno não encontrado")
    if student.role != UserRole.STUDENT:
        raise HTTPException(400, "Apenas alunos recebem convite")
    if student.invitation_accepted_at:
        raise HTTPException(400, "Este aluno já aceitou o convite")
    if student.deleted_at:
        raise HTTPException(400, "Aluno excluído")

    token = secrets.token_urlsafe(32)
    student.invitation_token = token
    student.invitation_sent_at = datetime.utcnow()
    db.commit()
    db.refresh(student)

    email_service.send_student_invitation(
        to_email=student.email,
        student_name=student.name,
        institution_name=current_user.institution.name,
        token=token,
    )
    return UserOut.from_user(student)


@router.get("/verify/{token}")
def verify_invitation(token: str, db: Session = Depends(get_db)):
    """Verifica se o token de convite é válido e retorna dados básicos do aluno."""
    student = db.query(User).filter(User.invitation_token == token).first()
    if not student:
        raise HTTPException(404, "Link de convite inválido ou já utilizado")
    if student.invitation_accepted_at:
        raise HTTPException(400, "Este convite já foi utilizado")
    if student.deleted_at or not student.is_active:
        raise HTTPException(400, "Conta desativada")

    expire_days = settings.INVITATION_EXPIRE_DAYS
    if student.invitation_sent_at:
        expires_at = student.invitation_sent_at + timedelta(days=expire_days)
        if datetime.utcnow() > expires_at:
            raise HTTPException(400, f"Link de convite expirado (válido por {expire_days} dias)")

    return {
        "valid": True,
        "student_name": student.name,
        "email": student.email,
        "institution_name": student.institution.name if student.institution else "",
    }


@router.post("/accept")
def accept_invitation(payload: InvitationAccept, db: Session = Depends(get_db)):
    """O aluno define sua senha usando o token do magic link.

    Ao aceitar: define senha, marca invitation_accepted_at, invalida o token.
    A partir deste momento o aluno passa a contar nos limites do plano.
    """
    student = db.query(User).filter(User.invitation_token == payload.token).first()
    if not student:
        raise HTTPException(404, "Link de convite inválido ou já utilizado")
    if student.invitation_accepted_at:
        raise HTTPException(400, "Este convite já foi utilizado. Faça login normalmente.")
    if student.deleted_at or not student.is_active:
        raise HTTPException(400, "Conta desativada. Entre em contato com a escola.")

    expire_days = settings.INVITATION_EXPIRE_DAYS
    if student.invitation_sent_at:
        expires_at = student.invitation_sent_at + timedelta(days=expire_days)
        if datetime.utcnow() > expires_at:
            raise HTTPException(400, f"Link de convite expirado (válido por {expire_days} dias). Peça à escola um novo convite.")

    if len(payload.password) < 6:
        raise HTTPException(422, "A senha deve ter no mínimo 6 caracteres")

    student.hashed_password = get_password_hash(payload.password)
    student.invitation_accepted_at = datetime.utcnow()
    student.invitation_token = None  # invalida o token após uso
    db.commit()

    return {"message": "Senha definida com sucesso. Você já pode fazer login."}
