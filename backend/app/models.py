from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── ENEM Public Question Bank ─────────────────────────────────────────────────


class UserRole(str, PyEnum):
    OWNER = "owner"
    ADMIN = "admin"
    PROFESSOR = "professor"
    STUDENT = "student"


class UserRoleType(TypeDecorator):
    """Reads role as VARCHAR, normalises legacy UPPER-CASE values from the
    PostgreSQL native enum that existed before the column was converted."""
    impl = String(50)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if isinstance(value, UserRole):
            return value.value
        if isinstance(value, str):
            return value.lower()
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        normalised = value.lower() if isinstance(value, str) else value
        try:
            return UserRole(normalised)
        except ValueError:
            return normalised


class QuestionType(str, PyEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    ESSAY = "essay"
    SUMMATION = "summation"


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    logo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plan_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    plan_since: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    car_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # ── Stripe billing ────────────────────────────────────────────────────────
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    stripe_subscription_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    credits_balance: Mapped[int] = mapped_column(Integer, default=0)

    users: Mapped[List["User"]] = relationship(back_populates="institution")
    subjects: Mapped[List["Subject"]] = relationship(back_populates="institution")
    classes: Mapped[List["Class"]] = relationship(back_populates="institution")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    car_access: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # ── Invitation flow ───────────────────────────────────────────────────────
    invitation_token: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True, index=True)
    invitation_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    invitation_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # ── Auto-cadastro / confirmação de e-mail ────────────────────────────────
    email_verification_token: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True, index=True)
    email_verification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # ── Recuperação de senha ("esqueci minha senha") ─────────────────────────
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True, index=True)
    password_reset_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    institution: Mapped["Institution"] = relationship(back_populates="users")
    teaching_assignments: Mapped[List["TeachingAssignment"]] = relationship(
        back_populates="professor", foreign_keys="TeachingAssignment.professor_id"
    )
    enrollments: Mapped[List["StudentClass"]] = relationship(back_populates="student")
    questions: Mapped[List["Question"]] = relationship(back_populates="professor")
    exams: Mapped[List["Exam"]] = relationship(back_populates="professor")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)

    institution: Mapped["Institution"] = relationship(back_populates="subjects")
    teaching_assignments: Mapped[List["TeachingAssignment"]] = relationship(back_populates="subject")
    questions: Mapped[List["Question"]] = relationship(back_populates="subject")
    exams: Mapped[List["Exam"]] = relationship(back_populates="subject")

    __table_args__ = (UniqueConstraint("name", "institution_id"),)


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)

    institution: Mapped["Institution"] = relationship(back_populates="classes")
    teaching_assignments: Mapped[List["TeachingAssignment"]] = relationship(back_populates="class_")
    enrollments: Mapped[List["StudentClass"]] = relationship(back_populates="class_")
    exams: Mapped[List["Exam"]] = relationship(back_populates="class_")

    __table_args__ = (UniqueConstraint("name", "year", "institution_id"),)


class StudentClass(Base):
    __tablename__ = "student_classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)

    student: Mapped["User"] = relationship(back_populates="enrollments")
    class_: Mapped["Class"] = relationship(back_populates="enrollments")

    __table_args__ = (UniqueConstraint("student_id", "class_id"),)


