"""Sessão via cookie httpOnly: login, /me só com cookie, logout, header Bearer e CSRF."""
import pytest

from app.core.config import settings

COOKIE = settings.SESSION_COOKIE_NAME
CSRF = {"X-Requested-With": "XMLHttpRequest"}


@pytest.fixture(autouse=True)
def _wipe_committed_rows(db_session):
    """Endpoints fazem commit, o que escapa do rollback do fixture: limpa as tabelas ao final."""
    yield
    from app.database import Base
    db_session.rollback()
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()


def _login(client):
    return client.post("/api/auth/login", data={"username": "test@example.com", "password": "testpass123"})


def test_login_sets_httponly_cookie(client, sample_user):
    resp = _login(client)
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert f"{COOKIE}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()
    assert "Path=/" in set_cookie
    # Host local (testserver) em modo auto => sem Secure, para funcionar em http.
    assert "Secure" not in set_cookie
    # Corpo legado mantido para o app mobile.
    assert resp.json()["access_token"]


def test_cookie_secure_on_non_local_host(client, sample_user):
    resp = client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "testpass123"},
        headers={"Host": "api.example.com"},
    )
    assert resp.status_code == 200
    assert "Secure" in resp.headers.get("set-cookie", "")


def test_me_works_with_cookie_only(client, sample_user):
    assert _login(client).status_code == 200
    assert "Authorization" not in client.headers
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_logout_clears_cookie(client, sample_user):
    _login(client)
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert f"{COOKIE}=" in set_cookie
    assert "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()
    assert client.get("/api/auth/me").status_code == 401


def test_bearer_header_still_works(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200


def test_csrf_rejects_cookie_post_without_header(client, sample_user):
    _login(client)
    # Simula um POST cross-site: o navegador anexa o cookie, mas não há header customizado.
    resp = client.patch("/api/auth/me", json={"name": "Hacked"}, headers={"Origin": "https://evil.example"})
    assert resp.status_code == 403
    ok = client.patch("/api/auth/me", json={"name": "Renamed"}, headers=CSRF)
    assert ok.status_code == 200
    assert ok.json()["name"] == "Renamed"


def test_csrf_not_required_with_bearer(client, auth_headers):
    resp = client.patch("/api/auth/me", json={"name": "Via Bearer"}, headers=auth_headers)
    assert resp.status_code == 200
