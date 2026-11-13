"""Simulados sorteados da tabela unificada vestibular_questions, mantendo
simulados antigos (FK pras tabelas legadas) renderizando."""
import uuid

import pytest
from sqlalchemy import text

from app.core.security import create_access_token, get_password_hash
from app.models import EnemQuestion, EnemQuestionOption, Simulado, SimuladoQuestion, User, UserRole
from app.services import simulado_corrector
from app.vestibular.models import VestibularQuestion, VestibularQuestionOption


def _student(db, institution) -> User:
    user = User(
        name="Aluno",
        email=f"aluno-{uuid.uuid4().hex[:10]}@example.com",
        hashed_password=get_password_hash("x"),
        role=UserRole.STUDENT,
        institution_id=institution.id,
    )
    db.add(user)
    db.flush()
    return user


def _headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def _vq(db, exam_type, number, metadata, *, correct="B", with_options=True, annulled=False, answer=None, values=None):
    q = VestibularQuestion(
        exam_type=exam_type,
        exam_name=f"{exam_type} 2023",
        year=2023,
        number=number,
        statement=f"Enunciado {number}",
        is_annulled=annulled,
        answer=answer,
        metadata_=metadata,
    )
    db.add(q)
    db.flush()
    if with_options:
        for i, letter in enumerate("ABCDE"):
            db.add(VestibularQuestionOption(
                question_id=q.id,
                letter=letter,
                text=f"Alt {letter}",
                is_correct=(letter == correct),
                order=i,
                value=(values[i] if values else None),
            ))
    db.flush()
    return q


@pytest.fixture()
def exam_type():
    return f"t{uuid.uuid4().hex[:8]}"


def test_create_simulado_without_area_round_robin(client, db_session, sample_institution, exam_type):
    for n in range(1, 4):
        _vq(db_session, exam_type, n, {"area": "Matemática", "language": None})
    for n in range(4, 7):
        _vq(db_session, exam_type, n, {"area": "Linguagens", "language": None})
    # Fora do sorteio: sem alternativas, anulada, eletiva de língua estrangeira
    _vq(db_session, exam_type, 7, {"area": "Matemática"}, with_options=False)
    _vq(db_session, exam_type, 8, {"area": "Matemática"}, annulled=True)
    foreign = _vq(db_session, exam_type, 9, {"area": "Linguagens", "language": "Inglês"})
    user = _student(db_session, sample_institution)

    r = client.post("/api/simulados", json={"exam_type": exam_type, "num_questions": 4}, headers=_headers(user))
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["exam_type"] == exam_type
    assert data["question_count"] == 4
    areas = [q["area"] for q in data["questions"]]
    assert areas.count("Matemática") == 2 and areas.count("Linguagens") == 2
    for q in data["questions"]:
        assert q["statement"].startswith("Enunciado")
        assert [o["letter"] for o in q["options"]] == list("ABCDE")
        assert "is_correct" not in q["options"][0]
        assert q["question_type"] == "single"

    rows = db_session.query(SimuladoQuestion).filter_by(simulado_id=data["id"]).all()
    assert all(sq.vestibular_question_id is not None and sq.vq_exam_type == exam_type for sq in rows)
    assert foreign.id not in {sq.vestibular_question_id for sq in rows}


def test_create_simulado_with_area_and_subject_fallback(client, db_session, sample_institution, exam_type):
    _vq(db_session, exam_type, 1, {"area": "Matemática"})
    _vq(db_session, exam_type, 2, {"area": "Matemática"})
    _vq(db_session, exam_type, 3, {"subject": "História"})
    user = _student(db_session, sample_institution)
    h = _headers(user)

    areas = client.get("/api/simulados/areas", params={"exam_type": exam_type}, headers=h)
    assert areas.status_code == 200
    assert areas.json() == ["História", "Matemática"]

    r = client.post("/api/simulados", json={"exam_type": exam_type, "area": "Matemática", "num_questions": 10}, headers=h)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["question_count"] == 2
    assert {q["area"] for q in data["questions"]} == {"Matemática"}


