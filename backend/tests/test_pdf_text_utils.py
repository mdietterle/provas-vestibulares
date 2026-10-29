"""Tests for app.services.pdf_text_utils — pure text/HTML processing helpers."""
import pytest
from app.services.pdf_text_utils import (
    extract_line_html,
    join_lines_smart,
    join_html_smart,
    build_statement,
)


class TestExtractLineHtml:
    def test_empty_spans(self):
        assert extract_line_html([]) == ""

    def test_plain_text(self):
        spans = [{"text": "Hello world", "flags": 0}]
        assert extract_line_html(spans) == "Hello world"

    def test_bold_flag(self):
        spans = [{"text": "Bold", "flags": 1 << 4}]
        result = extract_line_html(spans)
        assert "<b>Bold</b>" in result

    def test_italic_flag(self):
        spans = [{"text": "Italic", "flags": 1 << 1}]
        result = extract_line_html(spans)
        assert "<i>Italic</i>" in result

    def test_bold_and_italic(self):
        spans = [{"text": "Both", "flags": (1 << 4) | (1 << 1)}]
        result = extract_line_html(spans)
        assert "<b><i>Both</i></b>" in result

    def test_mixed_spans(self):
        spans = [
            {"text": "Normal ", "flags": 0},
            {"text": "Bold", "flags": 1 << 4},
        ]
        result = extract_line_html(spans)
        assert "Normal" in result
        assert "<b>Bold</b>" in result

    def test_skips_empty_text(self):
        spans = [{"text": "", "flags": 0}, {"text": "Keep", "flags": 0}]
        assert extract_line_html(spans) == "Keep"


class TestJoinLinesSmart:
    def test_empty_list(self):
        assert join_lines_smart([]) == ""

    def test_single_line(self):
        assert join_lines_smart(["Hello"]) == "Hello"

    def test_joins_lowercase_continuation(self):
        lines = ["This is a", "sentence."]
        result = join_lines_smart(lines)
        assert "This is a sentence." in result

    def test_paragraph_break_on_empty_line(self):
        lines = ["First para.", "", "Second para."]
        result = join_lines_smart(lines)
        assert "First para." in result
        assert "Second para." in result
        assert "\n" in result

    def test_hyphenated_word_join(self):
        lines = ["infor-", "mation"]
        result = join_lines_smart(lines)
        assert "information" in result

    def test_new_paragraph_on_uppercase_after_period(self):
        lines = ["End of sentence.", "New paragraph starts."]
        result = join_lines_smart(lines)
        assert "End of sentence." in result
        assert "New paragraph starts." in result


class TestJoinHtmlSmart:
    def test_empty_list(self):
        assert join_html_smart([]) == ""

    def test_single_html_line(self):
        result = join_html_smart(["<b>Hello</b>"])
        assert "<p><b>Hello</b></p>" in result

    def test_merges_continuous_lines_into_paragraph(self):
        lines = ["Start of", "a sentence."]
        result = join_html_smart(lines)
        assert "<p>" in result
        assert "Start of" in result
        assert "a sentence." in result

    def test_paragraph_break_on_empty_line(self):
        lines = ["<b>First</b>", "", "<i>Second</i>"]
        result = join_html_smart(lines)
        assert result.count("<p>") == 2

    def test_hyphenated_merge(self):
        # join_html_smart strips tags to check trailing hyphen on plain text,
        # then merges: current[-1][:-(len(plain))] + plain[:-1] + next_line
        # With "<b>infor-</b>" the plain is "infor-", so it keeps the tag prefix
        # and appends "mation" (with hyphen removed from plain).
        lines = ["<b>infor-</b>", "mation"]
        result = join_html_smart(lines)
        # Result should contain merged word without the hyphen
        assert "infor" in result
        assert "mation" in result
        assert "-" not in result or result.count("-") == 0


class TestBuildStatement:
    def test_plain_only(self):
        stmt, html = build_statement(["Hello world"], [])
        assert stmt == "Hello world"
        assert html is None

    def test_with_html_overrides_plain(self):
        plain = ["ignored"]
        html_lines = ["<b>Bold text</b>"]
        stmt, html = build_statement(plain, html_lines)
        assert html is not None
        assert "<b>Bold text</b>" in html
        # Plain regenerated from HTML
        assert "Bold text" in stmt
        assert "<" not in stmt

    def test_empty_inputs(self):
        stmt, html = build_statement([], [])
        assert stmt == ""
        assert html is None