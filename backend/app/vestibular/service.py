"""Unified service layer for vestibular_questions.
Replaces duplicated query logic across 34 exam routers.
"""
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select, and_, or_
from sqlalchemy.orm import Session, joinedload
from app.vestibular.models import VestibularQuestion, VestibularQuestionOption, VestibularQuestionImage
from app.vestibular.registry import get_exam_config


class VestibularQuestionService:
    """CRUD + search for unified vestibular_questions table."""

    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        exam_type: str,
        year: Optional[int] = None,
        area: Optional[str] = None,
        language: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[VestibularQuestion], int]:
        """Return (questions, total_count) with filters applied."""
        q = select(VestibularQuestion).where(VestibularQuestion.exam_type == exam_type)

        if year is not None:
            q = q.where(VestibularQuestion.year == year)
        if area:
            q = q.where(VestibularQuestion.extra_data.op("->>")("area") == area)
        if language:
            q = q.where(VestibularQuestion.extra_data.op("->>")("language") == language)
        if search:
            q = q.where(
                or_(
                    VestibularQuestion.statement.ilike(f"%{search}%"),
                    VestibularQuestion.extra_data.op("->>")("subject").ilike(f"%{search}%"),
                )
            )

        # Count before pagination
        count_q = select(func.count()).select_from(q.subquery())
        total = self.db.execute(count_q).scalar() or 0

        # Paginate + eager load
        q = (
            q.order_by(VestibularQuestion.year.desc(), VestibularQuestion.number.asc())
            .offset((page - 1) * size)
            .limit(size)
            .options(joinedload(VestibularQuestion.options), joinedload(VestibularQuestion.images))
        )
        questions = list(self.db.execute(q).scalars().unique())
        return questions, total

    def get(self, question_id: int) -> Optional[VestibularQuestion]:
        """Fetch single question with options + images."""
        stmt = (
            select(VestibularQuestion)
            .where(VestibularQuestion.id == question_id)
            .options(joinedload(VestibularQuestion.options), joinedload(VestibularQuestion.images))
        )
        return self.db.execute(stmt).scalars().unique().first()

    def create(self, exam_type: str, data: Dict[str, Any]) -> VestibularQuestion:
        """Insert a new vestibular question."""
        config = get_exam_config(exam_type)
        if config is None:
            raise ValueError(f"Unknown exam_type: {exam_type}")

        options_data = data.pop("options", [])
        images_data = data.pop("images", [])

        vq = VestibularQuestion(exam_type=exam_type, **data)
        self.db.add(vq)
        self.db.flush()

        for opt in options_data:
            self.db.add(VestibularQuestionOption(question_id=vq.id, **opt))
        for img in images_data:
            self.db.add(VestibularQuestionImage(question_id=vq.id, **img))

        return vq

    def bulk_create(self, exam_type: str, rows: List[Dict[str, Any]]) -> int:
        """Batch insert questions. Returns count created."""
        config = get_exam_config(exam_type)
        if config is None:
            raise ValueError(f"Unknown exam_type: {exam_type}")

        created = 0
        for row in rows:
            options_data = row.pop("options", [])
            images_data = row.pop("images", [])
            vq = VestibularQuestion(exam_type=exam_type, **row)
            self.db.add(vq)
            self.db.flush()
            for opt in options_data:
                self.db.add(VestibularQuestionOption(question_id=vq.id, **opt))
            for img in images_data:
                self.db.add(VestibularQuestionImage(question_id=vq.id, **img))
            created += 1
        return created

    def get_distinct_years(self, exam_type: str) -> List[int]:
        """Distinct years for an exam type, descending."""
        stmt = (
            select(VestibularQuestion.year)
            .where(VestibularQuestion.exam_type == exam_type)
            .distinct()
            .order_by(VestibularQuestion.year.desc())
        )
        return [r[0] for r in self.db.execute(stmt).all()]

    def get_distinct_areas(self, exam_type: str) -> List[str]:
        """Distinct areas from JSONB metadata, sorted."""
        stmt = (
            select(VestibularQuestion.extra_data.op("->>")("area"))
            .where(
                and_(
                    VestibularQuestion.exam_type == exam_type,
                    VestibularQuestion.extra_data.op("->>")("area").isnot(None),
                )
            )
            .distinct()
            .order_by(VestibularQuestion.extra_data.op("->>")("area"))
        )
        return [r[0] for r in self.db.execute(stmt).all() if r[0]]

    def get_distinct_languages(self, exam_type: str) -> List[str]:
        """Distinct languages from JSONB metadata, sorted."""
        stmt = (
            select(VestibularQuestion.extra_data.op("->>")("language"))
            .where(
                and_(
                    VestibularQuestion.exam_type == exam_type,
                    VestibularQuestion.extra_data.op("->>")("language").isnot(None),
                )
            )
            .distinct()
            .order_by(VestibularQuestion.extra_data.op("->>")("language"))
        )
        return [r[0] for r in self.db.execute(stmt).all() if r[0]]