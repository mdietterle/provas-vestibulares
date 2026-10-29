"""Tests for app.vestibular.compat — legacy ↔ unified conversion layer."""
import pytest
from unittest.mock import patch, MagicMock
from app.vestibular.compat import to_legacy_dict, from_legacy_row


class FakeOption:
    def __init__(self, id, letter, value, text, is_correct, order):
        self.id = id
        self.letter = letter
        self.value = value
        self.text = text
        self.is_correct = is_correct
        self.order = order


class FakeImage:
    def __init__(self, id, image_base64, image_url, order):
        self.id = id
        self.image_base64 = image_base64
        self.image_url = image_url
        self.order = order


class FakeVQ:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 1)
        self.exam_name = kwargs.get("exam_name", "ENEM")
        self.year = kwargs.get("year", 2024)
        self.number = kwargs.get("number", 1)
        self.statement = kwargs.get("statement", "Questão teste")
        self.created_at = kwargs.get("created_at", "2024-01-01T00:00:00Z")
        self.image_base64 = kwargs.get("image_base64", None)
        self.answer = kwargs.get("answer", None)
        self.is_annulled = kwargs.get("is_annulled", False)
        self.correct_option = kwargs.get("correct_option", None)
        self.extra_data = kwargs.get("extra_data", {})
        self.options = kwargs.get("options", [])
        self.images = kwargs.get("images", [])


class TestToLegacyDict:
    def test_basic_fields(self):
        vq = FakeVQ()
        result = to_legacy_dict(vq)
        assert result["id"] == 1
        assert result["exam_name"] == "ENEM"
        assert result["year"] == 2024
        assert result["number"] == 1
        assert result["statement"] == "Questão teste"
        assert result["is_annulled"] is False

    def test_expands_extra_data_to_top_level(self):
        vq = FakeVQ(extra_data={"color": "blue", "module": "math"})
        result = to_legacy_dict(vq)
        assert result["color"] == "blue"
        assert result["module"] == "math"

    def test_options_sorted_by_order(self):
        opts = [
            FakeOption(2, "B", None, "Opção B", False, 2),
            FakeOption(1, "A", None, "Opção A", True, 1),
        ]
        vq = FakeVQ(options=opts)
        result = to_legacy_dict(vq)
        assert len(result["options"]) == 2
        assert result["options"][0]["letter"] == "A"
        assert result["options"][1]["letter"] == "B"

    def test_images_sorted_by_order(self):
        imgs = [
            FakeImage(2, "base64_2", "url2", 2),
            FakeImage(1, "base64_1", "url1", 1),
        ]
        vq = FakeVQ(images=imgs)
        result = to_legacy_dict(vq)
        assert len(result["images"]) == 2
        assert result["images"][0]["id"] == 1
        assert result["images"][1]["id"] == 2

    def test_empty_options_and_images(self):
        vq = FakeVQ()
        result = to_legacy_dict(vq)
        assert result["options"] == []
        assert result["images"] == []


class TestFromLegacyRow:
    @patch("app.vestibular.compat.get_exam_config")
    def test_maps_core_fields(self, mock_get_config):
        mock_config = MagicMock()
        mock_config.metadata_keys = ["area", "language"]
        mock_get_config.return_value = mock_config

        row = {
            "id": 99,
            "exam_name": "FUVEST",
            "year": 2023,
            "number": 5,
            "statement": "Enunciado",
            "area": "Matemática",
            "language": "Português",
            "unknown_field": "should go to metadata",
            "options": [{"id": 1}],
            "images": [],
        }
        result = from_legacy_row(row, "fuvest")
        assert result["exam_type"] == "fuvest"
        assert result["exam_name"] == "FUVEST"
        assert result["year"] == 2023
        assert result["metadata"]["area"] == "Matemática"
        assert result["metadata"]["language"] == "Português"
        assert result["metadata"]["unknown_field"] == "should go to metadata"
        assert result["options"] == [{"id": 1}]
        assert "id" not in result  # skip_keys excludes id

    @patch("app.vestibular.compat.get_exam_config")
    def test_none_metadata_values_excluded(self, mock_get_config):
        mock_config = MagicMock()
        mock_config.metadata_keys = ["area"]
        mock_get_config.return_value = mock_config

        row = {"exam_name": "ENEM", "year": 2024, "number": 1, "statement": "Q", "area": None}
        result = from_legacy_row(row, "enem")
        assert "area" not in result["metadata"]

    @patch("app.vestibular.compat.get_exam_config")
    def test_no_config_returns_empty_metadata_keys(self, mock_get_config):
        mock_get_config.return_value = None
        row = {"exam_name": "X", "year": 2024, "number": 1, "statement": "Q"}
        result = from_legacy_row(row, "unknown_exam")
        assert result["exam_type"] == "unknown_exam"
        assert result["metadata"] == {}