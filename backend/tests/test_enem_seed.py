"""Tests for app.services.enem.seed — pure helpers and seed logic."""
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock


class TestGetArea:
    def test_day1_linguagens(self):
        from app.services.enem.seed import _get_area
        assert _get_area(1, 1) == "Linguagens e Códigos"
        assert _get_area(45, 1) == "Linguagens e Códigos"

    def test_day1_humanas(self):
        from app.services.enem.seed import _get_area
        assert _get_area(46, 1) == "Ciências Humanas"
        assert _get_area(90, 1) == "Ciências Humanas"

    def test_day1_estrangeira(self):
        from app.services.enem.seed import _get_area
        assert _get_area(91, 1) == "Língua Estrangeira"
        assert _get_area(99, 1) == "Língua Estrangeira"

    def test_day2_natureza(self):
        from app.services.enem.seed import _get_area
        assert _get_area(96, 2) == "Ciências da Natureza"
        assert _get_area(135, 2) == "Ciências da Natureza"

    def test_day2_matematica(self):
        from app.services.enem.seed import _get_area
        assert _get_area(136, 2) == "Matemática"
        assert _get_area(180, 2) == "Matemática"

    def test_out_of_range_returns_geral(self):
        from app.services.enem.seed import _get_area
        assert _get_area(0, 1) == "Geral"
        assert _get_area(200, 2) == "Geral"


class TestDetectLanguage:
    def test_spanish_markers(self):
        from app.services.enem.seed import _detect_language
        content = [{"type": "text", "content": "¿Qué es la fotosíntesis?"}]
        assert _detect_language(content) == "Espanhol"

    def test_english_default(self):
        from app.services.enem.seed import _detect_language
        content = [{"type": "text", "content": "What is photosynthesis?"}]
        assert _detect_language(content) == "Inglês"

    def test_empty_content(self):
        from app.services.enem.seed import _detect_language
        assert _detect_language([]) == "Inglês"

    def test_image_only_returns_english(self):
        from app.services.enem.seed import _detect_language
        content = [{"type": "image", "content": "img.png"}]
        assert _detect_language(content) == "Inglês"

    def test_mixed_content_with_spanish(self):
        from app.services.enem.seed import _detect_language
        content = [
            {"type": "text", "content": "Read the following text."},
            {"type": "text", "content": "Los estudiantes están aprendiendo."},
        ]
        assert _detect_language(content) == "Espanhol"


class TestBuildStatement:
    def test_joins_text_items(self):
        from app.services.enem.seed import _build_statement
        content = [
            {"type": "text", "content": "Parte A"},
            {"type": "text", "content": "Parte B"},
        ]
        assert _build_statement(content) == "Parte A Parte B"

    def test_skips_images(self):
        from app.services.enem.seed import _build_statement
        content = [
            {"type": "text", "content": "Texto"},
            {"type": "image", "content": "img.png"},
        ]
        assert _build_statement(content) == "Texto"

    def test_strips_whitespace(self):
        from app.services.enem.seed import _build_statement
        content = [{"type": "text", "content": "  Espaçado  "}]
        assert _build_statement(content) == "Espaçado"

    def test_empty_list(self):
        from app.services.enem.seed import _build_statement
        assert _build_statement([]) == ""

    def test_blank_text_excluded(self):
        from app.services.enem.seed import _build_statement
        content = [
            {"type": "text", "content": "Válido"},
            {"type": "text", "content": "   "},
        ]
        assert _build_statement(content) == "Válido"


class TestSeedEnemEdgeCases:
    @patch("app.services.enem.seed.ENEM_DIR")
    def test_missing_dir_returns_skipped(self, mock_dir):
        from app.services.enem.seed import seed_enem
        mock_dir.exists.return_value = False
        result = seed_enem()
        assert result["skipped"] is True
        assert "não encontrada" in result["reason"]

    @patch("app.services.enem.seed.ENEM_DIR")
    def test_no_json_files_returns_skipped(self, mock_dir):
        from app.services.enem.seed import seed_enem
        mock_dir.exists.return_value = True
        mock_dir.glob.return_value = []
        result = seed_enem()
        assert result["skipped"] is True
        assert "Nenhum arquivo" in result["reason"]