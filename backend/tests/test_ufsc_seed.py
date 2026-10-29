"""Tests for app.services.ufsc.seed — pure helpers and seed logic."""
import pytest
from unittest.mock import patch, MagicMock


class TestClean:
    def test_collapses_spaces(self):
        from app.services.ufsc.seed import _clean
        assert _clean("hello   world") == "hello world"

    def test_collapses_newlines(self):
        from app.services.ufsc.seed import _clean
        # _clean regex \n{3,} collapses 3+ consecutive newlines to single \n
        four_nl = "line1" + "\n" * 4 + "line2"
        assert _clean(four_nl) == "line1\nline2"
        # 2 newlines are NOT collapsed (below threshold of 3), preserved as-is
        two_nl = "line1" + "\n" * 2 + "line2"
        assert _clean(two_nl) == "line1\n\nline2"

    def test_strips_trailing_numbers(self):
        from app.services.ufsc.seed import _clean
        assert _clean("text\n12") == "text"

    def test_strips_whitespace(self):
        from app.services.ufsc.seed import _clean
        assert _clean("  hello  ") == "hello"

    def test_empty_string(self):
        from app.services.ufsc.seed import _clean
        assert _clean("") == ""


class TestLooksLikePassage:
    def test_short_text_returns_false(self):
        from app.services.ufsc.seed import _looks_like_passage
        assert _looks_like_passage("short") is False

    def test_latin_heavy_text_returns_true(self):
        from app.services.ufsc.seed import _looks_like_passage
        text = "Este é um texto de apoio com muitas palavras em português para leitura."
        assert _looks_like_passage(text) is True

    def test_symbol_heavy_text_returns_false(self):
        from app.services.ufsc.seed import _looks_like_passage
        # Simulates corrupted math formula PDF extraction
        text = "∑∏∫∂∇√∛∜≠≈≡≤≥⊂⊃∈∉∅∩∪∧∨¬∀∃" * 3
        assert _looks_like_passage(text) is False

    def test_empty_string(self):
        from app.services.ufsc.seed import _looks_like_passage
        assert _looks_like_passage("") is False


class TestParseFilename:
    def test_standard_format(self):
        from app.services.ufsc.seed import _parse_filename
        year, phase, color = _parse_filename("2024_p1_amarela.pdf")
        assert year == 2024
        assert phase == "1"
        assert color == "amarela"

    def test_gabarito_excluded_from_color(self):
        from app.services.ufsc.seed import _parse_filename
        year, phase, color = _parse_filename("2023_p2_gabarito_novo.pdf")
        assert year == 2023
        assert phase == "2"
        assert color == ""

    def test_no_year_returns_zero(self):
        from app.services.ufsc.seed import _parse_filename
        year, phase, color = _parse_filename("prova_p1.pdf")
        assert year == 0
        assert phase == "1"

    def test_no_phase_defaults_to_1(self):
        from app.services.ufsc.seed import _parse_filename
        year, phase, color = _parse_filename("2022_amarela.pdf")
        assert year == 2022
        assert phase == "1"

    def test_hyphen_separator(self):
        from app.services.ufsc.seed import _parse_filename
        year, phase, color = _parse_filename("2024-p1-verde.pdf")
        assert year == 2024
        assert phase == "1"
        assert color == "verde"


class TestIsAreaHeader:
    def test_known_headers(self):
        from app.services.ufsc.seed import _is_area_header
        assert _is_area_header("MATEMÁTICA") == "Matemática"
        assert _is_area_header("FÍSICA:") == "Física"
        assert _is_area_header("LÍNGUA PORTUGUESA") == "Língua Portuguesa"
        assert _is_area_header("INGLÊS") == "Língua Estrangeira"
        assert _is_area_header("ESPANHOL") == "Língua Estrangeira"

    def test_case_insensitive(self):
        from app.services.ufsc.seed import _is_area_header
        assert _is_area_header("matemática") == "Matemática"
        assert _is_area_header("fisica") == "Física"

    def test_unknown_returns_none(self):
        from app.services.ufsc.seed import _is_area_header
        assert _is_area_header("Texto qualquer") is None

    def test_empty_returns_none(self):
        from app.services.ufsc.seed import _is_area_header
        assert _is_area_header("") is None


