"""Tests for app.services.scan_corrector — offline logic and parsing."""
import pytest
from unittest.mock import MagicMock, patch


class TestStripThinking:
    def test_removes_think_tags(self):
        from app.services.scan_corrector import _strip_thinking
        assert _strip_thinking("<think>reasoning</think>Answer") == "Answer"

    def test_multiline_think(self):
        from app.services.scan_corrector import _strip_thinking
        text = "<think>line1\nline2</think>\nResult"
        assert _strip_thinking(text) == "Result"

    def test_no_tags_returns_stripped(self):
        from app.services.scan_corrector import _strip_thinking
        assert _strip_thinking("  hello  ") == "hello"

    def test_empty_string(self):
        from app.services.scan_corrector import _strip_thinking
        assert _strip_thinking("") == ""


class TestGroqVisionAvailable:
    @patch("app.services.scan_corrector.settings")
    def test_returns_true_when_key_set(self, mock_settings):
        from app.services.scan_corrector import groq_vision_available
        mock_settings.GROQ_API_KEY = "gsk_test_key"
        assert groq_vision_available() is True

    @patch("app.services.scan_corrector.settings")
    def test_returns_false_when_key_empty(self, mock_settings):
        from app.services.scan_corrector import groq_vision_available
        mock_settings.GROQ_API_KEY = ""
        assert groq_vision_available() is False

    @patch("app.services.scan_corrector.settings")
    def test_returns_false_when_key_none(self, mock_settings):
        from app.services.scan_corrector import groq_vision_available
        mock_settings.GROQ_API_KEY = None
        assert groq_vision_available() is False

    def test_ollama_alias_exists(self):
        from app.services.scan_corrector import ollama_vision_available, groq_vision_available
        assert ollama_vision_available is groq_vision_available


class TestFuzzyMatch:
    def _make_user(self, id, name):
        u = MagicMock()
        u.id = id
        u.name = name
        return u

    def test_exact_match(self):
        from app.services.scan_corrector import _fuzzy_match
        students = [self._make_user(1, "Ana Silva"), self._make_user(2, "Bruno Souza")]
        best, score = _fuzzy_match("Ana Silva", students)
        assert best.id == 1
        assert score == 1.0

    def test_case_insensitive(self):
        from app.services.scan_corrector import _fuzzy_match
        students = [self._make_user(1, "Ana Silva")]
        best, score = _fuzzy_match("ana silva", students)
        assert best.id == 1
        assert score == 1.0

    def test_partial_match(self):
        from app.services.scan_corrector import _fuzzy_match
        students = [self._make_user(1, "Ana Silva"), self._make_user(2, "Bruno Souza")]
        best, score = _fuzzy_match("Ana Silv", students)
        assert best.id == 1
        assert score > 0.8

    def test_no_match_returns_low_score(self):
        from app.services.scan_corrector import _fuzzy_match
        students = [self._make_user(1, "Ana Silva")]
        best, score = _fuzzy_match("ZZZZZ XXXXX", students)
        assert score < 0.5

    def test_empty_students_list(self):
        from app.services.scan_corrector import _fuzzy_match
        best, score = _fuzzy_match("Ana", [])
        assert best is None
        assert score == 0.0


