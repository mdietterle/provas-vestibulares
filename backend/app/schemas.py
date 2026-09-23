from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr

from app.models import QuestionType, SubmissionStatus, UserRole  # EnemQuestion imported separately


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ── Institution ───────────────────────────────────────────────────────────────

class InstitutionCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    cnpj: Optional[str] = None
    logo: Optional[str] = None  # base64 encoded image


class InstitutionOut(BaseModel):
    id: int
    name: str
    cnpj: Optional[str]
    logo: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None  # None para alunos criados via convite
    role: UserRole
    institution_id: int
    car_access: bool = False


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    car_access: Optional[bool] = None


class InvitationStatus(str):
    PENDING = "pending"       # convite ainda não acessado
    LINK_OPENED = "link_opened"  # aluno abriu o link mas não definiu senha
    ACCEPTED = "accepted"    # aluno definiu senha (conta ativa no plano)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    car_access: bool = False
    avatar: Optional[str] = None
    deleted_at: Optional[datetime] = None
    institution_id: Optional[int] = None
    pending_institution_name: Optional[str] = None
    car_enabled: bool = False
    institution_verified: bool = True
    created_at: datetime
    invitation_sent_at: Optional[datetime] = None
    invitation_accepted_at: Optional[datetime] = None
    invitation_status: Optional[str] = None  # "pending" | "accepted"

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: "User") -> "UserOut":  # type: ignore[name-defined]
        inst = getattr(user, "institution", None)
        inv_status: Optional[str] = None
        if user.role == "student" and user.invitation_sent_at is not None:
            inv_status = "accepted" if user.invitation_accepted_at else "pending"
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            car_access=bool(user.car_access),
            avatar=user.avatar,
            deleted_at=user.deleted_at,
            institution_id=user.institution_id,
            pending_institution_name=user.pending_institution_name,
            car_enabled=bool(inst.car_enabled) if inst else False,
            institution_verified=bool(inst.is_verified) if inst else False,
            created_at=user.created_at,
            invitation_sent_at=user.invitation_sent_at,
            invitation_accepted_at=user.invitation_accepted_at,
            invitation_status=inv_status,
        )


# ── Convite / Magic Link ──────────────────────────────────────────────────────

class InvitationAccept(BaseModel):
    token: str
    password: str


# ── Auto-cadastro / confirmação de e-mail ──────────────────────────────────────

class StudentRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None  # usado quando o aluno digita uma instituição nova


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class InstitutionPublicOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# ── Subject ───────────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str


class SubjectUpdate(BaseModel):
    name: Optional[str] = None


class SubjectOut(BaseModel):
    id: int
    name: str
    institution_id: int

    model_config = {"from_attributes": True}

# ── Class ─────────────────────────────────────────────────────────────────────

class ClassCreate(BaseModel):
    name: str
    year: int


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = None


class ClassOut(BaseModel):
    id: int
    name: str
    year: int
    institution_id: int

    model_config = {"from_attributes": True}


# ── Enrollments ───────────────────────────────────────────────────────────────

class StudentEnrollment(BaseModel):
    student_id: int
    class_id: int


class TeachingAssignmentCreate(BaseModel):
    professor_id: int
    subject_id: int
    class_id: int


class TeachingAssignmentOut(BaseModel):
    id: int
    professor_id: int
    subject_id: int
    class_id: int
    professor: UserOut
    subject: SubjectOut
    class_: ClassOut

    model_config = {"from_attributes": True}


# ── Question ──────────────────────────────────────────────────────────────────

class QuestionOptionCreate(BaseModel):
    text: str
    is_correct: bool = False
    order: int = 0


class QuestionOptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    statement: str
    question_type: QuestionType
    is_public: bool = False
    difficulty: Optional[str] = None
    criteria: Optional[str] = None
    image_base64: Optional[str] = None
    subject_id: int
    options: List[QuestionOptionCreate] = []


