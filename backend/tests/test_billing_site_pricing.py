"""Checkout cobra base + professores e os pacotes do site; chave live é recusada no sandbox."""
from unittest.mock import patch

import pytest

from app.models import Institution, User, UserRole
from app.services import billing


def _school(db):
    inst = Institution(name="Escola Billing", plan_type="basic", stripe_customer_id="cus_test")
    db.add(inst)
    db.flush()
    admin = User(name="A", email="admin-billing@x.com", hashed_password="x", role=UserRole.ADMIN, institution_id=inst.id)
    db.add(admin)
    for i in range(3):
        db.add(User(name=f"P{i}", email=f"p{i}-billing@x.com", hashed_password="x", role=UserRole.PROFESSOR, institution_id=inst.id))
    db.flush()
    return inst, admin


def test_subscription_has_base_and_one_seat_per_professor(db_session):
    inst, admin = _school(db_session)
    with patch.dict(billing.PLAN_PRICE_MAP, {"pro": "price_base"}), \
         patch.dict(billing.PLAN_SEAT_PRICE_MAP, {"pro": "price_seat"}), \
         patch.object(billing.settings, "STRIPE_SECRET_KEY", "sk_test_x"), \
         patch("stripe.checkout.Session.create", return_value={"url": "u"}) as create:
        billing.create_subscription_checkout_session(db_session, inst, admin, "pro", "s", "c")
    assert create.call_args.kwargs["line_items"] == [
        {"price": "price_base", "quantity": 1},
        {"price": "price_seat", "quantity": 3},
    ]


def test_credit_pack_uses_pack_price_and_credits(db_session):
    inst, admin = _school(db_session)
    with patch.dict(billing.CREDIT_PACKS["mixed"], {"price": "price_mixed"}), \
         patch.object(billing.settings, "STRIPE_SECRET_KEY", "sk_test_x"), \
         patch("stripe.checkout.Session.create", return_value={"url": "u"}) as create:
        billing.create_credits_checkout_session(db_session, inst, admin, "s", "c", pack="mixed")
    kwargs = create.call_args.kwargs
    assert kwargs["line_items"] == [{"price": "price_mixed", "quantity": 1}]
    assert kwargs["metadata"]["credits_amount"] == "300"


def test_live_key_refused_without_live_mode(db_session):
    inst, admin = _school(db_session)
    with patch.object(billing.settings, "STRIPE_SECRET_KEY", "sk_live_x"), \
         patch.object(billing.settings, "STRIPE_LIVE_MODE", False):
        with pytest.raises(ValueError):
            billing.create_credits_checkout_session(db_session, inst, admin, "s", "c", pack="questions")
