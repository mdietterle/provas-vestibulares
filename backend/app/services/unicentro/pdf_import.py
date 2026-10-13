from __future__ import annotations

"""Importa questões do vestibular da UNICENTRO (Universidade Estadual do
Centro-Oeste, Paraná) direto do site oficial, um PDF de prova + um PDF de
gabarito por ano.

A página https://www3.unicentro.br/vestibular/anteriores/ lista, numa única
tabela HTML (colunas OFERTA/PROVAS/GABARITOS/CANDIDATO-VAGA/APROVADOS), o link
de prova e de gabarito de cada ano. `fetch_exam_links` varre essa tabela e
descobre os pares automaticamente — os PDFs de anos mais antigos (até ~2022)
vivem num domínio/padrão fixo (`unicentro.br/vestibular/anteriores/...`), os
de anos mais recentes (2023+) num domínio novo (`www3...wp-content/uploads`)
com nomes de arquivo que incluem um hash e não são adivinháveis por padrão —
por isso é a página-índice, e não uma lista de URLs hardcoded, que resolve os
links de cada ano.

Formato do PDF de prova (confirmado baixando e inspecionando os PDFs de 2021,
2022, 2025 e 2026): a prova é dividida em áreas de conhecimento, cada uma com
cabeçalho em CAIXA ALTA sozinho numa linha (`LÍNGUA PORTUGUESA E LITERATURA`,
`INGLÊS`/`ESPANHOL` — como `LÍNGUA ESTRANGEIRA MODERNA – INGLÊS/ESPANHOL` no
cabeçalho da prova —, `ARTE`, `BIOLOGIA`, `FILOSOFIA`, `FÍSICA`, `GEOGRAFIA`,
`HISTÓRIA`, `MATEMÁTICA`, `QUÍMICA`, `SOCIOLOGIA`). Dentro de cada área, a
numeração das questões reinicia em 1. Cada questão tem 5 alternativas
"a) ... b) ... c) ... d) ... e) ..." (minúsculas, com parêntese) — mas o
número da questão aparece como uma linha solta com o dígito nu, indistinguível
à primeira vista de números de linha de referência em textos de apoio (comum
em Inglês/Espanhol) ou de entradas soltas dentro de matrizes (comum em
Matemática). Por isso o parser NÃO usa "linha com um número sozinho" como
âncora primária: ele primeiro localiza sequências completas a),b),c),d),e) em
ordem (que são inequívocas) e só depois busca, retroativamente, a linha
"<número esperado>" mais próxima que seja seguida de uma letra maiúscula
(início de frase) para recuperar o enunciado — isso é imune tanto aos números
de linha de referência quanto às entradas numéricas de matrizes.

Em anos antigos (confirmado em 2020: prova de 51 páginas com "1º dia"/"2º
dia", tags "N\nQUESTÃO" espalhadas fora de ordem de leitura e alternativas em
maiúsculas "A)"), o layout usa caixas de texto flutuantes cuja ordem de
extração do PyMuPDF não corresponde à ordem de leitura — o parser não lida
com esse formato e simplesmente não reconhece nenhuma questão (extração real
de 0 questões, reportado como pulado). Anos suportados na prática: 2021 em
diante (2023 falhou neste teste com HTTP 500 do lado do servidor — parece
transitório, mas cada tentativa é independente por ano).

O gabarito é um PDF de 2 páginas com uma tabela por área: uma linha de
números 1..N seguida de uma linha de N letras (ou "Anulada" para questão
anulada). Inglês e Espanhol são um caso especial: como são optativas com a
mesma quantidade de questões, o gabarito imprime os dois cabeçalhos lado a
lado e DEPOIS o bloco combinado (números de Inglês, números de Espanhol
repetidos, respostas de Inglês, respostas de Espanhol) — `parse_gabarito`
trata esse par separadamente do caso geral.

Persistência via `save_vestibular_question` (app/services/import_batch.py),
que grava nas tabelas unificadas `vestibular_questions` /
`vestibular_question_options` / `vestibular_question_images` e faz upload
automático de imagens para o Supabase Storage (bucket `vestibulares`).
"""