class TeachingAssignment(Base):
    __tablename__ = "teaching_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    professor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)

    professor: Mapped["User"] = relationship(
        back_populates="teaching_assignments", foreign_keys=[professor_id]
    )
    subject: Mapped["Subject"] = relationship(back_populates="teaching_assignments")
    class_: Mapped["Class"] = relationship(back_populates="teaching_assignments")

    __table_args__ = (UniqueConstraint("professor_id", "subject_id", "class_id"),)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False, index=True)
    professor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    subject: Mapped["Subject"] = relationship(back_populates="questions")
    professor: Mapped["User"] = relationship(back_populates="questions")
    options: Mapped[List["QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
    exam_questions: Mapped[List["ExamQuestion"]] = relationship(back_populates="question")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["Question"] = relationship(back_populates="options")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    professor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False, index=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    professor: Mapped["User"] = relationship(back_populates="exams")
    subject: Mapped["Subject"] = relationship(back_populates="exams")
    class_: Mapped["Class"] = relationship(back_populates="exams")
    exam_questions: Mapped[List["ExamQuestion"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.order"
    )


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[float] = mapped_column(default=1.0)

    exam: Mapped["Exam"] = relationship(back_populates="exam_questions")
    question: Mapped["Question"] = relationship(back_populates="exam_questions")
    submission_answers: Mapped[List["SubmissionAnswer"]] = relationship(back_populates="exam_question")

    __table_args__ = (UniqueConstraint("exam_id", "question_id"),)


class SubmissionStatus(str, PyEnum):
    PENDING = "pending"       # aluno entregou, aguardando correção
    CORRECTING = "correcting" # correção em andamento
    DONE = "done"             # corrigido, aguardando professor disponibilizar
    RELEASED = "released"     # nota visível ao aluno


class ExamSubmission(Base):
    __tablename__ = "exam_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    total_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    scan_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Marca quando o status virou CORRECTING pela última vez. Serve só pra distinguir
    # "rodando agora" de "travado há muito tempo" na UI — não é atualizado em nenhuma
    # outra transição de status.
    correcting_since: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    exam: Mapped["Exam"] = relationship()
    student: Mapped["User"] = relationship()
    answers: Mapped[List["SubmissionAnswer"]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("exam_id", "student_id"),)


class SubmissionAnswer(Base):
    __tablename__ = "submission_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("exam_submissions.id"), nullable=False, index=True)
    exam_question_id: Mapped[int] = mapped_column(ForeignKey("exam_questions.id"), nullable=False, index=True)
    selected_option_id: Mapped[Optional[int]] = mapped_column(ForeignKey("question_options.id"), nullable=True)
    essay_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    essay_image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_auto_corrected: Mapped[bool] = mapped_column(Boolean, default=False)

    submission: Mapped["ExamSubmission"] = relationship(back_populates="answers")
    exam_question: Mapped["ExamQuestion"] = relationship(back_populates="submission_answers")
    selected_option: Mapped[Optional["QuestionOption"]] = relationship()


class UsageEventType(str, PyEnum):
    AI_GENERATION = "ai_generation"   # questão gerada por IA
    AI_CORRECTION = "ai_correction"   # discursiva corrigida por IA


class UsageEvent(Base):
    """Registro granular de consumo de recursos limitados por plano.

    Cada evento é atribuído ao professor (user_id) e à instituição, e marca
    se ultrapassou a cota mensal do plano (is_overage) para faturamento futuro
    de créditos avulsos.
    """
    __tablename__ = "usage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    is_overage: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)


class EnemQuestion(Base):
    __tablename__ = "enem_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    color: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # cor do caderno: "Azul", "Amarelo" etc.
    module: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # ex.: "Dia 1", "Caderno 1"
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # matéria fina, ex.: "História"
    difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Fácil" | "Médio" | "Difícil"
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["EnemQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="EnemQuestionOption.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class EnemQuestionOption(Base):
    __tablename__ = "enem_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("enem_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["EnemQuestion"] = relationship(back_populates="options")


class UfrgsQuestion(Base):
    __tablename__ = "ufrgs_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1 ou 2
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UfrgsQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfrgsQuestionOption.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number"),)


class UfrgsQuestionOption(Base):
    __tablename__ = "ufrgs_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufrgs_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfrgsQuestion"] = relationship(back_populates="options")


class PucprQuestion(Base):
    __tablename__ = "pucpr_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Verão" | "Inverno"
    course: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "Medicina" | "Demais Cursos"
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Amarela" | "Branca" | "Única"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" (eletiva)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["PucprQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucprQuestionOption.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class PucprQuestionOption(Base):
    __tablename__ = "pucpr_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucpr_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucprQuestion"] = relationship(back_populates="options")


class AcafeQuestion(Base):
    __tablename__ = "acafe_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Verão" | "Inverno"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_matrix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["AcafeQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="AcafeQuestionOption.order"
    )
    images: Mapped[List["AcafeQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="AcafeQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class AcafeQuestionImage(Base):
    __tablename__ = "acafe_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("acafe_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["AcafeQuestion"] = relationship(back_populates="images")


class AcafeQuestionOption(Base):
    __tablename__ = "acafe_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("acafe_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["AcafeQuestion"] = relationship(back_populates="options")


class UfprQuestion(Base):
    __tablename__ = "ufpr_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UFPR")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UfprQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfprQuestionOption.order"
    )
    images: Mapped[List["UfprQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfprQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class UfprQuestionImage(Base):
    __tablename__ = "ufpr_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufpr_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfprQuestion"] = relationship(back_populates="images")


class UfprQuestionOption(Base):
    __tablename__ = "ufpr_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufpr_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfprQuestion"] = relationship(back_populates="options")


# ── UFSC (Vestibular UFSC/IFSC/IFC) ─────────────────────────────────────────


class UfscQuestion(Base):
    __tablename__ = "ufsc_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UFSC")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)   # "1" | "2"
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)   # "amarela" | "azul" etc.
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="summation")  # "summation" | "discursive"
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # gabarito numérico (soma)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UfscQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfscQuestionOption.order"
    )
    images: Mapped[List["UfscQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfscQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class UfscQuestionImage(Base):
    __tablename__ = "ufsc_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufsc_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfscQuestion"] = relationship(back_populates="images")


class UfscQuestionOption(Base):
    __tablename__ = "ufsc_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufsc_questions.id"), nullable=False, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)  # potência de 2: 01, 02, 04, 08, 16, 32, 64
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfscQuestion"] = relationship(back_populates="options")


# ── Simulado (Mock Exam) ──────────────────────────────────────────────────────


