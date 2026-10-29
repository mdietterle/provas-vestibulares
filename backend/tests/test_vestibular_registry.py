"""Tests for app.vestibular.registry — exam type configuration."""
import pytest
from app.vestibular.registry import get_exam_config, all_exam_types, EXAM_TYPE_REGISTRY, ExamConfig


class TestExamConfig:
    def test_frozen_dataclass(self):
        cfg = ExamConfig(label="Test")
        with pytest.raises(AttributeError):
            cfg.label = "Changed"

    def test_default_values(self):
        cfg = ExamConfig(label="Test")
        assert cfg.metadata_keys == []
        assert cfg.unique_fields == ["exam_name", "number"]
        assert cfg.option_variant == "letter"
        assert cfg.has_images is False
        assert cfg.has_html_statement is False


class TestGetExamConfig:
    def test_returns_known_exam(self):
        cfg = get_exam_config("enem")
        assert cfg is not None
        assert cfg.label == "ENEM"
        assert "area" in cfg.metadata_keys

    def test_case_insensitive(self):
        cfg_lower = get_exam_config("enem")
        cfg_upper = get_exam_config("ENEM")
        cfg_mixed = get_exam_config("Enem")
        assert cfg_lower is cfg_upper is cfg_mixed

    def test_returns_none_for_unknown(self):
        assert get_exam_config("nonexistent_exam") is None

    def test_all_registered_exams_return_config(self):
        for exam_type in EXAM_TYPE_REGISTRY:
            cfg = get_exam_config(exam_type)
            assert cfg is not None
            assert isinstance(cfg, ExamConfig)
            assert cfg.label != ""

    def test_enem_has_language_in_unique_fields(self):
        cfg = get_exam_config("enem")
        assert "language" in cfg.unique_fields

    def test_uem_has_value_option_variant(self):
        cfg = get_exam_config("uem")
        assert cfg.option_variant == "value"

    def test_ufg_has_no_letter_option_variant(self):
        cfg = get_exam_config("ufg")
        assert cfg.option_variant == "no_letter"

    def test_acafe_has_images(self):
        cfg = get_exam_config("acafe")
        assert cfg.has_images is True

    def test_ufms_has_html_statement(self):
        cfg = get_exam_config("ufms")
        assert cfg.has_html_statement is True

    def test_concurso_fepese_unique_fields(self):
        cfg = get_exam_config("concurso_fepese")
        assert "concurso_slug" in cfg.unique_fields
        assert "cargo_code" in cfg.unique_fields


class TestAllExamTypes:
    def test_returns_sorted_list(self):
        types = all_exam_types()
        assert types == sorted(types)

    def test_returns_all_registered_keys(self):
        types = all_exam_types()
        assert set(types) == set(EXAM_TYPE_REGISTRY.keys())

    def test_non_empty(self):
        assert len(all_exam_types()) > 0

    def test_contains_major_exams(self):
        types = all_exam_types()
        for exam in ["enem", "fuvest", "unicamp", "ufpr", "ufrgs"]:
            assert exam in types