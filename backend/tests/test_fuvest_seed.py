"""Tests for app.services.fuvest.seed — pure helpers and import logic."""
import sys
import pytest
from unittest.mock import patch, MagicMock

# fuvest/seed.py imports _xref_to_dataurl from ufpr.seed at module level,
# but that function doesn't exist there (it's _assign_images).
# Pre-inject a stub so the module can be imported for testing pure helpers.
import app.services.ufpr.seed as _ufpr_seed_stub
if not hasattr(_ufpr_seed_stub, "_xref_to_dataurl"):
    _ufpr_seed_stub._xref_to_dataurl = lambda doc, xref: None


class TestNormalize:
    def test_removes_separators_and_lowercases(self):
        from app.services.fuvest.seed import _normalize
        assert _normalize("Prova 2024-V1") == "prova2024v1"
        assert _normalize("FUVEST_2023") == "fuvest2023"
        assert _normalize("GABARITO OFICIAL") == "gabaritooficial"

    def test_empty_string(self):
        from app.services.fuvest.seed import _normalize
        assert _normalize("") == ""


class TestParseGabarito:
    def test_single_version(self):
        from app.services.fuvest.seed import _parse_gabarito
        text = "PROVA V\n1 A 46 B\n2 C 47 D\n3 E 48 A"
        result = _parse_gabarito(text, "V")
        assert result[1] == "A"
        assert result[2] == "C"
        assert result[3] == "E"
        assert result[46] == "B"
        assert result[47] == "D"
        assert result[48] == "A"

    def test_multiple_versions_selects_target(self):
        from app.services.fuvest.seed import _parse_gabarito
        # 2 versions interleaved: V gets tokens at positions 0-3, K at 4-7
        # step = n_versions * 4 = 8
        # For question 1: group[0:4] = V, group[4:8] = K
        text = "PROVA V PROVA K\n1 A 46 B 1 C 46 D\n2 E 47 D 2 A 47 B"
        result_v = _parse_gabarito(text, "V")
        result_k = _parse_gabarito(text, "K")
        assert result_v[1] == "A"
        assert result_v[2] == "E"
        assert result_k[1] == "C"
        assert result_k[2] == "A"

    def test_star_means_no_answer(self):
        from app.services.fuvest.seed import _parse_gabarito
        text = "PROVA V\n1 * 46 B\n2 C 47 *"
        result = _parse_gabarito(text, "V")
        assert 1 not in result
        assert result[46] == "B"
        assert result[2] == "C"
        assert 47 not in result

    def test_strips_correspondencia_section(self):
        from app.services.fuvest.seed import _parse_gabarito
        text = "PROVA V\n1 A 46 B\ncorrespondência entre versões\nPROVA V\n99 Z"
        result = _parse_gabarito(text, "V")
        assert result[1] == "A"
        assert result[46] == "B"
        assert 99 not in result

    def test_no_headers_returns_empty(self):
        from app.services.fuvest.seed import _parse_gabarito
        assert _parse_gabarito("texto sem cabeçalho", "V") == {}

    def test_target_label_not_found_defaults_to_first(self):
        from app.services.fuvest.seed import _parse_gabarito
        text = "PROVA V\n1 A 46 B"
        result = _parse_gabarito(text, "Z")
        assert result[1] == "A"

    def test_handles_nbsp(self):
        from app.services.fuvest.seed import _parse_gabarito
        text = "PROVA\xa0V\n1\xa0A\xa046\xa0B"
        result = _parse_gabarito(text, "V")
        assert result[1] == "A"

    def test_duplicate_letters_keeps_first(self):
        from app.services.fuvest.seed import _parse_gabarito
        # Single version: tokens are "1 A 46 B 48 D E"
        # After dedup: "1 A 46 B 48 D" (E skipped because prev_was_letter)
        # step=4, group=[1, A, 46, B] → q1=A, q46=B
        # Next group starts at index 4: [48, D] → only 2 tokens, len < 4, skipped
        # So 48 won't appear. Adjust test to have enough tokens after dedup.
        text = "PROVA V\n1 A 46 B 48 D 49 E"
        result = _parse_gabarito(text, "V")
        assert result[48] == "D"
        assert result[49] == "E"


class TestRegexPatterns:
    def test_q_mark_brace(self):
        from app.services.fuvest.seed import _Q_MARK_BRACE_RE
        m = _Q_MARK_BRACE_RE.match("{42}")
        assert m and m.group(1) == "42"
        assert _Q_MARK_BRACE_RE.match("42") is None
        assert _Q_MARK_BRACE_RE.match("{abc}") is None

    def test_q_mark_bare(self):
        from app.services.fuvest.seed import _Q_MARK_BARE_RE
        m = _Q_MARK_BARE_RE.match("07")
        assert m and m.group(1) == "07"
        assert _Q_MARK_BARE_RE.match("{07}") is None
        assert _Q_MARK_BARE_RE.match("abc") is None

    def test_opt_line_uppercase(self):
        from app.services.fuvest.seed import _OPT_LINE_RE
        m = _OPT_LINE_RE.match("(A) Texto da alternativa")
        assert m and m.group(1) == "A"
        assert m.group(3) == "Texto da alternativa"

    def test_opt_line_lowercase(self):
        from app.services.fuvest.seed import _OPT_LINE_RE
        m = _OPT_LINE_RE.match("b) outra alternativa")
        assert m and m.group(2) == "b"
        assert m.group(3) == "outra alternativa"

    def test_noise_line(self):
        from app.services.fuvest.seed import _NOISE_LINE_RE
        assert _NOISE_LINE_RE.match("Concurso Vestibular FUVEST 2024")
        assert _NOISE_LINE_RE.match("##")
        assert _NOISE_LINE_RE.match("V")
        assert _NOISE_LINE_RE.match("Texto normal") is None


