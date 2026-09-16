"""AI endpoints — question generation and other AI-assisted features."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User, Subject

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateQuestionsRequest(BaseModel):
    subject_id: int
    topic: str = Field(..., min_length=3, max_length=200)
    question_type: str = Field(..., pattern="^(multiple_choice|true_false|essay|summation)$")
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    count: int = Field(default=3, ge=1, le=10)
    context: Optional[str] = Field(default="", max_length=8000)
    image_base64: Optional[str] = Field(default=None)


class GeneratedOption(BaseModel):
    text: str
    is_correct: bool
    order: int


class GeneratedQuestion(BaseModel):
    statement: str
    question_type: str
    difficulty: str
    options: List[GeneratedOption]


@router.post("/generate-questions", response_model=List[GeneratedQuestion])
def generate_questions(
    payload: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(503, "GROQ_API_KEY não configurada. Defina a variável no .env.")

    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(404, "Matéria não encontrada")
    if subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso a esta matéria")

    # Feature gate: plano Basic não inclui IA
    from app.services import usage as usage_service
    from app.models import UsageEventType
    if not usage_service.ai_enabled(db, current_user.institution_id):
        raise HTTPException(
            403,
            "Geração de questões com IA não está disponível no plano Basic. "
            "Faça upgrade para o plano Pro ou Enterprise.",
        )

    quota = usage_service.check_quota(
        db, current_user, UsageEventType.AI_GENERATION.value, quantity=payload.count
    )
    if not quota["allowed"]:
        raise HTTPException(
            402,
            {
                "code": "quota_exceeded",
                "resource": "ai_generation",
                "used": quota["used"],
                "limit": quota["limit"],
                "remaining": quota["remaining"],
                "message": (
                    f"Você utilizou {quota['used']} de {quota['limit']} gerações por IA "
                    f"disponíveis neste mês. Adquira um pacote avulso para continuar."
                ),
            },
        )

    from app.services.ai_question_generator import generate_questions as _gen
    try:
        questions = _gen(
            subject=subject.name,
            topic=payload.topic,
            question_type=payload.question_type,
            difficulty=payload.difficulty,
            count=payload.count,
            context=payload.context or "",
            image_base64=payload.image_base64,
        )
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    # Contabiliza uso (não bloqueia; marca excedente para créditos avulsos)
    from app.models import UsageEventType
    usage_service.record_usage(
        db, current_user, UsageEventType.AI_GENERATION.value, quantity=len(questions)
    )

    return questions


@router.get("/status")
def ai_status(current_user: User = Depends(get_current_user)):
    available = bool(settings.GROQ_API_KEY)
    return {
        "available": available,
        "model": settings.GROQ_MODEL,
        "message": "Groq disponível" if available else "GROQ_API_KEY não configurada",
    }
