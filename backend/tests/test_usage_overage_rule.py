"""Regra de excedente: plano com IA não bloqueia acima da cota; plano sem IA bloqueia."""
from app.models import Institution, User, UserRole
from app.services.usage import can_use_ai, check_quota, record_usage


def _prof(db, plan):
    inst = Institution(name=f"Escola {plan}", plan_type=plan)
    db.add(inst)
    db.flush()
    u = User(name="P", email=f"p-{plan}@x.com", hashed_password="x", role=UserRole.PROFESSOR, institution_id=inst.id)
    db.add(u)
    db.flush()
    return u


def test_pro_over_quota_is_allowed_as_overage(db_session):
    prof = _prof(db_session, "pro")
    record_usage(db_session, prof, "ai_generation", quantity=20)
    quota = check_quota(db_session, prof, "ai_generation", quantity=1)
    assert quota["allowed"] is False
    assert can_use_ai(quota) is True
    assert record_usage(db_session, prof, "ai_generation", quantity=1)["is_overage"] is True


def test_basic_is_blocked(db_session):
    prof = _prof(db_session, "basic")
    assert can_use_ai(check_quota(db_session, prof, "ai_generation", quantity=1)) is False