class Simulado(Base):
    __tablename__ = "simulados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    exam_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "enem" | "acafe" | "ufpr" | "ufsc" | "ufrgs" | "pucpr"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | correcting | done
    current_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    # Estimativa de nota no estilo ENEM (0-1000) — ver app/services/enem/scoring.py.
    enem_estimated_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    enem_score_breakdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON: {"overall", "by_area"}
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    student: Mapped["User"] = relationship()
    questions: Mapped[List["SimuladoQuestion"]] = relationship(
        back_populates="simulado", cascade="all, delete-orphan", order_by="SimuladoQuestion.order"
    )


class SimuladoQuestion(Base):
    __tablename__ = "simulado_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    simulado_id: Mapped[int] = mapped_column(ForeignKey("simulados.id"), nullable=False, index=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ufpel_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufpel_questions.id"), nullable=True)
    pucrio_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pucrio_questions.id"), nullable=True)
    ita_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ita_questions.id"), nullable=True)
    unesp_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unesp_questions.id"), nullable=True)
    cebraspe_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cebraspe_questions.id"), nullable=True)
    unifesp_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unifesp_questions.id"), nullable=True)
    enem_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("enem_questions.id"), nullable=True)
    acafe_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("acafe_questions.id"), nullable=True)
    ufpr_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufpr_questions.id"), nullable=True)
    ufsc_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufsc_questions.id"), nullable=True)
    ufrgs_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufrgs_questions.id"), nullable=True)
    pucpr_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pucpr_questions.id"), nullable=True)
    fuvest_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("fuvest_questions.id"), nullable=True)
    udesc_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("udesc_questions.id"), nullable=True)
    ufgd_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufgd_questions.id"), nullable=True)
    uem_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uem_questions.id"), nullable=True)
    ufms_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufms_questions.id"), nullable=True)
    ufg_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufg_questions.id"), nullable=True)
    ufjf_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufjf_questions.id"), nullable=True)
    ufu_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufu_questions.id"), nullable=True)
    ufpa_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufpa_questions.id"), nullable=True)
    utfpr_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("utfpr_questions.id"), nullable=True)
    unioeste_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unioeste_questions.id"), nullable=True)
    uel_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uel_questions.id"), nullable=True)
    espm_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("espm_questions.id"), nullable=True)
    fgv_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("fgv_questions.id"), nullable=True)
    uerj_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uerj_questions.id"), nullable=True)
    unicamp_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unicamp_questions.id"), nullable=True)
    pucrs_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pucrs_questions.id"), nullable=True)
    pucminas_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pucminas_questions.id"), nullable=True)
    ufrn_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufrn_questions.id"), nullable=True)
    ufsm_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufsm_questions.id"), nullable=True)
    ufam_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ufam_questions.id"), nullable=True)
    puccampinas_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("puccampinas_questions.id"), nullable=True)
    unimontes_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unimontes_questions.id"), nullable=True)
    unicentro_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unicentro_questions.id"), nullable=True)
    unaerp_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unaerp_questions.id"), nullable=True)
    # Student's answer
    # A-E para questão de alternativa única; questão tipo somatório (UFSC)
    # guarda várias letras separadas por vírgula (ex.: "A,C,D") — o aluno
    # marca quantas afirmativas achar verdadeiras, e a nota é a soma dos
    # valores das marcadas comparada ao gabarito.
    selected_letter: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    simulado: Mapped["Simulado"] = relationship(back_populates="questions")
    enem_question: Mapped[Optional["EnemQuestion"]] = relationship()
    acafe_question: Mapped[Optional["AcafeQuestion"]] = relationship()
    ufpr_question: Mapped[Optional["UfprQuestion"]] = relationship()
    ufsc_question: Mapped[Optional["UfscQuestion"]] = relationship()
    ufrgs_question: Mapped[Optional["UfrgsQuestion"]] = relationship()
    ufpel_question: Mapped[Optional["UfpelQuestion"]] = relationship()
    pucrio_question: Mapped[Optional["PucRioQuestion"]] = relationship()
    ita_question: Mapped[Optional["ItaQuestion"]] = relationship()
    unesp_question: Mapped[Optional["UnespQuestion"]] = relationship()
    cebraspe_question: Mapped[Optional["CebraspeQuestion"]] = relationship()
    unifesp_question: Mapped[Optional["UnifespQuestion"]] = relationship()
    pucpr_question: Mapped[Optional["PucprQuestion"]] = relationship()
    fuvest_question: Mapped[Optional["FuvestQuestion"]] = relationship()
    udesc_question: Mapped[Optional["UdescQuestion"]] = relationship()
    ufgd_question: Mapped[Optional["UfgdQuestion"]] = relationship()
    uem_question: Mapped[Optional["UemQuestion"]] = relationship()
    ufms_question: Mapped[Optional["UfmsQuestion"]] = relationship()
    ufg_question: Mapped[Optional["UfgQuestion"]] = relationship()
    ufjf_question: Mapped[Optional["UfjfQuestion"]] = relationship()
    ufu_question: Mapped[Optional["UfuQuestion"]] = relationship()
    ufpa_question: Mapped[Optional["UfpaQuestion"]] = relationship()
    utfpr_question: Mapped[Optional["UtfprQuestion"]] = relationship()
    unioeste_question: Mapped[Optional["UnioesteQuestion"]] = relationship()
    uel_question: Mapped[Optional["UelQuestion"]] = relationship()
    espm_question: Mapped[Optional["EspmQuestion"]] = relationship()
    fgv_question: Mapped[Optional["FgvQuestion"]] = relationship()
    uerj_question: Mapped[Optional["UerjQuestion"]] = relationship()
    unicamp_question: Mapped[Optional["UnicampQuestion"]] = relationship()
    pucrs_question: Mapped[Optional["PucrsQuestion"]] = relationship()
    pucminas_question: Mapped[Optional["PucminasQuestion"]] = relationship()
    ufrn_question: Mapped[Optional["UfrnQuestion"]] = relationship()
    ufsm_question: Mapped[Optional["UfsmQuestion"]] = relationship()
    ufam_question: Mapped[Optional["UfamQuestion"]] = relationship()
    puccampinas_question: Mapped[Optional["PuccampinasQuestion"]] = relationship()
    unimontes_question: Mapped[Optional["UnimontesQuestion"]] = relationship()
    unicentro_question: Mapped[Optional["UnicentroQuestion"]] = relationship()
    unaerp_question: Mapped[Optional["UnaerpQuestion"]] = relationship()


