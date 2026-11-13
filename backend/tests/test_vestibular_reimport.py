"""save_vestibular_question(force_reimport=True) atualiza a questão no lugar.

Antes, o reimport apagava a linha de `vestibular_questions` e criava outra:
`exam_vestibular_questions` (ON DELETE CASCADE) perdia a questão em silêncio
e `simulado_questions.vestibular_question_id` ficava apontando para um id
inexistente. Agora o id da questão é mantido, os campos/metadata são
sobrescritos, as alternativas são atualizadas pela posição e as imagens
substituídas.
"""
import uuid
from unittest.mock import patch

from app.core.security import get_password_hash
from app.models import Class, Exam, ExamVestibularQuestion, Simulado, SimuladoQuestion, Subject, User, UserRole
from app.services.import_batch import save_vestibular_question
from app.vestibular.models import VestibularQuestion, VestibularQuestionImage, VestibularQuestionOption


def _opts(texts, correct="A"):
    return [
        {"letter": letter, "text": text, "is_correct": letter == correct, "order": i}
        for i, (letter, text) in enumerate(zip("ABCDE", texts))
    ]


def _save(db, *, statement, options, force=False, image="data:image/png;base64,AAAA", images=None,
          metadata=None, correct="A", exam_name=None):
    return save_vestibular_question(
        db,
        exam_type="enem",
        exam_name=exam_name or "ENEM 2025 – Dia 2 (Azul)",
        year=2025,
        number=124,
        statement=statement,
        html_statement=f"<p>{statement}</p>",
        options=options,
        image_base64=image,
        images=images,
        correct_option=correct,
        metadata=metadata if metadata is not None else {"area": "Ciências da Natureza"},
        force_reimport=force,
    )


def _upload_stub(data, *, exam_type, year, number, suffix="", **_):
    return f"https://cdn.test/{exam_type}/{year}/{number}{suffix}-{uuid.uuid4().hex[:6]}.png"


def _exam_and_simulado(db, inst):
    tag = uuid.uuid4().hex[:8]
    prof = User(name="Prof", email=f"prof-{tag}@x.com", hashed_password=get_password_hash("x12345678"),
                role=UserRole.PROFESSOR, institution_id=inst.id)
    student = User(name="Aluno", email=f"aluno-{tag}@x.com", hashed_password=get_password_hash("x12345678"),
                   role=UserRole.STUDENT, institution_id=inst.id)
    subject = Subject(name=f"Física {tag}", institution_id=inst.id)
    klass = Class(name=f"Turma {tag}", year=2026, institution_id=inst.id)
    db.add_all([prof, student, subject, klass])
    db.flush()
    exam = Exam(title="Prova", professor_id=prof.id, subject_id=subject.id, class_id=klass.id, status="published")
    simulado = Simulado(student_id=student.id, exam_type="enem")
    db.add_all([exam, simulado])
    db.flush()
    return exam, simulado


