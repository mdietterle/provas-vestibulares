"""Definição central de planos e suas cotas de uso.

As cotas de IA são contabilizadas POR PROFESSOR / POR MÊS.
O limite de professores é por instituição.

Mantém alinhamento com o que é anunciado no frontend (PlansPage):
  - Basic:      sem IA, até 15 professores
  - Pro:        20 gerações/prof/mês, 50 correções/prof/mês, até 50 professores
  - Enterprise: 40 gerações/prof/mês, 100 correções/prof/mês, professores ilimitados

Os preços (price_monthly) refletem o valor cobrado via Stripe (ver
app.core.config para os respectivos STRIPE_PRICE_*).
"""
from typing import Optional

# Sentinela para "ilimitado"
UNLIMITED = None

DEFAULT_PLAN = "basic"

PLANS = {
    "basic": {
        "label": "Basic",
        "price_monthly": 199,
        "ai_enabled": False,
        "ai_generation_per_prof": 0,
        "ai_correction_per_prof": 0,
        "max_professors": 15,
    },
    "pro": {
        "label": "Pro",
        "price_monthly": 399,
        "ai_enabled": True,
        "ai_generation_per_prof": 20,
        "ai_correction_per_prof": 50,
        "max_professors": 50,
    },
    "enterprise": {
        "label": "Enterprise",
        "price_monthly": 799,
        "ai_enabled": True,
        "ai_generation_per_prof": 40,
        "ai_correction_per_prof": 100,
        "max_professors": UNLIMITED,
    },
}


def normalize_plan(plan_type: Optional[str]) -> str:
    """Devolve um plano válido, caindo no padrão se nulo/desconhecido."""
    if not plan_type:
        return DEFAULT_PLAN
    key = plan_type.strip().lower()
    return key if key in PLANS else DEFAULT_PLAN


def get_plan_config(plan_type: Optional[str]) -> dict:
    return PLANS[normalize_plan(plan_type)]
