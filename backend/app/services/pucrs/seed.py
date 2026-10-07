"""Importa questões do vestibular de Medicina da PUCRS direto do site
oficial (portal.pucrs.br/.../provas-anteriores/), sem depender de arquivo
local.

A página só publica prova+gabarito de Medicina — o vestibular "Demais
Cursos" não tem prova objetiva própria (entra só por edital/chamada). Cada
edição com prova publicada vira uma seção de acordeão (FAQ) cujo id termina
em "-provas-e-gabaritos"; o scraper descobre essas seções dinamicamente, e
extrai ano/estação do próprio id (ex.:
"vestibular-de-verao-2023-medicina-...-provas-e-gabaritos"). No momento
(2026) só existem 2 edições com essa seção — Verão 2022 e Verão 2023 — mas
se a PUCRS publicar mais no futuro, aparecem automaticamente.

Prova impressa em 2 colunas por página (como a FUVEST) — por isso os
eventos de linha são ordenados por (página, coluna, y), não só (página, y).

70 questões objetivas + redação (descartada, é discursiva), divididas em 6
grupos, sempre na mesma ordem e faixa de número (confirmado idêntico entre
prova e gabarito na edição de 2023): Língua Estrangeira — Espanhol OU Inglês,
mesma faixa 1-10 (compartilhada, o candidato escolhe um idioma) —,
Matemática (11-20), Língua Portuguesa (21-30), Física/Química/Biologia
combinadas (31-50), Literatura/História/Geografia combinadas (51-70). O
gabarito não indica de qual matéria é cada questão (é uma lista sequencial
"N – LETRA", sem cabeçalho por bloco), por isso essas faixas são fixas
(hardcoded) em vez de detectadas dinamicamente.
"""

from __future__ import annotations
from app.services.progress import update_task_progress, complete_task, fail_task
import gc

import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.ufpr.seed import _page_content_images, _xref_to_dataurl

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_INDEX_URL = "https://portal.pucrs.br/ensino/formas-de-ingresso/vestibular/provas-anteriores/"

_SECTION_ID_RE = re.compile(r'<div id="([a-z0-9\-]*-provas-e-gabaritos)"')
_LINK_RE = re.compile(r'<a[^>]*href="([^"]+\.pdf)"[^>]*>([^<]*)</a>', re.I)
_SEASON_YEAR_RE = re.compile(r"vestibular-de-(verao|inverno)-(\d{4})")


def fetch_pucrs_editions() -> list[dict]:
    """Varre a página de provas anteriores e retorna as edições com prova +
    gabarito de Medicina disponíveis: {year, season, prova_url, gabarito_url}."""
    resp = requests.get(_INDEX_URL, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    html = resp.text

    section_starts = [(m.start(), m.group(1)) for m in _SECTION_ID_RE.finditer(html)]
    editions = []
    for i, (pos, section_id) in enumerate(section_starts):
        end = section_starts[i + 1][0] if i + 1 < len(section_starts) else len(html)
        section_html = html[pos:end]

        m_season = _SEASON_YEAR_RE.search(section_id)
        if not m_season:
            continue
        season = "Verão" if m_season.group(1) == "verao" else "Inverno"
        year = int(m_season.group(2))

        prova_url = gabarito_url = None
        for href, text in _LINK_RE.findall(section_html):
            low = text.lower()
            if prova_url is None and "prova" in low and "comentada" not in low:
                prova_url = href
            elif gabarito_url is None and "gabarito" in low:
                gabarito_url = href

        if prova_url and gabarito_url:
            editions.append({"year": year, "season": season, "prova_url": prova_url, "gabarito_url": gabarito_url})

    return editions


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=90, headers=_HEADERS)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Gabarito ─────────────────────────────────────────────────────────────────

_RANGES: list[tuple[int, int, str, Optional[str]]] = [
    (1, 10, "Língua Estrangeira", "Espanhol"),
    (1, 10, "Língua Estrangeira", "Inglês"),
    (11, 20, "Matemática", None),
    (21, 30, "Língua Portuguesa", None),
    (31, 50, "Física, Química e Biologia", None),
    (51, 70, "Literatura, História e Geografia", None),
]
_GAB_ENTRY_RE = re.compile(r"(\d{1,2})\s*[–\-]\s*([A-E])\b")


def _range_lookup(number: int, occurrence_index: int) -> tuple[Optional[str], Optional[str]]:
    candidates = [r for r in _RANGES if r[0] <= number <= r[1]]
    if not candidates:
        return None, None
    idx = min(occurrence_index, len(candidates) - 1)
    _, _, area, language = candidates[idx]
    return area, language