class TestStripRecurringDecorativeImages:
    def test_removes_repeated_images(self):
        from app.services.ufsc.seed import _strip_recurring_decorative_images
        repeated_img = "data:image/png;base64,AAAA"
        unique_img = "data:image/png;base64,BBBB"
        questions = [
            {"image_base64": repeated_img, "extra_images": []},
            {"image_base64": repeated_img, "extra_images": []},
            {"image_base64": unique_img, "extra_images": []},
        ]
        _strip_recurring_decorative_images(questions)
        assert questions[0]["image_base64"] is None
        assert questions[1]["image_base64"] is None
        assert questions[2]["image_base64"] == unique_img

    def test_removes_from_extra_images(self):
        from app.services.ufsc.seed import _strip_recurring_decorative_images
        repeated = "data:image/png;base64,REPEAT"
        questions = [
            {"image_base64": None, "extra_images": [repeated]},
            {"image_base64": None, "extra_images": [repeated]},
        ]
        _strip_recurring_decorative_images(questions)
        assert questions[0]["extra_images"] == []
        assert questions[1]["extra_images"] == []

    def test_no_change_when_all_unique(self):
        from app.services.ufsc.seed import _strip_recurring_decorative_images
        questions = [
            {"image_base64": "img1", "extra_images": []},
            {"image_base64": "img2", "extra_images": []},
        ]
        _strip_recurring_decorative_images(questions)
        assert questions[0]["image_base64"] == "img1"
        assert questions[1]["image_base64"] == "img2"

    def test_handles_none_images(self):
        from app.services.ufsc.seed import _strip_recurring_decorative_images
        questions = [
            {"image_base64": None, "extra_images": []},
            {"image_base64": None, "extra_images": []},
        ]
        _strip_recurring_decorative_images(questions)
        assert questions[0]["image_base64"] is None


class TestRegexPatterns:
    def test_q_obj_matches(self):
        from app.services.ufsc.seed import _Q_OBJ
        m = _Q_OBJ.match("21) Determine o valor")
        assert m and m.group(1) == "21"

    def test_q_obj_no_match_without_paren(self):
        from app.services.ufsc.seed import _Q_OBJ
        assert _Q_OBJ.match("21 Determine") is None

    def test_q_obj_alt_matches(self):
        from app.services.ufsc.seed import _Q_OBJ_ALT
        m = _Q_OBJ_ALT.match("QUESTÃO 04")
        assert m and m.group(1) == "04"

    def test_opt_matches_valid_values(self):
        from app.services.ufsc.seed import _OPT
        for val in ["01", "02", "04", "08", "16", "32", "64"]:
            m = _OPT.match(f"{val}. Texto da opção")
            assert m and m.group(1) == val

    def test_opt_rejects_invalid(self):
        from app.services.ufsc.seed import _OPT
        assert _OPT.match("03. Texto") is None
        assert _OPT.match("05. Texto") is None

    def test_opt_inline_text(self):
        from app.services.ufsc.seed import _OPT
        m = _OPT.match("01. O céu é azul")
        assert m and m.group(2) == "O céu é azul"

    def test_q_disc_matches(self):
        from app.services.ufsc.seed import _Q_DISC
        m = _Q_DISC.match("QUESTÃO DISCURSIVA 5")
        assert m and m.group(1) == "5"


class TestSeedUfscEdgeCases:
    @patch("app.services.ufsc.seed.PROVAS_DIR")
    def test_no_pdf_files_returns_empty(self, mock_dir):
        from app.services.ufsc.seed import seed_ufsc
        mock_dir.glob.return_value = []
        db = MagicMock()
        result = seed_ufsc(db=db)
        assert result["total_added"] == 0
        assert result["files"] == []

    @patch("app.services.ufsc.seed._persist_parsed_questions")
    @patch("app.services.ufsc.seed._parse_exam")
    @patch("app.services.ufsc.seed._parse_gabarito")
    @patch("app.services.ufsc.seed.PROVAS_DIR")
    def test_counts_added_per_exam(self, mock_dir, mock_gab, mock_parse, mock_persist):
        from app.services.ufsc.seed import seed_ufsc
        from pathlib import Path

        prova = MagicMock(spec=Path)
        prova.stem = "2024_p1_amarela"
        prova.name = "2024_p1_amarela.pdf"
        mock_dir.glob.return_value = [prova]
        mock_gab.return_value = {1: 3}
        mock_parse.return_value = [{"number": 1}]
        mock_persist.return_value = (10, 2)

        db = MagicMock()
        result = seed_ufsc(db=db)
        assert result["total_added"] == 10
        assert len(result["files"]) == 1
        assert result["files"][0]["added"] == 10

    @patch("app.services.ufsc.seed._parse_exam")
    @patch("app.services.ufsc.seed._parse_gabarito")
    @patch("app.services.ufsc.seed.PROVAS_DIR")
    def test_handles_parse_error_gracefully(self, mock_dir, mock_gab, mock_parse):
        from app.services.ufsc.seed import seed_ufsc
        from pathlib import Path

        prova = MagicMock(spec=Path)
        prova.stem = "2024_p1_amarela"
        prova.name = "2024_p1_amarela.pdf"
        mock_dir.glob.return_value = [prova]
        mock_gab.return_value = {}
        mock_parse.side_effect = RuntimeError("PDF corrupto")

        db = MagicMock()
        result = seed_ufsc(db=db)
        assert result["total_added"] == 0
        assert "error" in result["files"][0]
        assert "PDF corrupto" in result["files"][0]["error"]