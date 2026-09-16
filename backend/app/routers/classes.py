from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin, require_professor
from app.models import Class, StudentClass, TeachingAssignment, User, UserRole
from app.schemas import (
    ClassCreate,
    ClassOut,
    ClassUpdate,
    TeachingAssignmentCreate,
    TeachingAssignmentOut,
    UserOut,
)

router = APIRouter(prefix="/classes", tags=["classes"])


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
    return q.all()


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
    return class_


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
