"""Unified v2 router for vestibular_questions.
Single router replaces 34 per-exam routers for list/detail/filter operations.
Legacy routers remain active during Phase 2-3 transition.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.vestibular.service import VestibularQuestionService
from app.vestibular.schemas import (
    VestibularQuestionOut,
    VestibularQuestionListOut,
)
from app.vestibular.registry import all_exam_types, get_exam_config

router = APIRouter(prefix="/v2/vestibular-questions", tags=["vestibular-v2"])


@router.get("/exam-types")
def list_exam_types():
    """Return all registered exam types with metadata."""
    return [
        {"value": et, "label": get_exam_config(et).label}
        for et in all_exam_types()
    ]


@router.get("/{exam_type}", response_model=VestibularQuestionListOut)
def list_questions(
    exam_type: str,
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List questions for an exam type with filters and pagination."""
    config = get_exam_config(exam_type)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown exam_type: {exam_type}")

    service = VestibularQuestionService(db)
    questions, total = service.list(
        exam_type=exam_type,
        year=year,
        area=area,
        language=language,
        search=search,
        page=page,
        size=size,
    )
    return VestibularQuestionListOut(
        items=[VestibularQuestionOut.model_validate(q) for q in questions],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{exam_type}/years", response_model=List[int])
def list_years(exam_type: str, db: Session = Depends(get_db)):
    """Distinct years for an exam type."""
    config = get_exam_config(exam_type)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown exam_type: {exam_type}")
    return VestibularQuestionService(db).get_distinct_years(exam_type)


@router.get("/{exam_type}/areas", response_model=List[str])
def list_areas(exam_type: str, db: Session = Depends(get_db)):
    """Distinct areas for an exam type."""
    config = get_exam_config(exam_type)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown exam_type: {exam_type}")
    return VestibularQuestionService(db).get_distinct_areas(exam_type)


@router.get("/{exam_type}/languages", response_model=List[str])
def list_languages(exam_type: str, db: Session = Depends(get_db)):
    """Distinct languages for an exam type."""
    config = get_exam_config(exam_type)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown exam_type: {exam_type}")
    return VestibularQuestionService(db).get_distinct_languages(exam_type)


@router.get("/{exam_type}/{question_id}", response_model=VestibularQuestionOut)
def get_question(
    exam_type: str,
    question_id: int,
    db: Session = Depends(get_db),
):
    """Get single question by ID."""
    config = get_exam_config(exam_type)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown exam_type: {exam_type}")

    service = VestibularQuestionService(db)
    question = service.get(question_id)
    if question is None or question.exam_type != exam_type:
        raise HTTPException(status_code=404, detail="Question not found")
    return VestibularQuestionOut.model_validate(question)