"""Shared utilities for PDF text extraction with smart line joining and HTML formatting.

Used by all vestibular importers to avoid mid-sentence line breaks from PDF
column layout and preserve bold/italic formatting from PyMuPDF spans.
"""
import re
from typing import List, Tuple


def extract_line_html(spans: list[dict]) -> str:
    """Build HTML string from PyMuPDF line spans, preserving bold/italic."""
    html_parts = []
    for s in spans:
        txt = s.get("text", "")
        if not txt:
            continue
        flags = s.get("flags", 0)
        is_bold = bool(flags & (1 << 4))   # bit 4 = bold
        is_italic = bool(flags & (1 << 1))  # bit 1 = italic
        if is_bold and is_italic:
            html_parts.append(f"<b><i>{txt}</i></b>")
        elif is_bold:
            html_parts.append(f"<b>{txt}</b>")
        elif is_italic:
            html_parts.append(f"<i>{txt}</i>")
        else:
            html_parts.append(txt)
    return "".join(html_parts).strip()


def join_lines_smart(lines: List[str]) -> str:
    """Join PDF lines into paragraphs, avoiding mid-sentence breaks.

    - Lines ending with hyphen: joined without space (word continuation)
    - Lines ending with lowercase/punctuation: joined with space (same sentence)
    - Empty lines: paragraph breaks
    - Lines starting with uppercase after a complete sentence: new paragraph
    """
    if not lines:
        return ""
    result_parts: list[str] = []
    current_para: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                result_parts.append(" ".join(current_para))
                current_para = []
            continue
        if current_para and current_para[-1].endswith("-"):
            prev = current_para.pop()
            current_para.append(prev[:-1] + stripped)
        elif current_para and re.search(r'[a-záéíóúãõâêîôûç,;:]$', current_para[-1]):
            current_para.append(stripped)
        else:
            if current_para:
                result_parts.append(" ".join(current_para))
            current_para = [stripped]
    if current_para:
        result_parts.append(" ".join(current_para))
    return "\n".join(result_parts)


def join_html_smart(html_lines: List[str]) -> str:
    """Join HTML lines preserving formatting tags, merging into <p> blocks."""
    if not html_lines:
        return ""
    paragraphs: list[str] = []
    current: list[str] = []
    for hline in html_lines:
        stripped = hline.strip()
        if not stripped:
            if current:
                paragraphs.append("<p>" + " ".join(current) + "</p>")
                current = []
            continue
        plain = re.sub(r'<[^>]+>', '', stripped)
        if current:
            last_plain = re.sub(r'<[^>]+>', '', current[-1])
            if last_plain.endswith("-"):
                # Merge hyphenated word across lines
                current[-1] = current[-1][:-(len(last_plain))] + last_plain[:-1] + stripped
            elif re.search(r'[a-záéíóúãõâêîôûç,;:]$', last_plain):
                current.append(stripped)
            else:
                paragraphs.append("<p>" + " ".join(current) + "</p>")
                current = [stripped]
        else:
            current = [stripped]
    if current:
        paragraphs.append("<p>" + " ".join(current) + "</p>")
    return "".join(paragraphs)


def build_statement(
    plain_lines: List[str],
    html_lines: List[str],
) -> Tuple[str, str | None]:
    """Build both plain and HTML statements from accumulated lines.

    Returns (statement, html_statement). html_statement is None if no HTML
    lines were provided.
    """
    stmt = join_lines_smart(plain_lines)
    html_stmt = join_html_smart(html_lines) if html_lines else None
    if html_stmt:
        # Regenerate plain text from HTML to ensure consistency
        stmt = re.sub(r'<[^>]+>', '', html_stmt).strip()
    return stmt, html_stmt