# ── Denúncia de questão problemática ──────────────────────────────────────────
#
# `exam_type` + `question_id` apontam pra linha real na tabela de questões
# daquele banco (ex.: exam_type="ufsc", question_id=123 -> ufsc_questions.id)
# — sem FK de verdade porque o alvo muda de tabela conforme o banco (mesmo
# padrão de EXAM_TYPE_MODELS em app/routers/simulados.py). Enquanto existir
# relatório "pending" pra um (exam_type, question_id), essa questão é
# excluída do sorteio de novos simulados (ver _pick_questions) até o owner
# revisar: corrigir e liberar, ou excluir a questão em definitivo.

class QuestionReport(Base):
    __tablename__ = "question_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    student: Mapped["User"] = relationship()


# ── CAR – Correção Automática de Redações ─────────────────────────────────────


class RedacaoStatus(str, PyEnum):
    PENDING = "pending"          # submitted, not yet sent to AI
    CORRECTING = "correcting"    # AI correction in progress
    AI_DONE = "ai_done"          # AI finished, waiting for professor review
    REVIEWED = "reviewed"        # professor has validated/overridden


class Redacao(Base):
    """An essay submitted by a student for AI + professor correction."""
    __tablename__ = "redacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    professor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    # Prompt / tema
    theme: Mapped[str] = mapped_column(String(500), nullable=False)
    # Optional rubric defined by professor before submission
    rubric: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Maximum score for this essay (professor-configurable, default 10)
    max_score: Mapped[float] = mapped_column(nullable=False, default=10.0)

    # Student text
    body: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=RedacaoStatus.PENDING)

    # AI scores/feedback (filled after AI correction)
    ai_total_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Final scores (professor-validated; mirrors ai values until overridden)
    final_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    professor_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    corrected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    institution: Mapped["Institution"] = relationship()
    student: Mapped["User"] = relationship(foreign_keys=[student_id])
    professor: Mapped[Optional["User"]] = relationship(foreign_keys=[professor_id])
    criteria_scores: Mapped[List["RedacaoCriterionScore"]] = relationship(
        back_populates="redacao", cascade="all, delete-orphan"
    )


class RedacaoCriterionScore(Base):
    """Per-criterion AI score that the professor can override."""
    __tablename__ = "redacao_criterion_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    redacao_id: Mapped[int] = mapped_column(ForeignKey("redacoes.id"), nullable=False, index=True)

    criterion: Mapped[str] = mapped_column(String(200), nullable=False)  # e.g. "Coesão"
    max_points: Mapped[float] = mapped_column(nullable=False)
    ai_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    ai_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_score: Mapped[Optional[float]] = mapped_column(nullable=True)  # None → use ai_score
    professor_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    redacao: Mapped["Redacao"] = relationship(back_populates="criteria_scores")


