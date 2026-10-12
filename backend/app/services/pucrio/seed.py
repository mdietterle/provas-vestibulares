from __future__ import annotations

"""Importa questões do vestibular da PUC-Rio direto de
puc-rio.br/vestibular/repositorio/ (acervo de provas e gabaritos por ano).

Cada edição publica dezenas de PDFs (por dia, turno e grupo de carreiras).
Para manter o escopo razoável (mesmo padrão da PUCPR, que só from app.services.progress import update_task_progress, complete_task, fail_task
import gc
importa
"Medicina" e não "Demais Cursos"), importamos só dois PDFs por edição — os
dois com o conteúdo mais representativo e estável entre edições:

  - 1º Dia (Língua Estrangeira: Inglês + Espanhol, igual pra todos os grupos)
  - 2º Dia, Grupo 1 (Ciências da Natureza + Ciências Humanas)

Os nomes de arquivo mudam muito de formato ano a ano (sem padrão fixo), então
os links são localizados por palavras-chave no texto/href do link, não por
nome de arquivo fixo — edições muito antigas (nomenclatura caótica, ~2020-
2022) ou que só publicam um ZIP único (sem página HTML por PDF) não são
localizadas com confiança e são puladas.

O gabarito da PUC-Rio é o PRÓPRIO caderno de prova com a alternativa correta
grifada por um sublinhado colorido (varia de cor) desenhado sob o texto da
alternativa — nunca preto/branco/cinza. Basta parsear o PDF de gabarito (que
já contém o enunciado completo, as imagens e a resposta certa); não é
necessário baixar a prova separada.
"""


import re
import unicodedata
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.ufpr.seed import _xref_to_dataurl

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_REPO_URL = "https://www.puc-rio.br/vestibular/repositorio/"
_YEAR_RE = re.compile(r'repositorio/provas/(\d{4}(?:-2)?)/?"')
_LINK_RE = re.compile(r'<a[^>]*href="(download/[^"]+\.pdf)"[^>]*>(.*?)</a>', re.I | re.S)

_MIN_QUESTIONS_DAY1 = 8
_MIN_QUESTIONS_DAY2 = 15


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s).strip()


