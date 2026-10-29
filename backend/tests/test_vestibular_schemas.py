"""Tests for app.vestibular.schemas — Pydantic schemas for unified vestibular API."""
import pytest
from datetime import datetime
from app.vestibular.schemas import (
    VestibularOptionOut,
    VestibularImageOut,
    VestibularQuestionOut,
    VestibularQuestionListOut,
    VestibularFilterParams,
)


class TestVestibularOptionOut:
    def test_valid_option_with_letter(self):
        opt = VestibularOptionOut(id=1, letter="A", text="Opção A", is_correct=True, order=1)
        assert opt.letter == "A"
        assert opt.is_correct is True
        assert opt.order == 1

    def test_defaults(self):
        opt = VestibularOptionOut(id=2, text="Opção B")
        assert opt.letter is None
        assert opt.value is None
        assert opt.is_correct is False
        assert opt.order == 0

    def test_value_variant(self):
        opt = VestibularOptionOut(id=3, value=42, text="Resposta 42")
        assert opt.value == 42
        assert opt.letter is None

    def test_from_attributes(self):
        class FakeOpt:
            id = 10
            letter = "C"
            value = None
            text = "Alt C"
            is_correct = False
            order = 3
        opt = VestibularOptionOut.model_validate(FakeOpt())
        assert opt.id == 10
        assert opt.letter == "C"


class TestVestibularImageOut:
    def test_valid_image(self):
        img = VestibularImageOut(id=1, image_base64="abc123", order=1)
        assert img.image_base64 == "abc123"
        assert img.order == 1

    def test_fallback_image_base64_from_url(self):
        img = VestibularImageOut(id=1, image_url="http://example.com/img.png")
        assert img.image_base64 == "http://example.com/img.png"

    def test_no_fallback_when_base64_present(self):
        img = VestibularImageOut(id=1, image_base64="data:...", image_url="http://other.com/img.png")
        assert img.image_base64 == "data:..."

    def test_defaults(self):
        img = VestibularImageOut(id=5)
        assert img.image_base64 is None
        assert img.image_url is None
        assert img.order == 0


class TestVestibularQuestionOut:
    def _make_question(self, **overrides):
        data = {
            "id": 1,
            "exam_type": "enem",
            "exam_name": "ENEM 2024",
            "year": 2024,
            "number": 1,
            "statement": "Questão teste",
        }
        data.update(overrides)
        return VestibularQuestionOut(**data)

    def test_minimal_question(self):
        q = self._make_question()
        assert q.id == 1
        assert q.exam_type == "enem"
        assert q.options == []
        assert q.images == []
        assert q.metadata == {}
        assert q.is_annulled is False

    def test_with_options_and_images(self):
        opts = [VestibularOptionOut(id=10, letter="A", text="Alt A", is_correct=True, order=1)]
        imgs = [VestibularImageOut(id=20, image_base64="img_data", order=1)]
        q = self._make_question(options=opts, images=imgs, metadata={"area": "Matemática"})
        assert len(q.options) == 1
        assert len(q.images) == 1
        assert q.metadata["area"] == "Matemática"

    def test_metadata_alias(self):
        """metadata_ in DB maps to metadata in API response."""
        q = VestibularQuestionOut(
            id=1, exam_type="enem", year=2024, number=1, statement="Q",
            metadata_={"area": "Física"},
        )
        dumped = q.model_dump(by_alias=True)
        assert "metadata" in dumped
        assert dumped["metadata"]["area"] == "Física"

    def test_fallback_image_base64(self):
        q = self._make_question(image_url="http://example.com/q.png")
        assert q.image_base64 == "http://example.com/q.png"

    def test_no_fallback_when_base64_set(self):
        q = self._make_question(image_base64="data:...", image_url="http://other.com/q.png")
        assert q.image_base64 == "data:..."

    def test_optional_fields_default_none(self):
        q = self._make_question()
        assert q.html_statement is None
        assert q.answer is None
        assert q.correct_option is None
        assert q.created_at is None


class TestVestibularQuestionListOut:
    def test_empty_list(self):
        resp = VestibularQuestionListOut(items=[], total=0, page=1, size=20)
        assert resp.items == []
        assert resp.total == 0
        assert resp.page == 1
        assert resp.size == 20

    def test_with_items(self):
        item = VestibularQuestionOut(
            id=1, exam_type="fuvest", exam_name="FUVEST 2023",
            year=2023, number=10, statement="Q10",
        )
        resp = VestibularQuestionListOut(items=[item], total=1, page=1, size=20)
        assert len(resp.items) == 1
        assert resp.items[0].id == 1
        assert resp.total == 1


class TestVestibularFilterParams:
    def test_defaults(self):
        params = VestibularFilterParams(exam_type="enem")
        assert params.year is None
        assert params.area is None
        assert params.language is None
        assert params.search is None
        assert params.page == 1
        assert params.size == 20

    def test_custom_values(self):
        params = VestibularFilterParams(
            exam_type="ufpr", year=2024, area="Matemática",
            language="Inglês", search="função", page=2, size=50,
        )
        assert params.exam_type == "ufpr"
        assert params.year == 2024
        assert params.area == "Matemática"
        assert params.page == 2
        assert params.size == 50

    def test_page_minimum_is_1(self):
        with pytest.raises(Exception):
            VestibularFilterParams(exam_type="enem", page=0)

    def test_size_bounds(self):
        with pytest.raises(Exception):
            VestibularFilterParams(exam_type="enem", size=0)
        with pytest.raises(Exception):
            VestibularFilterParams(exam_type="enem", size=101)

    def test_max_size_allowed(self):
        params = VestibularFilterParams(exam_type="enem", size=100)
        assert params.size == 100