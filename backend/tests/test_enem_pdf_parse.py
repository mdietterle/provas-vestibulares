"""Parser do PDF do ENEM: expoentes, alternativas e créditos de imagem.

Regressão do QA (ENEM 2025, questão 124 — "laje"): o enunciado saía com
"104 Pa" / "50 m2" / "kg/m3" / "m/s2" (expoentes perdidos — com 104 Pa
nenhuma alternativa fica correta), com as alternativas grudadas no fim
("... é A 0,16 m. B 0,50 m. ...", letras divergindo dos botões embaralhados)
e com o crédito da imagem ("Disponível em: ...") no topo do enunciado.
"""
import importlib
import sys
from unittest.mock import MagicMock

import pytest

from app.services.enem import pdf_import
from app.services.enem.pdf_import import (
    _html_to_plain,
    _is_credit_line,
    _merge_script_only_lines,
    _render_spans,
    _split_options,
    _statement_ends_with_options,
)


def _span(text, size=10.0, y=215.0, x=0.0, flags=0):
    return {"text": text, "size": size, "flags": flags, "origin": (x, y), "bbox": (x, y - size, x + 5, y)}


# ── Spans → texto/HTML ───────────────────────────────────────────────────────

def test_superscript_span_by_flag_becomes_unicode_and_sup():
    plain, html = _render_spans([_span("50 m"), _span("2", size=6, y=211, x=40, flags=1), _span(" de área", x=45)])
    assert plain == "50 m² de área"
    assert html == "50 m<sup>2</sup> de área"


def test_superscript_detected_by_size_and_baseline_without_flag():
    plain, html = _render_spans([_span("pressão de 10"), _span("4", size=6, y=211, x=60), _span(" Pa", x=65)])
    assert plain == "pressão de 10⁴ Pa"
    assert html == "pressão de 10<sup>4</sup> Pa"


def test_negative_exponent_and_subscript():
    plain, _ = _render_spans([_span("10"), _span("−3", size=6, y=211, x=10)])
    assert plain == "10⁻³"
    plain, html = _render_spans([_span("H"), _span("2", size=6, y=217, x=8), _span("O", x=12)])
    assert plain == "H₂O"
    assert html == "H<sub>2</sub>O"


def test_unconvertible_superscript_keeps_text_but_html_has_sup():
    plain, html = _render_spans([_span("x"), _span("ab", size=6, y=211, x=8, flags=1)])
    assert plain == "xab"
    assert html == "x<sup>ab</sup>"


def test_bold_and_regular_size_text_is_not_superscript():
    plain, html = _render_spans([_span("A", flags=16), _span(" 0,16 m.", x=8)])
    assert plain == "A 0,16 m."
    assert html == "<b>A</b> 0,16 m."


def test_exponent_split_into_its_own_line_is_merged_back():
    lines = [
        {"bbox": (40, 204, 342, 218), "spans": [_span("pressão de 10", x=40)]},
        {"bbox": (337, 204, 358, 218), "spans": [_span("4", size=6, y=211, x=337), _span(" Pa.", x=341)]},
        {"bbox": (40, 219, 276, 233), "spans": [_span("Próxima linha", y=230, x=40)]},
    ]
    spans, bboxes = _merge_script_only_lines(lines)
    assert len(spans) == 2
    assert _render_spans(spans[0])[0] == "pressão de 10⁴ Pa."
    assert _render_spans(spans[1])[0] == "Próxima linha"


# ── Alternativas / créditos ──────────────────────────────────────────────────

def test_split_options_still_returns_statement_and_options():
    stmt, opts = _split_options(["Enunciado", "A 1", "B 2", "C 3", "D 4", "E 5"])
    assert stmt == "Enunciado"
    assert opts == ["1", "2", "3", "4", "5"]


def test_statement_ends_with_options_guard():
    opts = ["0,16 m.", "0,50 m.", "0,80 m.", "1,60 m.", "8,00 m."]
    assert _statement_ends_with_options("é A 0,16 m. B 0,50 m. C 0,80 m. D 1,60 m. E 8,00 m.", opts)
    assert not _statement_ends_with_options("A espessura máxima da laje é", opts)


@pytest.mark.parametrize("line,prev,expected", [
    ("Disponível em: www.novomilenio.inf.br. Acesso em: 10 out. 2025.", None, True),
    ("Acesso em: 10 out. 2025.", "Disponível em: www.x.br.", True),
    ("Fonte: IBGE, 2020.", None, True),
    ("pagina/123.html", "Disponível em: https://www.site.com.br/", True),
    ("(adaptado).", "Disponível em: www.x.br. Acesso em: 1 jan. 2025", True),
    ("Uma laje de concreto", None, False),
    ("Uma laje de concreto", "Disponível em: www.x.br. Acesso em: 1 jan. 2025.", False),
])
def test_is_credit_line(line, prev, expected):
    assert _is_credit_line(line, prev) is expected


