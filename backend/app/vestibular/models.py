"""Unified vestibular question models.

Replaces 34 per-exam tables with a single schema using JSONB metadata
for exam-specific fields.
"""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Index,
    UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List, Optional

from app.database import Base


class VestibularQuestion(Base):
    __tablename__ = "vestibular_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_type: Mapped[str] = mapped_column(String(30), nullable=False)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    html_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_annulled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    correct_option: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}", default=dict
    )
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    options: Mapped[List["VestibularQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", lazy="selectin"
    )
    images: Mapped[List["VestibularQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        Index("idx_vq_exam_type_year", "exam_type", "year"),
        Index("idx_vq_metadata_gin", "metadata", postgresql_using="gin"),
    )

    def __repr__(self) -> str:
        return f"<VestibularQuestion id={self.id} type={self.exam_type} {self.exam_name} #{self.number}>"


class VestibularQuestionOption(Base):
    __tablename__ = "vestibular_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vestibular_questions.id", ondelete="CASCADE"), nullable=False
    )
    letter: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    question: Mapped[VestibularQuestion] = relationship(back_populates="options")

    __table_args__ = (
        Index("idx_vqo_question", "question_id", "order"),
    )


class VestibularQuestionImage(Base):
    __tablename__ = "vestibular_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vestibular_questions.id", ondelete="CASCADE"), nullable=False
    )
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    question: Mapped[VestibularQuestion] = relationship(back_populates="images")

    __table_args__ = (
        Index("idx_vqi_question", "question_id", "order"),
    )