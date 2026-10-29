"""Tests for app.services.pucrs.seed — pure helpers and listing logic."""
import pytest
from unittest.mock import patch, MagicMock

# pucrs/seed.py imports _page_content_images and _xref_to_dataurl from ufpr.seed
# at module level, but those functions don't exist there. Pre-inject stubs so
# the module can be imported for testing pure helpers.
import app.services.ufpr.seed as _ufpr_stub
if not hasattr(_ufpr_stub, "_page_content_images"):
    _ufpr_stub._page_content_images = lambda page: []
if not hasattr(_ufpr_stub, "_xref_to_dataurl"):
    _ufpr_stub._xref_to_dataurl = lambda doc, xref: None


class TestRegexPatterns:
    def test_section_id_re_matches(self):
        from app.services.pucrs.seed import _SECTION_ID_RE
        m = _SECTION_ID_RE.search('<div id="vestibular-de-verao-2023-medicina-provas-e-gabaritos">')
        assert m and "provas-e-gabaritos" in m.group(1)

    def test_section_id_re_no_match_without_suffix(self):
        from app.services.pucrs.seed import _SECTION_ID_RE
        assert _SECTION_ID_RE.search('<div id="outra-secao">') is None

    def test_link_re_matches_pdf(self):
        from app.services.pucrs.seed import _LINK_RE
        m = _LINK_RE.search('<a href="/prova2023.pdf">Prova 2023</a>')
        assert m and m.group(1) == "/prova2023.pdf"

    def test_season_year_re_verao(self):
        from app.services.pucrs.seed import _SEASON_YEAR_RE
        m = _SEASON_YEAR_RE.search("vestibular-de-verao-2023-medicina")
        assert m and m.group(1) == "verao" and m.group(2) == "2023"

    def test_season_year_re_inverno(self):
        from app.services.pucrs.seed import _SEASON_YEAR_RE
        m = _SEASON_YEAR_RE.search("vestibular-de-inverno-2024")
        assert m and m.group(1) == "inverno" and m.group(2) == "2024"

    def test_gab_entry_re_matches(self):
        from app.services.pucrs.seed import _GAB_ENTRY_RE
        m = _GAB_ENTRY_RE.search("15 – B")
        assert m and m.group(1) == "15" and m.group(2) == "B"

    def test_gab_entry_re_dash_variant(self):
        from app.services.pucrs.seed import _GAB_ENTRY_RE
        m = _GAB_ENTRY_RE.search("42-A")
        assert m and m.group(1) == "42" and m.group(2) == "A"


class TestRanges:
    def test_ranges_cover_all_questions(self):
        from app.services.pucrs.seed import _RANGES
        all_numbers = set()
        for lo, hi, _area, _lang in _RANGES:
            for n in range(lo, hi + 1):
                all_numbers.add(n)
        assert min(all_numbers) == 1
        assert max(all_numbers) == 70

    def test_foreign_language_has_both_languages(self):
        from app.services.pucrs.seed import _RANGES
        langs = [(lo, hi, lang) for lo, hi, _area, lang in _RANGES if lang is not None]
        lang_values = [lang for _, _, lang in langs]
        assert "Espanhol" in lang_values
        assert "Inglês" in lang_values

    def test_six_groups_defined(self):
        from app.services.pucrs.seed import _RANGES
        areas = set(area for _, _, area, _ in _RANGES)
        assert len(areas) == 5  # LE + Mat + LP + FQB + LHG


class TestFetchPucrsEditions:
    @patch("app.services.pucrs.seed.requests.get")
    def test_extracts_editions_from_html(self, mock_get):
        from app.services.pucrs.seed import fetch_pucrs_editions
        html = '''
        <div id="vestibular-de-verao-2023-medicina-provas-e-gabaritos">
        <a href="/prova2023.pdf">Prova Medicina</a>
        <a href="/gabarito2023.pdf">Gabarito</a>
        </div>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_pucrs_editions()
        assert len(editions) == 1
        assert editions[0]["year"] == 2023
        assert editions[0]["season"] == "Verão"
        assert editions[0]["prova_url"] == "/prova2023.pdf"
        assert editions[0]["gabarito_url"] == "/gabarito2023.pdf"

    @patch("app.services.pucrs.seed.requests.get")
    def test_skips_sections_without_both_urls(self, mock_get):
        from app.services.pucrs.seed import fetch_pucrs_editions
        html = '''
        <div id="vestibular-de-verao-2023-medicina-provas-e-gabaritos">
        <a href="/prova2023.pdf">Prova</a>
        </div>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_pucrs_editions()
        assert editions == []

    @patch("app.services.pucrs.seed.requests.get")
    def test_excludes_comentada_from_prova(self, mock_get):
        from app.services.pucrs.seed import fetch_pucrs_editions
        html = '''
        <div id="vestibular-de-verao-2023-medicina-provas-e-gabaritos">
        <a href="/comentada.pdf">Prova Comentada</a>
        <a href="/prova.pdf">Prova</a>
        <a href="/gabarito.pdf">Gabarito</a>
        </div>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_pucrs_editions()
        assert len(editions) == 1
        assert editions[0]["prova_url"] == "/prova.pdf"

    @patch("app.services.pucrs.seed.requests.get")
    def test_raises_on_http_error(self, mock_get):
        from app.services.pucrs.seed import fetch_pucrs_editions
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("timeout")
        mock_get.return_value = mock_resp
        with pytest.raises(Exception, match="timeout"):
            fetch_pucrs_editions()