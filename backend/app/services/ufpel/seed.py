from __future__ import annotations

"""Importa questões do PAVE (Programa de Avaliação da Vida Escolar — o
vestibular seriado próprio da UFPel), direto do site oficial.

O domínio ufpel.edu.br (e os subdomínios wp./ces.) está atrás de um WAF
("SafeLine") que bloqueia toda requisição automatizada — tanto a página de
listagem quanto os PDFs retornam HTTP 403 com uma página de erro do WAF, não
o conteúdo real, mesmo com User-Agent de navegador. Não há workaround direto
por header. Por isso este from app.services.progress import update_task_progress, complete_task, fail_task
import gc
importador usa o **Wayback Machine**
(web.archive.org) como proxy: descobre o snapshot mais recente da página
"provas-anteriores" pela CDX API, e baixa os PDFs pelo mesmo mecanismo — um
sufixo "id_" no timestamp do link do snapshot devolve o arquivo original
bruto, sem o toolbar do arquivo.

Cada ano tem uma seção "PAVE {ano}" com um link de prova por etapa (1, 2, 3)
e um único PDF de gabarito cobrindo as 3 etapas juntas (seções internas
"ETAPA 1/2/3"). 32 questões objetivas por etapa: 9 Ciências da Natureza, 9
Ciências Humanas, 5 Matemática, 9 Linguagens (das quais as 3 últimas são de
Língua Estrangeira — o candidato escolhe Espanhol ou Inglês por questão,
mas a própria prova avisa que "o gabarito é o mesmo" independente do
idioma escolhido — diferente dos outros importadores, não há ambiguidade de
idioma pra resolver aqui).

Cada questão tem 6 alternativas impressas, "(a)" a "(f)" — mas "(f)" é
sempre "I.R." (Item Removido/anulado), não uma alternativa de resposta real;
é descartada, ficam só as 5 reais (a-e, mapeadas pra A-E)."""


import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.ufpr.seed import _page_content_images, _xref_to_dataurl

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_ORIGINAL_URL = "https://wp.ufpel.edu.br/pave/provas-anteriores/"
_CDX_URL = "http://web.archive.org/cdx/search/cdx"


def _latest_snapshot_timestamp() -> str:
    # A CDX API costuma ser lenta (20-30s não é incomum) e às vezes responde
    # 503/504 sob carga — timeout generoso e algumas tentativas antes de
    # desistir, nenhum dos dois é sinal de que a página não existe.
    import time

    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            resp = requests.get(
                _CDX_URL,
                params={"url": _ORIGINAL_URL, "output": "json", "limit": -1},
                timeout=90,
                headers=_HEADERS,
            )
            resp.raise_for_status()
            rows = resp.json()
            if len(rows) < 2:  # 1ª linha é sempre o cabeçalho de colunas
                raise RuntimeError("Nenhum snapshot da página encontrado no Wayback Machine")
            return rows[-1][1]
        except requests.exceptions.RequestException as e:
            last_exc = e
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    raise last_exc


def _wayback_raw_url(wrapped_href: str) -> str:
    """Converte um href de snapshot (".../web/TIMESTAMP/URL") pro formato
    que devolve o conteúdo bruto do arquivo (".../web/TIMESTAMPid_/URL")."""
    return re.sub(r"(/web/\d+)(/)", r"\1id_\2", wrapped_href, count=1)


_YEAR_SECTION_RE = re.compile(r"PAVE\s*(\d{4})", re.I)
_LINK_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>([^<]*)</a>', re.I)


def fetch_ufpel_editions() -> list[dict]:
    """Varre (via Wayback Machine) a página de provas anteriores do PAVE e
    retorna uma edição por ano: {year, stages: {1: url, 2: url, 3: url},
    gabarito_url}."""
    timestamp = _latest_snapshot_timestamp()
    resp = requests.get(
        f"http://web.archive.org/web/{timestamp}/{_ORIGINAL_URL}", timeout=30, headers=_HEADERS
    )
    resp.raise_for_status()
    html = resp.text

    year_positions = [(m.start(), int(m.group(1))) for m in _YEAR_SECTION_RE.finditer(html)]
    editions = []
    for i, (pos, year) in enumerate(year_positions):
        end = year_positions[i + 1][0] if i + 1 < len(year_positions) else len(html)
        block = html[pos:end]

        stages: dict[int, str] = {}
        gabarito_url = None
        for href, text in _LINK_RE.findall(block):
            low = text.lower()
            m_etapa = re.search(r"etapa\s*(\d)", low)
            if m_etapa and "prova" in low and int(m_etapa.group(1)) not in stages:
                stages[int(m_etapa.group(1))] = _wayback_raw_url(href)
            elif "gabarito" in low and gabarito_url is None:
                gabarito_url = _wayback_raw_url(href)

        if stages and gabarito_url:
            editions.append({"year": year, "stages": stages, "gabarito_url": gabarito_url})

    return editions