class QuestionUpdate(BaseModel):
    statement: Optional[str] = None
    question_type: Optional[QuestionType] = None
    is_public: Optional[bool] = None
    difficulty: Optional[str] = None
    criteria: Optional[str] = None
    image_base64: Optional[str] = None
    subject_id: Optional[int] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionOut(BaseModel):
    id: int
    statement: str
    question_type: QuestionType
    is_public: bool
    difficulty: Optional[str]
    criteria: Optional[str]
    image_base64: Optional[str]
    subject_id: int
    professor_id: int
    professor: UserOut
    subject: SubjectOut
    options: List[QuestionOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Exam ──────────────────────────────────────────────────────────────────────

class ExamQuestionIn(BaseModel):
    question_id: int
    order: int = 0
    points: float = 1.0


class ExamCreate(BaseModel):
    title: str
    instructions: Optional[str] = None
    subject_id: int
    class_id: int
    questions: List[ExamQuestionIn]


class ExamCreateRedacao(BaseModel):
    title: str
    subject_id: int
    class_id: int
    enunciado: str          # instruções/proposta da redação
    points: float = 10.0   # pontuação total da redação
    criteria: Optional[str] = None  # rubrica/critérios de correção (opcional)


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    instructions: Optional[str] = None
    questions: Optional[List[ExamQuestionIn]] = None


class ExamApply(BaseModel):
    class_id: int


class ExamQuestionOut(BaseModel):
    id: int
    question_id: int
    order: int
    points: float
    question: QuestionOut

    model_config = {"from_attributes": True}


class ExamOut(BaseModel):
    id: int
    title: str
    instructions: Optional[str]
    professor_id: int
    subject_id: int
    class_id: int
    professor: UserOut
    subject: SubjectOut
    class_: ClassOut
    exam_questions: List[ExamQuestionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExamListOut(BaseModel):
    id: int
    title: str
    professor_id: int
    subject_id: int
    class_id: int
    professor: UserOut
    subject: SubjectOut
    class_: ClassOut
    created_at: datetime
    question_count: int = 0

    model_config = {"from_attributes": True}


# ── Submissions ───────────────────────────────────────────────────────────────

class AnswerIn(BaseModel):
    exam_question_id: int
    selected_option_id: Optional[int] = None
    essay_text: Optional[str] = None
    essay_image_base64: Optional[str] = None


class SubmissionCreate(BaseModel):
    answers: List[AnswerIn]


class AnswerScoreOverride(BaseModel):
    score: float
    ai_feedback: Optional[str] = None


class SubmissionAnswerOut(BaseModel):
    id: int
    exam_question_id: int
    selected_option_id: Optional[int]
    essay_text: Optional[str]
    essay_image_base64: Optional[str]
    score: Optional[float]
    ai_feedback: Optional[str]
    is_auto_corrected: bool
    exam_question: "ExamQuestionOut"

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    status: SubmissionStatus
    total_score: Optional[float]
    submitted_at: datetime
    correcting_since: Optional[datetime] = None
    student: UserOut
    answers: List[SubmissionAnswerOut]

    model_config = {"from_attributes": True}


class SubmissionListOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    status: SubmissionStatus
    total_score: Optional[float]
    submitted_at: datetime
    correcting_since: Optional[datetime] = None
    student: UserOut

    model_config = {"from_attributes": True}


# ── ENEM Public Question Bank ─────────────────────────────────────────────────

class EnemOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class EnemQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    number: int
    area: Optional[str]
    language: Optional[str]
    color: Optional[str] = None
    module: Optional[str] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    statement: str
    image_base64: Optional[str]
    options: List[EnemOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class EnemImportRequest(BaseModel):
    enem_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class AcafeOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class AcafeImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class AcafeQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    period: Optional[str]
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    justification: Optional[str]
    reference_matrix: Optional[str]
    options: List[AcafeOptionOut]
    images: List[AcafeImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class AcafeImportRequest(BaseModel):
    acafe_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class AcafeUrlImportRequest(BaseModel):
    url: str
    year: int
    period: Optional[str] = None


class UfprOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UfprImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UfprQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[UfprOptionOut]
    images: List[UfprImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UfprImportRequest(BaseModel):
    ufpr_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class UfrgsOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UfrgsQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    day: int
    number: int
    area: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[UfrgsOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UfrgsImportRequest(BaseModel):
    ufrgs_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class PucprOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class PucprQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    season: Optional[str]
    course: Optional[str]
    color: Optional[str]
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[PucprOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class PucprImportRequest(BaseModel):
    pucpr_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class PucprUrlImportRequest(BaseModel):
    url: str
    year: int
    season: Optional[str] = None
    course: Optional[str] = None
    color: Optional[str] = None
    gabarito_text: str = ""


class UfscOptionOut(BaseModel):
    id: int
    value: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UfscImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UfscQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str]
    color: Optional[str]
    number: int
    question_type: str
    area: Optional[str]
    language: Optional[str]
    statement: str
    answer: Optional[int]
    image_base64: Optional[str]
    options: List[UfscOptionOut]
    images: List[UfscImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UfscImportRequest(BaseModel):
    ufsc_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class FuvestOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class FuvestImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class FuvestQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    version: Optional[str]
    number: int
    area: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[FuvestOptionOut]
    images: List[FuvestImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class FuvestImportRequest(BaseModel):
    fuvest_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class UdescOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UdescImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}

# ── UNESP ────────────────────────────────────────────────────────────────────

class UnespOptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UnespImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UnespQuestionOut(BaseModel):
    id: int
    year: int
    number: int
    area: Optional[str] = None
    statement: str
    image_base64: Optional[str] = None
    options: List[UnespOptionOut]
    images: List[UnespImageOut]

    model_config = {"from_attributes": True}


class UnespImportRequest(BaseModel):
    unesp_question_id: int
    subject_id: int
    is_public: bool = False
    difficulty: str = "medium"


# ── CEBRASPE / UnB ───────────────────────────────────────────────────────────

class CebraspeOptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class CebraspeImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class CebraspeQuestionOut(BaseModel):
    id: int
    year: int
    exam_name: str
    number: int
    area: Optional[str] = None
    statement: str
    image_base64: Optional[str] = None
    options: List[CebraspeOptionOut]
    images: List[CebraspeImageOut]

    model_config = {"from_attributes": True}


class CebraspeImportRequest(BaseModel):
    cebraspe_question_id: int
    subject_id: int
    is_public: bool = False
    difficulty: str = "medium"


# ── UNIFESP ──────────────────────────────────────────────────────────────────

class UnifespOptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UnifespImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UnifespQuestionOut(BaseModel):
    id: int
    year: int
    number: int
    area: Optional[str] = None
    statement: str
    image_base64: Optional[str] = None
    options: List[UnifespOptionOut]
    images: List[UnifespImageOut]

    model_config = {"from_attributes": True}


class UnifespImportRequest(BaseModel):
    unifesp_question_id: int
    subject_id: int
    is_public: bool = False
    difficulty: str = "medium"


class UdescQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    semester: int
    shift: Optional[str]
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[UdescOptionOut]
    images: List[UdescImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UdescImportRequest(BaseModel):
    udesc_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class PucrsOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class PucrsImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class PucrsQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    season: Optional[str]
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[PucrsOptionOut]
    images: List[PucrsImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class PucrsImportRequest(BaseModel):
    pucrs_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class UfpelOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UfpelImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UfpelQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    stage: int
    number: int
    area: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[UfpelOptionOut]
    images: List[UfpelImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UfpelImportRequest(BaseModel):
    ufpel_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


class PucRioOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class PucRioImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class PucRioQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    number: int
    area: Optional[str]
    language: Optional[str]
    statement: str
    image_base64: Optional[str]
    options: List[PucRioOptionOut]
    images: List[PucRioImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class PucRioImportRequest(BaseModel):
    pucrio_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── ITA (Instituto Tecnológico de Aeronáutica) ─────────────────────────────────────────


class ItaOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class ItaImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class ItaQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str]
    number: int
    question_type: str
    area: Optional[str]
    language: Optional[str]
    statement: str
    answer: Optional[str]
    image_base64: Optional[str]
    options: List[ItaOptionOut]
    images: List[ItaImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class ItaImportRequest(BaseModel):
    ita_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── UNICAMP (Universidade Estadual de Campinas) ────────────────────────────────────────


class UnicampOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UnicampImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UnicampQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str]
    number: int
    question_type: str
    area: Optional[str]
    language: Optional[str]
    statement: str
    answer: Optional[str]
    image_base64: Optional[str]
    options: List[UnicampOptionOut]
    images: List[UnicampImageOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UnicampImportRequest(BaseModel):
    unicamp_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── FGV ─────────────────────────────────────────────────────────────


class FgvQuestionOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class FgvQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class FgvQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str] = None
    number: int
    question_type: str
    area: Optional[str] = None
    language: Optional[str] = None
    statement: str
    answer: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    options: List[FgvQuestionOptionOut] = []
    images: List[FgvQuestionImageOut] = []

    model_config = {"from_attributes": True}


class FgvImportRequest(BaseModel):
    fgv_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── ESPM ────────────────────────────────────────────────────────────


class EspmQuestionOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class EspmQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class EspmQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str] = None
    number: int
    question_type: str
    area: Optional[str] = None
    language: Optional[str] = None
    statement: str
    answer: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    options: List[EspmQuestionOptionOut] = []
    images: List[EspmQuestionImageOut] = []

    model_config = {"from_attributes": True}


class EspmImportRequest(BaseModel):
    espm_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── UERJ ────────────────────────────────────────────────────────────

class UerjQuestionOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UerjQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UerjQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    phase: Optional[str] = None
    number: int
    question_type: str
    area: Optional[str] = None
    language: Optional[str] = None
    statement: str
    answer: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    options: List[UerjQuestionOptionOut] = []
    images: List[UerjQuestionImageOut] = []

    model_config = {"from_attributes": True}


class UerjImportRequest(BaseModel):
    uerj_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── UFGD ────────────────────────────────────────────────────────────

class UfgdQuestionOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UfgdQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UfgdQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    number: int
    question_type: str
    area: Optional[str] = None
    language: Optional[str] = None
    statement: str
    answer: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    options: List[UfgdQuestionOptionOut] = []
    images: List[UfgdQuestionImageOut] = []

    model_config = {"from_attributes": True}


class UfgdImportRequest(BaseModel):
    ufgd_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── UEM ─────────────────────────────────────────────────────────────

class UemQuestionOptionOut(BaseModel):
    id: int
    value: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UemQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class UemQuestionOut(BaseModel):
    id: int
    exam_name: str
    university: str
    year: int
    season: Optional[str] = None
    number: int
    question_type: str
    area: Optional[str] = None
    language: Optional[str] = None
    statement: str
    answer: Optional[int] = None
    image_base64: Optional[str] = None
    created_at: datetime
    options: List[UemQuestionOptionOut] = []
    images: List[UemQuestionImageOut] = []

    model_config = {"from_attributes": True}


class UemImportRequest(BaseModel):
    uem_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False


# ── UFMS ─────────────────────────────────────────────────────────────────────

class UfmsQuestionOptionOut(BaseModel):
    id: int
    letter: str
    html_text: str
    order: int

    model_config = {"from_attributes": True}

class UfmsQuestionImageOut(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}

class UfmsQuestionOut(BaseModel):
    id: int
    year: int
    stage: Optional[int] = None
    question_number: int
    html_statement: str
    correct_option: Optional[str] = None
    is_annulled: bool
    subject: Optional[str] = None
    created_at: datetime
    options: List[UfmsQuestionOptionOut] = []
    images: List[UfmsQuestionImageOut] = []

    model_config = {"from_attributes": True}

class UfmsPdfImportResult(BaseModel):
    success: bool
    message: str
    imported_questions: int

    model_config = {"from_attributes": True}


class UfgQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfgQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    options: list[UfgQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UfjfQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfjfQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    options: list[UfjfQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UfuQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfuQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    options: list[UfuQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UfpaQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfpaQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    exam_name: Optional[str] = None
    subject: Optional[str] = None
    options: list[UfpaQuestionOptionSchema]

    model_config = {"from_attributes": True}


class UtfprQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UtfprQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    exam_name: Optional[str] = None
    options: list[UtfprQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UnioesteQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UnioesteQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UnioesteQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UelQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UelQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UelQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class EspmQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class EspmQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[EspmQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class FgvQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class FgvQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[FgvQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UerjQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UerjQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UerjQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UnicampQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UnicampQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UnicampQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class PucrsQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class PucrsQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[PucrsQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class PucminasQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class PucminasQuestionImageSchema(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class PucminasQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    subject: Optional[str] = None
    year: int
    number: int
    statement: str
    image_base64: Optional[str] = None
    options: list[PucminasQuestionOptionSchema]
    images: list[PucminasQuestionImageSchema] = []

    model_config = {"from_attributes": True}


class UfrnQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfrnQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UfrnQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UfsmQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfsmQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[UfsmQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UlbraQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}

class UlbraQuestionSchema(BaseModel):
    id: int
    year: int
    edition: str
    number: int
    statement: str
    options: list[UlbraQuestionOptionSchema]

    model_config = {"from_attributes": True}


class UfamQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UfamQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    exam_name: Optional[str] = None
    stage: Optional[int] = None
    subject: Optional[str] = None
    options: list[UfamQuestionOptionSchema]

    model_config = {"from_attributes": True}


class PuccampinasQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class PuccampinasQuestionImageSchema(BaseModel):
    id: int
    image_base64: str
    order: int

    model_config = {"from_attributes": True}


class PuccampinasQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    image_base64: Optional[str] = None
    options: list[PuccampinasQuestionOptionSchema]
    images: list[PuccampinasQuestionImageSchema] = []

    model_config = {"from_attributes": True}


class UnimontesQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UnimontesQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    area: Optional[str] = None
    subject: Optional[str] = None
    year: int
    number: int
    statement: str
    options: list[UnimontesQuestionOptionSchema]

    model_config = {"from_attributes": True}


class UnicentroQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UnicentroQuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    area: Optional[str] = None
    statement: str
    options: list[UnicentroQuestionOptionSchema]
    
    model_config = {"from_attributes": True}


class UnaerpQuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {"from_attributes": True}

class UnaerpQuestionSchema(BaseModel):
    id: int
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    options: list[UnaerpQuestionOptionSchema]

    model_config = {"from_attributes": True}


class UpfOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class UpfQuestionOut(BaseModel):
    id: int
    exam_name: str
    year: int
    number: int
    area: Optional[str]
    statement: str
    options: List[UpfOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class UpfImportRequest(BaseModel):
    upf_question_id: int
    subject_id: int
    difficulty: Optional[str] = None
    is_public: bool = False




class ConcursoFepeseOptionOut(BaseModel):
    id: int
    letter: str
    text: str
    is_correct: bool
    order: int

    model_config = {"from_attributes": True}


class ConcursoFepeseQuestionOut(BaseModel):
    id: int
    concurso_slug: str
    orgao: str
    edital: str
    exam_type: Optional[str]
    cargo: str
    cargo_code: str
    year: int
    number: int
    subject: Optional[str]
    statement: str
    options: List[ConcursoFepeseOptionOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class ConcursoFepeseCargoIn(BaseModel):
    cargo: str
    cargo_code: str


class ConcursoFepeseImportRequest(BaseModel):
    concurso_slug: str
    orgao: str
    edital: str
    year: int
    exam_type: Optional[str] = None
    cargos: List[ConcursoFepeseCargoIn]
