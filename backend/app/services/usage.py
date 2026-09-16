"""Serviço de contabilização de uso e enforcement de cotas por plano.

Cotas de IA são por professor / por mês. Excedentes são gravados
(is_overage=True) mas não bloqueiam a operação — ficam disponíveis para
faturamento de créditos avulsos.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.plans import get_plan_config
from app.models import Institution, UsageEvent, UsageEventType, User, UserRole


def _month_start(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.utcnow()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_month_usage(db: Session, user_id: int, event_type: str) -> int:
    """Total consumido por um professor no mês corrente para um tipo de evento."""
    total = (
        db.query(func.coalesce(func.sum(UsageEvent.quantity), 0))
        .filter(
            UsageEvent.user_id == user_id,
            UsageEvent.event_type == event_type,
            UsageEvent.created_at >= _month_start(),
        )
        .scalar()
    )
    return int(total or 0)


def _ai_limit_for_user(db: Session, user: User, event_type: str) -> Optional[int]:
    inst = db.get(Institution, user.institution_id)
    cfg = get_plan_config(inst.plan_type if inst else None)
    if event_type == UsageEventType.AI_GENERATION.value:
        return cfg["ai_generation_per_prof"]
    if event_type == UsageEventType.AI_CORRECTION.value:
        return cfg["ai_correction_per_prof"]
    return None


def ai_enabled(db: Session, institution_id: int) -> bool:
    inst = db.get(Institution, institution_id)
    return bool(get_plan_config(inst.plan_type if inst else None)["ai_enabled"])


def check_quota(db: Session, user: User, event_type: str, quantity: int = 1) -> dict:
    """Verifica se o professor tem cota disponível.

    Retorna {allowed, used, limit, remaining, overage_count}.
    Não bloqueia nem grava nada — apenas informa.
    """
    limit = _ai_limit_for_user(db, user, event_type)
    used = get_month_usage(db, user.id, event_type)
    if limit is None:
        return {"allowed": True, "used": used, "limit": None, "remaining": None, "overage_count": 0}
    remaining = max(0, limit - used)
    will_exceed = (used + quantity) > limit
    return {
        "allowed": not will_exceed,
        "used": used,
        "limit": limit,
        "remaining": remaining,
        "overage_count": max(0, used - limit),
    }


def record_usage(db: Session, user: User, event_type: str, quantity: int = 1) -> dict:
    """Grava consumo, marcando excedente. Não bloqueia.

    Retorna {used_before, used_after, limit, is_overage}.
    """
    limit = _ai_limit_for_user(db, user, event_type)
    used_before = get_month_usage(db, user.id, event_type)
    # Excedente quando o consumo pós-evento ultrapassa o limite (limite None = ilimitado)
    is_overage = limit is not None and (used_before + quantity) > limit

    event = UsageEvent(
        institution_id=user.institution_id,
        user_id=user.id,
        event_type=event_type,
        quantity=quantity,
        is_overage=is_overage,
    )
    db.add(event)

    # Excedente é debitado do saldo de créditos avulsos comprados via Stripe
    # (não bloqueia o uso caso o saldo seja insuficiente — só zera o saldo).
    if is_overage:
        inst = db.get(Institution, user.institution_id)
        if inst and inst.credits_balance:
            inst.credits_balance = max(0, inst.credits_balance - quantity)

    db.commit()

    return {
        "used_before": used_before,
        "used_after": used_before + quantity,
        "limit": limit,
        "is_overage": is_overage,
    }


def active_professor_count(db: Session, institution_id: int) -> int:
    return (
        db.query(func.count(User.id))
        .filter(
            User.institution_id == institution_id,
            User.role == UserRole.PROFESSOR,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
        )
        .scalar()
    ) or 0


def active_student_count(db: Session, institution_id: int) -> int:
    """Conta apenas alunos que aceitaram o convite (definiram senha).

    Alunos com convite pendente não contam no limite do plano.
    """
    return (
        db.query(func.count(User.id))
        .filter(
            User.institution_id == institution_id,
            User.role == UserRole.STUDENT,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
            User.invitation_accepted_at.isnot(None),
        )
        .scalar()
    ) or 0


def can_add_professor(db: Session, institution_id: int) -> bool:
    """True se ainda há vaga de professor no plano da instituição."""
    inst = db.get(Institution, institution_id)
    limit = get_plan_config(inst.plan_type if inst else None)["max_professors"]
    if limit is None:
        return True
    return active_professor_count(db, institution_id) < limit
