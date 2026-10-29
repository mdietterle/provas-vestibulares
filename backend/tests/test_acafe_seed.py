"""Tests for app.services.acafe.seed — pure helpers and listing logic."""
import pytest
from unittest.mock import patch, MagicMock


class TestIsProvaCandidate:
    def test_valid_prova(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("prova objetiva comentada") is True

    def test_excludes_gabarito(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("gabarito prova oficial") is False

    def test_excludes_edital(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("edital prova vestibular") is False

    def test_excludes_resultado(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("resultado final prova") is False

    def test_no_prova_word(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("documento oficial vestibular") is False

    def test_excludes_retificacao(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("retificação prova") is False

    def test_excludes_demanda(self):
        from app.services.acafe.seed import _is_prova_candidate
        assert _is_prova_candidate("demanda candidatos prova") is False


class TestProvaScore:
    def test_comentada_best(self):
        from app.services.acafe.seed import _prova_score
        assert _prova_score("prova objetiva comentada pdf") == 0

    def test_objetiva_second(self):
        from app.services.acafe.seed import _prova_score
        assert _prova_score("prova objetiva pdf") == 1

    def test_nao_comentada_worst(self):
        from app.services.acafe.seed import _prova_score
        assert _prova_score("prova não comentada") == 3
        assert _prova_score("prova nao comentada") == 3

    def test_generic_middle(self):
        from app.services.acafe.seed import _prova_score
        assert _prova_score("prova vestibular") == 2

    def test_comentada_overrides_nao_comentada(self):
        from app.services.acafe.seed import _prova_score
        # "não comentada" in text should NOT get score 0 even if "comentada" also present
        assert _prova_score("prova comentada e não comentada") != 0


class TestGabaritoScore:
    def test_not_gabarito_returns_none(self):
        from app.services.acafe.seed import _gabarito_score
        assert _gabarito_score("prova objetiva") is None

    def test_oficial_best(self):
        from app.services.acafe.seed import _gabarito_score
        assert _gabarito_score("gabarito oficial") == 0

    def test_generic_middle(self):
        from app.services.acafe.seed import _gabarito_score
        assert _gabarito_score("gabarito vestibular") == 1

    def test_preliminar_worst(self):
        from app.services.acafe.seed import _gabarito_score
        assert _gabarito_score("gabarito preliminar") == 2


class TestFetchAcafeEditionsEdgeCases:
    @patch("app.services.acafe.seed.requests.get")
    def test_raises_on_http_error(self, mock_get):
        from app.services.acafe.seed import fetch_acafe_editions
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("404")
        mock_get.return_value = mock_resp
        with pytest.raises(Exception, match="404"):
            fetch_acafe_editions(2099, 1)

    @patch("app.services.acafe.seed.requests.get")
    def test_returns_empty_when_no_links(self, mock_get):
        from app.services.acafe.seed import fetch_acafe_editions
        mock_resp = MagicMock()
        mock_resp.text = "<html>sem links</html>"
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        result = fetch_acafe_editions(2024, 1)
        assert result == []