class FuvestQuestion(Base):
    __tablename__ = "fuvest_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "V1", "V", "K"... (caderno usado)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["FuvestQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="FuvestQuestionOption.order"
    )
    images: Mapped[List["FuvestQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="FuvestQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number"),)


class FuvestQuestionOption(Base):
    __tablename__ = "fuvest_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("fuvest_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["FuvestQuestion"] = relationship(back_populates="options")


class FuvestQuestionImage(Base):
    __tablename__ = "fuvest_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("fuvest_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["FuvestQuestion"] = relationship(back_populates="images")

# ── UNESP (Universidade Estadual Paulista) ─────────────────────────────

class UnespQuestion(Base):
    __tablename__ = "unesp_questions"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    options: Mapped[list["UnespQuestionOption"]] = relationship(
        "UnespQuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["UnespQuestionImage"]] = relationship(
        "UnespQuestionImage",
        back_populates="question",
        cascade="all, delete-orphan",
    )

class UnespQuestionOption(Base):
    __tablename__ = "unesp_question_options"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("unesp_questions.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["UnespQuestion"] = relationship("UnespQuestion", back_populates="options")

class UnespQuestionImage(Base):
    __tablename__ = "unesp_question_images"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("unesp_questions.id", ondelete="CASCADE"), nullable=False)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["UnespQuestion"] = relationship("UnespQuestion", back_populates="images")


# ── CEBRASPE / UnB ───────────────────────────────────────────────────────────

class CebraspeQuestion(Base):
    __tablename__ = "cebraspe_questions"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    exam_name: Mapped[str] = mapped_column(String, nullable=False) # Ex: Vestibular UnB, PAS 1, etc
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    options: Mapped[list["CebraspeQuestionOption"]] = relationship(
        "CebraspeQuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["CebraspeQuestionImage"]] = relationship(
        "CebraspeQuestionImage",
        back_populates="question",
        cascade="all, delete-orphan",
    )

class CebraspeQuestionOption(Base):
    __tablename__ = "cebraspe_question_options"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("cebraspe_questions.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["CebraspeQuestion"] = relationship("CebraspeQuestion", back_populates="options")

class CebraspeQuestionImage(Base):
    __tablename__ = "cebraspe_question_images"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("cebraspe_questions.id", ondelete="CASCADE"), nullable=False)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["CebraspeQuestion"] = relationship("CebraspeQuestion", back_populates="images")


# ── UNIFESP (Universidade Federal de São Paulo) ──────────────────────────────

class UnifespQuestion(Base):
    __tablename__ = "unifesp_questions"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    options: Mapped[list["UnifespQuestionOption"]] = relationship(
        "UnifespQuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["UnifespQuestionImage"]] = relationship(
        "UnifespQuestionImage",
        back_populates="question",
        cascade="all, delete-orphan",
    )

class UnifespQuestionOption(Base):
    __tablename__ = "unifesp_question_options"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("unifesp_questions.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["UnifespQuestion"] = relationship("UnifespQuestion", back_populates="options")

class UnifespQuestionImage(Base):
    __tablename__ = "unifesp_question_images"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("unifesp_questions.id", ondelete="CASCADE"), nullable=False)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["UnifespQuestion"] = relationship("UnifespQuestion", back_populates="images")


class UdescQuestion(Base):
    __tablename__ = "udesc_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 ou 2
    shift: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Matutino" | "Vespertino"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UdescQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UdescQuestionOption.order"
    )
    images: Mapped[List["UdescQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UdescQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class UdescQuestionOption(Base):
    __tablename__ = "udesc_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("udesc_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UdescQuestion"] = relationship(back_populates="options")


class UdescQuestionImage(Base):
    __tablename__ = "udesc_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("udesc_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UdescQuestion"] = relationship(back_populates="images")


class PucrsQuestion(Base):
    __tablename__ = "pucrs_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Verão" | "Inverno"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["PucrsQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucrsQuestionOption.order"
    )
    images: Mapped[List["PucrsQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucrsQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class PucrsQuestionOption(Base):
    __tablename__ = "pucrs_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucrs_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucrsQuestion"] = relationship(back_populates="options")


class PucrsQuestionImage(Base):
    __tablename__ = "pucrs_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucrs_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucrsQuestion"] = relationship(back_populates="images")


class UfpelQuestion(Base):
    __tablename__ = "ufpel_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    stage: Mapped[int] = mapped_column(Integer, nullable=False)  # etapa 1, 2 ou 3
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UfpelQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfpelQuestionOption.order"
    )
    images: Mapped[List["UfpelQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfpelQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number"),)


class UfpelQuestionOption(Base):
    __tablename__ = "ufpel_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufpel_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfpelQuestion"] = relationship(back_populates="options")


class UfpelQuestionImage(Base):
    __tablename__ = "ufpel_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufpel_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfpelQuestion"] = relationship(back_populates="images")


class PucRioQuestion(Base):
    __tablename__ = "pucrio_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Inglês" | "Espanhol" | NULL
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["PucRioQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucRioQuestionOption.order"
    )
    images: Mapped[List["PucRioQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucRioQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "language"),)


class PucRioQuestionOption(Base):
    __tablename__ = "pucrio_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucrio_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucRioQuestion"] = relationship(back_populates="options")


class PucRioQuestionImage(Base):
    __tablename__ = "pucrio_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucrio_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucRioQuestion"] = relationship(back_populates="images")


# ── ITA (Instituto Tecnológico de Aeronáutica) ─────────────────────────────────────────


