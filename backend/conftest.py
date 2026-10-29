"""Shared test fixtures — SQLite in-memory DB, isolated FastAPI app, auth helpers.

CRITICAL: Patches app.database engine BEFORE any router/service import, because
app/database.py creates a PostgreSQL engine with pool_size/max_overflow at module
level — these params are unsupported by SQLite and cause immediate failure.
"""
import os
import sys
from typing import Generator
from unittest.mock import MagicMock

# ── Mock external-dep modules missing in test env ─────────────────────────────
for _mod in [
    "boto3", "botocore", "botocore.config",
    "sentry_sdk", "sentry_sdk.integrations.fastapi", "sentry_sdk.integrations.starlette",
    "groq", "stripe", "resend", "reportlab", "reportlab.lib", "reportlab.lib.pagesizes",
    "qrcode", "openpyxl", "fitz", "pytesseract",
    "structlog",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

# ── Patch env before any app import ────────────────────────────────────────────
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ADMIN_PASSWORD"] = "test-admin-pass"

# ── Create test engine FIRST, then inject into app.database ────────────────────
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@event.listens_for(_test_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# ── Register JSONB → JSON adapter for SQLite compatibility ────────────────────
# Models use PostgreSQL JSONB; SQLite only supports JSON. This adapter lets
# create_all() succeed without modifying production model code.
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy import event as _sa_event

@_sa_event.listens_for(_test_engine, "connect")
def _register_jsonb_adapter(dbapi_conn, connection_record):
    """No-op listener kept for symmetry; actual adaptation via compiler."""
    pass

# Monkey-patch the SQLite dialect compiler to treat JSONB as JSON
from sqlalchemy.dialects.sqlite import base as _sqlite_base
_original_visit = getattr(_sqlite_base.SQLiteTypeCompiler, "visit_JSONB", None)
if _original_visit is None:
    _sqlite_base.SQLiteTypeCompiler.visit_JSONB = _sqlite_base.SQLiteTypeCompiler.visit_JSON

# ── Inject test engine into app.database BEFORE importing any app module ───────
# This prevents the production PostgreSQL engine from being created
import app.database as _db_module
_db_module.engine = _test_engine
_db_module.SessionLocal = _TestSessionLocal

# Now safe to import app modules — they use our injected SQLite engine
from app.core.security import get_password_hash, create_access_token  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.models import Institution, User, UserRole  # noqa: E402
from app.router_registry import register_all_routers  # noqa: E402

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Build minimal test app (no middleware that needs external deps)
_test_app = FastAPI(title="Test App")
register_all_routers(_test_app)


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture()
def db_session() -> Generator:
    """Fresh transaction per test — rollback after each test."""
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db_session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with DB override."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    _test_app.dependency_overrides[get_db] = _override_get_db
    with TestClient(_test_app) as c:
        yield c
    _test_app.dependency_overrides.clear()


@pytest.fixture()
def sample_institution(db_session) -> Institution:
    inst = Institution(name="Test School", cnpj=None)
    db_session.add(inst)
    db_session.flush()
    return inst


@pytest.fixture()
def sample_user(db_session, sample_institution) -> User:
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        role=UserRole.ADMIN,
        institution_id=sample_institution.id,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def auth_headers(sample_user) -> dict:
    token = create_access_token(data={"sub": str(sample_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def authenticated_client(client, auth_headers) -> TestClient:
    """Client that sends auth headers on every request."""
    client.headers.update(auth_headers)
    return client