class TestBuildPrompt:
    def _make_question(self, qid, statement, qtype, options=None, criteria=None):
        q = MagicMock()
        q.id = qid
        q.statement = statement
        q.question_type = qtype
        q.options = options or []
        q.criteria = criteria
        return q

    def _make_exam_question(self, eqid, question, points=10):
        eq = MagicMock()
        eq.id = eqid
        eq.question = question
        eq.points = points
        return eq

    def test_includes_all_questions(self):
        from app.services.scan_corrector import _build_prompt
        from app.models import QuestionType
        q1 = self._make_question(1, "Questão A", QuestionType.MULTIPLE_CHOICE, options=[])
        q2 = self._make_question(2, "Questão B", QuestionType.ESSAY, criteria="Clareza")
        eqs = [self._make_exam_question(10, q1), self._make_exam_question(20, q2)]
        prompt = _build_prompt(eqs, student_id=1, exam_id=1)
        assert "Questão A" in prompt
        assert "Questão B" in prompt
        assert "exam_question_id=10" in prompt
        assert "exam_question_id=20" in prompt

    def test_deterministic_with_same_seed(self):
        from app.services.scan_corrector import _build_prompt
        from app.models import QuestionType
        q1 = self._make_question(1, "Q1", QuestionType.ESSAY)
        q2 = self._make_question(2, "Q2", QuestionType.ESSAY)
        eqs = [self._make_exam_question(10, q1), self._make_exam_question(20, q2)]
        p1 = _build_prompt(eqs, student_id=5, exam_id=3)
        p2 = _build_prompt(eqs, student_id=5, exam_id=3)
        assert p1 == p2

    def test_different_seeds_produce_different_order(self):
        from app.services.scan_corrector import _build_prompt
        from app.models import QuestionType
        questions = [self._make_question(i, f"Q{i}", QuestionType.ESSAY) for i in range(10)]
        eqs = [self._make_exam_question(i * 10, q) for i, q in enumerate(questions, 1)]
        p1 = _build_prompt(eqs, student_id=1, exam_id=1)
        p2 = _build_prompt(eqs, student_id=2, exam_id=1)
        # Different seeds should produce different orderings (extremely unlikely to match)
        assert p1 != p2

    def test_multiple_choice_includes_options(self):
        from app.services.scan_corrector import _build_prompt
        from app.models import QuestionType
        opt1 = MagicMock(id=100, text="Opção A")
        opt2 = MagicMock(id=200, text="Opção B")
        q = self._make_question(1, "MC Q", QuestionType.MULTIPLE_CHOICE, options=[opt1, opt2])
        eqs = [self._make_exam_question(10, q)]
        prompt = _build_prompt(eqs, student_id=1, exam_id=1)
        assert "Opção A" in prompt
        assert "Opção B" in prompt
        assert "option_id=100" in prompt

    def test_essay_includes_criteria(self):
        from app.services.scan_corrector import _build_prompt
        from app.models import QuestionType
        q = self._make_question(1, "Essay Q", QuestionType.ESSAY, criteria="Argumentação e coesão")
        eqs = [self._make_exam_question(10, q)]
        prompt = _build_prompt(eqs, student_id=1, exam_id=1)
        assert "Argumentação e coesão" in prompt
        assert "Transcreva LITERALMENTE" in prompt


class TestIdentifyStudentFromScanParsing:
    """Test JSON parsing logic of identify_student_from_scan without calling Groq."""

    def _make_user(self, id, name):
        u = MagicMock()
        u.id = id
        u.name = name
        return u

    @patch("app.services.scan_corrector._call_vision")
    def test_qr_code_identification(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = '{"qr_text": "EXAM:5:STUDENT:42", "student_name": null, "confidence": "high"}'
        students = [self._make_user(42, "João Silva"), self._make_user(43, "Maria Santos")]
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=students)
        assert result["student_id"] == 42
        assert result["student_name"] == "João Silva"
        assert result["method"] == "qr"
        assert result["confidence"] == "high"

    @patch("app.services.scan_corrector._call_vision")
    def test_qr_wrong_exam_returns_unknown(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = '{"qr_text": "EXAM:99:STUDENT:42", "student_name": null, "confidence": "high"}'
        students = [self._make_user(42, "João Silva")]
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=students)
        assert result["student_id"] is None
        assert result["method"] != "qr"

    @patch("app.services.scan_corrector._call_vision")
    def test_name_fuzzy_match_high_confidence(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = '{"qr_text": null, "student_name": "João Silva", "confidence": "medium"}'
        students = [self._make_user(42, "João Silva")]
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=students)
        assert result["student_id"] == 42
        assert result["method"] == "name"
        assert result["confidence"] == "high"

    @patch("app.services.scan_corrector._call_vision")
    def test_name_no_match(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = '{"qr_text": null, "student_name": "ZZZZZ XXXXX", "confidence": "low"}'
        students = [self._make_user(42, "João Silva")]
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=students)
        assert result["student_id"] is None
        assert result["method"] == "name_unmatched"

    @patch("app.services.scan_corrector._call_vision")
    def test_invalid_json_returns_unknown(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = "not json at all"
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=[])
        assert result["student_id"] is None
        assert result["method"] == "unknown"
        assert result["confidence"] == "low"

    @patch("app.services.scan_corrector._call_vision")
    def test_api_error_returns_unknown_with_error(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.side_effect = Exception("API timeout")
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=[])
        assert result["student_id"] is None
        assert result["method"] == "unknown"
        assert "error" in result
        assert "API timeout" in result["error"]

    @patch("app.services.scan_corrector._call_vision")
    def test_no_json_braces_returns_unknown(self, mock_vision):
        from app.services.scan_corrector import identify_student_from_scan
        mock_vision.return_value = "just plain text without braces"
        result = identify_student_from_scan(b"fake_image", exam_id=5, enrolled_students=[])
        assert result["student_id"] is None
        assert result["method"] == "unknown"