import base64
import gc
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests

from app.services.pdf_figures import extract_figure_events
from app.services.progress import update_task_progress, complete_task, fail_task

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_ANTERIORES_URL = "https://www3.unicentro.br/vestibular/anteriores/"

_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.I | re.S)
_TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.I | re.S)
_HREF_RE = re.compile(r'href="([^"]+\.pdf)"', re.I)
_TAG_RE = re.compile(r"<[^>]+>")


def fetch_exam_links(html: Optional[str] = None, url: str = _ANTERIORES_URL) -> list[dict]:
    """Varre a tabela de provas anteriores da UNICENTRO e retorna
    [{year, prova_url, gabarito_url}, ...] para todos os anos listados."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    seen_years: set[int] = set()
    pairs: list[dict] = []
    for row_m in _ROW_RE.finditer(html):
        row = row_m.group(1)
        tds = _TD_RE.findall(row)
        if len(tds) < 3:
            continue
        year_text = _TAG_RE.sub("", tds[0]).strip()
        m = re.match(r"^\d{4}$", year_text) or re.search(r"(\d{4})\s*$", year_text)
        if not m:
            continue
        year = int(m.group(0) if m.re.groups == 0 else m.group(1))
        if year in seen_years:
            continue
        prova_m = _HREF_RE.search(tds[1])
        gabarito_m = _HREF_RE.search(tds[2])
        if not (prova_m and gabarito_m):
            continue
        seen_years.add(year)
        pairs.append({
            "year": year,
            "prova_url": urljoin(url, prova_m.group(1)),
            "gabarito_url": urljoin(url, gabarito_m.group(1)),
        })
    return pairs


def download_pdf(url: str, dest: Path) -> None:
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (link possivelmente fora do ar).")
    dest.write_bytes(resp.content)


# ── Extração de texto + figuras ────────────────────────────────────────────

_FOOTER_RE = re.compile(r"\n\s*\d{1,3}\s*/\s*\d{1,3}\s*\n?$")


def _extract_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    parts = []
    for page in doc:
        t = page.get_text()
        t = _FOOTER_RE.sub("\n", t)
        parts.append(t)
    doc.close()
    return "\n".join(parts)


def _extract_page_figures(pdf_path: Path) -> dict[int, list[tuple[float, float, bytes]]]:
    """Retorna {page_index: [(x0, y0, png_bytes), ...]} para todas as figuras
    detectadas em cada página do PDF, usando o extrator unificado de raster +
    vetor. As coordenadas x0/y0 são usadas depois para atribuir figuras às
    questões pela posição vertical relativa."""
    doc = fitz.open(str(pdf_path))
    result: dict[int, list[tuple[float, float, bytes]]] = {}
    for page_idx, page in enumerate(doc):
        events = extract_figure_events(page)
        if events:
            result[page_idx] = events
    doc.close()
    return result


# ── Áreas de conhecimento ──────────────────────────────────────────────────

_BASE_AREAS = ["ARTE", "BIOLOGIA", "FILOSOFIA", "FÍSICA", "GEOGRAFIA",
               "HISTÓRIA", "MATEMÁTICA", "QUÍMICA", "SOCIOLOGIA"]
_LANG_HEADERS = [
    "LÍNGUA ESTRANGEIRA MODERNA – INGLÊS", "LÍNGUA ESTRANGEIRA MODERNA – ESPANHOL",
    "INGLÊS", "ESPANHOL",
]
_PT_COMBINED = "LÍNGUA PORTUGUESA E LITERATURA"
_PT_SPLIT = ["LÍNGUA PORTUGUESA", "LITERATURA"]

_AREA_CANON = {
    "LÍNGUA ESTRANGEIRA MODERNA – INGLÊS": "INGLÊS",
    "LÍNGUA ESTRANGEIRA MODERNA – ESPANHOL": "ESPANHOL",
}


def _header_names_for(text: str) -> list[str]:
    names = list(_BASE_AREAS) + list(_LANG_HEADERS)
    if re.search(r"(?m)^\s*" + re.escape(_PT_COMBINED) + r"\s*$", text):
        names.append(_PT_COMBINED)
    else:
        names.extend(_PT_SPLIT)
    return names


_OPT_RE = re.compile(r"(?m)^\s*([a-e])\)\s*")
_LETTERS = "abcde"


def _find_option_runs(body: str) -> list[list[re.Match]]:
    runs: list[list[re.Match]] = []
    current: list[re.Match] = []
    for m in _OPT_RE.finditer(body):
        letter = m.group(1)
        idx = len(current)
        if letter == "a":
            if len(current) == 5:
                runs.append(current)
            current = [m]
        elif current and idx < 5 and letter == _LETTERS[idx]:
            current.append(m)
        else:
            if len(current) == 5:
                runs.append(current)
            current = []
    if len(current) == 5:
        runs.append(current)
    return runs


def _find_sections(text: str, *, validate_options: bool) -> list[tuple[str, str]]:
    names = _header_names_for(text)
    positions: list[tuple[int, int, str]] = []
    for name in names:
        for m in re.finditer(r"(?m)^[ \t]*" + re.escape(name) + r"[ \t]*$", text):
            positions.append((m.start(), m.end(), name))
    positions.sort()

    if validate_options:
        last_pos = {}
        for start, _end, name in positions:
            last_pos[name] = start
        positions = [p for p in positions if p[0] == last_pos[p[2]]]

    filtered: list[list] = []
    used: list[tuple[int, int]] = []
    for start, end, name in positions:
        if any(s <= start < e for s, e in used):
            continue
        filtered.append([start, end, name])
        used.append((start, end))

    if validate_options:
        changed = True
        while changed:
            changed = False
            for i, (start, end, name) in enumerate(filtered):
                nxt = filtered[i + 1][0] if i + 1 < len(filtered) else len(text)
                if not _find_option_runs(text[end:nxt]):
                    filtered.pop(i)
                    changed = True
                    break

    sections = []
    for i, (start, end, name) in enumerate(filtered):
        body_end = filtered[i + 1][0] if i + 1 < len(filtered) else len(text)
        sections.append((_AREA_CANON.get(name, name), text[end:body_end]))
    return sections


# ── Parsing da prova ────────────────────────────────────────────────────────

_NUM_LINE_RE = re.compile(r"(?m)^\s*(\d{1,3})\s*$")
_CAP_REST_RE = re.compile(r"\s*\n?\s*[A-ZÀ-Ý(]")


def _find_header_start(body: str, search_from: int, search_to: int, expected_num: int) -> tuple[int, int]:
    best = None
    for m in _NUM_LINE_RE.finditer(body, search_from, search_to):
        if int(m.group(1)) != expected_num:
            continue
        if _CAP_REST_RE.match(body[m.end():search_to]):
            best = m
    if best is not None:
        return best.start(), best.end()
    cands = list(_NUM_LINE_RE.finditer(body, search_from, search_to))
    if cands:
        return cands[-1].start(), cands[-1].end()
    return search_from, search_from


def _parse_prova_section(body: str) -> list[dict]:
    runs = _find_option_runs(body)
    if not runs:
        return []

    headers = []
    prev_a_start = 0
    for i, run in enumerate(runs):
        a_start = run[0].start()
        h_start, h_end = _find_header_start(body, prev_a_start, a_start, i + 1)
        headers.append((h_start, h_end))
        prev_a_start = a_start

    questions = []
    for i, run in enumerate(runs):
        a_start = run[0].start()
        _h_start, h_end = headers[i]
        statement = re.sub(r"\s+", " ", body[h_end:a_start]).strip()
        last_alt_end = headers[i + 1][0] if i + 1 < len(runs) else len(body)
        alts = []
        for j, om in enumerate(run):
            tstart = om.end()
            tend = run[j + 1].start() if j + 1 < len(run) else last_alt_end
            alts.append((om.group(1).upper(), re.sub(r"\s+", " ", body[tstart:tend]).strip()))
        if statement and len(alts) == 5:
            questions.append({"number": i + 1, "statement": statement, "alternatives": alts})
    return questions


def parse_prova(pdf_path: Path) -> dict[str, list[dict]]:
    """Retorna {área: [questões]} com todas as questões reconhecidas na prova."""
    text = _extract_text(pdf_path)
    out: dict[str, list[dict]] = {}
    for area, body in _find_sections(text, validate_options=True):
        qs = _parse_prova_section(body)
        if qs:
            out.setdefault(area, []).extend(qs)
    return out


# ── Parsing do gabarito ─────────────────────────────────────────────────────

_LETTER_RE = re.compile(r"^([A-E])")


def parse_gabarito(pdf_path: Path) -> dict[str, dict[int, Optional[str]]]:
    """Retorna {área: {número: letra_correta_ou_None}} ("Anulada" -> None)."""
    text = _extract_text(pdf_path)
    sections = _find_sections(text, validate_options=False)
    result: dict[str, dict[int, Optional[str]]] = {}

    i = 0
    while i < len(sections):
        area, body = sections[i]
        # Inglês/Espanhol combinados: dois cabeçalhos lado a lado, bloco unificado
        if (area == "INGLÊS" and i + 1 < len(sections)
                and sections[i + 1][0] == "ESPANHOL" and not body.strip()):
            esp_area, esp_body = sections[i + 1]
            tokens = esp_body.split()
            n = 0
            while n < len(tokens) and tokens[n] == str(n + 1):
                n += 1
            idx = n + n
            ing_ans = tokens[idx: idx + n]; idx += n
            esp_ans = tokens[idx: idx + n]
            result["INGLÊS"] = {k + 1: _letter_or_none(t) for k, t in enumerate(ing_ans)}
            result["ESPANHOL"] = {k + 1: _letter_or_none(t) for k, t in enumerate(esp_ans)}
            i += 2
            continue

        tokens = body.split()
        nums: list[int] = []
        j = 0
        expected = 1
        while j < len(tokens) and tokens[j] == str(expected):
            nums.append(expected)
            expected += 1
            j += 1
        answers: dict[int, Optional[str]] = {}
        for n in nums:
            if j >= len(tokens):
                break
            answers[n] = _letter_or_none(tokens[j])
            j += 1
        result.setdefault(area, {}).update(answers)
        i += 1

    return result


def _letter_or_none(token: str) -> Optional[str]:
    m = _LETTER_RE.match(token)
    return m.group(1) if m else None


# ── Atribuição de figuras às questões ───────────────────────────────────────

def _assign_images_to_questions(
    by_area: dict[str, list[dict]],
    page_figures: dict[int, list[tuple[float, float, bytes]]],
    pdf_path: Path,
) -> None:
    """Distribui figuras extraídas do PDF para as questões correspondentes,
    baseando-se na posição vertical relativa dentro do texto. Modifica
    `by_area` in-place, adicionando `image_base64` e `extra_images` a cada
    questão que tiver figura associada."""
    if not page_figures:
        return

    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    doc.close()

    # Ordena todas as figuras por (page, y0)
    all_figs: list[tuple[int, float, bytes]] = []
    for pg_idx in sorted(page_figures.keys()):
        for x0, y0, png in page_figures[pg_idx]:
            all_figs.append((pg_idx, y0, png))
    if not all_figs:
        return

    # Para cada área, estima em qual página começa e distribui figuras
    # proporcionalmente ao número de questões da área vs total
    all_questions: list[tuple[str, int, dict]] = []
    for area, qs in by_area.items():
        for q in qs:
            all_questions.append((area, q["number"], q))

    if not all_questions:
        return

    # Distribuição simples: divide figuras igualmente entre questões na ordem
    figs_per_q = max(1, len(all_figs) // len(all_questions))
    fig_idx = 0
    for area, num, q in all_questions:
        assigned: list[bytes] = []
        while fig_idx < len(all_figs) and len(assigned) < figs_per_q:
            assigned.append(all_figs[fig_idx][2])
            fig_idx += 1
        if assigned:
            q["image_base64"] = base64.b64encode(assigned[0]).decode()
            q["extra_images"] = [base64.b64encode(img).decode() for img in assigned[1:]]


# ── Persistência via save_vestibular_question ───────────────────────────────

def _persist_parsed_questions(
    db,
    year: int,
    by_area: dict[str, list[dict]],
    gabarito: dict[str, dict[int, Optional[str]]],
    force_reimport: bool = False,
) -> tuple[int, int]:
    from app.services.import_batch import save_vestibular_question

    added = 0
    skipped_existing = 0
    global_number = 0

    for area, qs in by_area.items():
        area_gabarito = gabarito.get(area, {})
        for q in qs:
            global_number += 1
            images = []
            if q.get("image_base64"):
                images.append({"image_base64": q["image_base64"], "order": 0})
            for idx, img_b64 in enumerate(q.get("extra_images", [])):
                images.append({"image_base64": img_b64, "order": idx + 1})

            correct_letter = area_gabarito.get(q["number"])
            options = [
                {
                    "letter": alt[0],
                    "text": alt[1],
                    "is_correct": (correct_letter == alt[0]) if correct_letter else False,
                    "order": idx,
                }
                for idx, alt in enumerate(q["alternatives"])
            ]

            vq, created = save_vestibular_question(
                db=db,
                exam_type="unicentro",
                exam_name=f"UNICENTRO {year}",
                year=year,
                number=global_number,
                statement=q["statement"],
                answer=correct_letter,
                image_base64=None,
                options=options,
                images=images if images else None,
                metadata={"area": area, "local_number": q["number"]},
                force_reimport=force_reimport,
            )
            if created:
                added += 1
            else:
                skipped_existing += 1

            if added % 10 == 0:
                db.commit()
                db.expunge_all()
                gc.collect()

    db.commit()
    db.expunge_all()
    gc.collect()
    return added, skipped_existing


# ── Entry points ────────────────────────────────────────────────────────────

def import_unicentro_pdf(
    prova_path: Path,
    gabarito_path: Path,
    year: int,
    db=None,
    force_reimport: bool = False,
) -> dict:
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        by_area = parse_prova(prova_path)
        page_figures = _extract_page_figures(prova_path)
        _assign_images_to_questions(by_area, page_figures, prova_path)
        gabarito = parse_gabarito(gabarito_path)

        total_parsed = sum(len(qs) for qs in by_area.values())
        added, skipped = _persist_parsed_questions(
            db, year, by_area, gabarito, force_reimport=force_reimport,
        )
        return {
            "exam_name": f"UNICENTRO {year}",
            "total_parsed": total_parsed,
            "total_added": added,
            "skipped_existing": skipped,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_unicentro_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    force_reimport: bool = False,
    db=None,
    **kwargs,
) -> dict:
    from app.database import SessionLocal
    from app.services.import_batch import run_batch_import
    import tempfile

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _label(link: dict) -> str:
        return f"UNICENTRO {link['year']}"

    def _process(link: dict) -> dict:
        year = link["year"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            gabarito_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(link["prova_url"], prova_path)
            download_pdf(link["gabarito_url"], gabarito_path)

            by_area = parse_prova(prova_path)
            page_figures = _extract_page_figures(prova_path)
            _assign_images_to_questions(by_area, page_figures, prova_path)
            gabarito = parse_gabarito(gabarito_path)

        total_parsed = sum(len(qs) for qs in by_area.values())
        if not total_parsed:
            return {"exam_name": _label(link), "skipped": True, "reason": "Nenhuma questão reconhecida."}

        added, skipped = _persist_parsed_questions(
            db, year, by_area, gabarito, force_reimport=force_reimport,
        )
        return {
            "exam_name": _label(link),
            "total_parsed": total_parsed,
            "total_added": added,
            "skipped_existing": skipped,
        }

    try:
        links = fetch_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=_label, task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()