class ItaQuestion(Base):
    __tablename__ = "ita_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="ITA")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)   # "1" | "2"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")  # "multiple_choice" | "discursive"
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. "Matemática", "Física"
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g. "Inglês"
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "A"-"E", "*" (anulada)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["ItaQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="ItaQuestionOption.order"
    )
    images: Mapped[List["ItaQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="ItaQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class ItaQuestionOption(Base):
    __tablename__ = "ita_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ita_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["ItaQuestion"] = relationship(back_populates="options")


class ItaQuestionImage(Base):
    __tablename__ = "ita_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ita_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["ItaQuestion"] = relationship(back_populates="images")


# ── UNICAMP (Universidade Estadual de Campinas) ────────────────────────────────────────


class UnicampQuestion(Base):
    __tablename__ = "unicamp_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UNICAMP")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)   # "1" | "2"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")  # "multiple_choice" | "discursive"
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. "Matemática", "Física"
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g. "Inglês"
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "A"-"D", "*" (anulada)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UnicampQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnicampQuestionOption.order"
    )
    images: Mapped[List["UnicampQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnicampQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class UnicampQuestionOption(Base):
    __tablename__ = "unicamp_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unicamp_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnicampQuestion"] = relationship(back_populates="options")


class UnicampQuestionImage(Base):
    __tablename__ = "unicamp_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unicamp_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnicampQuestion"] = relationship(back_populates="images")


# ── FGV (Fundação Getulio Vargas) ──────────────────────────────────────────────


class FgvQuestion(Base):
    __tablename__ = "fgv_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="FGV")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["FgvQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="FgvQuestionOption.order"
    )
    images: Mapped[List["FgvQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="FgvQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class FgvQuestionOption(Base):
    __tablename__ = "fgv_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("fgv_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["FgvQuestion"] = relationship(back_populates="options")


class FgvQuestionImage(Base):
    __tablename__ = "fgv_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("fgv_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["FgvQuestion"] = relationship(back_populates="images")


# ── ESPM (Escola Superior de Propaganda e Marketing) ───────────────────────────


class EspmQuestion(Base):
    __tablename__ = "espm_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="ESPM")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["EspmQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="EspmQuestionOption.order"
    )
    images: Mapped[List["EspmQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="EspmQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class EspmQuestionOption(Base):
    __tablename__ = "espm_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("espm_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["EspmQuestion"] = relationship(back_populates="options")


class EspmQuestionImage(Base):
    __tablename__ = "espm_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("espm_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["EspmQuestion"] = relationship(back_populates="images")


class UerjQuestion(Base):
    __tablename__ = "uerj_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UERJ")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UerjQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UerjQuestionOption.order"
    )
    images: Mapped[List["UerjQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UerjQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class UerjQuestionOption(Base):
    __tablename__ = "uerj_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("uerj_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UerjQuestion"] = relationship(back_populates="options")


class UerjQuestionImage(Base):
    __tablename__ = "uerj_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("uerj_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UerjQuestion"] = relationship(back_populates="images")


# ── UFGD ──────────────────────────────────────────────────────────────────────


class UfgdQuestion(Base):
    __tablename__ = "ufgd_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UFGD")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="multiple_choice")
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UfgdQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfgdQuestionOption.order"
    )
    images: Mapped[List["UfgdQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfgdQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class UfgdQuestionOption(Base):
    __tablename__ = "ufgd_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufgd_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfgdQuestion"] = relationship(back_populates="options")


class UfgdQuestionImage(Base):
    __tablename__ = "ufgd_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufgd_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfgdQuestion"] = relationship(back_populates="images")


# ── UEM ───────────────────────────────────────────────────────────────────────


class UemQuestion(Base):
    __tablename__ = "uem_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    university: Mapped[str] = mapped_column(String(50), nullable=False, default="UEM")
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # "Inverno", "Verão"
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, default="summation")
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # soma
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["UemQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UemQuestionOption.order"
    )
    images: Mapped[List["UemQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UemQuestionImage.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class UemQuestionOption(Base):
    __tablename__ = "uem_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("uem_questions.id"), nullable=False, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False) # 01, 02, 04, 08, 16
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UemQuestion"] = relationship(back_populates="options")


class UemQuestionImage(Base):
    __tablename__ = "uem_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("uem_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UemQuestion"] = relationship(back_populates="images")


# ── UFMS – Importador de Provas ──────────────────────────────────────────────

class UfmsQuestion(Base):
    __tablename__ = "ufms_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    stage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # e.g. 1 (inverno), 2 (verão), etc.
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    html_statement: Mapped[str] = mapped_column(Text, nullable=False)
    
    correct_option: Mapped[Optional[str]] = mapped_column(String, nullable=True) # 'A', 'B', 'C', 'D', 'E'
    is_annulled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[List["UfmsQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfmsQuestionOption.order"
    )
    images: Mapped[List["UfmsQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfmsQuestionImage.order"
    )


class UfmsQuestionOption(Base):
    __tablename__ = "ufms_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufms_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String, nullable=False) # 'A', 'B', 'C', 'D', 'E'
    html_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfmsQuestion"] = relationship(back_populates="options")


class UfmsQuestionImage(Base):
    __tablename__ = "ufms_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufms_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfmsQuestion"] = relationship(back_populates="images")


class UfgQuestion(Base):
    __tablename__ = "ufg_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfgQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfgQuestionOption.order"
    )

class UfgQuestionOption(Base):
    __tablename__ = "ufg_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufg_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfgQuestion"] = relationship(back_populates="options")


class UfjfQuestion(Base):
    __tablename__ = "ufjf_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # O vestibular PISM da UFJF publica cadernos separados por dia, módulo
    # (I/II/III) e, no Módulo III, por área (Economia, Exatas, Humanas,
    # Saúde) -- cada um reinicia a numeração em 1. `exam_name` (ex.: "UFJF
    # PISM 2023 - Dia 2 - Módulo III - Exatas") garante unicidade e
    # idempotência do import, do mesmo jeito que em UnaerpQuestion.
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfjfQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfjfQuestionOption.order"
    )