def download_pdf(url: str, dest: Path, _retries: int = 3) -> None:
    """O Wayback Machine faz rate-limiting de requisições em sequência
    rápida (reseta a conexão) — tenta de novo com backoff antes de desistir.
    Também é conhecido truncar capturas de arquivos grandes em exatamente
    1 MiB, o que corrompe o PDF de um jeito que não dá pra contornar
    baixando de novo (é a própria captura que está incompleta) — nesse
    caso `_MIN_QUESTIONS`, mais adiante, detecta e reporta como pulado."""
    import time

    last_exc: Optional[Exception] = None
    for attempt in range(_retries):
        try:
            resp = requests.get(url, timeout=90, headers=_HEADERS)
            resp.raise_for_status()
            if resp.content[:4] != b"%PDF":
                raise ValueError("A URL não retornou um PDF (link removido, ou falha do Wayback Machine)")
            dest.write_bytes(resp.content)
            return
        except requests.exceptions.RequestException as e:
            last_exc = e
            if attempt + 1 < _retries:
                time.sleep(3 * (attempt + 1))
    raise last_exc


# ── Gabarito ─────────────────────────────────────────────────────────────────

_ETAPA_SPLIT_RE = re.compile(r"ETAPA\s*(\d)", re.I)
_GAB_ENTRY_RE = re.compile(r"(\d{1,2})\s+([A-E]|Anulada)\b", re.I)


def parse_ufpel_gabarito(pdf_path: Path) -> dict[int, dict[int, Optional[str]]]:
    """Retorna {etapa: {número: letra_ou_None}} — um único PDF cobre as 3
    etapas do ano, em seções "ETAPA N"."""
    doc = fitz.open(str(pdf_path))
    full_text = "\n".join(p.get_text() for p in doc)
    doc.close()

    positions = [(m.start(), int(m.group(1))) for m in _ETAPA_SPLIT_RE.finditer(full_text)]
    result: dict[int, dict[int, Optional[str]]] = {}
    for i, (pos, etapa) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(full_text)
        block = full_text[pos:end]
        answers: dict[int, Optional[str]] = {}
        for num_s, val in _GAB_ENTRY_RE.findall(block):
            num = int(num_s)
            answers[num] = None if "anulad" in val.lower() else val.upper()
        result[etapa] = answers
    return result


# ── Prova ────────────────────────────────────────────────────────────────────
#
# Marcador de questão: número solto seguido de ponto no início da linha
# ("1. <texto>") — o próprio texto de apoio (ex.: uma notícia) é parte do
# enunciado, não um marcador espúrio, então a resincronização por "número
# esperado" (mesma técnica da ACAFE/UFPR) é só uma rede de segurança contra
# ruído de PDF, não uma necessidade estrutural aqui.

_Q_MARK_RE = re.compile(r"^(\d{1,3})\.\s+(\S.*)$")
_OPT_LINE_RE = re.compile(r"^\(([a-f])\)\s*(.*)$", re.I)
_AREA_HEADER_MAP = {
    "CIÊNCIAS DA NATUREZA": "Ciências da Natureza",
    "CIÊNCIAS HUMANAS": "Ciências Humanas",
    "MATEMÁTICA": "Matemática",
    "LINGUAGENS": "Linguagens",
}


