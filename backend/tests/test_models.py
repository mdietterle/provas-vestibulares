import pytest
from app.models import Base, Institution, Simulado, SimuladoQuestion, User, ItaQuestion
from app.database import Base as DBBase
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_models.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _make_institution(db) -> Institution:
    institution = Institution(name="Test Institution")
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution


def test_user_creation():
    db = TestingSessionLocal()
    institution = _make_institution(db)
    user = User(
        name="Test User",
        email="test2@test.com",
        hashed_password="hashed",
        role="student",
        institution_id=institution.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.id is not None
    assert user.email == "test2@test.com"
    db.close()

def test_simulado_creation():
    db = TestingSessionLocal()
    institution = _make_institution(db)
    student = User(
        name="Test Student",
        email="student@test.com",
        hashed_password="hashed",
        role="student",
        institution_id=institution.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    simulado = Simulado(
        exam_type="enem",
        student_id=student.id,
    )
    db.add(simulado)
    db.commit()
    db.refresh(simulado)
    assert simulado.id is not None
    db.close()

def test_simulado_question_link():
    db = TestingSessionLocal()
    institution = _make_institution(db)
    student = User(
        name="Test Student 2",
        email="student2@test.com",
        hashed_password="hashed",
        role="student",
        institution_id=institution.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    simulado = Simulado(exam_type="enem", student_id=student.id)
    db.add(simulado)
    db.commit()
    db.refresh(simulado)

    # Create an ITA question
    ita_q = ItaQuestion(
        exam_name="ITA 2024",
        year=2024,
        number=1,
        statement="Test ITA question"
    )
    db.add(ita_q)
    db.commit()
    db.refresh(ita_q)

    sq = SimuladoQuestion(
        simulado_id=simulado.id,
        ita_question_id=ita_q.id,
        order=1
    )
    db.add(sq)
    db.commit()
    db.refresh(sq)

    assert sq.id is not None
    assert sq.ita_question_id == ita_q.id
    db.close()
