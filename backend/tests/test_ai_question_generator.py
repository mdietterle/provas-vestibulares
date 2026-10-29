"""Tests for app.services.ai_question_generator — offline parsing and normalization."""
import json
import pytest
from unittest.mock import patch, MagicMock


def _make_mock_response(content: str):
    """Create a mock Groq API response with given content."""
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    return mock_resp


class TestStripThinking:
    def test_removes_think_tags(self):
        from app.services.ai_question_generator import _strip_thinking
        text = "<think>reasoning here</think>The actual answer"
        assert _strip_thinking(text) == "The actual answer"

    def test_handles_multiline_think(self):
        from app.services.ai_question_generator import _strip_thinking
        text = "<think>line1\nline2\nline3</think>\nResult"
        assert _strip_thinking(text) == "Result"

    def test_no_think_tags_returns_stripped(self):
        from app.services.ai_question_generator import _strip_thinking
        assert _strip_thinking(" hello ") == "hello"

    def test_empty_string(self):
        from app.services.ai_question_generator import _strip_thinking
        assert _strip_thinking("") == ""


class TestGenerateQuestionsParsing:
    """Test JSON parsing logic without calling Groq API."""

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_parses_array_directly(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        questions = [
            {"statement": "Q1", "options": [{"text": "A", "is_correct": True, "order": 1}]},
            {"statement": "Q2", "options": [{"text": "B", "is_correct": False, "order": 1}]},
        ]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps(questions)
        )
        mock_get_client.return_value = mock_client
        result = generate_questions("Math", "Algebra", "multiple_choice", "easy", 2)
        assert len(result) == 2
        assert result[0]["statement"] == "Q1"
        assert result[0]["question_type"] == "multiple_choice"
        assert result[0]["difficulty"] == "easy"
        assert result[0]["options"][0]["text"] == "A"
        assert result[0]["options"][0]["is_correct"] is True

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_unwraps_questions_key(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        wrapped = {"questions": [{"statement": "Q1", "options": []}]}
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps(wrapped)
        )
        mock_get_client.return_value = mock_client
        result = generate_questions("Math", "Algebra", "essay", "medium", 1)
        assert len(result) == 1
        assert result[0]["statement"] == "Q1"
        assert result[0]["options"] == []

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_single_object_wrapped_in_list(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        single = {"statement": "Solo Q", "options": [{"text": "X", "is_correct": True}]}
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps(single)
        )
        mock_get_client.return_value = mock_client
        result = generate_questions("Physics", "Optics", "multiple_choice", "hard", 1)
        assert len(result) == 1
        assert result[0]["statement"] == "Solo Q"

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_extracts_json_from_text(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        raw = 'Some preamble text [{"statement": "Extracted", "options": []}] trailing'
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(raw)
        mock_get_client.return_value = mock_client
        result = generate_questions("Bio", "Cells", "essay", "easy", 1)
        assert len(result) == 1
        assert result[0]["statement"] == "Extracted"

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_invalid_json_raises_runtime_error(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            "not json at all"
        )
        mock_get_client.return_value = mock_client
        with pytest.raises(RuntimeError, match="formato inválido"):
            generate_questions("Math", "Calc", "multiple_choice", "easy", 1)

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_api_error_raises_runtime_error(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API down")
        mock_get_client.return_value = mock_client
        with pytest.raises(RuntimeError, match="Erro ao chamar Groq"):
            generate_questions("Math", "Calc", "multiple_choice", "easy", 1)


class TestOptionNormalization:
    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_normalizes_option_fields(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        questions = [{
            "statement": "Q",
            "options": [
                {"text": "Opt A", "is_correct": True, "order": 3},
                {"text": "Opt B"},
            ]
        }]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps(questions)
        )
        mock_get_client.return_value = mock_client
        result = generate_questions("Chem", "Atoms", "multiple_choice", "easy", 1)
        opts = result[0]["options"]
        assert opts[0]["order"] == 3
        assert opts[0]["is_correct"] is True
        assert opts[1]["is_correct"] is False
        assert opts[1]["order"] == 2

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_limits_to_requested_count(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "test-model"
        mock_settings.GROQ_VISION_MODEL = "test-vision"
        questions = [{"statement": f"Q{i}", "options": []} for i in range(10)]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps(questions)
        )
        mock_get_client.return_value = mock_client
        result = generate_questions("Hist", "WW2", "essay", "medium", 3)
        assert len(result) == 3


class TestImageHandling:
    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_sends_image_content_when_base64_provided(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "text-model"
        mock_settings.GROQ_VISION_MODEL = "vision-model"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps([{"statement": "Img Q", "options": []}])
        )
        mock_get_client.return_value = mock_client
        fake_b64 = "/9j/4AAQSkZJRg=="
        generate_questions("Art", "Painting", "multiple_choice", "easy", 1, image_base64=fake_b64)
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "vision-model"
        content = call_kwargs["messages"][0]["content"]
        assert isinstance(content, list)
        assert content[0]["type"] == "image_url"
        assert "image/jpeg" in content[0]["image_url"]["url"]

    @patch("app.services.ai_question_generator._get_client")
    @patch("app.services.ai_question_generator.settings")
    def test_detects_png_mime(self, mock_settings, mock_get_client):
        from app.services.ai_question_generator import generate_questions
        mock_settings.GROQ_MODEL = "text-model"
        mock_settings.GROQ_VISION_MODEL = "vision-model"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_response(
            json.dumps([{"statement": "PNG Q", "options": []}])
        )
        mock_get_client.return_value = mock_client
        fake_png = "iVBORw0KGgo="
        generate_questions("Art", "Drawing", "essay", "easy", 1, image_base64=fake_png)
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        content = call_kwargs["messages"][0]["content"]
        assert "image/png" in content[0]["image_url"]["url"]