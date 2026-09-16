import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Class, StudentClass, TeachingAssignment, User, UserRole
from app.schemas import TeachingAssignmentOut, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[UserRole] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(User).filter(User.institution_id == current_user.institution_id)
    if role:
        q = q.filter(User.role == role)
    if not include_deleted:
        q = q.filter(User.deleted_at.is_(None))
    return [UserOut.from_user(u) for u in q.all()]


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.institution_id != current_user.institution_id:
        raise HTTPException(403, "Só pode criar usuários na sua instituição")
    if db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first():
        raise HTTPException(400, "Email já cadastrado")
    if payload.role == UserRole.PROFESSOR:
        from app.services import usage as usage_service
        if not usage_service.can_add_professor(db, current_user.institution_id):
            raise HTTPException(
                403,
                "Limite de professores do plano atingido. "
                "Faça upgrade do plano para cadastrar mais professores.",
            )

    data = payload.model_dump()
    password = data.pop("password", None)

    send_invite = False
    if payload.role == UserRole.STUDENT and not password:
        # Admin não informou senha: aluno é criado sem senha e recebe convite por
        # e-mail pra definir a dele própria (única situação em que o e-mail ainda
        # é necessário — sem ele o aluno não teria como entrar de jeito nenhum).
        token = secrets.token_urlsafe(32)
        data["hashed_password"] = get_password_hash(secrets.token_urlsafe(16))  # senha aleatória temporária
        data["invitation_token"] = token
        data["invitation_sent_at"] = datetime.utcnow()
        data["is_active"] = True
        send_invite = True
    elif payload.role == UserRole.STUDENT:
        # Admin já definiu a senha do aluno na hora do cadastro: login liberado
        # de imediato, sem depender de e-mail nenhum.
        data["hashed_password"] = get_password_hash(password)
        data["invitation_accepted_at"] = datetime.utcnow()
    else:
        if not password:
            raise HTTPException(422, "Senha é obrigatória para professores e administradores")
        data["hashed_password"] = get_password_hash(password)

    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)

    if send_invite:
        from app.services import email as email_service
        try:
            email_service.send_student_invitation(
                to_email=user.email,
                student_name=user.name,
                institution_name=current_user.institution.name,
                token=token,
            )
        except Exception as exc:
            # Falha no e-mail não deve reverter o cadastro
            print(f"⚠️  Falha ao enviar convite para {user.email}: {exc}")

    return UserOut.from_user(user)


@router.get("/professors/by-subject/{subject_id}", response_model=List[UserOut])
def professors_by_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return professors teaching a specific subject in the current institution."""
    professor_ids = (
        db.query(TeachingAssignment.professor_id)
        .filter(TeachingAssignment.subject_id == subject_id)
        .distinct()
        .all()
    )
    ids = [r[0] for r in professor_ids]
    return (
        db.query(User)
        .filter(User.id.in_(ids), User.institution_id == current_user.institution_id)
        .all()
    )


@router.get("/students/by-class/{class_id}", response_model=List[UserOut])
def students_by_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.PROFESSOR):
        raise HTTPException(403, "Sem acesso")
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    if current_user.role == UserRole.PROFESSOR:
        teaches = (
            db.query(TeachingAssignment)
            .filter(TeachingAssignment.professor_id == current_user.id, TeachingAssignment.class_id == class_id)
            .first()
        )
        if not teaches:
            raise HTTPException(403, "Você não leciona nesta turma")
    enrollments = db.query(StudentClass).filter(StudentClass.class_id == class_id).all()
    ids = [e.student_id for e in enrollments]
    return db.query(User).filter(User.id.in_(ids), User.institution_id == current_user.institution_id).all()


@router.get("/{user_id}/assignments", response_model=List[TeachingAssignmentOut])
def get_user_assignments(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(403, "Sem acesso")
    professor = db.get(User, user_id)
    if not professor or professor.institution_id != current_user.institution_id:
        raise HTTPException(404, "Professor não encontrado")
    return db.query(TeachingAssignment).filter(TeachingAssignment.professor_id == user_id).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    data = payload.model_dump(exclude_none=True)
    if "password" in data:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/toggle-active", response_model=UserOut)
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activate or deactivate a user without deleting them."""
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id or user.deleted_at:
        raise HTTPException(404, "Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(400, "Não pode desativar a si mesmo")
    # Ao reativar um professor, respeita o limite do plano
    if not user.is_active and user.role == UserRole.PROFESSOR:
        from app.services import usage as usage_service
        if not usage_service.can_add_professor(db, current_user.institution_id):
            raise HTTPException(
                403,
                "Limite de professores do plano atingido. "
                "Faça upgrade do plano para reativar este professor.",
            )
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete: marks deleted_at, blocks login, hides from all listings."""
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(400, "Não pode excluir a si mesmo")
    if user.deleted_at:
        raise HTTPException(400, "Usuário já foi excluído")
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.commit()


# ── Enrollments ───────────────────────────────────────────────────────────────

@router.post("/enroll", status_code=201)
def enroll_student(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = db.get(User, student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(404, "Aluno não encontrado")
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    existing = (
        db.query(StudentClass)
        .filter(StudentClass.student_id == student_id, StudentClass.class_id == class_id)
        .first()
    )
    if existing:
        raise HTTPException(400, "Aluno já matriculado nesta turma")
    db.add(StudentClass(student_id=student_id, class_id=class_id))
    db.commit()
    return {"message": "Aluno matriculado com sucesso"}


@router.delete("/enroll/{student_id}/{class_id}", status_code=204)
def unenroll_student(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    enrollment = (
        db.query(StudentClass)
        .filter(StudentClass.student_id == student_id, StudentClass.class_id == class_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(404, "Matrícula não encontrada")
    db.delete(enrollment)
    db.commit()