def fetch_pucrio_years() -> list[str]:
    """Retorna os rótulos de edição disponíveis (ex.: '2023', '2023-2', '2025')."""
    resp = requests.get(_REPO_URL, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    years = sorted(set(_YEAR_RE.findall(resp.text)))
    return years


def _fetch_year_links(year: str) -> list[tuple[str, str]]:
    """[(href, texto_do_link)] dos PDFs listados na página da edição."""
    url = f"{_REPO_URL}provas/{year}/"
    resp = requests.get(url, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    return [(href, _strip_tags(text)) for href, text in _LINK_RE.findall(resp.text)]


def _is_day(text: str, day: int) -> bool:
    # "1º DIA" (padrão comum) ou "Dia01"/"Diia01" (2019, dia como sufixo do
    # nome, inclusive com o typo "Diia" que a própria PUC-Rio publicou).
    return bool(
        re.search(rf"{day}\s*[ºo]?\s*[-_]?\s*DIA", text, re.I)
        or re.search(rf"DI+A\s*0?{day}(?!\d)", text, re.I)
    )


def _is_gabarito(text: str, href: str) -> bool:
    return "GABARITO" in text.upper() or "GABARITO" in href.upper()


_GRUPOS_RE = re.compile(r"GRUPOS?\s*[-_]?\s*((?:\d\D{0,4}){1,4})", re.I)


def _compact_group_digits(blob: str) -> Optional[set[int]]:
    """Fallback pra nomes que abreviam "GRUPO" pra só "G" colado no número
    (ex.: 2015/2018/2020: "gabarito_G1_3_4_5_...", "gabaritoG2-V2...").
    Cada dígito capturado exige `(?!\\d)` logo depois — trava assim que o
    próximo caractere também é dígito — pra nunca confundir com um dígito
    isolado de dentro de uma data colada sem separador (ex.: seria fácil
    capturar o "1" de "G2_13OUT2019" como se fosse outro grupo, mas o "1" é
    seguido por outro dígito ali, então a trava barra e para no primeiro
    grupo mesmo)."""
    m = re.search(r"(?<![A-Za-z])G(\d)(?!\d)", blob)
    if not m:
        return None
    digits = {int(m.group(1))}
    pos = m.end()
    while True:
        m2 = re.match(r"[_-](\d)(?!\d)", blob[pos:])
        if not m2:
            break
        digits.add(int(m2.group(1)))
        pos += m2.end()
    return digits


def _find_day1_gabarito(links: list[tuple[str, str]]) -> Optional[str]:
    """Prefere o caderno combinado (Grupos 1,3,4,5 — mas nem toda edição
    inclui os 4: em 2026 o grupo 5 sumiu do nome do arquivo, "GRUPOS_1-3-4",
    então não dá pra exigir a lista completa); cai pro Grupo 2 isolado se
    não achar nenhum combinado."""
    combined, single = None, None
    for href, text in links:
        blob = f"{href} {text}"
        if not (_is_day(blob, 1) and _is_gabarito(text, href)):
            continue
        m = _GRUPOS_RE.search(blob)
        digits = {int(d) for d in re.findall(r"\d", m.group(1))} if m else _compact_group_digits(blob)
        if not digits:
            continue
        if digits - {2}:
            # Tem algum grupo além do 2 → é o caderno combinado, não o
            # isolado (independente de quantos grupos exatamente).
            combined = href
        elif digits == {2}:
            single = href
    return combined or single


def _find_day2_grupo1_gabarito(links: list[tuple[str, str]]) -> Optional[str]:
    for href, text in links:
        blob = f"{href} {text}"
        if not (_is_day(blob, 2) and _is_gabarito(text, href)):
            continue
        # Grupo 1 isolado — exclui cadernos combinados tipo "GRUPOS 1 E 3".
        if re.search(r"GRUPOS?\s*[-_]?\s*1\D{0,4}3", blob, re.I):
            continue
        if re.search(r"GRUPO\s*[-_]?\s*1\b", blob, re.I):
            return href
    return None


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=120, headers=_HEADERS)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Parsing ───────────────────────────────────────────────────────────────

_AREA_PATTERNS = [
    (re.compile(r"L[ÍI]NGUA\s+ESTRANGEIRA\s*[-–]\s*INGL[ÊE]S", re.I), ("Língua Estrangeira", "Inglês")),
    (re.compile(r"L[ÍI]NGUA\s+ESTRANGEIRA\s*[-–]\s*ESPANHOL", re.I), ("Língua Estrangeira", "Espanhol")),
    (re.compile(r"^CI[ÊE]NCIAS\s+DA\s+NATUREZA\s*$", re.I), ("Ciências da Natureza", None)),
    (re.compile(r"^CI[ÊE]NCIAS\s+HUMANAS\s*$", re.I), ("Ciências Humanas", None)),
]

_NOISE_RE = re.compile(
    r"^PUC\s*-\s*RIO|^\d+[ºo]?\s*DIA|^VESTIBULAR|^RASCUNHO|^CONCURSO VESTIBULAR|^GABARITO\b",
    re.I,
)
_Q_MARK_RE = re.compile(r"^(\d{1,2})$")
_OPT_RE = re.compile(r"^\(([A-E])\)\s*(.*)$")


def _match_area(text: str):
    for pat, val in _AREA_PATTERNS:
        if pat.search(text.strip()):
            return val
    return None


def _page_content_images_xy(page) -> list[tuple[float, float, int]]:
    """[(x0, y0, xref)] das imagens de conteúdo da página (sem fundos/logos)."""
    pw, ph = page.rect.width, page.rect.height
    out = []
    for im in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = im["bbox"]
        w, h = x1 - x0, y1 - y0
        xref = im.get("xref", 0)
        if not xref or w <= 8 or h <= 8:
            continue
        if w > pw * 0.9 and h > ph * 0.9:
            continue
        if y0 < 40 and x0 < 120 and w < 200:
            continue
        out.append((x0, y0, xref))
    out.sort(key=lambda t: t[1])
    return out


def _is_grayscale_or_bw(color) -> bool:
    if not color or len(color) != 3:
        return True
    r, g, b = color
    if (r, g, b) in ((0, 0, 0), (1, 1, 1)):
        return True
    return abs(r - g) < 0.08 and abs(g - b) < 0.08 and abs(r - b) < 0.08


def _page_underlines(page) -> list[tuple[float, float, float]]:
    """[(y, x0, x1)] dos traços de grifo (sublinhado colorido) da página."""
    out = []
    for d in page.get_drawings():
        if d.get("type") not in ("s", "fs"):
            continue
        if _is_grayscale_or_bw(d.get("color")):
            continue
        rect = d["rect"]
        if abs(rect.y1 - rect.y0) > 2 and (rect.x1 - rect.x0) < 4:
            continue  # linha vertical, não é sublinhado
        if rect.x1 - rect.x0 < 8:
            continue
        out.append(((rect.y0 + rect.y1) / 2, rect.x0, rect.x1))
    return out


def _is_underlined(bbox, underlines: list[tuple[float, float, float]]) -> bool:
    y0, x0, y1, x1 = bbox[1], bbox[0], bbox[3], bbox[2]
    for uy, ux0, ux1 in underlines:
        if y0 - 2 <= uy <= y1 + 2 and not (ux1 < x0 or ux0 > x1):
            return True
    return False


def parse_pucrio_pdf(path: Path) -> tuple[list[dict], list[int]]:
    """Retorna (questões, números pulados). Cada questão: {number, area,
    language, statement, options: [{letter, text}], correct, images}."""
    doc = fitz.open(str(path))
    # cada evento: (page_index, coluna, y, etype, payload)
    events: list[tuple[int, int, float, str, object]] = []

    for page_idx, page in enumerate(doc):
        underlines = _page_underlines(page)
        page_h = page.rect.height
        page_mid_x = page.rect.width / 2
        lines = []
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = "".join(s["text"] for s in spans).strip()
                if text:
                    lines.append((text, line["bbox"]))

        for x0, y0, xref in _page_content_images_xy(page):
            col = 0 if x0 < page_mid_x else 1
            events.append((page_idx, col, y0, "img", xref))

        for text, bbox in lines:
            # Cabeçalho/rodapé (número de página, "N DIA - TURNO - GRUPO",
            # nome da universidade) fica sempre nessas faixas de margem.
            if bbox[1] < 65 or bbox[1] > page_h - 65:
                continue
            col = 0 if bbox[0] < page_mid_x else 1
            area = _match_area(text)
            if area:
                events.append((page_idx, col, bbox[1], "area", area))
                continue
            m_q = _Q_MARK_RE.match(text)
            if m_q:
                events.append((page_idx, col, bbox[1], "q_start", int(m_q.group(1))))
                continue
            m_opt = _OPT_RE.match(text)
            if m_opt:
                is_hl = _is_underlined(bbox, underlines)
                events.append((page_idx, col, bbox[1], "opt_start", (m_opt.group(1), m_opt.group(2).strip(), is_hl)))
                continue
            if _NOISE_RE.match(text):
                continue
            events.append((page_idx, col, bbox[1], "text", text))

    # Ordena por página, depois coluna (esquerda antes de direita), depois Y —
    # o layout é sempre 2 colunas, nunca por posição bruta no stream do PDF.
    events.sort(key=lambda e: (e[0], e[1], e[2]))

    # Números soltos aparecem em vários lugares que não são marcador de
    # questão: numeração de parágrafo em textos de leitura, rótulos dentro de
    # figuras ("blocos 1 e 2"), tabela periódica etc. Um marcador de questão
    # de verdade sempre tem uma alternativa "(A)" num raio pequeno de eventos
    # à frente — usa uma janela fixa, não "até o próximo número solto"
    # (que pode ele também ser um rótulo espúrio, sub-contando a distância).
    _LOOKAHEAD_WINDOW = 60
    for i, e in enumerate(events):
        if e[3] != "q_start":
            continue
        end = min(i + 1 + _LOOKAHEAD_WINDOW, len(events))
        has_option_a = any(
            events[j][3] == "opt_start" and events[j][4][0] == "A" for j in range(i + 1, end)
        )
        if not has_option_a:
            page_idx, col, y, _etype, num = e
            events[i] = (page_idx, col, y, "text", str(num))

    questions: list[dict] = []
    skipped: list[int] = []
    current_area = "Geral"
    current_lang: Optional[str] = None
    q_num: Optional[int] = None
    statement_lines: list[str] = []
    options: list[dict] = []
    images: list[str] = []
    seen_xref: set[int] = set()
    expected = 1

    def flush():
        nonlocal q_num, statement_lines, options, images
        if q_num is None:
            return
        stmt = "\n".join(statement_lines).strip()
        letters = {o["letter"] for o in options}
        if stmt and len(options) == 5 and letters == set("ABCDE"):
            highlighted = [o["letter"] for o in options if o.get("highlighted")]
            correct = highlighted[0] if len(highlighted) == 1 else None
            questions.append({
                "number": q_num,
                "area": current_area,
                "language": current_lang,
                "statement": stmt,
                "correct": correct,
                "options": [{"letter": o["letter"], "text": " ".join(o["lines"]).strip()} for o in options],
                "images": list(images),
            })
        else:
            skipped.append(q_num)
        q_num, statement_lines, options, images = None, [], [], []

    for _page_idx, _col, _y, etype, payload in events:
        if etype == "area":
            flush()
            new_area, new_lang = payload
            if new_lang is not None and new_lang != current_lang:
                # Espanhol reinicia a numeração do zero (mesma numeração do
                # Inglês, matérias diferentes) — mesmo padrão da PUCRS.
                expected = 1
            current_area, current_lang = new_area, new_lang
        elif etype == "q_start":
            num = payload
            # A essa altura, os eventos "q_start" já foram filtrados (acima)
            # para conter só marcadores de questão de verdade — basta exigir
            # a sequência exata.
            if num == expected:
                flush()
                q_num = num
                statement_lines = []
                options = []
                images = []
                expected = num + 1
            elif q_num is not None:
                # não bate com o esperado — trata como texto (ex.: número citado no enunciado)
                statement_lines.append(str(num)) if not options else options[-1]["lines"].append(str(num))
        elif etype == "opt_start":
            letter, rest, is_hl = payload
            if q_num is not None:
                options.append({"letter": letter, "lines": [rest] if rest else [], "highlighted": is_hl})
        elif etype == "text":
            text = payload
            if q_num is None:
                continue
            if options:
                options[-1]["lines"].append(text)
            else:
                statement_lines.append(text)
        elif etype == "img":
            xref = payload
            if q_num is None or xref in seen_xref:
                continue
            seen_xref.add(xref)
            data_url = _xref_to_dataurl(doc, xref)
            if data_url:
                images.append(data_url)
    flush()

    return questions, skipped


# ── Orquestração ──────────────────────────────────────────────────────────

def _extract_year_label(path: Path) -> Optional[int]:
    doc = fitz.open(str(path))
    text = doc[0].get_text() if len(doc) else ""
    doc.close()
    m = re.search(r"(?:PUC\s*-\s*RIO|VESTIBULAR)\s*(\d{4})", text, re.I)
    return int(m.group(1)) if m else None


def import_pucrio_edition(
    year_label: str,
    tmp_dir: Path,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
) -> dict:
    from app.database import SessionLocal
    from app.services.import_batch import save_vestibular_question

    links = _fetch_year_links(year_label)
    day1_href = _find_day1_gabarito(links)
    day2_href = _find_day2_grupo1_gabarito(links)
    if not day1_href and not day2_href:
        return {"year_label": year_label, "skipped": True, "reason": "nenhum PDF reconhecido nesta edição"}

    all_questions: list[dict] = []
    files_used = []
    for href, min_q in ((day1_href, _MIN_QUESTIONS_DAY1), (day2_href, _MIN_QUESTIONS_DAY2)):
        if not href:
            continue
        url = _REPO_URL + f"provas/{year_label}/" + href
        dest = tmp_dir / Path(href).name
        try:
            download_pdf(url, dest)
            qs, _skipped = parse_pucrio_pdf(dest)
        except Exception as e:
            continue
        if len(qs) < min_q:
            continue
        all_questions.extend(qs)
        files_used.append(href)
    if not all_questions:
        return {"year_label": year_label, "skipped": True, "reason": "PDFs encontrados mas sem questões suficientes"}

    year = _extract_year_label(tmp_dir / Path(files_used[0]).name) or int(year_label[:4])

    # O rótulo da pasta ("2023-2") pode não bater com o ano real de ingresso
    # impresso no PDF ("2024" — ver `_year_candidates`); o filtro em
    # `import_all_pucrio_exams` é intencionalmente amplo demais pra não
    # perder essa edição, então a checagem definitiva de since_year/
    # until_year é feita aqui, contra o ano REAL extraído do PDF.
    if since_year and year < since_year:
        return {"year_label": year_label, "skipped": True, "reason": f"ano real {year} é anterior a since_year={since_year}"}
    if until_year and year > until_year:
        return {"year_label": year_label, "skipped": True, "reason": f"ano real {year} é posterior a until_year={until_year}"}

    db = SessionLocal()
    try:
        exam_name = f"PUC-Rio {year}"
        added = 0
        skipped_existing = 0
        for q in all_questions:
            options = []
            for i, opt in enumerate(q["options"]):
                options.append({
                    "letter": opt["letter"],
                    "text": opt["text"],
                    "is_correct": (opt["letter"] == q["correct"]),
                    "order": i,
                })
            images = None
            if q.get("images"):
                images = [
                    {"image_base64": img, "order": i}
                    for i, img in enumerate(q["images"])
                ]
            metadata = {
                "area": q["area"],
                "language": q["language"],
            }
            vq, created = save_vestibular_question(
                db,
                exam_type="pucrio",
                exam_name=exam_name,
                year=year,
                number=q["number"],
                statement=q["statement"],
                options=options,
                images=images,
                image_base64=q["images"][0] if q.get("images") else None,
                correct_option=q.get("correct"),
                metadata=metadata,
            )
            if not created:
                skipped_existing += 1
                continue
            added += 1
        db.commit()
        return {
            "year_label": year_label,
            "exam_name": exam_name,
            "files_used": files_used,
            "total_questions": added,
            "skipped_existing": skipped_existing,
            "with_gabarito": sum(1 for q in all_questions if q["correct"]),
        }
    finally:
        db.close()


def _year_candidates(label: str) -> set[int]:
    """O rótulo da pasta no site é normalmente o ano de ingresso, mas pelo
    menos uma edição foge disso: a pasta "2023-2" (2º semestre de 2023)
    publica o vestibular de ingresso 2024 (PDFs nomeados
    "GABARITO-2024-..."), enquanto outras pastas "-2" mais antigas (ex.:
    "2019-2", "2015-2") usam mesmo o ano do rótulo — não é um deslocamento
    fixo confiável por filename (gabaritos às vezes reaproveitam link de
    edição anterior, o que gera falso positivo se tentarmos adivinhar o ano
    real só pelo nome do arquivo). Em vez de arriscar essa adivinhação,
    retorna um conjunto de anos PLAUSÍVEIS pra filtro de `since_year`/
    `until_year` — o rótulo mesmo, e +1 só pra "-2" (único deslocamento
    confirmado). O ano definitivo de cada edição é decidido depois, na
    importação de verdade, direto do texto do PDF (`_extract_year_label`)."""
    base = int(label[:4])
    return {base, base + 1} if label.endswith("-2") else {base}


def import_all_pucrio_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, **kwargs) -> dict:
    import tempfile

    years = fetch_pucrio_years()

    if since_year:
        years = [y for y in years if any(c >= since_year for c in _year_candidates(y))]
    if until_year:
        years = [y for y in years if any(c <= until_year for c in _year_candidates(y))]

    imported, skipped, errors = [], [], []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        for year_label in years:
            try:
                result = import_pucrio_edition(year_label, tmp_dir, since_year=since_year, until_year=until_year)
                if result.get("skipped"):
                    skipped.append(result)
                else:
                    imported.append(result)
            except Exception as e:
                errors.append({"year_label": year_label, "error": str(e)})

    return {"imported": imported, "skipped": skipped, "errors": errors}