def parse_ufpel_pdf(pdf_path: Path) -> list[dict]:
    """Parseia UMA etapa e retorna a lista de questões: {number, area,
    statement, options: [(letra, texto)] (só A-E; "(f) I.R." é descartada),
    images, image_base64}."""
    doc = fitz.open(str(pdf_path))

    events: list[tuple[int, float, str, object]] = []
    for pno, page in enumerate(doc):
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                text = "".join(s["text"] for s in line["spans"]).strip()
                if not text:
                    continue
                y = line["bbox"][1]

                if text.upper() in _AREA_HEADER_MAP:
                    events.append((pno, y, "area", _AREA_HEADER_MAP[text.upper()]))
                    continue

                m_opt = _OPT_LINE_RE.match(text)
                if m_opt:
                    events.append((pno, y, "opt", (m_opt.group(1).upper(), m_opt.group(2))))
                    continue

                m_q = _Q_MARK_RE.match(text)
                if m_q:
                    events.append((pno, y, "q", (int(m_q.group(1)), m_q.group(2))))
                    continue

                events.append((pno, y, "text", text))

        for y, xref in _page_content_images(page):
            events.append((pno, y, "img", xref))

    events.sort(key=lambda e: (e[0], e[1]))

    questions: list[dict] = []
    expected = 1
    cur: Optional[dict] = None
    current_area: Optional[str] = None
    images_by_number: dict[int, list[str]] = {}
    seen_xref: set[int] = set()

    def flush():
        nonlocal cur
        if cur is None:
            return
        real_opts = [(letter, lines) for letter, lines in cur["options"] if letter != "F"]
        if len(real_opts) >= 5:
            seen: set[str] = set()
            built: list[tuple[str, str]] = []
            for letter, lines in real_opts:
                if letter in seen:
                    continue
                seen.add(letter)
                built.append((letter, re.sub(r"\s+", " ", " ".join(lines)).strip()))
            order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
            built = sorted([(l, t) for l, t in built if l in order], key=lambda lt: order[lt[0]])
            statement = re.sub(r"\s+", " ", " ".join(cur["statement_lines"])).strip()
            if statement and set("ABCDE").issubset({l for l, _ in built}):
                questions.append({
                    "number": cur["number"],
                    "area": cur["area"],
                    "statement": statement,
                    "options": built[:5],
                })
        cur = None

    for pno, _y, kind, val in events:
        if kind == "area":
            current_area = val
            continue

        if kind == "q":
            n, rest = val
            if current_area is None:
                # As instruções gerais no início da prova são numeradas
                # ("1. Não pergunte nada ao fiscal...") no mesmo formato de
                # uma questão real — ignora qualquer "questão" antes do
                # primeiro cabeçalho de área, senão essa lista consome os
                # números baixos e desalinha a resincronização pro resto.
                val = f"{n}. {rest}" if rest else str(n)
                kind = "text"
            elif n == expected or (expected < n <= 99 and n - expected <= 4):
                flush()
                cur = {"number": n, "area": current_area, "statement_lines": [rest] if rest else [], "options": []}
                expected = n + 1
                continue
            val = f"{n}. {rest}" if rest else str(n)
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


# ── Persistência ─────────────────────────────────────────────────────────────

_MIN_QUESTIONS = 10  # etapas têm só 32 questões, limite proporcionalmente mais baixo


def run_migrations_ufpel(conn):
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ufpel_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            stage INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ufpel_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpel_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ufpel_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpel_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


def import_ufpel_stage(db, year: int, stage: int, prova_url: str, gabarito: dict[int, Optional[str]]) -> dict:
    from app.services.import_batch import save_vestibular_question

    exam_name = f"UFPel PAVE {year} – Etapa {stage}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "prova.pdf"
        download_pdf(prova_url, pdf_path)
        parsed = parse_ufpel_pdf(pdf_path)

    if len(parsed) < _MIN_QUESTIONS:
        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": 0,
            "skipped": True,
            "reason": f"Só {len(parsed)} questões reconhecidas (provável falha de parsing nesse formato de PDF)",
        }

    added = 0
    skipped_existing = 0
    seen: set[int] = set()
    for q in parsed:
        num = q["number"]
        if num in seen:
            continue
        seen.add(num)

        correct = gabarito.get(num)
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
            "stage": stage,
            "area": q.get("area"),
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="ufpel",
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


def import_ufpel_edition(db, edition: dict) -> list[dict]:
    year = edition["year"]
    results = []

    gabarito_by_stage: dict[int, dict[int, Optional[str]]] = {}
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            gab_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(edition["gabarito_url"], gab_path)
            gabarito_by_stage = parse_ufpel_gabarito(gab_path)
    except Exception:
        gabarito_by_stage = {}  # best-effort: importa as provas mesmo sem gabarito

    for stage in sorted(edition["stages"].keys()):
        try:
            r = import_ufpel_stage(db, year, stage, edition["stages"][stage], gabarito_by_stage.get(stage, {}))
        except Exception as e:
            db.rollback()
            r = {"exam_name": f"UFPel PAVE {year} – Etapa {stage}", "skipped": True, "reason": str(e)}
        results.append(r)
    return results


def import_all_ufpel_exams(since_year: int = 2013, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as provas do PAVE listadas em
    wp.ufpel.edu.br/pave/provas-anteriores/ (acessada via Wayback Machine,
    já que o domínio bloqueia requisições automatizadas — ver docstring do
    módulo). Cada ano tem até 3 etapas, cada uma tentada de forma
    independente."""
    from app.database import SessionLocal, engine

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with engine.begin() as conn:
            run_migrations_ufpel(conn)
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    try:
        editions = fetch_ufpel_editions()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a listagem de edições (via Wayback Machine): {e}")

    editions = [
        e for e in editions
        if (since_year is None or e["year"] >= since_year) and (until_year is None or e["year"] <= until_year)
    ]

    results = []
    total_added = 0
    try:
        for edition in sorted(editions, key=lambda e: e["year"], reverse=True):
            for r in import_ufpel_edition(db, edition):
                results.append({"year": edition["year"], **r})
                total_added += r.get("total_added", 0)

        return {"total_added": total_added, "exams": results}
    finally:
        if close_after:
            db.close()
