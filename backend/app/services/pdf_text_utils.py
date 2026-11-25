"""Shared utilities for PDF text extraction with smart line joining and HTML formatting.

Used by all vestibular importers to avoid mid-sentence line breaks from PDF
column layout and preserve bold/italic formatting from PyMuPDF spans.
Includes centralized superscript/subscript detection and conversion so every
importer handles exponents (e.g. "10⁴ Pa", "H₂O") consistently.
"""
import re
from typing import List, Optional, Tuple

# ── Superscript / Subscript constants and tables ────────────────────────────
#
# PyMuPDF flag for superscript spans.
SPAN_FLAG_SUPERSCRIPT = 1  # fitz.TEXT_FONT_SUPERSCRIPT
SPAN_FLAG_ITALIC = 1 << 1
SPAN_FLAG_BOLD = 1 << 4

# Unicode translation tables — unified for all importers.
SUPERSCRIPT_TABLE = str.maketrans("0123456789+-−=()ni", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ⁿⁱ")
SUBSCRIPT_TABLE = str.maketrans("0123456789+-−=()", "₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎")


def to_script_chars(text: str, kind: str) -> Optional[str]:
    """Convert `text` to Unicode superscript/subscript, or None if any
    character has no equivalent (caller should keep original)."""
    table = SUPERSCRIPT_TABLE if kind == "sup" else SUBSCRIPT_TABLE
    converted = text.translate(table)
    if any(not c.isspace() and c == o for c, o in zip(converted, text)):
        return None
    return converted


def span_script(span: dict, base_size: float, base_y: Optional[float]) -> Optional[str]:
    """Return 'sup', 'sub' or None for a span, relative to the dominant span."""
    if not (span.get("text") or "").strip():
        return None
    size = float(span.get("size") or 0)
    smaller = bool(base_size and size and size < base_size * 0.85)
    origin = span.get("origin")
    dy = (origin[1] - base_y) if (origin and base_y is not None) else None
    if span.get("flags", 0) & SPAN_FLAG_SUPERSCRIPT:
        if smaller or base_size == 0 or (dy is not None and dy < -0.15 * base_size):
            return "sup"
    if smaller and dy is not None:
        if dy < -0.15 * base_size:
            return "sup"
        if dy > 0.1 * base_size:
            return "sub"
    return None


def line_base(spans: list[dict]) -> tuple[float, Optional[float]]:
    """(font size, baseline y) of the dominant span in a line."""
    candidates = [s for s in spans if (s.get("text") or "").strip()]
    if not candidates:
        return 0.0, None
    dominant = max(candidates, key=lambda s: (float(s.get("size") or 0), len(s["text"].strip())))
    origin = dominant.get("origin")
    return float(dominant.get("size") or 0), (origin[1] if origin else None)


def render_spans(spans: list[dict], base: Optional[tuple[float, Optional[float]]] = None) -> tuple[str, str]:
    """Build (plain text, HTML) from PyMuPDF spans, preserving bold/italic
    and converting superscript/subscript to <sup>/<sub> + Unicode."""
    base_size, base_y = base if base is not None else line_base(spans)
    plain_parts: list[str] = []
    html_parts: list[str] = []
    for s in spans:
        txt = s.get("text") or ""
        if not txt:
            continue
        flags = s.get("flags", 0)
        script = span_script(s, base_size, base_y)
        if script:
            converted = to_script_chars(txt, script)
            plain_parts.append(converted if converted is not None else txt)
            inner = f"<{script}>{txt.strip()}</{script}>"
            inner = txt[: len(txt) - len(txt.lstrip())] + inner + txt[len(txt.rstrip()):]
        else:
            plain_parts.append(txt)
            inner = txt
        is_bold = bool(flags & SPAN_FLAG_BOLD)
        is_italic = bool(flags & SPAN_FLAG_ITALIC)
        if is_bold and is_italic:
            html_parts.append(f"<b><i>{inner}</i></b>")
        elif is_bold:
            html_parts.append(f"<b>{inner}</b>")
        elif is_italic:
            html_parts.append(f"<i>{inner}</i>")
        else:
            html_parts.append(inner)
    return "".join(plain_parts).strip(), "".join(html_parts).strip()


def merge_script_only_lines(lines: list[dict]) -> tuple[list[list[dict]], list[list[float]]]:
    """Merge lines that are only a short exponent/subscript back into the
    previous visual line, or merge continuation lines sharing the same
    baseline. Prevents MuPDF from splitting '10⁴ Pa' across two paragraphs."""
    merged: list[tuple[list[dict], list[float]]] = []
    for line in lines:
        spans = [s for s in line.get("spans", []) if s.get("text")]
        if not spans:
            continue
        bbox = list(line.get("bbox") or (0, 0, 0, 0))
        if merged:
            prev_spans, prev_bbox = merged[-1]
            prev_size, prev_y = line_base(prev_spans)
            this_size, this_y = line_base(spans)
            text = "".join(s["text"] for s in spans).strip()
            overlaps = bbox[1] < prev_bbox[3] and bbox[3] > prev_bbox[1]
            script_only = bool(
                text and len(text) <= 4 and prev_size
                and this_size < prev_size * 0.85 and overlaps
            )
            same_baseline = bool(
                prev_size and prev_y is not None and this_y is not None
                and abs(this_y - prev_y) <= 0.2 * prev_size
                and abs(this_size - prev_size) <= 0.15 * prev_size
                and prev_bbox[2] - prev_size <= bbox[0] <= prev_bbox[2] + 2 * prev_size
            )
            if script_only or same_baseline:
                combined = sorted(prev_spans + spans, key=lambda s: (s.get("bbox") or (0,))[0])
                new_bbox = [
                    min(prev_bbox[0], bbox[0]), min(prev_bbox[1], bbox[1]),
                    max(prev_bbox[2], bbox[2]), max(prev_bbox[3], bbox[3]),
                ]
                merged[-1] = (combined, new_bbox)
                continue
        merged.append((spans, bbox))
    return [spans for spans, _ in merged], [bbox for _, bbox in merged]


def extract_line_html(spans: list[dict]) -> str:
    """Build HTML string from PyMuPDF line spans, preserving bold/italic
    and converting superscript/subscript to <sup>/<sub> tags."""
    _base_size, _base_y = line_base(spans)
    html_parts = []
    for s in spans:
        txt = s.get("text", "")
        if not txt:
            continue
        flags = s.get("flags", 0)
        script = span_script(s, _base_size, _base_y)
        if script:
            inner = f"<{script}>{txt.strip()}</{script}>"
            inner = txt[: len(txt) - len(txt.lstrip())] + inner + txt[len(txt.rstrip()):]
        else:
            inner = txt
        is_bold = bool(flags & SPAN_FLAG_BOLD)
        is_italic = bool(flags & SPAN_FLAG_ITALIC)
        if is_bold and is_italic:
            html_parts.append(f"<b><i>{inner}</i></b>")
        elif is_bold:
            html_parts.append(f"<b>{inner}</b>")
        elif is_italic:
            html_parts.append(f"<i>{inner}</i>")
        else:
            html_parts.append(inner)
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


_SUP_RE = re.compile(r'<sup>(.*?)</sup>', re.I | re.DOTALL)
_SUB_RE = re.compile(r'<sub>(.*?)</sub>', re.I | re.DOTALL)


def html_to_plain_preserve_exponents(html: str) -> str:
    """Strip HTML tags but convert <sup>/<sub> to Unicode equivalents first."""
    def _conv(kind: str):
        def inner(m: re.Match) -> str:
            converted = to_script_chars(m.group(1), kind)
            return converted if converted is not None else m.group(1)
        return inner

    result = _SUP_RE.sub(_conv("sup"), html)
    result = _SUB_RE.sub(_conv("sub"), result)
    return re.sub(r'<[^>]+>', '', result).strip()


# Backward-compatible alias for existing callers.
_html_to_plain_preserve_exponents = html_to_plain_preserve_exponents


def build_statement(
    plain_lines: List[str],
    html_lines: List[str],
) -> Tuple[str, str | None]:
    """Build both plain and HTML statements from accumulated lines.

    Returns (statement, html_statement). html_statement is None if no HTML
    lines were provided. Preserves exponents by converting <sup>/<sub> to
    Unicode superscript/subscript characters instead of stripping them.
    """
    stmt = join_lines_smart(plain_lines)
    html_stmt = join_html_smart(html_lines) if html_lines else None
    if html_stmt:
        stmt = html_to_plain_preserve_exponents(html_stmt)
    return stmt, html_stmt