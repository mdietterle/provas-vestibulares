"""Tests for app.vestibular.service — VestibularQuestionService CRUD + search."""
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from app.vestibular.service import VestibularQuestionService


class FakeVQ:
    """Minimal stand-in for VestibularQuestion model."""
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 1)
        self.exam_type = kwargs.get("exam_type", "enem")
        self.exam_name = kwargs.get("exam_name", "ENEM 2024")
        self.year = kwargs.get("year", 2024)
        self.number = kwargs.get("number", 1)
        self.statement = kwargs.get("statement", "Questão teste")
        self.metadata_ = kwargs.get("metadata_", {})
        self.options = kwargs.get("options", [])
        self.images = kwargs.get("images", [])


def _make_db():
    """Create a mock SQLAlchemy Session with chainable execute()."""
    db = MagicMock()
    result = MagicMock()
    db.execute.return_value = result
    result.scalar.return_value = 5
    result.scalars.return_value.unique.return_value = [FakeVQ()]
    result.all.return_value = [(2024,), (2023,)]
    return db


class TestInit:
    def test_stores_db(self):
        db = _make_db()
        svc = VestibularQuestionService(db)
        assert svc.db is db


class TestList:
    @patch("app.vestibular.service.select")
    def test_returns_questions_and_total(self, mock_select):
        db = _make_db()
        # Make select() return a chainable mock
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.order_by.return_value = chain
        chain.offset.return_value = chain
        chain.limit.return_value = chain
        chain.options.return_value = chain
        chain.subquery.return_value = MagicMock()

        svc = VestibularQuestionService(db)
        questions, total = svc.list("enem", page=1, size=20)

        assert total == 5
        assert len(questions) == 1
        assert isinstance(questions[0], FakeVQ)

    @patch("app.vestibular.service.select")
    def test_applies_year_filter(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.order_by.return_value = chain
        chain.offset.return_value = chain
        chain.limit.return_value = chain
        chain.options.return_value = chain
        chain.subquery.return_value = MagicMock()

        svc = VestibularQuestionService(db)
        svc.list("enem", year=2024)

        # where should be called at least twice: exam_type + year
        assert chain.where.call_count >= 2

    @patch("app.vestibular.service.select")
    def test_applies_search_filter(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.order_by.return_value = chain
        chain.offset.return_value = chain
        chain.limit.return_value = chain
        chain.options.return_value = chain
        chain.subquery.return_value = MagicMock()

        svc = VestibularQuestionService(db)
        svc.list("enem", search="fotossíntese")

        # where called for exam_type + search (or_)
        assert chain.where.call_count >= 2


class TestGet:
    @patch("app.vestibular.service.select")
    def test_returns_single_question(self, mock_select):
        db = _make_db()
        fake = FakeVQ(id=42)
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.options.return_value = chain
        scalars_mock = MagicMock()
        scalars_mock.unique.return_value.first.return_value = fake
        db.execute.return_value.scalars.return_value = scalars_mock

        svc = VestibularQuestionService(db)
        result = svc.get(42)

        assert result is fake
        assert result.id == 42

    @patch("app.vestibular.service.select")
    def test_returns_none_when_not_found(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.options.return_value = chain
        scalars_mock = MagicMock()
        scalars_mock.unique.return_value.first.return_value = None
        db.execute.return_value.scalars.return_value = scalars_mock

        svc = VestibularQuestionService(db)
        result = svc.get(999)

        assert result is None


class TestCreate:
    @patch("app.vestibular.service.VestibularQuestionImage")
    @patch("app.vestibular.service.VestibularQuestionOption")
    @patch("app.vestibular.service.VestibularQuestion")
    @patch("app.vestibular.service.get_exam_config")
    def test_creates_question_with_options_and_images(
        self, mock_get_config, MockVQ, MockOpt, MockImg
    ):
        mock_get_config.return_value = MagicMock()
        db = _make_db()
        mock_vq_instance = MagicMock()
        mock_vq_instance.id = 10
        MockVQ.return_value = mock_vq_instance

        svc = VestibularQuestionService(db)
        data = {
            "exam_name": "ENEM 2024",
            "year": 2024,
            "number": 1,
            "statement": "Q1",
            "options": [{"letter": "A", "text": "Opção A", "is_correct": True}],
            "images": [{"image_base64": "abc123"}],
        }
        result = svc.create("enem", data)

        MockVQ.assert_called_once()
        db.add.assert_called()
        db.flush.assert_called_once()
        MockOpt.assert_called_once_with(question_id=10, letter="A", text="Opção A", is_correct=True)
        MockImg.assert_called_once_with(question_id=10, image_base64="abc123")
        assert result is mock_vq_instance

    @patch("app.vestibular.service.get_exam_config")
    def test_raises_on_unknown_exam_type(self, mock_get_config):
        mock_get_config.return_value = None
        db = _make_db()
        svc = VestibularQuestionService(db)

        with pytest.raises(ValueError, match="Unknown exam_type"):
            svc.create("invalid_exam", {"statement": "Q"})


class TestBulkCreate:
    @patch("app.vestibular.service.VestibularQuestionImage")
    @patch("app.vestibular.service.VestibularQuestionOption")
    @patch("app.vestibular.service.VestibularQuestion")
    @patch("app.vestibular.service.get_exam_config")
    def test_returns_count_created(
        self, mock_get_config, MockVQ, MockOpt, MockImg
    ):
        mock_get_config.return_value = MagicMock()
        db = _make_db()
        mock_vq = MagicMock()
        mock_vq.id = 1
        MockVQ.return_value = mock_vq

        svc = VestibularQuestionService(db)
        rows = [
            {"exam_name": "E1", "year": 2024, "number": 1, "statement": "Q1", "options": [], "images": []},
            {"exam_name": "E1", "year": 2024, "number": 2, "statement": "Q2", "options": [], "images": []},
            {"exam_name": "E1", "year": 2024, "number": 3, "statement": "Q3", "options": [], "images": []},
        ]
        count = svc.bulk_create("enem", rows)

        assert count == 3
        assert MockVQ.call_count == 3

    @patch("app.vestibular.service.get_exam_config")
    def test_raises_on_unknown_exam_type(self, mock_get_config):
        mock_get_config.return_value = None
        db = _make_db()
        svc = VestibularQuestionService(db)

        with pytest.raises(ValueError, match="Unknown exam_type"):
            svc.bulk_create("bad", [{"statement": "Q"}])


class TestDistinctQueries:
    @patch("app.vestibular.service.select")
    def test_get_distinct_years(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.distinct.return_value = chain
        chain.order_by.return_value = chain
        db.execute.return_value.all.return_value = [(2024,), (2023,), (2022,)]

        svc = VestibularQuestionService(db)
        years = svc.get_distinct_years("enem")

        assert years == [2024, 2023, 2022]

    @patch("app.vestibular.service.select")
    def test_get_distinct_areas(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.op.return_value = chain
        chain.where.return_value = chain
        chain.distinct.return_value = chain
        chain.order_by.return_value = chain
        db.execute.return_value.all.return_value = [("Matemática",), ("Física",), (None,)]

        svc = VestibularQuestionService(db)
        areas = svc.get_distinct_areas("enem")

        # None values filtered out
        assert "Matemática" in areas
        assert "Física" in areas
        assert None not in areas

    @patch("app.vestibular.service.select")
    def test_get_distinct_languages(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.op.return_value = chain
        chain.where.return_value = chain
        chain.distinct.return_value = chain
        chain.order_by.return_value = chain
        db.execute.return_value.all.return_value = [("Inglês",), ("Espanhol",)]

        svc = VestibularQuestionService(db)
        langs = svc.get_distinct_languages("enem")

        assert langs == ["Inglês", "Espanhol"]

    @patch("app.vestibular.service.select")
    def test_get_distinct_exam_names_no_year(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.distinct.return_value = chain
        chain.order_by.return_value = chain
        db.execute.return_value.all.return_value = [("ENEM 2024",), ("ENEM 2023",)]

        svc = VestibularQuestionService(db)
        names = svc.get_distinct_exam_names("enem")

        assert names == ["ENEM 2024", "ENEM 2023"]

    @patch("app.vestibular.service.select")
    def test_get_distinct_exam_names_with_year(self, mock_select):
        db = _make_db()
        chain = MagicMock()
        mock_select.return_value = chain
        chain.where.return_value = chain
        chain.distinct.return_value = chain
        chain.order_by.return_value = chain
        db.execute.return_value.all.return_value = [("ENEM 2024 – Dia 1",)]

        svc = VestibularQuestionService(db)
        names = svc.get_distinct_exam_names("enem", year=2024)

        assert names == ["ENEM 2024 – Dia 1"]
        # where should include year filter
        assert chain.where.call_count >= 1