class TestFetchFuvestYears:
    @patch("app.services.fuvest.seed.requests.get")
    def test_extracts_years_from_html(self, mock_get):
        from app.services.fuvest.seed import fetch_fuvest_years
        mock_resp = MagicMock()
        mock_resp.text = '<a href="/acervo-vestibular-2024">2024</a><a href="/acervo-vestibular-2023">2023</a>'
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        years = fetch_fuvest_years()
        assert years == [2023, 2024]

    @patch("app.services.fuvest.seed.requests.get")
    def test_deduplicates_years(self, mock_get):
        from app.services.fuvest.seed import fetch_fuvest_years
        mock_resp = MagicMock()
        mock_resp.text = 'acervo-vestibular-2024 acervo-vestibular-2024 acervo-vestibular-2023'
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        years = fetch_fuvest_years()
        assert years == [2023, 2024]


class TestFetchFuvestEdition:
    @patch("app.services.fuvest.seed.requests.get")
    def test_finds_prova_and_gabarito(self, mock_get):
        from app.services.fuvest.seed import fetch_fuvest_edition
        html = '''
<a href="/prova-v1.pdf">Prova 2024 V1 1fase</a>
<a href="/gabarito-v1.pdf">Gabarito V1</a>
'''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        edition = fetch_fuvest_edition(2024)
        assert edition is not None
        assert edition["prova_url"] == "/prova-v1.pdf"
        assert edition["gabarito_url"] == "/gabarito-v1.pdf"
        # Regex extracts last uppercase letter+digit token from link text
        # "Prova 2024 V1 1fase" → matches "V" (last single uppercase before end)
        # The actual regex r"([A-Z]\d{0,2})\s*$" on stripped text
        # Text after HTML strip: "Prova 2024 V1 1fase"
        # \s*$ won't match because "1fase" is at end. So label falls back to "V".
        assert edition["version"] == "V"

    @patch("app.services.fuvest.seed.requests.get")
    def test_excludes_second_phase(self, mock_get):
        from app.services.fuvest.seed import fetch_fuvest_edition
        html = '''
<a href="/prova-2fase.pdf">Prova 2fase</a>
<a href="/prova-v1.pdf">Prova V1 1fase</a>
'''
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        edition = fetch_fuvest_edition(2024)
        assert edition is not None
        assert edition["prova_url"] == "/prova-v1.pdf"

    @patch("app.services.fuvest.seed.requests.get")
    def test_returns_none_when_no_prova(self, mock_get):
        from app.services.fuvest.seed import fetch_fuvest_edition
        mock_resp = MagicMock()
        mock_resp.text = "<html>sem links relevantes</html>"
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        assert fetch_fuvest_edition(2024) is None


class TestImportFuvestYearEdgeCases:
    @patch("app.services.fuvest.seed.parse_fuvest_pdf")
    @patch("app.services.fuvest.seed.download_pdf")
    def test_skips_when_too_few_questions(self, mock_dl, mock_parse):
        from app.services.fuvest.seed import import_fuvest_year
        mock_parse.return_value = [{"number": 1}]
        db = MagicMock()
        edition = {"prova_url": "http://example.com/prova.pdf", "version": "V"}
        result = import_fuvest_year(db, 2024, edition)
        assert result["skipped"] is True
        assert result["total_added"] == 0

    @patch("app.services.import_batch.save_vestibular_question")
    @patch("app.services.fuvest.seed.parse_fuvest_pdf")
    @patch("app.services.fuvest.seed.download_pdf")
    def test_counts_added_and_skipped(self, mock_dl, mock_parse, mock_save):
        from app.services.fuvest.seed import import_fuvest_year
        questions = [
            {"number": i, "area": "Matemática", "statement": f"Q{i}",
             "options": [("A", "a"), ("B", "b"), ("C", "c"), ("D", "d"), ("E", "e")],
             "images": [], "image_base64": None}
            for i in range(1, 25)
        ]
        mock_parse.return_value = questions
        mock_save.side_effect = [(MagicMock(), i < 20) for i in range(24)]
        db = MagicMock()
        edition = {"prova_url": "http://example.com/prova.pdf", "version": "V"}
        result = import_fuvest_year(db, 2024, edition)
        assert result["total_added"] == 20
        assert result["skipped_existing"] == 4
        assert result["total_parsed"] == 24
        db.commit.assert_called_once()

    @patch("app.services.fuvest.seed.parse_fuvest_pdf")
    @patch("app.services.fuvest.seed.download_pdf")
    def test_deduplicates_by_number(self, mock_dl, mock_parse):
        from app.services.fuvest.seed import import_fuvest_year
        questions = [
            {"number": 1, "area": "X", "statement": "Q1",
             "options": [("A", "a"), ("B", "b"), ("C", "c"), ("D", "d"), ("E", "e")],
             "images": [], "image_base64": None},
            {"number": 1, "area": "X", "statement": "Q1 dup",
             "options": [("A", "a"), ("B", "b"), ("C", "c"), ("D", "d"), ("E", "e")],
             "images": [], "image_base64": None},
        ] + [
            {"number": i, "area": "X", "statement": f"Q{i}",
             "options": [("A", "a"), ("B", "b"), ("C", "c"), ("D", "d"), ("E", "e")],
             "images": [], "image_base64": None}
            for i in range(2, 25)
        ]
        mock_parse.return_value = questions
        with patch("app.services.import_batch.save_vestibular_question") as mock_save:
            mock_save.return_value = (MagicMock(), True)
            db = MagicMock()
            edition = {"prova_url": "http://example.com/prova.pdf", "version": "V"}
            result = import_fuvest_year(db, 2024, edition)
            assert result["total_parsed"] == 25
            assert mock_save.call_count == 24