class UfjfQuestionOption(Base):
    __tablename__ = "ufjf_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufjf_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfjfQuestion"] = relationship(back_populates="options")


class UfuQuestion(Base):
    __tablename__ = "ufu_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Cada edição de ano publica 4 cadernos embaralhados ("Tipo 1".."Tipo 4"),
    # cada um com sua própria numeração 1..N reaproveitada entre tipos e anos.
    # exam_name (ex.: "UFU 2025 – Tipo 1") garante unicidade e idempotência do
    # import, seguindo o mesmo padrão usado em UnaerpQuestion.exam_name.
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfuQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfuQuestionOption.order"
    )

class UfuQuestionOption(Base):
    __tablename__ = "ufu_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufu_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfuQuestion"] = relationship(back_populates="options")


class UfpaQuestion(Base):
    __tablename__ = "ufpa_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfpaQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfpaQuestionOption.order"
    )

class UfpaQuestionOption(Base):
    __tablename__ = "ufpa_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufpa_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfpaQuestion"] = relationship(back_populates="options")


class UtfprQuestion(Base):
    __tablename__ = "utfpr_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UtfprQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UtfprQuestionOption.order"
    )

class UtfprQuestionOption(Base):
    __tablename__ = "utfpr_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("utfpr_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UtfprQuestion"] = relationship(back_populates="options")


class UnioesteQuestion(Base):
    __tablename__ = "unioeste_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UnioesteQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnioesteQuestionOption.order"
    )

class UnioesteQuestionOption(Base):
    __tablename__ = "unioeste_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unioeste_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnioesteQuestion"] = relationship(back_populates="options")


class UelQuestion(Base):
    __tablename__ = "uel_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UelQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UelQuestionOption.order"
    )

class UelQuestionOption(Base):
    __tablename__ = "uel_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("uel_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UelQuestion"] = relationship(back_populates="options")


class PucminasQuestion(Base):
    __tablename__ = "pucminas_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    # O vestibular próprio da PUC Minas publica, por semestre, um caderno por
    # TRILHA de cursos (Medicina: sempre 50 questões; qualquer outra trilha —
    # "Demais Cursos" ou agrupamentos específicos como "Direito/Psicologia":
    # sempre 40 questões), cada um com numeração própria reiniciada em 1 —
    # exam_name diferencia cada caderno (ano/semestre/trilha). subject
    # diferencia a disciplina dentro do caderno — necessário porque as
    # questões de Língua Estrangeira (Espanhol/Inglês) se repetem sob os
    # mesmos números, uma vez por idioma.
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["PucminasQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucminasQuestionOption.order"
    )
    images: Mapped[list["PucminasQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PucminasQuestionImage.order"
    )

class PucminasQuestionOption(Base):
    __tablename__ = "pucminas_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucminas_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucminasQuestion"] = relationship(back_populates="options")


class PucminasQuestionImage(Base):
    __tablename__ = "pucminas_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("pucminas_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PucminasQuestion"] = relationship(back_populates="images")


class UfrnQuestion(Base):
    __tablename__ = "ufrn_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfrnQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfrnQuestionOption.order"
    )

class UfrnQuestionOption(Base):
    __tablename__ = "ufrn_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufrn_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfrnQuestion"] = relationship(back_populates="options")


class UfsmQuestion(Base):
    __tablename__ = "ufsm_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfsmQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfsmQuestionOption.order"
    )

class UfsmQuestionOption(Base):
    __tablename__ = "ufsm_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufsm_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfsmQuestion"] = relationship(back_populates="options")


class UlbraQuestion(Base):
    __tablename__ = "ulbra_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    # Rótulo da edição dentro do ano (ULBRA/Canoas publica 2 processos
    # seletivos por ano, ex.: "2019-1" para o de 02/06/2019 e "2019-2" para
    # o de 20/10/2019 — ver docstring de app/services/ulbra/pdf_import.py).
    edition: Mapped[str] = mapped_column(String, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UlbraQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UlbraQuestionOption.order"
    )

class UlbraQuestionOption(Base):
    __tablename__ = "ulbra_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ulbra_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UlbraQuestion"] = relationship(back_populates="options")


class UfamQuestion(Base):
    __tablename__ = "ufam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    stage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UfamQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UfamQuestionOption.order"
    )

class UfamQuestionOption(Base):
    __tablename__ = "ufam_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("ufam_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UfamQuestion"] = relationship(back_populates="options")


