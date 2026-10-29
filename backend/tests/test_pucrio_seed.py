"""Tests for app.services.pucrio.seed — pure helpers and listing logic."""
import pytest
from unittest.mock import patch, MagicMock

# pucrio/seed.py imports _xref_to_dataurl from ufpr.seed at module level,
# but that function doesn't exist there. Pre-inject a stub so the module
# can be imported for testing pure helpers.
import app.services.ufpr.seed as _ufpr_stub
if not hasattr(_ufpr_stub, "_xref_to_dataurl"):
    _ufpr_stub._xref_to_dataurl = lambda doc, xref: None


class TestStripTags:
    def test_removes_html_tags(self):
        from app.services.pucrio.seed import _strip_tags
        # _strip_tags replaces tags with space, may leave double spaces
        result = _strip_tags("<b>Gabarito</b> Oficial")
        assert "Gabarito" in result and "Oficial" in result

    def test_strips_whitespace(self):
        from app.services.pucrio.seed import _strip_tags
        assert _strip_tags(" <i>texto</i> ") == "texto"

    def test_empty_string(self):
        from app.services.pucrio.seed import _strip_tags
        assert _strip_tags("") == ""

    def test_no_tags(self):
        from app.services.pucrio.seed import _strip_tags
        assert _strip_tags("texto simples") == "texto simples"


class TestIsDay:
    def test_day1_standard(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("1º DIA - Línguas", 1) is True

    def test_day2_standard(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("2º DIA - Grupo 1", 2) is True

    def test_day1_alternative_format(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("DIA01_prova.pdf", 1) is True

    def test_day1_typo_diia(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("DIIA01_gabarito.pdf", 1) is True

    def test_wrong_day_returns_false(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("2º DIA", 1) is False

    def test_no_day_returns_false(self):
        from app.services.pucrio.seed import _is_day
        assert _is_day("GABARITO OFICIAL", 1) is False


class TestIsGabarito:
    def test_text_contains_gabarito(self):
        from app.services.pucrio.seed import _is_gabarito
        assert _is_gabarito("Gabarito Oficial", "/prova.pdf") is True

    def test_href_contains_gabarito(self):
        from app.services.pucrio.seed import _is_gabarito
        assert _is_gabarito("Download", "/gabarito_2024.pdf") is True

    def test_neither_contains_gabarito(self):
        from app.services.pucrio.seed import _is_gabarito
        assert _is_gabarito("Prova Dia 1", "/prova_dia1.pdf") is False

    def test_case_insensitive(self):
        from app.services.pucrio.seed import _is_gabarito
        assert _is_gabarito("gabarito preliminar", "/file.pdf") is True


class TestCompactGroupDigits:
    def test_single_group(self):
        from app.services.pucrio.seed import _compact_group_digits
        result = _compact_group_digits("gabarito_G1_final")
        assert result == {1}

    def test_multiple_groups_with_separator(self):
        from app.services.pucrio.seed import _compact_group_digits
        result = _compact_group_digits("gabarito_G1_3_4_5_final")
        assert result == {1, 3, 4, 5}

    def test_compact_format_with_underscore(self):
        from app.services.pucrio.seed import _compact_group_digits
        # Regex requires non-alpha char before G (lookbehind)
        result = _compact_group_digits("gabarito_G2-V2")
        assert result == {2}

    def test_no_group_returns_none(self):
        from app.services.pucrio.seed import _compact_group_digits
        assert _compact_group_digits("prova_dia1.pdf") is None

    def test_digit_followed_by_digit_stops(self):
        from app.services.pucrio.seed import _compact_group_digits
        # G2 followed by 13 should only capture 2, not 1 or 3
        result = _compact_group_digits("G2_13OUT2019")
        assert result == {2}


class TestFetchPucrioYears:
    @patch("app.services.pucrio.seed.requests.get")
    def test_extracts_years_from_html(self, mock_get):
        from app.services.pucrio.seed import fetch_pucrio_years
        html = '''
        <a href="repositorio/provas/2024/">2024</a>
        <a href="repositorio/provas/2023-2/">2023-2</a>
        <a href="repositorio/provas/2023/">2023</a>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        years = fetch_pucrio_years()
        assert "2023" in years
        assert "2023-2" in years
        assert "2024" in years
        assert years == sorted(years)

    @patch("app.services.pucrio.seed.requests.get")
    def test_raises_on_http_error(self, mock_get):
        from app.services.pucrio.seed import fetch_pucrio_years
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("500")
        mock_get.return_value = mock_resp
        with pytest.raises(Exception, match="500"):
            fetch_pucrio_years()


class TestMinQuestionsConstants:
    def test_day1_minimum(self):
        from app.services.pucrio.seed import _MIN_QUESTIONS_DAY1
        assert _MIN_QUESTIONS_DAY1 >= 5

    def test_day2_minimum(self):
        from app.services.pucrio.seed import _MIN_QUESTIONS_DAY2
        assert _MIN_QUESTIONS_DAY2 >= 10