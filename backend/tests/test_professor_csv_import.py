"""POST /api/users/professors/import-csv — importação de professores por CSV."""
from unittest.mock import patch

from app.core.security import create_access_token, get_password_hash
from app.models import Class, Subject, TeachingAssignment, User, UserRole

import pytest

URL = "/api/users/professors/import-csv"


@pytest.fixture(autouse=True)
def _no_real_commit(db_session, monkeypatch):
    # O endpoint faz commit; troca por flush para o rollback do fixture isolar os testes.
    monkeypatch.setattr(db_session, "commit", db_session.flush)


def _headers(user):
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def _upload(client, user, content: str, **params):
    return client.post(
        URL,
        params=params,
        files={"file": ("professores.csv", content.encode("utf-8"), "text/csv")},
        headers=_headers(user),
    )


def _professors(db, institution_id):
    return (
        db.query(User)
        .filter(User.institution_id == institution_id, User.role == UserRole.PROFESSOR)
        .all()
    )


def test_imports_professors_with_invitation_and_assignments(client, db_session, sample_institution, sample_user):
    math = Subject(name="Matemática", institution_id=sample_institution.id)
    phys = Subject(name="Física", institution_id=sample_institution.id)
    cls = Class(name="1 Ano EM", year=2026, institution_id=sample_institution.id)
    db_session.add_all([math, phys, cls])
    db_session.flush()

    csv_content = (
        "nome,email,materias,turmas\n"
        "Ana Prof,ana@escola.com,Matemática;Física,1 Ano EM\n"
        "Bruno Prof,BRUNO@escola.com,,\n"
    )
    with patch("app.services.email.send_professor_invitation") as send:
        r = _upload(client, sample_user, csv_content)

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 2
    assert body["skipped"] == 0
    assert body["errors"] == []
    assert send.call_count == 2

    profs = {p.email: p for p in _professors(db_session, sample_institution.id)}
    assert set(profs) == {"ana@escola.com", "bruno@escola.com"}
    ana = profs["ana@escola.com"]
    assert ana.invitation_token and ana.invitation_sent_at
    assigns = db_session.query(TeachingAssignment).filter_by(professor_id=ana.id).all()
    assert {(a.subject_id, a.class_id) for a in assigns} == {(math.id, cls.id), (phys.id, cls.id)}


def test_skips_duplicates_and_reports_errors(client, db_session, sample_institution, sample_user):
    db_session.add(User(
        name="Já Existe", email="existe@escola.com", hashed_password=get_password_hash("x"),
        role=UserRole.PROFESSOR, institution_id=sample_institution.id,
    ))
    db_session.flush()

    csv_content = (
        "nome;email;materias;turmas\n"
        "Já Existe;existe@escola.com;;\n"
        "Nova;nova@escola.com;Química;Turma X\n"
        "Nova de novo;nova@escola.com;;\n"
        ";semnome@escola.com;;\n"
    )
    with patch("app.services.email.send_professor_invitation"):
        r = _upload(client, sample_user, csv_content)

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 1
    assert body["skipped"] == 2
    messages = [(e["row"], e["message"]) for e in body["errors"]]
    assert (2, "E-mail já cadastrado — linha ignorada") in messages
    assert (4, "E-mail já cadastrado — linha ignorada") in messages
    assert any(row == 3 and "Química" in msg for row, msg in messages)
    assert any(row == 3 and "Turma X" in msg for row, msg in messages)
    assert any(row == 5 for row, _ in messages)
    emails = {p.email for p in _professors(db_session, sample_institution.id)}
    assert emails == {"existe@escola.com", "nova@escola.com"}


def test_dry_run_does_not_persist(client, db_session, sample_institution, sample_user):
    with patch("app.services.email.send_professor_invitation") as send:
        r = _upload(client, sample_user, "nome,email\nCarla,carla@escola.com\n", dry_run="true")
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 1
    assert r.json()["dry_run"] is True
    send.assert_not_called()
    assert db_session.query(User).filter_by(email="carla@escola.com").first() is None


def test_respects_plan_professor_limit(client, db_session, sample_institution, sample_user):
    sample_institution.plan_type = "basic"  # 15 professores
    for i in range(14):
        db_session.add(User(
            name=f"P{i}", email=f"p{i}@escola.com", hashed_password="x",
            role=UserRole.PROFESSOR, institution_id=sample_institution.id, is_active=True,
        ))
    db_session.flush()

    csv_content = "nome,email\nUm,um@escola.com\nDois,dois@escola.com\n"
    with patch("app.services.email.send_professor_invitation"):
        r = _upload(client, sample_user, csv_content)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 1
    assert any("Limite" in e["message"] for e in body["errors"])
    assert db_session.query(User).filter_by(email="dois@escola.com").first() is None


def test_requires_admin_and_csv(client, db_session, sample_institution, sample_user):
    prof = User(
        name="Prof", email="prof@escola.com", hashed_password="x",
        role=UserRole.PROFESSOR, institution_id=sample_institution.id,
    )
    db_session.add(prof)
    db_session.flush()
    assert _upload(client, prof, "nome,email\nA,a@a.com\n").status_code == 403

    r = client.post(
        URL, files={"file": ("x.txt", b"nome,email\n", "text/plain")}, headers=_headers(sample_user)
    )
    assert r.status_code == 400
    r = _upload(client, sample_user, "foo,bar\n1,2\n")
    assert r.status_code == 400
