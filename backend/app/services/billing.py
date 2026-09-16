"""Integração com Stripe: checkout de assinatura, checkout de créditos avulsos,
portal do cliente e processamento de webhooks.

O "pagador" de cada instituição é o usuário ADMIN da escola (não o
UserRole.OWNER, que é o super-admin da plataforma). Cada Institution tem no
máximo um customer e uma subscription no Stripe.
"""
from typing import Optional

import stripe
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Institution, User

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_MAP = {
    "basic": settings.STRIPE_PRICE_BASIC,
    "pro": settings.STRIPE_PRICE_PRO,
    "enterprise": settings.STRIPE_PRICE_ENTERPRISE,
}

# Valor mensal (R$) de cada plano — espelha o unit_amount configurado nos
# Price acima no Stripe (conferido em 2026-08-28: 199,00 / 399,00 / 799,00,
# test mode). Usado pelo dashboard do Owner para simular MRR a partir da
# contagem de instituições por plano, já que ainda não há assinatura real
# via Stripe para toda instituição — só o checkout está implementado.
# Fonte única: antes esse dicionário estava duplicado em app/routers/owner.py
# e no frontend (OwnerPage.tsx), podendo divergir silenciosamente.
PLAN_MONTHLY_PRICE = {"basic": 199, "pro": 399, "enterprise": 799}
DEFAULT_PLAN_MONTHLY_PRICE = 199


def plan_price(plan_type: str | None) -> int:
    return PLAN_MONTHLY_PRICE.get((plan_type or "basic").lower(), DEFAULT_PLAN_MONTHLY_PRICE)

# Inverso do mapa acima, resolvido em runtime pelo webhook para saber a que
# plano um price_id do Stripe corresponde.
def _plan_from_price_id(price_id: str) -> Optional[str]:
    for plan, pid in PLAN_PRICE_MAP.items():
        if pid and pid == price_id:
            return plan
    return None


def _get_or_create_customer(db: Session, institution: Institution, admin: User) -> str:
    if institution.stripe_customer_id:
        return institution.stripe_customer_id

    customer = stripe.Customer.create(
        name=institution.name,
        email=admin.email,
        metadata={"institution_id": str(institution.id)},
    )
    institution.stripe_customer_id = customer["id"]
    db.commit()
    return customer["id"]


def create_subscription_checkout_session(
    db: Session, institution: Institution, admin: User, plan: str, success_url: str, cancel_url: str
) -> str:
    price_id = PLAN_PRICE_MAP.get(plan)
    if not price_id:
        raise ValueError(f"Plano inválido ou sem price configurado: {plan}")

    customer_id = _get_or_create_customer(db, institution, admin)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"institution_id": str(institution.id), "plan": plan},
        subscription_data={"metadata": {"institution_id": str(institution.id), "plan": plan}},
    )
    return session["url"]


def create_credits_checkout_session(
    db: Session, institution: Institution, admin: User, success_url: str, cancel_url: str
) -> str:
    if not settings.STRIPE_PRICE_CREDITS_PACK:
        raise ValueError("STRIPE_PRICE_CREDITS_PACK não configurado")

    customer_id = _get_or_create_customer(db, institution, admin)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="payment",
        line_items=[{"price": settings.STRIPE_PRICE_CREDITS_PACK, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "institution_id": str(institution.id),
            "type": "credits_pack",
            "credits_amount": str(settings.STRIPE_CREDITS_PACK_AMOUNT),
        },
    )
    return session["url"]


def create_portal_session(institution: Institution, return_url: str) -> str:
    if not institution.stripe_customer_id:
        raise ValueError("Instituição ainda não tem assinatura no Stripe")
    session = stripe.billing_portal.Session.create(
        customer=institution.stripe_customer_id,
        return_url=return_url,
    )
    return session["url"]


def _institution_by_customer(db: Session, customer_id: str) -> Optional[Institution]:
    return db.query(Institution).filter(Institution.stripe_customer_id == customer_id).first()


def handle_webhook_event(db: Session, event: dict) -> None:
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, obj)
    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        _handle_subscription_updated(db, obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, obj)


def _handle_checkout_completed(db: Session, session: dict) -> None:
    metadata = session.get("metadata") or {}
    institution_id = metadata.get("institution_id")
    if not institution_id:
        return
    institution = db.get(Institution, int(institution_id))
    if not institution:
        return

    if session.get("mode") == "payment" and metadata.get("type") == "credits_pack":
        credits = int(metadata.get("credits_amount") or settings.STRIPE_CREDITS_PACK_AMOUNT)
        institution.credits_balance = (institution.credits_balance or 0) + credits
        db.commit()
        return

    if session.get("mode") == "subscription":
        plan = metadata.get("plan")
        if plan:
            institution.plan_type = plan
        institution.stripe_subscription_id = session.get("subscription")
        db.commit()


def _handle_subscription_updated(db: Session, subscription: dict) -> None:
    institution = _institution_by_customer(db, subscription.get("customer"))
    if not institution:
        return

    institution.stripe_subscription_id = subscription.get("id")
    institution.stripe_subscription_status = subscription.get("status")

    items = (subscription.get("items") or {}).get("data") or []
    if items:
        price_id = (items[0].get("price") or {}).get("id")
        plan = _plan_from_price_id(price_id) if price_id else None
        if plan:
            institution.plan_type = plan

    db.commit()


def _handle_subscription_deleted(db: Session, subscription: dict) -> None:
    institution = _institution_by_customer(db, subscription.get("customer"))
    if not institution:
        return
    institution.stripe_subscription_status = "canceled"
    db.commit()
