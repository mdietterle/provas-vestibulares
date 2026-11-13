"""Código de turma: gerar/trocar, desativar, consulta pública e visibilidade."""
import pytest

from app.core.security import create_access_token, get_password_hash
from app.models import Class, Institution, StudentClass, Subject, TeachingAssignment, User, UserRole
from app.routers import classes as classes_router


@pytest.fixture(autouse=True)
def _wipe_committed_rows(db_session):
    """Endpoints fazem commit, o que escapa do rollback do fixture: limpa as tabelas ao final."""
    yield
    from app.database import Base
    db_session.rollback()
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()


def _headers(user):
    return {"Authorization": f"Bearer {create_access_token({'sub': str(user.id)})}"}


def _user(db, inst, role, email):
    u = User(name=email, email=email, hashed_password=get_password_hash("x123456"), role=role, institution_id=inst.id)
    db.add(u)
    db.flush()
    return u


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    classes_router._lookup_hits.clear()
    yield
    classes_router._lookup_hits.clear()


@pytest.fixture()
def klass(db_session, sample_institution):
    c = Class(name="2B", year=2026, institution_id=sample_institution.id)
    db_session.add(c)
    db_session.flush()
    return c


def test_admin_generates_and_rotates_code(client, auth_headers, klass):
    r1 = client.post(f"/api/classes/{klass.id}/join-code", headers=auth_headers)
    assert r1.status_code == 200
    code = r1.json()["join_code"]
    assert len(code) == 8
    assert not set(code) & set("0O1IL")
    r2 = client.post(f"/api/classes/{klass.id}/join-code", headers=auth_headers)
    assert r2.json()["join_code"] != code
    # código antigo deixa de valer
    assert client.get(f"/api/classes/join-code/{code}").status_code == 404


def test_public_lookup_and_disable(client, auth_headers, klass, sample_institution):
    code = client.post(f"/api/classes/{klass.id}/join-code", headers=auth_headers).json()["join_code"]
    r = client.get(f"/api/classes/join-code/{code.lower()}")
    assert r.status_code == 200
    assert r.json() == {"class_name": "2B", "year": 2026, "institution_name": sample_institution.name}
    assert client.delete(f"/api/classes/{klass.id}/join-code", headers=auth_headers).status_code == 204
    assert client.get(f"/api/classes/join-code/{code}").status_code == 404


def test_public_lookup_rate_limited(client):
    statuses = [client.get("/api/classes/join-code/ZZZZZZZZ").status_code for _ in range(classes_router._LOOKUP_LIMIT + 1)]
    assert statuses[-1] == 429
    assert set(statuses[:-1]) == {404}


def test_professor_permissions(client, db_session, sample_institution, klass):
    prof = _user(db_session, sample_institution, UserRole.PROFESSOR, "prof-jc@example.com")
    r = client.post(f"/api/classes/{klass.id}/join-code", headers=_headers(prof))
    assert r.status_code == 403
    subj = Subject(name="Matemática JC", institution_id=sample_institution.id)
    db_session.add(subj)
    db_session.flush()
    db_session.add(TeachingAssignment(professor_id=prof.id, subject_id=subj.id, class_id=klass.id))
    db_session.flush()
    r = client.post(f"/api/classes/{klass.id}/join-code", headers=_headers(prof))
    assert r.status_code == 200
    listed = client.get("/api/classes", headers=_headers(prof)).json()
    assert [c["join_code"] for c in listed if c["id"] == klass.id] == [r.json()["join_code"]]


def test_other_institution_cannot_manage(client, db_session, klass):
    other = Institution(name="Outra Escola")
    db_session.add(other)
    db_session.flush()
    admin2 = _user(db_session, other, UserRole.ADMIN, "admin2-jc@example.com")
    assert client.post(f"/api/classes/{klass.id}/join-code", headers=_headers(admin2)).status_code == 404


def test_student_never_sees_code(client, db_session, auth_headers, sample_institution, klass):
    client.post(f"/api/classes/{klass.id}/join-code", headers=auth_headers)
    student = _user(db_session, sample_institution, UserRole.STUDENT, "aluno-jc@example.com")
    db_session.add(StudentClass(student_id=student.id, class_id=klass.id))
    db_session.flush()
    listed = client.get("/api/classes", headers=_headers(student)).json()
    assert listed and all(c["join_code"] is None for c in listed)
    one = client.get(f"/api/classes/{klass.id}", headers=_headers(student)).json()
    assert one["join_code"] is None
    assert client.post(f"/api/classes/{klass.id}/join-code", headers=_headers(student)).status_code == 403


def test_admin_sees_code_in_list(client, auth_headers, klass):
    code = client.post(f"/api/classes/{klass.id}/join-code", headers=auth_headers).json()["join_code"]
    listed = client.get("/api/classes", headers=auth_headers).json()
    assert [c["join_code"] for c in listed if c["id"] == klass.id] == [code]