def parse_pucrs_gabarito(pdf_path: Path) -> dict[tuple[int, Optional[str]], tuple[Optional[str], str]]:
    """Retorna {(número, idioma): (letra, área)}. O gabarito é uma lista
    sequencial "N – LETRA" (sem indicar a matéria) — usa `_RANGES` pra saber
    a matéria, com contagem de ocorrência pra distinguir Espanhol de Inglês
    na faixa compartilhada 1-10."""
    doc = fitz.open(str(pdf_path))
    full_text = "\n".join(p.get_text() for p in doc)
    doc.close()

    result: dict[tuple[int, Optional[str]], tuple[Optional[str], str]] = {}
    occurrence_count: dict[int, int] = {}
    for num_s, letter in _GAB_ENTRY_RE.findall(full_text):
        num = int(num_s)
        idx = occurrence_count.get(num, 0)
        occurrence_count[num] = idx + 1
        area, language = _range_lookup(num, idx)
        if area is None:
            continue
        result[(num, language)] = (letter.upper(), area)
    return result


# ── Prova ────────────────────────────────────────────────────────────────────

_Q_MARK_RE = re.compile(r"^Quest[ãa]o\s*0?(\d{1,3})\b", re.I)
_OPT_LINE_RE = re.compile(r"^([A-D])\)\s*(.*)$")


def parse_pucrs_pdf(pdf_path: Path) -> list[dict]:
    """Parseia o PDF da prova (múltipla escolha, 4 alternativas A-D) e
    retorna a lista de questões: {number, statement, options, images,
    image_base64}. Não inclui a redação (discursiva).

    Prova em 2 colunas por página — eventos ordenados por (página, coluna, y)."""
    doc = fitz.open(str(pdf_path))

    events: list[tuple[int, int, float, str, object]] = []
    for pno, page in enumerate(doc):
        mid_x = page.rect.width / 2
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                text = "".join(s["text"] for s in line["spans"]).strip()
                if not text:
                    continue
                x0, y = line["bbox"][0], line["bbox"][1]
                col = 0 if x0 < mid_x else 1

                m_q = _Q_MARK_RE.match(text)
                if m_q:
                    events.append((pno, col, y, "q", int(m_q.group(1))))
                    continue

                m_opt = _OPT_LINE_RE.match(text)
                if m_opt:
                    events.append((pno, col, y, "opt", (m_opt.group(1), m_opt.group(2))))
                    continue

                events.append((pno, col, y, "text", text))

        for x0, y0, xref in _page_content_images_xy(page):
            col = 0 if x0 < mid_x else 1
            events.append((pno, col, y0, "img", xref))

    events.sort(key=lambda e: (e[0], e[1], e[2]))

    questions: list[dict] = []
    expected = 1
    cur: Optional[dict] = None
    images_by_number: dict[int, list[str]] = {}
    seen_xref: set[int] = set()
    occurrence_count: dict[int, int] = {}

    def flush():
        nonlocal cur
        if cur is None:
            return
        opts = cur["options"]
        if len(opts) >= 4:
            seen: set[str] = set()
            built: list[tuple[str, str]] = []
            for letter, lines in opts:
                if letter in seen:
                    continue
                seen.add(letter)
                built.append((letter, re.sub(r"\s+", " ", " ".join(lines)).strip()))
            order = {"A": 0, "B": 1, "C": 2, "D": 3}
            built = sorted([(l, t) for l, t in built if l in order], key=lambda lt: order[lt[0]])
            statement = re.sub(r"\s+", " ", " ".join(cur["statement_lines"])).strip()
            if statement and set("ABCD").issubset({l for l, _ in built}):
                num = cur["number"]
                occurrence = occurrence_count.get(num, 0)
                occurrence_count[num] = occurrence + 1
                questions.append({
                    "number": num,
                    "occurrence": occurrence,
                    "statement": statement,
                    "options": built[:4],
                })
        cur = None

    for pno, _col, _y, kind, val in events:
        if kind == "q":
            n = val
            if n == expected or (expected < n <= 99 and n - expected <= 4):
                flush()
                cur = {"number": n, "statement_lines": [], "options": []}
                expected = n + 1
                continue
            if n <= 3 and n < expected:
                # reinício de seção — a Língua Estrangeira reaproveita a
                # numeração entre Espanhol e Inglês (ambos 1-10).
                flush()
                cur = {"number": n, "statement_lines": [], "options": []}
                expected = n + 1
                continue
            val = str(n)
            kind = "text"

        if kind == "opt":
            letter, rest = val
            if cur is not None:
                cur["options"].append([letter, [rest] if rest else []])
            continue

        if kind == "img":
            if cur is not None and val not in seen_xref:
                seen_xref.add(val)
                data_url = _xref_to_dataurl(doc, val)
                if data_url:
                    images_by_number.setdefault(cur["number"], []).append(data_url)
            continue

        if cur is None:
            continue
        if cur["options"]:
            cur["options"][-1][1].append(val)
        else:
            cur["statement_lines"].append(val)

    flush()

    for q in questions:
        imgs = images_by_number.get(q["number"], [])
        q["images"] = imgs
        q["image_base64"] = imgs[0] if imgs else None

    doc.close()
    return questions