class PuccampinasQuestion(Base):
    __tablename__ = "puccampinas_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["PuccampinasQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PuccampinasQuestionOption.order"
    )
    images: Mapped[list["PuccampinasQuestionImage"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="PuccampinasQuestionImage.order"
    )

class PuccampinasQuestionOption(Base):
    __tablename__ = "puccampinas_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("puccampinas_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PuccampinasQuestion"] = relationship(back_populates="options")


class PuccampinasQuestionImage(Base):
    __tablename__ = "puccampinas_question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("puccampinas_questions.id"), nullable=False, index=True)
    image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["PuccampinasQuestion"] = relationship(back_populates="images")


class UnimontesQuestion(Base):
    __tablename__ = "unimontes_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    # O vestibular próprio da UNIMONTES publica, por edição, 8 cadernos (2
    # grupos x 4 áreas), cada um com numeração própria de 1 a 45 — e dentro
    # de cada caderno as questões 16-19 (Língua Estrangeira) se repetem duas
    # vezes (Espanhol/Inglês, à escolha do candidato). `exam_name` diferencia
    # cada caderno (ano/edital/grupo/área) e `subject` diferencia a
    # disciplina dentro do caderno — necessário para não colidir as duas
    # versões de Língua Estrangeira sob o mesmo número de questão.
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UnimontesQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnimontesQuestionOption.order"
    )

class UnimontesQuestionOption(Base):
    __tablename__ = "unimontes_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unimontes_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnimontesQuestion"] = relationship(back_populates="options")


class UnicentroQuestion(Base):
    __tablename__ = "unicentro_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    # A prova é dividida em áreas de conhecimento (Língua Portuguesa, Inglês,
    # Biologia, ...) cada uma com sua própria numeração reiniciada em 1 — sem
    # esse campo, `number` sozinho colidiria entre áreas de um mesmo ano.
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UnicentroQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnicentroQuestionOption.order"
    )

class UnicentroQuestionOption(Base):
    __tablename__ = "unicentro_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unicentro_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnicentroQuestion"] = relationship(back_populates="options")


class UnaerpQuestion(Base):
    __tablename__ = "unaerp_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Cada edição (ano/semestre) publica dois cadernos distintos ("Geral" -
    # 40 questões, todos os cursos exceto Medicina; "Medicina" - 60 questões)
    # com numeração 1..N que se sobrepõe entre si e entre semestres. `year`
    # sozinho não é suficiente para diferenciar; exam_name (ex.: "UNAERP
    # 2025/1 – Geral") é o que garante unicidade e idempotência do import.
    exam_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UnaerpQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UnaerpQuestionOption.order"
    )

class UnaerpQuestionOption(Base):
    __tablename__ = "unaerp_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("unaerp_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UnaerpQuestion"] = relationship(back_populates="options")


class UpfQuestion(Base):
    __tablename__ = "upf_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # exam_name (ex.: "UPF Verão 2025") + number + area garantem unicidade:
    # questões de Língua Estrangeira reaproveitam a mesma numeração (17-24)
    # pra Inglês e Espanhol, diferenciadas só pelo campo `area`.
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["UpfQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="UpfQuestionOption.order"
    )

    __table_args__ = (UniqueConstraint("exam_name", "number", "area"),)


class UpfQuestionOption(Base):
    __tablename__ = "upf_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("upf_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["UpfQuestion"] = relationship(back_populates="options")


# ── Concursos FEPESE (concursos públicos / processos seletivos catarinenses) ──
# Diferente das universidades (1 tabela por instituição, banca própria), a
# FEPESE organiza concursos de dezenas de órgãos/municípios diferentes com o
# MESMO formato de PDF — então 1 tabela cobre todos os concursos dessa banca,
# distinguidos por `concurso_slug` (o subdomínio, ex.: "2024psconcordiasaude").


class ConcursoFepeseQuestion(Base):
    __tablename__ = "concurso_fepese_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    concurso_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex.: "2024psconcordiasaude"
    orgao: Mapped[str] = mapped_column(String(200), nullable=False)  # ex.: "Município de Concórdia"
    edital: Mapped[str] = mapped_column(String(30), nullable=False)  # ex.: "004/2024"
    exam_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "ps" | "cp" | ...
    cargo: Mapped[str] = mapped_column(String(200), nullable=False)  # ex.: "Motorista Socorrista"
    cargo_code: Mapped[str] = mapped_column(String(20), nullable=False)  # ex.: "F1" (nome do arquivo no site)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # ex.: "Língua Portuguesa"
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    options: Mapped[List["ConcursoFepeseQuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="ConcursoFepeseQuestionOption.order"
    )

    __table_args__ = (UniqueConstraint("concurso_slug", "cargo_code", "number"),)


class ConcursoFepeseQuestionOption(Base):
    __tablename__ = "concurso_fepese_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("concurso_fepese_questions.id"), nullable=False, index=True)
    letter: Mapped[str] = mapped_column(String(1), nullable=False)  # A-E
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["ConcursoFepeseQuestion"] = relationship(back_populates="options")


