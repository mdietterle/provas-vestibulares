from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Subject, User
from app.schemas import SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=List[SubjectOut])
def list_subjects(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Subject)
        .filter(Subject.institution_id == current_user.institution_id)
        .all()
    )


@router.post("", response_model=SubjectOut, status_code=201)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = (
        db.query(Subject)
        .filter(
            Subject.name == payload.name,
            Subject.institution_id == current_user.institution_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "Matéria já cadastrada")
    subj = Subject(name=payload.name, institution_id=current_user.institution_id)
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subj = db.get(Subject, subject_id)
    if not subj or subj.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    return subj


@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    subj = db.get(Subject, subject_id)
    if not subj or subj.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(subj, field, value)
    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    subj = db.get(Subject, subject_id)
    if not subj or subj.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    db.delete(subj)
    db.commit()
