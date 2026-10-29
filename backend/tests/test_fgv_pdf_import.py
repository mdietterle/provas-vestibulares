"""Tests for app.services.fgv.pdf_import — pure helpers."""
import pytest


class TestClean:
    def test_collapses_spaces(self):
        from app.services.fgv.pdf_import import _clean
        assert _clean("hello   world") == "hello world"

    def test_collapses_newlines(self):
        from app.services.fgv.pdf_import import _clean
        assert _clean("a\n\n\n\nb") == "a\n\nb"

    def test_strips_whitespace(self):
        from app.services.fgv.pdf_import import _clean
        assert _clean("  hello  ") == "hello"

    def test_empty_string(self):
        from app.services.fgv.pdf_import import _clean
        assert _clean("") == ""


class TestLooksLikePassage:
    def test_short_text_false(self):
        from app.services.fgv.pdf_import import _looks_like_passage
        assert _looks_like_passage("curto") is False

    def test_latin_heavy_true(self):
        from app.services.fgv.pdf_import import _looks_like_passage
        text = "Este é um texto de apoio com muitas palavras em português para leitura compreensiva."
        assert _looks_like_passage(text) is True

    def test_notacoes_excluded(self):
        from app.services.fgv.pdf_import import _looks_like_passage
        text = "Notações e convenções matemáticas usadas nesta prova de vestibular unificado."
        assert _looks_like_passage(text) is False

    def test_empty_false(self):
        from app.services.fgv.pdf_import import _looks_like_passage
        assert _looks_like_passage("") is False


class TestRepairPdfAccents:
    def test_ligatures(self):
        from app.services.fgv.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("ﬁﬂ") == "fifl"

    def test_acute_spaced(self):
        from app.services.fgv.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("´ e")
        assert "é" in result

    def test_grave_spaced(self):
        from app.services.fgv.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("` a")
        assert "à" in result

    def test_cedilla(self):
        from app.services.fgv.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("C¸")
        assert "Ç" in result

    def test_no_change_plain_text(self):
        from app.services.fgv.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("texto normal sem acentos quebrados") == "texto normal sem acentos quebrados"


class TestRegexPatterns:
    def test_q_start_matches(self):
        from app.services.fgv.pdf_import import _Q_START
        m = _Q_START.match("Questao 42. Enunciado")
        assert m and m.group(1) == "42"

    def test_opt_start_matches(self):
        from app.services.fgv.pdf_import import _OPT_START
        m = _OPT_START.search("B ( ) Alternativa B")
        assert m and m.group(1) == "B"

    def test_opt_start_rejects_invalid_letter(self):
        from app.services.fgv.pdf_import import _OPT_START
        assert _OPT_START.search("Z ( )") is None


class TestAreaNames:
    def test_known_areas(self):
        from app.services.fgv.pdf_import import _AREA_NAMES
        assert _AREA_NAMES["MATEMATICA"] == "Matemática"
        assert _AREA_NAMES["FISICA"] == "Física"
        assert _AREA_NAMES["QUIMICA"] == "Química"
        assert _AREA_NAMES["INGLES"] == "Inglês"
        assert _AREA_NAMES["PORTUGUES"] == "Português"
        assert _AREA_NAMES["REDACAO"] == "Português"

    def test_unknown_returns_none(self):
        from app.services.fgv.pdf_import import _AREA_NAMES
        assert _AREA_NAMES.get("DESCONHECIDO") is None