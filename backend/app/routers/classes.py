import secrets
import threading
import time
from collections import defaultdict, deque
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin, require_professor
from app.models import Class, Institution, StudentClass, TeachingAssignment, User, UserRole
from app.schemas import (
    ClassCreate,
    ClassJoinCodeLookupOut,
    ClassJoinCodeOut,
    ClassOut,
    ClassUpdate,
    TeachingAssignmentCreate,
    TeachingAssignmentOut,
    UserOut,
)

router = APIRouter(prefix="/classes", tags=["classes"])


# ── Código de turma (auto-cadastro de aluno) ──────────────────────────────────
# Sem caracteres ambíguos (0/O, 1/I/L): fácil de ditar e digitar.
JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 8


def normalize_join_code(code: str) -> str:
    return "".join(ch for ch in (code or "").upper() if ch.isalnum())


def find_class_by_join_code(db: Session, code: str):
    normalized = normalize_join_code(code)
    if not normalized:
        return None
    return db.query(Class).filter(Class.join_code == normalized).first()


def _generate_unique_join_code(db: Session) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH))
        if not db.query(Class.id).filter(Class.join_code == code).first():
            return code
    raise HTTPException(500, "Não foi possível gerar um código único. Tente novamente.")


def _can_manage_class(db: Session, user: User, class_: Class) -> bool:
    if class_.institution_id != user.institution_id:
        return False
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.PROFESSOR:
        return (
            db.query(TeachingAssignment.id)
            .filter(
                TeachingAssignment.professor_id == user.id,
                TeachingAssignment.class_id == class_.id,
            )
            .first()
            is not None
        )
    return False


def _class_out(class_: Class, show_code: bool) -> ClassOut:
    out = ClassOut.model_validate(class_)
    if not show_code:
        out.join_code = None
    return out


# Rate limit simples em memória (por IP) para a consulta pública de código.
# Por processo: com vários workers o limite efetivo é multiplicado.
_LOOKUP_LIMIT = 20
_LOOKUP_WINDOW_SECONDS = 60
_lookup_hits: "defaultdict[str, deque]" = defaultdict(deque)
_lookup_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_lookup_rate_limit(request: Request) -> None:
    now = time.monotonic()
    ip = _client_ip(request)
    with _lookup_lock:
        hits = _lookup_hits[ip]
        while hits and now - hits[0] > _LOOKUP_WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= _LOOKUP_LIMIT:
            raise HTTPException(429, "Muitas tentativas. Aguarde um minuto e tente novamente.")
        hits.append(now)


@router.get("/join-code/{code}", response_model=ClassJoinCodeLookupOut)
def lookup_join_code(code: str, request: Request, db: Session = Depends(get_db)):
    """Público: confirma a turma de um código antes do cadastro do aluno."""
    _enforce_lookup_rate_limit(request)
    class_ = find_class_by_join_code(db, code)
    institution = db.get(Institution, class_.institution_id) if class_ else None
    if not class_ or not institution or not institution.is_active:
        raise HTTPException(404, "Código de turma inválido")
    return ClassJoinCodeLookupOut(
        class_name=class_.name, year=class_.year, institution_name=institution.name
    )


@router.post("/{class_id}/join-code", response_model=ClassJoinCodeOut)
def rotate_join_code(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera (ou troca) o código da turma. Admin da instituição ou professor da turma."""
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    if not _can_manage_class(db, current_user, class_):
        raise HTTPException(403, "Sem permissão para gerenciar o código desta turma")
    class_.join_code = _generate_unique_join_code(db)
    db.commit()
    return ClassJoinCodeOut(join_code=class_.join_code)


@router.delete("/{class_id}/join-code", status_code=204)
def disable_join_code(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desativa o código da turma (novos cadastros com ele passam a falhar)."""
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    if not _can_manage_class(db, current_user, class_):
        raise HTTPException(403, "Sem permissão para gerenciar o código desta turma")
    class_.join_code = None
    db.commit()


@router.get("", response_model=List[ClassOut])
def list_classes(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = db.query(Class).filter(Class.institution_id == current_user.institution_id)
    if current_user.role == UserRole.PROFESSOR:
        taught_class_ids = (
            db.query(TeachingAssignment.class_id)
            .filter(TeachingAssignment.professor_id == current_user.id)
            .distinct()
            .all()
        )
        ids = [r[0] for r in taught_class_ids]
        q = q.filter(Class.id.in_(ids))
    elif current_user.role == UserRole.STUDENT:
        enrolled_ids = (
            db.query(StudentClass.class_id)
            .filter(StudentClass.student_id == current_user.id)
            .all()
        )
        ids = [r[0] for r in enrolled_ids]
        q = q.filter(Class.id.in_(ids))
    # Professores já veem só as turmas que lecionam; alunos nunca veem o código.
    show_code = current_user.role in (UserRole.ADMIN, UserRole.PROFESSOR)
    return [_class_out(c, show_code) for c in q.all()]


@router.post("", response_model=ClassOut, status_code=201)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = Class(**payload.model_dump(), institution_id=current_user.institution_id)
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


@router.get("/{class_id}", response_model=ClassOut)
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    return _class_out(class_, _can_manage_class(db, current_user, class_))


@router.put("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    payload: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(class_, field, value)
    db.commit()
    db.refresh(class_)
    return class_


@router.delete("/{class_id}", status_code=204)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    db.delete(class_)
    db.commit()


# ── Students in class ─────────────────────────────────────────────────────────

@router.get("/{class_id}/students", response_model=List[UserOut])
def list_students_in_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    enrollments = db.query(StudentClass).filter(StudentClass.class_id == class_id).all()
    from app.models import User as UserModel
    ids = [e.student_id for e in enrollments]
    return db.query(UserModel).filter(UserModel.id.in_(ids)).all()


@router.post("/{class_id}/students/{student_id}", status_code=201)
def add_student_to_class(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    from app.models import User as UserModel
    student = db.get(UserModel, student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(404, "Aluno não encontrado")
    if (
        db.query(StudentClass)
        .filter(StudentClass.student_id == student_id, StudentClass.class_id == class_id)
        .first()
    ):
        raise HTTPException(400, "Aluno já matriculado")
    db.add(StudentClass(student_id=student_id, class_id=class_id))
    db.commit()
    return {"message": "Aluno adicionado à turma"}


@router.delete("/{class_id}/students/{student_id}", status_code=204)
def remove_student_from_class(
    class_id: int,
    student_id: int,
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


# ── Teaching Assignments ──────────────────────────────────────────────────────

@router.get("/{class_id}/assignments", response_model=List[TeachingAssignmentOut])
def list_assignments(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    return db.query(TeachingAssignment).filter(TeachingAssignment.class_id == class_id).all()


@router.post("/assignments", response_model=TeachingAssignmentOut, status_code=201)
def create_assignment(
    payload: TeachingAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from app.models import Subject
    class_ = db.get(Class, payload.class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    professor = db.get(User, payload.professor_id)
    if not professor or professor.role != UserRole.PROFESSOR:
        raise HTTPException(404, "Professor não encontrado")
    if (
        db.query(TeachingAssignment)
        .filter(
            TeachingAssignment.professor_id == payload.professor_id,
            TeachingAssignment.subject_id == payload.subject_id,
            TeachingAssignment.class_id == payload.class_id,
        )
        .first()
    ):
        raise HTTPException(400, "Professor já atribuído a esta matéria/turma")
    assignment = TeachingAssignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = db.get(TeachingAssignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Atribuição não encontrada")
    class_ = db.get(Class, assignment.class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Atribuição não encontrada")
    db.delete(assignment)
    db.commit()