def test_create_simulado_no_area_single_pool(client, db_session, sample_institution, exam_type):
    for n in range(1, 4):
        _vq(db_session, exam_type, n, {})
    user = _student(db_session, sample_institution)
    r = client.post("/api/simulados", json={"exam_type": exam_type, "num_questions": 3}, headers=_headers(user))
    assert r.status_code == 201, r.text
    assert r.json()["question_count"] == 3


def test_create_simulado_no_questions_returns_400(client, db_session, sample_institution, exam_type):
    user = _student(db_session, sample_institution)
    r = client.post("/api/simulados", json={"exam_type": exam_type}, headers=_headers(user))
    assert r.status_code == 400
    assert "Não há questões" in r.json()["detail"]


def test_exam_types_lists_only_existing(client, db_session, sample_institution, exam_type):
    _vq(db_session, exam_type, 1, {"area": "Matemática"})
    _vq(db_session, exam_type, 2, {"area": "Matemática"}, with_options=False)
    user = _student(db_session, sample_institution)
    r = client.get("/api/simulados/exam-types", headers=_headers(user))
    assert r.status_code == 200
    entry = next(e for e in r.json() if e["exam_type"] == exam_type)
    assert entry["question_count"] == 1


def test_report_blocks_question_from_next_draw(client, db_session, sample_institution, exam_type):
    _vq(db_session, exam_type, 1, {"area": "Matemática"})
    _vq(db_session, exam_type, 2, {"area": "Matemática"})
    user = _student(db_session, sample_institution)
    h = _headers(user)
    data = client.post("/api/simulados", json={"exam_type": exam_type, "num_questions": 2}, headers=h).json()
    sq_id = data["questions"][0]["id"]
    sq = db_session.get(SimuladoQuestion, sq_id)

    r = client.post(f"/api/simulados/questions/{sq_id}/report", json={"reason": "wrong_answer"}, headers=h)
    assert r.status_code == 201, r.text

    from app.routers.simulados import _pick_questions
    picked, _ = _pick_questions(db_session, exam_type, None, 10)
    assert sq.vestibular_question_id not in {q.id for q in picked}
    assert len(picked) == 1


def test_progress_submit_and_result(client, db_session, sample_institution, exam_type, monkeypatch):
    _vq(db_session, exam_type, 1, {"area": "Matemática"}, correct="B")
    # Gabarito só em correct_option (sem is_correct nas alternativas)
    q2 = _vq(db_session, exam_type, 2, {"area": "Matemática"}, correct="Z")
    q2.correct_option = "C"
    db_session.flush()
    user = _student(db_session, sample_institution)
    h = _headers(user)
    monkeypatch.setattr(simulado_corrector.settings, "GROQ_API_KEY", "", raising=False)

    data = client.post("/api/simulados", json={"exam_type": exam_type, "num_questions": 2}, headers=h).json()
    by_vq = {db_session.get(SimuladoQuestion, q["id"]).vestibular_question_id: q["id"] for q in data["questions"]}
    sq1, sq2 = by_vq[db_session.query(VestibularQuestion).filter_by(exam_type=exam_type, number=1).one().id], by_vq[q2.id]

    r = client.patch(f"/api/simulados/{data['id']}/progress",
                     json={"current_index": 1, "answers": [{"simulado_question_id": sq1, "selected_letter": "b"}]}, headers=h)
    assert r.status_code == 200, r.text
    bad = client.patch(f"/api/simulados/{data['id']}/progress",
                       json={"current_index": 1, "answers": [{"simulado_question_id": sq1, "selected_letter": "B,C"}]}, headers=h)
    assert bad.status_code == 400

    r = client.post(f"/api/simulados/{data['id']}/submit", json={"answers": [
        {"simulado_question_id": sq1, "selected_letter": "B"},
        {"simulado_question_id": sq2, "selected_letter": "C"},
    ]}, headers=h)
    assert r.status_code == 200, r.text

    db_session.expire_all()
    result = client.get(f"/api/simulados/{data['id']}/result", headers=h)
    assert result.status_code == 200, result.text
    res = result.json()
    assert res["status"] == "done"
    assert res["total_score"] == 100.0
    assert all(q["is_correct"] is True for q in res["questions"])

    dash = client.get("/api/simulados/dashboard", headers=h).json()
    assert dash["by_area"]["Matemática"] == {"total": 2, "correct": 2, "pct": 100.0}


