"""GET /api/exams/:id e GET /api/exams devolvem o formato certo para cada perfil.

Regressão da rodada 3 de QA: o professor recebia só as colunas da tabela
(sem subject, class_, professor e questões) e a tela da prova quebrava; o aluno
recebia o objeto completo do professor (e-mail, papel, datas de convite).
"""
import uuid

from app.core.security import create_access_token, get_password_hash
from app.models import (
    Class,
    Exam,
    ExamQuestion,
    Question,
    QuestionOption,
    QuestionType,
    StudentClass,
    Subject,
    User,
    UserRole,
)


def _headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def _setup(db, inst, with_question: bool = True):
    tag = uuid.uuid4().hex[:8]  # endpoints fazem commit; evita colisão entre testes
    prof = User(name="Prof", email=f"prof-{tag}@x.com", hashed_password=get_password_hash("x12345678"),
                role=UserRole.PROFESSOR, institution_id=inst.id)
    student = User(name="Aluno", email=f"aluno-{tag}@x.com", hashed_password=get_password_hash("x12345678"),
                   role=UserRole.STUDENT, institution_id=inst.id)
    subject = Subject(name=f"Física {tag}", institution_id=inst.id)
    klass = Class(name=f"1 Ano EM {tag}", year=2026, institution_id=inst.id)
    db.add_all([prof, student, subject, klass])
    db.flush()
    db.add(StudentClass(student_id=student.id, class_id=klass.id))
    exam = Exam(title="Prova", professor_id=prof.id, subject_id=subject.id, class_id=klass.id, status="published")
    db.add(exam)
    db.flush()
    if with_question:
        q = Question(statement="Quanto é 1+1?", question_type=QuestionType.MULTIPLE_CHOICE,
                     subject_id=subject.id, professor_id=prof.id)
        db.add(q)
        db.flush()
        db.add_all([
            QuestionOption(question_id=q.id, text="2", is_correct=True, order=0),
            QuestionOption(question_id=q.id, text="3", is_correct=False, order=1),
        ])
        db.add(ExamQuestion(exam_id=exam.id, question_id=q.id, order=1, points=1))
    db.flush()
    return prof, student, exam


def test_professor_gets_full_exam(client, db_session, sample_institution):
    prof, _, exam = _setup(db_session, sample_institution)
    r = client.get(f"/api/exams/{exam.id}", headers=_headers(prof))
    assert r.status_code == 200
    body = r.json()
    assert body["subject"]["name"].startswith("Física")
    assert body["class_"]["name"].startswith("1 Ano EM")
    assert body["professor"]["name"] == "Prof"
    assert len(body["exam_questions"]) == 1
    assert any(o.get("is_correct") for o in body["exam_questions"][0]["question"]["options"])


def test_student_gets_only_professor_name_and_no_answer_key(client, db_session, sample_institution):
    _, student, exam = _setup(db_session, sample_institution)
    r = client.get(f"/api/exams/{exam.id}", headers=_headers(student))
    assert r.status_code == 200
    body = r.json()
    assert body["professor"] == {"id": exam.professor_id, "name": "Prof"}
    assert body["subject"]["name"].startswith("Física")
    for opt in body["exam_questions"][0]["question"]["options"]:
        assert "is_correct" not in opt


def test_student_list_hides_professor_data_and_empty_exams(client, db_session, sample_institution):
    prof, student, exam = _setup(db_session, sample_institution)
    empty = Exam(title="Vazia", professor_id=prof.id, subject_id=exam.subject_id, class_id=exam.class_id, status="published")
    db_session.add(empty)
    db_session.flush()

    r = client.get("/api/exams", headers=_headers(student))
    assert r.status_code == 200
    items = r.json()
    assert [i["id"] for i in items] == [exam.id]
    assert items[0]["professor"] == {"id": prof.id, "name": "Prof"}
    assert "submission_count" not in items[0]

    r = client.get("/api/exams", headers=_headers(prof))
    ids = {i["id"] for i in r.json()}
    assert ids == {exam.id, empty.id}
    assert all("submission_count" in i for i in r.json())


def test_draft_is_hidden_from_student_until_published(client, db_session, sample_institution):
    prof, student, exam = _setup(db_session, sample_institution)
    exam.status = "draft"
    db_session.flush()

    assert client.get("/api/exams", headers=_headers(student)).json() == []
    assert client.get(f"/api/exams/{exam.id}", headers=_headers(student)).status_code == 404
    r = client.post(f"/api/submissions/exams/{exam.id}", json={"answers": []}, headers=_headers(student))
    assert r.status_code == 400

    r = client.post(f"/api/exams/{exam.id}/publish", headers=_headers(prof))
    assert r.status_code == 200 and r.json()["status"] == "published"
    assert [i["id"] for i in client.get("/api/exams", headers=_headers(student)).json()] == [exam.id]

    r = client.post(f"/api/exams/{exam.id}/unpublish", headers=_headers(prof))
    assert r.status_code == 200 and r.json()["status"] == "draft"


def test_cannot_publish_empty_exam(client, db_session, sample_institution):
    prof, _, exam = _setup(db_session, sample_institution, with_question=False)
    exam.status = "draft"
    db_session.flush()
    assert client.post(f"/api/exams/{exam.id}/publish", headers=_headers(prof)).status_code == 400
