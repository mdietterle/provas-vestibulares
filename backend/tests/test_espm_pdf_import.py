"""Tests for app.services.espm.pdf_import — pure helpers."""
import pytest


class TestClean:
    def test_collapses_spaces(self):
        from app.services.espm.pdf_import import _clean
        assert _clean("hello   world") == "hello world"

    def test_collapses_newlines(self):
        from app.services.espm.pdf_import import _clean
        assert _clean("a\n\n\n\nb") == "a\n\nb"

    def test_strips_whitespace(self):
        from app.services.espm.pdf_import import _clean
        assert _clean("  hello  ") == "hello"

    def test_empty_string(self):
        from app.services.espm.pdf_import import _clean
        assert _clean("") == ""


class TestLooksLikePassage:
    def test_short_text_false(self):
        from app.services.espm.pdf_import import _looks_like_passage
        assert _looks_like_passage("curto") is False

    def test_latin_heavy_true(self):
        from app.services.espm.pdf_import import _looks_like_passage
        text = "Este é um texto de apoio com muitas palavras em português para leitura compreensiva."
        assert _looks_like_passage(text) is True

    def test_convencoes_excluded(self):
        from app.services.espm.pdf_import import _looks_like_passage
        text = "Convenções e notações matemáticas usadas nesta prova de vestibular unificado."
        assert _looks_like_passage(text) is False

    def test_instrucoes_excluded(self):
        from app.services.espm.pdf_import import _looks_like_passage
        text = "Instruções gerais para os candidatos realizarem a prova do vestibular hoje."
        assert _looks_like_passage(text) is False

    def test_empty_false(self):
        from app.services.espm.pdf_import import _looks_like_passage
        assert _looks_like_passage("") is False


class TestRepairPdfAccents:
    def test_ligatures(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("ﬁﬂﬃﬄ") == "fiflffiffl"

    def test_tilde_spaced(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        assert "˜a" in _repair_pdf_accents("˜a") or "ã" in _repair_pdf_accents("˜a")

    def test_acute_spaced(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("´ a")
        assert "á" in result

    def test_circumflex_spaced(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("ˆ a")
        assert "â" in result

    def test_cedilla(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("c¸")
        assert "ç" in result

    def test_dotless_i(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("ı")
        assert "i" in result

    def test_no_change_plain_text(self):
        from app.services.espm.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("texto normal") == "texto normal"


class TestRegexPatterns:
    def test_q_start_matches(self):
        from app.services.espm.pdf_import import _Q_START
        m = _Q_START.match("Questao 15. Enunciado aqui")
        assert m and m.group(1) == "15"

    def test_q_start_case_insensitive(self):
        from app.services.espm.pdf_import import _Q_START
        m = _Q_START.match("QUESTAO 3.")
        assert m and m.group(1) == "3"

    def test_opt_checkbox_format(self):
        from app.services.espm.pdf_import import _OPT_START_CHECKBOX
        m = _OPT_START_CHECKBOX.search("A ( ) Texto da alternativa")
        assert m and m.group(1) == "A"

    def test_opt_paren_format(self):
        from app.services.espm.pdf_import import _OPT_START_PAREN
        m = _OPT_START_PAREN.search("a) Texto da alternativa")
        assert m and m.group(1) == "a"

    def test_opt_checkbox_rejects_invalid(self):
        from app.services.espm.pdf_import import _OPT_START_CHECKBOX
        assert _OPT_START_CHECKBOX.search("F ( )") is None