def test_summation_question_grading_from_unified_table(db_session):
    q = _vq(db_session, "ufsc_test", 1, {"area": "Física", "question_type": "summation"},
            correct="Z", answer="5", values=[1, 2, 4, 8, 16])
    sq = SimuladoQuestion(simulado_id=None, order=1, vestibular_question_id=q.id, vq_exam_type="ufsc_test")
    sq.vestibular_question = q
    sq.selected_letter = "A,C"
    assert simulado_corrector.question_type_of(q) == "summation"
    ok, _ = simulado_corrector._grade_summation(sq, q)
    assert ok is True

    from app.routers.simulados import _vq_is_strict
    assert _vq_is_strict({"area": "Física", "question_type": "summation"}, "ufsc")
    assert not _vq_is_strict({"area": "Física", "question_type": "discursive"}, "ufsc")


def test_legacy_simulado_row_still_serializes(client, db_session, sample_institution):
    """Simulado antigo: SimuladoQuestion aponta pra enem_questions pela coluna
    legada enem_question_id (existe no Postgres, não mais no ORM)."""
    cols = [r[1] for r in db_session.execute(text("PRAGMA table_info(simulado_questions)")).fetchall()]
    if "enem_question_id" not in cols:
        db_session.execute(text("ALTER TABLE simulado_questions ADD COLUMN enem_question_id INTEGER"))
    simulado_corrector._LEGACY_FK_COLS_CACHE.clear()
    try:
        legacy = EnemQuestion(exam_name=f"ENEM legado {uuid.uuid4().hex[:6]}", year=2019, number=10,
                              area="Ciências Humanas", statement="Questão legada")
        db_session.add(legacy)
        db_session.flush()
        for i, letter in enumerate("ABCDE"):
            db_session.add(EnemQuestionOption(question_id=legacy.id, letter=letter, text=f"L{letter}",
                                              is_correct=(letter == "D"), order=i))
        user = _student(db_session, sample_institution)
        sim = Simulado(student_id=user.id, exam_type="enem", status="done", total_score=100.0)
        db_session.add(sim)
        db_session.flush()
        sq = SimuladoQuestion(simulado_id=sim.id, order=1, area="Ciências Humanas",
                              selected_letter="D", is_correct=True)
        db_session.add(sq)
        db_session.flush()
        db_session.execute(text("UPDATE simulado_questions SET enem_question_id = :q WHERE id = :id"),
                           {"q": legacy.id, "id": sq.id})
        db_session.expire_all()

        h = _headers(user)
        r = client.get(f"/api/simulados/{sim.id}", headers=h)
        assert r.status_code == 200, r.text
        q = r.json()["questions"][0]
        assert q.get("statement") == "Questão legada", q
        assert [o["letter"] for o in q["options"]] == list("ABCDE")
        assert next(o for o in q["options"] if o["letter"] == "D")["is_correct"] is True

        # Denúncia de questão legada continua usando o exam_type da tabela legada
        from app.routers.simulados import _underlying_exam_type_and_id
        assert _underlying_exam_type_and_id(db_session.get(SimuladoQuestion, q["id"])) == ("enem", legacy.id)
    finally:
        simulado_corrector._LEGACY_FK_COLS_CACHE.clear()
