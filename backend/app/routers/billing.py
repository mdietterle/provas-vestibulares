import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.deps import require_admin
from app.models import Institution, User
from app.services import billing as billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


def _institution_of(db: Session, admin: User) -> Institution:
    institution = db.get(Institution, admin.institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada")
    return institution


@router.get("/status")
def get_billing_status(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    institution = _institution_of(db, admin)
    return {
        "plan_type": institution.plan_type,
        "stripe_subscription_status": institution.stripe_subscription_status,
        "credits_balance": institution.credits_balance,
        "has_stripe_customer": bool(institution.stripe_customer_id),
    }


@router.post("/checkout-session")
def create_checkout_session(
    plan: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if plan not in billing_service.PLAN_PRICE_MAP:
        raise HTTPException(status_code=400, detail=f"Plano inválido. Use: {list(billing_service.PLAN_PRICE_MAP)}")

    institution = _institution_of(db, admin)
    try:
        url = billing_service.create_subscription_checkout_session(
            db,
            institution,
            admin,
            plan,
            success_url=f"{settings.FRONTEND_URL}/subscription?checkout=success",
            cancel_url=f"{settings.FRONTEND_URL}/subscription?checkout=cancel",
        )
    except (ValueError, stripe.error.StripeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"url": url}


@router.post("/credits-checkout")
def create_credits_checkout(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    institution = _institution_of(db, admin)
    try:
        url = billing_service.create_credits_checkout_session(
            db,
            institution,
            admin,
            success_url=f"{settings.FRONTEND_URL}/subscription?credits=success",
            cancel_url=f"{settings.FRONTEND_URL}/subscription?credits=cancel",
        )
    except (ValueError, stripe.error.StripeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"url": url}


@router.post("/portal")
def create_portal_session(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    institution = _institution_of(db, admin)
    try:
        url = billing_service.create_portal_session(institution, return_url=f"{settings.FRONTEND_URL}/subscription")
    except (ValueError, stripe.error.StripeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET não configurado")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Assinatura de webhook inválida")

    billing_service.handle_webhook_event(db, event)
    return {"received": True}