def _page_content_images_xy(page) -> list[tuple[float, float, int]]:
    """[(x0, y0, xref)] das imagens de conteúdo da página (sem fundos/logos)
    — como `_page_content_images` da UFPR, mas com x0, necessário pra saber
    a coluna da imagem."""
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


# ── Persistência ─────────────────────────────────────────────────────────────

_MIN_QUESTIONS = 20


def run_migrations_pucrs(conn):
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS pucrs_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            season VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS pucrs_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrs_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS pucrs_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrs_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


def import_pucrs_edition(db, edition: dict) -> dict:
    from app.services.import_batch import save_vestibular_question

    year, season = edition["year"], edition["season"]
    exam_name = f"PUCRS {season} {year} – Medicina"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        download_pdf(edition["prova_url"], prova_path)
        parsed = parse_pucrs_pdf(prova_path)

        gabarito: dict = {}
        try:
            gab_path = tmp_path / "gabarito.pdf"
            download_pdf(edition["gabarito_url"], gab_path)
            gabarito = parse_pucrs_gabarito(gab_path)
        except Exception:
            gabarito = {}

    if len(parsed) < _MIN_QUESTIONS:
        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": 0,
            "skipped": True,
            "reason": f"Só {len(parsed)} questões reconhecidas (provável falha de parsing nesse formato de PDF)",
        }

    # A faixa 1-10 é compartilhada entre Espanhol e Inglês (2 questões com o
    # mesmo número na prova, uma por idioma) — usa a mesma indexação por
    # ordem de ocorrência do gabarito (`_range_lookup`) pra casar cada uma
    # com o idioma certo, em vez de tentar adivinhar por tentativa.
    added = 0
    skipped_existing = 0
    seen: set[tuple[int, Optional[str]]] = set()
    for q in parsed:
        num = q["number"]
        area, language = _range_lookup(num, q.get("occurrence", 0))
        correct = None
        entry = gabarito.get((num, language))
        if entry:
            correct, area = entry
        key = (num, language)
        if key in seen:
            continue
        seen.add(key)

        options = [
            {"letter": letter, "text": text_, "is_correct": (letter == correct), "order": i}
            for i, (letter, text_) in enumerate(q["options"])
        ]
        images = None
        if q.get("images"):
            images = [
                {"image_base64": img, "order": i}
                for i, img in enumerate(q["images"])
            ]
        metadata = {
            "season": season,
            "area": area,
            "language": language,
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="pucrs",
            exam_name=exam_name,
            year=year,
            number=num,
            statement=q["statement"],
            options=options,
            images=images,
            image_base64=q.get("image_base64"),
            correct_option=correct,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

    db.commit()
    return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}


def import_all_pucrs_exams(since_year: int = 2015, until_year: Optional[int] = None, db=None, task_id: Optional[str] = None, **kwargs) -> dict:
    """Importa TODAS as edições de Medicina da PUCRS com prova+gabarito
    publicados em portal.pucrs.br/.../provas-anteriores/. No momento (2026)
    só existem 2 edições disponíveis (Verão 2022 e Verão 2023) — o
    vestibular "Demais Cursos" e as edições de Inverno não têm prova
    objetiva publicada. Cada edição é tentada de forma independente. Quando
    chamada como BackgroundTask, `task_id` é obrigatório pra o progresso ser
    reportado — sem isso a tarefa nunca chega a "completed" e o polling do
    frontend fica parado pra sempre esperando um status que nunca muda
    (mesmo quando a importação real já terminou, ou nem tinha nada a
    importar pro intervalo de anos pedido)."""
    from app.database import SessionLocal, engine

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        try:
            with engine.begin() as conn:
                run_migrations_pucrs(conn)
        except Exception as e:
            raise RuntimeError(f"Falha ao criar tabelas: {e}")

        try:
            editions = fetch_pucrs_editions()
        except Exception as e:
            raise RuntimeError(f"Falha ao acessar a listagem de edições: {e}")

        editions = [
            e for e in editions
            if (since_year is None or e["year"] >= since_year) and (until_year is None or e["year"] <= until_year)
        ]

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(editions, start=1):
            exam_name = f"PUCRS {edition['season']} {edition['year']} – Medicina"
            try:
                r = import_pucrs_edition(db, edition)
            except Exception as e:
                db.rollback()
                r = {"exam_name": exam_name, "skipped": True, "reason": str(e)}
            results.append({"year": edition["year"], "season": edition["season"], **r})
            total_added += r.get("total_added", 0)

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=exam_name)

        summary = {"total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, summary)
        return summary
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()