def test_html_to_plain_keeps_paragraph_breaks_and_exponents():
    assert _html_to_plain("<p>10<sup>4</sup> Pa.</p><p>m/s<sup>2</sup></p>") == "10⁴ Pa.\nm/s²"


# ── parse_exam_pdf ponta a ponta com um PDF sintético ───────────────────────

def _real_fitz():
    """O conftest troca `fitz` por um MagicMock; carrega o PyMuPDF de verdade
    se estiver instalado (senão o teste é pulado)."""
    saved = sys.modules.pop("fitz", None)
    try:
        mod = importlib.import_module("fitz")
    except Exception:
        mod = None
    finally:
        if saved is not None:
            sys.modules["fitz"] = saved
        else:
            sys.modules.pop("fitz", None)
    if mod is None or isinstance(mod, MagicMock) or not hasattr(mod, "open"):
        return None
    return mod


def _build_q124_pdf(fitz, path):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    def put(x, y, s, size=10, font="helv"):
        page.insert_text((x, y), s, fontsize=size, fontname=font)
        return x + fitz.get_text_length(s, fontname=font, fontsize=size)

    put(40, 60, "CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS", 11, "hebo")
    put(40, 90, "QUESTÃO 124", 11, "hebo")
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 60, 40), 0)
    pix.clear_with(200)
    page.insert_image(fitz.Rect(40, 100, 240, 180), pixmap=pix)
    put(40, 192, "Disponível em: www.novomilenio.inf.br. Acesso em: 10 out. 2025.", 7)
    x = put(40, 215, "Uma laje de concreto com área de 50 m")
    x = put(x, 211, "2", 6)
    x = put(x, 215, " suporta uma pressão de 10")
    x = put(x, 211, "4", 6)
    put(x, 215, " Pa.")
    x = put(40, 230, "A densidade do concreto é 2 500 kg/m")
    x = put(x, 226, "3", 6)
    x = put(x, 230, " e g = 10 m/s")
    x = put(x, 226, "2", 6)
    put(x, 230, ".")
    put(40, 245, "A espessura máxima da laje é")
    for i, (letter, value) in enumerate(zip("ABCDE", ["0,16 m.", "0,50 m.", "0,80 m.", "1,60 m.", "8,00 m."])):
        put(40, 265 + i * 14, letter, 10, "hebo")
        put(52, 265 + i * 14, value)
    put(40, 360, "QUESTÃO 125", 11, "hebo")
    put(40, 380, "A figura mostra um circuito simples com uma pilha.")
    for i, (letter, value) in enumerate(zip("ABCDE", ["um.", "dois.", "três.", "quatro.", "cinco."])):
        put(40, 400 + i * 14, letter, 10, "hebo")
        put(52, 400 + i * 14, value)
    doc.save(str(path))
    doc.close()


def test_parse_exam_pdf_q124_end_to_end(tmp_path, monkeypatch):
    fitz = _real_fitz()
    if fitz is None:
        pytest.skip("PyMuPDF não instalado")
    import app.services.pdf_figures as pdf_figures

    monkeypatch.setattr(pdf_import, "fitz", fitz)
    monkeypatch.setattr(pdf_figures, "fitz", fitz)
    pdf = tmp_path / "q124.pdf"
    _build_q124_pdf(fitz, pdf)

    questions, _color, _instructions = pdf_import.parse_exam_pdf(pdf)
    by_num = {q["number"]: q for q in questions}

    q = by_num[124]
    assert q["parse_error"] is False
    assert q["options"] == ["0,16 m.", "0,50 m.", "0,80 m.", "1,60 m.", "8,00 m."]
    # 1. expoentes preservados
    assert "50 m² suporta uma pressão de 10⁴ Pa." in q["statement"]
    assert "kg/m³" in q["statement"] and "m/s²" in q["statement"]
    assert "10<sup>4</sup> Pa." in q["html_statement"]
    # 2/3. alternativas fora do enunciado (texto e HTML)
    assert "0,16 m" not in q["statement"]
    assert "0,16 m" not in q["html_statement"]
    # 4. crédito da imagem no fim, não no começo
    credit = "Disponível em: www.novomilenio.inf.br. Acesso em: 10 out. 2025."
    assert q["image_credit"] == credit
    assert q["statement"].startswith("Uma laje de concreto")
    assert q["statement"].endswith(credit)
    assert q["html_statement"].endswith(f'<p class="image-credit"><small>{credit}</small></p>')
    assert q["image_base64"]

    # Enunciado que começa com o artigo "A" não é mais confundido com alternativa.
    q125 = by_num[125]
    assert q125["parse_error"] is False
    assert q125["statement"] == "A figura mostra um circuito simples com uma pilha."
    assert q125["options"] == ["um.", "dois.", "três.", "quatro.", "cinco."]
    assert q125["image_credit"] is None
