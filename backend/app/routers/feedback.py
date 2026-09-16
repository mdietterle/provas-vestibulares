from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import email as email_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackReport(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    page_url: str = Field(min_length=1, max_length=500)
    reporter_email: str | None = None


@router.post("")
def send_feedback(payload: FeedbackReport):
    try:
        email_service.send_feedback_report(
            message=payload.message,
            page_url=payload.page_url,
            reporter_email=payload.reporter_email,
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Falha ao enviar o reporte. Tente novamente.")
    return {"ok": True}
