"""Tests for app.services.ita.pdf_import — pure helpers."""
import pytest


class TestClean:
    def test_collapses_spaces(self):
        from app.services.ita.pdf_import import _clean
        assert _clean("hello   world") == "hello world"

    def test_collapses_newlines(self):
        from app.services.ita.pdf_import import _clean
        assert _clean("a\n\n\n\nb") == "a\n\nb"

    def test_strips_whitespace(self):
        from app.services.ita.pdf_import import _clean
        assert _clean("  hello  ") == "hello"

    def test_empty_string(self):
        from app.services.ita.pdf_import import _clean
        assert _clean("") == ""


class TestLooksLikePassage:
    def test_short_text_false(self):
        from app.services.ita.pdf_import import _looks_like_passage
        assert _looks_like_passage("curto") is False

    def test_latin_heavy_true(self):
        from app.services.ita.pdf_import import _looks_like_passage
        text = "Este é um texto de apoio com muitas palavras em português para leitura compreensiva."
        assert _looks_like_passage(text) is True

    def test_instrucoes_excluded(self):
        from app.services.ita.pdf_import import _looks_like_passage
        text = "Instruções gerais para os candidatos realizarem a prova do vestibular ITA."
        assert _looks_like_passage(text) is False

    def test_empty_false(self):
        from app.services.ita.pdf_import import _looks_like_passage
        assert _looks_like_passage("") is False


class TestRepairPdfAccents:
    def test_ligatures(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("ﬁﬂﬃﬄ") == "fiflffiffl"

    def test_tilde_before_a(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("˜a")
        assert "ã" in result

    def test_tilde_after_o(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("o˜")
        assert "õ" in result

    def test_acute_uppercase(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("´ A")
        assert "Á" in result

    def test_circumflex_e(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("ˆ e")
        assert "ê" in result

    def test_grave_uppercase(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("` A")
        assert "À" in result

    def test_cedilla_variants(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        assert "ç" in _repair_pdf_accents("c¸")
        assert "ç" in _repair_pdf_accents("¸c")
        assert "Ç" in _repair_pdf_accents("C¸")

    def test_dotless_i_with_acute(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        result = _repair_pdf_accents("´ı")
        assert "í" in result

    def test_no_change_plain_text(self):
        from app.services.ita.pdf_import import _repair_pdf_accents
        assert _repair_pdf_accents("texto normal") == "texto normal"


class TestRegexPatterns:
    def test_q_start_matches(self):
        from app.services.ita.pdf_import import _Q_START
        m = _Q_START.match("Questao 7. Determine o valor")
        assert m and m.group(1) == "7"

    def test_q_start_no_dot(self):
        from app.services.ita.pdf_import import _Q_START
        m = _Q_START.match("Questao 12 Enunciado sem ponto")
        assert m and m.group(1) == "12"

    def test_opt_start_matches(self):
        from app.services.ita.pdf_import import _OPT_START
        m = _OPT_START.search("C ( ) Alternativa correta")
        assert m and m.group(1) == "C"

    def test_opt_start_all_letters(self):
        from app.services.ita.pdf_import import _OPT_START
        for letter in "ABCDE":
            m = _OPT_START.search(f"{letter} ( ) texto")
            assert m and m.group(1) == letter

    def test_opt_start_rejects_f(self):
        from app.services.ita.pdf_import import _OPT_START
        assert _OPT_START.search("F ( )") is None


class TestAreaNames:
    def test_all_areas_mapped(self):
        from app.services.ita.pdf_import import _AREA_NAMES
        expected = {
            "MATEMATICA": "Matemática",
            "FISICA": "Física",
            "QUIMICA": "Química",
            "INGLES": "Inglês",
            "PORTUGUES": "Português",
            "REDACAO": "Português",
        }
        for key, value in expected.items():
            assert _AREA_NAMES[key] == value

    def test_redacao_maps_to_portugues(self):
        from app.services.ita.pdf_import import _AREA_NAMES
        assert _AREA_NAMES["REDACAO"] == "Português"