"""Tests for app.routers.auth — login, register, token endpoints."""
import pytest


@pytest.fixture(autouse=True)
def _wipe_committed_rows(db_session):
    """Endpoints fazem commit, o que escapa do rollback do fixture: limpa as tabelas ao final."""
    yield
    from app.database import Base
    db_session.rollback()
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()


class TestLogin:
    def test_login_success(self, client, sample_user):
        resp = client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, sample_user):
        resp = client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", data={
            "username": "nobody@example.com",
            "password": "whatever",
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", data={})
        assert resp.status_code == 422


@pytest.fixture()
def coded_class(db_session, sample_institution):
    from app.models import Class
    import uuid
    cls = Class(
        name="3A",
        year=2026,
        institution_id=sample_institution.id,
        join_code=uuid.uuid4().hex[:8].upper(),
    )
    db_session.add(cls)
    db_session.flush()
    return cls


class TestRegister:
    def test_register_success_enrolls_in_class(self, client, db_session, coded_class):
        from app.models import StudentClass, User, UserRole
        resp = client.post("/api/auth/register", json={
            "name": "New User",
            "email": "newuser@example.com",
            "password": "strongpass123",
            "class_code": coded_class.join_code.lower(),  # case-insensitive
        })
        assert resp.status_code == 201, resp.text
        assert "message" in resp.json()
        user = db_session.query(User).filter(User.email == "newuser@example.com").one()
        assert user.role == UserRole.STUDENT
        assert user.institution_id == coded_class.institution_id
        assert db_session.query(StudentClass).filter_by(student_id=user.id, class_id=coded_class.id).count() == 1

    def test_register_invalid_code_rejected(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "Bad Code",
            "email": "badcode@example.com",
            "password": "strongpass123",
            "class_code": "NOPE1234",
        })
        assert resp.status_code == 400
        assert "inválido" in resp.json()["detail"]

    def test_register_without_code_rejected(self, client, sample_institution):
        resp = client.post("/api/auth/register", json={
            "name": "No Code",
            "email": "nocode@example.com",
            "password": "strongpass123",
            "institution_id": sample_institution.id,  # campo antigo é ignorado
        })
        assert resp.status_code == 400

    def test_register_duplicate_email(self, client, sample_user, coded_class):
        resp = client.post("/api/auth/register", json={
            "name": "Duplicate",
            "email": "test@example.com",
            "password": "strongpass123",
            "class_code": coded_class.join_code,
        })
        assert resp.status_code == 400

    def test_register_short_password_rejected(self, client, coded_class):
        resp = client.post("/api/auth/register", json={
            "name": "Short Pass",
            "email": "shortpass@example.com",
            "password": "12345",
            "class_code": coded_class.join_code,
        })
        assert resp.status_code == 422


class TestProtectedEndpoints:
    def test_access_without_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_access_with_valid_token(self, authenticated_client):
        resp = authenticated_client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"

    def test_access_with_invalid_token(self, client):
        headers = {"Authorization": "Bearer invalid.token.here"}
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 401