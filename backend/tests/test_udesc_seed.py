"""Tests for app.services.udesc.seed — pure helpers and listing logic."""
import pytest
from unittest.mock import patch, MagicMock

# udesc/seed.py imports _page_content_images and _xref_to_dataurl from ufpr.seed
# at module level, but those functions don't exist there. Pre-inject stubs so
# the module can be imported for testing pure helpers.
import app.services.ufpr.seed as _ufpr_stub
if not hasattr(_ufpr_stub, "_page_content_images"):
    _ufpr_stub._page_content_images = lambda page: []
if not hasattr(_ufpr_stub, "_xref_to_dataurl"):
    _ufpr_stub._xref_to_dataurl = lambda doc, xref: None


class TestRegexPatterns:
    def test_para_re_matches(self):
        from app.services.udesc.seed import _PARA_RE
        m = _PARA_RE.search("<p>Vestibular 2024.1</p>")
        assert m and "2024" in m.group(1)

    def test_link_re_matches(self):
        from app.services.udesc.seed import _LINK_RE
        m = _LINK_RE.search('<a href="/prova_matutino.pdf">Matutino</a>')
        assert m and m.group(1) == "/prova_matutino.pdf"

    def test_year_sem_re_standard(self):
        from app.services.udesc.seed import _YEAR_SEM_RE
        m = _YEAR_SEM_RE.search("Vestibular 2024.1")
        assert m and m.group(1) == "2024" and m.group(2) == "1"

    def test_year_sem_re_with_dash(self):
        from app.services.udesc.seed import _YEAR_SEM_RE
        m = _YEAR_SEM_RE.search("2023-2")
        assert m and m.group(1) == "2023" and m.group(2) == "2"

    def test_year_sem_re_with_underscore(self):
        from app.services.udesc.seed import _YEAR_SEM_RE
        m = _YEAR_SEM_RE.search("2022_1")
        assert m and m.group(1) == "2022" and m.group(2) == "1"

    def test_year_sem_re_leading_zero_semester(self):
        from app.services.udesc.seed import _YEAR_SEM_RE
        m = _YEAR_SEM_RE.search("2024.01")
        assert m and m.group(2) == "1"

    def test_year_sem_re_no_match_invalid_semester(self):
        from app.services.udesc.seed import _YEAR_SEM_RE
        assert _YEAR_SEM_RE.search("2024.3") is None


class TestFetchUdescEditions:
    @patch("app.services.udesc.seed.requests.get")
    def test_extracts_editions_from_paragraphs(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        html = '''
        <p>Vestibular 2024.1
        <a href="/matutino_2024_1.pdf">Prova Matutino</a>
        <a href="/vespertino_2024_1.pdf">Prova Vespertino</a>
        <a href="/gabarito_2024_1.pdf">Gabarito</a>
        </p>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_udesc_editions()
        assert len(editions) == 1
        assert editions[0]["year"] == 2024
        assert editions[0]["semester"] == 1
        assert "matutino_url" in editions[0]
        assert "vespertino_url" in editions[0]
        assert "gabarito_url" in editions[0]

    @patch("app.services.udesc.seed.requests.get")
    def test_skips_paragraphs_without_proof_urls(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        html = '<p>Vestibular 2024.1 - sem links de prova</p>'
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_udesc_editions()
        assert editions == []

    @patch("app.services.udesc.seed.requests.get")
    def test_multiple_editions_sorted_descending(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        html = '''
        <p>2023.2 <a href="/m232.pdf">Matutino</a></p>
        <p>2024.1 <a href="/m241.pdf">Matutino</a></p>
        <p>2023.1 <a href="/m231.pdf">Matutino</a></p>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_udesc_editions()
        assert len(editions) == 3
        assert editions[0]["year"] == 2024
        assert editions[1]["year"] == 2023
        assert editions[1]["semester"] == 2
        assert editions[2]["semester"] == 1

    @patch("app.services.udesc.seed.requests.get")
    def test_deduplicates_same_year_semester(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        html = '''
        <p>2024.1 <a href="/m1.pdf">Matutino</a></p>
        <p>2024.1 <a href="/v1.pdf">Vespertino</a></p>
        '''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_udesc_editions()
        assert len(editions) == 1
        assert "matutino_url" in editions[0]
        assert "vespertino_url" in editions[0]

    @patch("app.services.udesc.seed.requests.get")
    def test_raises_on_http_error(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("connection refused")
        mock_get.return_value = mock_resp
        with pytest.raises(Exception, match="connection refused"):
            fetch_udesc_editions()

    @patch("app.services.udesc.seed.requests.get")
    def test_handles_nbsp_in_text(self, mock_get):
        from app.services.udesc.seed import fetch_udesc_editions
        html = '<p>Vestibular&nbsp;2024.1 <a href="/m.pdf">Matutino</a></p>'
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        editions = fetch_udesc_editions()
        assert len(editions) == 1
        assert editions[0]["year"] == 2024


class TestKnownSubjects:
    def test_known_subjects_is_list(self):
        from app.services.udesc.seed import _KNOWN_SUBJECTS
        assert isinstance(_KNOWN_SUBJECTS, list)
        assert len(_KNOWN_SUBJECTS) > 0

    def test_contains_core_subjects(self):
        from app.services.udesc.seed import _KNOWN_SUBJECTS
        subjects_lower = [s.lower() for s in _KNOWN_SUBJECTS]
        assert any("matemática" in s or "matematica" in s for s in subjects_lower)
        assert any("português" in s or "portugues" in s for s in subjects_lower)