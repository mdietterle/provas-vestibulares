from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_professor
from app.models import Question, QuestionOption, Subject, TeachingAssignment, User, UserRole
from app.schemas import QuestionCreate, QuestionOut, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["questions"])


def _get_professor_subject_ids(db: Session, professor_id: int) -> List[int]:
    rows = (
        db.query(TeachingAssignment.subject_id)
        .filter(TeachingAssignment.professor_id == professor_id)
        .distinct()
        .all()
    )
    return [r[0] for r in rows]


@router.get("", response_model=List[QuestionOut])
def list_questions(
    subject_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    - Admin: sees all questions of the institution
    - Professor: sees own questions + public questions from same institution
    """
    if current_user.role == UserRole.ADMIN:
        q = (
            db.query(Question)
            .join(Subject)
            .filter(Subject.institution_id == current_user.institution_id)
        )
    else:
        # own questions OR public questions from same institution
        q = (
            db.query(Question)
            .join(Subject)
            .filter(
                Subject.institution_id == current_user.institution_id,
                or_(
                    Question.professor_id == current_user.id,
                    Question.is_public == True,
                ),
            )
        )
    if subject_id:
        q = q.filter(Question.subject_id == subject_id)
    return q.all()


@router.post("", response_model=QuestionOut, status_code=201)
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    if current_user.role == UserRole.PROFESSOR:
        allowed_ids = _get_professor_subject_ids(db, current_user.id)
        if payload.subject_id not in allowed_ids:
            raise HTTPException(403, "Você não leciona esta matéria")

    data = payload.model_dump(exclude={"options"})
    data["professor_id"] = current_user.id
    question = Question(**data)
    db.add(question)
    db.flush()

    for i, opt in enumerate(payload.options):
        db.add(QuestionOption(question_id=question.id, **opt.model_dump()))

    db.commit()
    db.refresh(question)
    return question


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Questão não encontrada")
    subject = db.get(Subject, question.subject_id)
    if subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso")
    if (
        current_user.role == UserRole.PROFESSOR
        and not question.is_public
        and question.professor_id != current_user.id
    ):
        raise HTTPException(403, "Questão privada de outro professor")
    return question


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Questão não encontrada")

    # Institution boundary: admins from other institutions must not edit this question
    subject = db.get(Subject, question.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso a esta questão")

    if current_user.role == UserRole.PROFESSOR and question.professor_id != current_user.id:
        raise HTTPException(403, "Só o autor pode editar esta questão")

    # If subject is being changed, ensure the new subject belongs to the same institution
    if payload.subject_id is not None and payload.subject_id != question.subject_id:
        new_subject = db.get(Subject, payload.subject_id)
        if not new_subject or new_subject.institution_id != current_user.institution_id:
            raise HTTPException(404, "Matéria não encontrada")
        if current_user.role == UserRole.PROFESSOR:
            allowed_ids = _get_professor_subject_ids(db, current_user.id)
            if payload.subject_id not in allowed_ids:
                raise HTTPException(403, "Você não leciona esta matéria")

    data = payload.model_dump(exclude_none=True, exclude={"options"})
    for field, value in data.items():
        setattr(question, field, value)

    if payload.options is not None:
        for opt in question.options:
            db.delete(opt)
        db.flush()
        for opt in payload.options:
            db.add(QuestionOption(question_id=question.id, **opt.model_dump()))

    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Questão não encontrada")

    # Institution boundary: admins from other institutions must not delete this question
    subject = db.get(Subject, question.subject_id)
    if subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso a esta questão")

    if current_user.role == UserRole.PROFESSOR and question.professor_id != current_user.id:
        raise HTTPException(403, "Só o autor pode excluir esta questão")
    db.delete(question)
    db.commit()