@patch("app.services.import_batch.upload_image", side_effect=_upload_stub)
def test_force_reimport_keeps_question_id_and_exam_links(_upload, db_session, sample_institution):
    vq, created = _save(db_session, statement="104 Pa antigo", options=_opts(["a", "b", "c", "d", "e"]),
                        images=[{"image_base64": "data:image/png;base64,BBBB", "order": 1}])
    assert created
    db_session.flush()
    vq_id = vq.id
    option_ids = [o.id for o in sorted(vq.options, key=lambda o: o.order)]

    exam, simulado = _exam_and_simulado(db_session, sample_institution)
    db_session.add(ExamVestibularQuestion(exam_id=exam.id, vestibular_question_id=vq_id, order=0))
    db_session.add(SimuladoQuestion(simulado_id=simulado.id, order=0, vestibular_question_id=vq_id,
                                    vq_exam_type="enem", selected_letter="B"))
    db_session.flush()

    vq2, created2 = _save(db_session, statement="10⁴ Pa novo",
                          options=_opts(["0,16 m.", "0,50 m.", "0,80 m.", "1,60 m.", "8,00 m."], correct="C"),
                          metadata={"area": "Ciências da Natureza", "image_credit": "Disponível em: x"},
                          correct="C", force=True)
    db_session.flush()
    db_session.expire_all()

    assert created2 is True
    assert vq2.id == vq_id
    assert db_session.query(VestibularQuestion).filter_by(number=124).count() == 1
    fresh = db_session.get(VestibularQuestion, vq_id)
    assert fresh.statement == "10⁴ Pa novo"
    assert fresh.html_statement == "<p>10⁴ Pa novo</p>"
    assert fresh.correct_option == "C"
    assert fresh.metadata_ == {"area": "Ciências da Natureza", "image_credit": "Disponível em: x"}

    opts = sorted(fresh.options, key=lambda o: o.order)
    assert [o.id for o in opts] == option_ids  # ids preservados pela posição
    assert [o.text for o in opts] == ["0,16 m.", "0,50 m.", "0,80 m.", "1,60 m.", "8,00 m."]
    assert [o.is_correct for o in opts] == [False, False, True, False, False]

    # Imagens substituídas: só a principal nova (o reimport não trouxe extras).
    imgs = db_session.query(VestibularQuestionImage).filter_by(question_id=vq_id).all()
    assert len(imgs) == 1 and imgs[0].order == 0

    # Vínculos com prova e simulado sobrevivem.
    assert db_session.query(ExamVestibularQuestion).filter_by(exam_id=exam.id, vestibular_question_id=vq_id).count() == 1
    sq = db_session.query(SimuladoQuestion).filter_by(simulado_id=simulado.id).one()
    assert sq.vestibular_question_id == vq_id
    assert sq.selected_letter == "B"


@patch("app.services.import_batch.upload_image", side_effect=_upload_stub)
def test_force_reimport_adds_and_removes_options_by_position(_upload, db_session):
    vq, _ = _save(db_session, statement="q", options=_opts(["a", "b", "c", "d", "e"]), image=None)
    db_session.flush()
    first_four = [o.id for o in sorted(vq.options, key=lambda o: o.order)][:4]

    _save(db_session, statement="q", options=_opts(["A1", "B1", "C1", "D1"]), image=None, force=True)
    db_session.flush()
    db_session.expire_all()
    opts = sorted(db_session.get(VestibularQuestion, vq.id).options, key=lambda o: o.order)
    assert [o.id for o in opts] == first_four
    assert [o.text for o in opts] == ["A1", "B1", "C1", "D1"]
    assert db_session.query(VestibularQuestionOption).filter_by(question_id=vq.id).count() == 4

    _save(db_session, statement="q", options=_opts(["A2", "B2", "C2", "D2", "E2"]), image=None, force=True)
    db_session.flush()
    db_session.expire_all()
    opts = sorted(db_session.get(VestibularQuestion, vq.id).options, key=lambda o: o.order)
    assert [o.id for o in opts][:4] == first_four
    assert [o.text for o in opts] == ["A2", "B2", "C2", "D2", "E2"]


@patch("app.services.import_batch.upload_image", side_effect=_upload_stub)
def test_without_force_existing_question_is_untouched(_upload, db_session):
    vq, _ = _save(db_session, statement="original", options=_opts(["a", "b", "c", "d", "e"]))
    db_session.flush()
    same, created = _save(db_session, statement="novo", options=_opts(["1", "2", "3", "4", "5"]))
    assert created is False
    assert same.id == vq.id
    assert same.statement == "original"


def test_failed_main_image_upload_keeps_previous_main_image(db_session):
    with patch("app.services.import_batch.upload_image", side_effect=_upload_stub):
        vq, _ = _save(db_session, statement="q", options=_opts(["a", "b", "c", "d", "e"]))
        db_session.flush()
    old_url = db_session.query(VestibularQuestionImage).filter_by(question_id=vq.id, order=0).one().image_url

    with patch("app.services.import_batch.upload_image", side_effect=RuntimeError("storage down")):
        _save(db_session, statement="q2", options=_opts(["a", "b", "c", "d", "e"]), force=True)
        db_session.flush()
    db_session.expire_all()
    imgs = db_session.query(VestibularQuestionImage).filter_by(question_id=vq.id).all()
    assert [i.image_url for i in imgs] == [old_url]
    assert db_session.get(VestibularQuestion, vq.id).statement == "q2"
