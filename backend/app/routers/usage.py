"""Painel de uso (admin): consumo de recursos vs. limites do plano."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.plans import get_plan_config
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Institution, UsageEvent, UsageEventType, User, UserRole
from app.services import usage as usage_service

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/summary")
def usage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Resumo de consumo da instituição no mês corrente vs. limites do plano."""
    inst = db.get(Institution, current_user.institution_id)
    cfg = get_plan_config(inst.plan_type if inst else None)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    professors = (
        db.query(User)
        .filter(
            User.institution_id == current_user.institution_id,
            User.role == UserRole.PROFESSOR,
            User.deleted_at.is_(None),
        )
        .order_by(User.name)
        .all()
    )

    # Consumo do mês por professor e tipo, em uma query
    rows = (
        db.query(
            UsageEvent.user_id,
            UsageEvent.event_type,
            func.coalesce(func.sum(UsageEvent.quantity), 0).label("total"),
        )
        .filter(
            UsageEvent.institution_id == current_user.institution_id,
            UsageEvent.created_at >= month_start,
        )
        .group_by(UsageEvent.user_id, UsageEvent.event_type)
        .all()
    )

    # mapa: (user_id, event_type) -> total
    usage_map: dict = {}
    for user_id, event_type, total in rows:
        usage_map[(user_id, event_type)] = int(total or 0)

    gen_limit = cfg["ai_generation_per_prof"]
    cor_limit = cfg["ai_correction_per_prof"]

    per_professor = []
    for p in professors:
        gen_used = usage_map.get((p.id, UsageEventType.AI_GENERATION.value), 0)
        cor_used = usage_map.get((p.id, UsageEventType.AI_CORRECTION.value), 0)
        per_professor.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "is_active": p.is_active,
            "ai_generation": {
                "used": gen_used,
                "limit": gen_limit,
                "overage": max(0, gen_used - gen_limit) if gen_limit is not None else 0,
            },
            "ai_correction": {
                "used": cor_used,
                "limit": cor_limit,
                "overage": max(0, cor_used - cor_limit) if cor_limit is not None else 0,
            },
        })

    active_profs = usage_service.active_professor_count(db, current_user.institution_id)
    max_profs = cfg["max_professors"]

    # Totais agregados da instituição
    total_gen = sum(pp["ai_generation"]["used"] for pp in per_professor)
    total_cor = sum(pp["ai_correction"]["used"] for pp in per_professor)
    total_gen_overage = sum(pp["ai_generation"]["overage"] for pp in per_professor)
    total_cor_overage = sum(pp["ai_correction"]["overage"] for pp in per_professor)

    return {
        "plan": {
            "type": (inst.plan_type if inst and inst.plan_type else "basic").lower(),
            "label": cfg["label"],
            "ai_enabled": cfg["ai_enabled"],
        },
        "professors": {
            "active": active_profs,
            "limit": max_profs,
        },
        "totals": {
            "ai_generation": total_gen,
            "ai_correction": total_cor,
            "ai_generation_overage": total_gen_overage,
            "ai_correction_overage": total_cor_overage,
        },
        "limits_per_professor": {
            "ai_generation": gen_limit,
            "ai_correction": cor_limit,
        },
        "per_professor": per_professor,
    }


@router.get("/my")
def my_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cota do professor autenticado no mês corrente."""
    gen = usage_service.check_quota(db, current_user, UsageEventType.AI_GENERATION.value)
    cor = usage_service.check_quota(db, current_user, UsageEventType.AI_CORRECTION.value)
    return {
        "ai_generation": gen,
        "ai_correction": cor,
    }
