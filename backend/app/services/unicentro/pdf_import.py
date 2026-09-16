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

Persistência via SQLAlchemy nos modelos `UnicentroQuestion`/
`UnicentroQuestionOption` (app/models.py). Como o modelo original não tinha
campo de área (só year/number/statement), foi adicionado `area` (nullable,
com migração incremental própria em `run_migrations_unicentro`, no mesmo
molde de `run_migrations_ufpr`) — sem ele, o campo `number` sozinho colidiria
entre áreas diferentes de um mesmo ano (ex.: questão 1 de Biologia e questão 1
de Química).
"""

import gc
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests

from app.models import UnicentroQuestion, UnicentroQuestionOption
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

    # Anos recentes (~2016+) rotulam a linha só com o ano ("2022"); anos mais
    # antigos (até ~2015), quando havia duas edições por ano, rotulam com
    # "1º – 2015"/"2º – 2015" (en-dash como entidade HTML). Extrai o ano dos
    # dois formatos; quando duas linhas caem no mesmo ano (1º e 2º semestre),
    # a segunda é descartada aqui (`seen`) — o modelo não distingue semestre,
    # então importar as duas geraria uma tentativa de reimportar o mesmo ano.
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


# ── Extração de texto ─────────────────────────────────────────────────────

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


# ── Áreas de conhecimento ──────────────────────────────────────────────────

_BASE_AREAS = ["ARTE", "BIOLOGIA", "FILOSOFIA", "FÍSICA", "GEOGRAFIA",
               "HISTÓRIA", "MATEMÁTICA", "QUÍMICA", "SOCIOLOGIA"]
_LANG_HEADERS = [
    "LÍNGUA ESTRANGEIRA MODERNA – INGLÊS", "LÍNGUA ESTRANGEIRA MODERNA – ESPANHOL",
    "INGLÊS", "ESPANHOL",
]
_PT_COMBINED = "LÍNGUA PORTUGUESA E LITERATURA"
_PT_SPLIT = ["LÍNGUA PORTUGUESA", "LITERATURA"]

# Cabeçalhos "LÍNGUA ESTRANGEIRA MODERNA – INGLÊS/ESPANHOL" (usados na prova)
# viram só "INGLÊS"/"ESPANHOL" para casar com o nome usado no gabarito.
_AREA_CANON = {
    "LÍNGUA ESTRANGEIRA MODERNA – INGLÊS": "INGLÊS",
    "LÍNGUA ESTRANGEIRA MODERNA – ESPANHOL": "ESPANHOL",
}


def _header_names_for(text: str) -> list[str]:
    """Português+Literatura vem combinado numa área só ("LÍNGUA PORTUGUESA E
    LITERATURA", usado de ~2022 em diante) ou como duas áreas separadas
    ("LÍNGUA PORTUGUESA" + "LITERATURA", usado em 2021 e anos anteriores) —
    detecta qual formato o documento usa e evita tratar "LITERATURA" como
    cabeçalho de área própria quando na verdade é só uma sub-seção da área
    combinada (ex.: 2026, onde "LITERATURA" aparece no meio da área "LÍNGUA
    PORTUGUESA E LITERATURA" introduzindo a 2ª metade das questões)."""
    names = list(_BASE_AREAS) + list(_LANG_HEADERS)
    if re.search(r"(?m)^\s*" + re.escape(_PT_COMBINED) + r"\s*$", text):
        names.append(_PT_COMBINED)
    else:
        names.extend(_PT_SPLIT)
    return names


_OPT_RE = re.compile(r"(?m)^\s*([a-e])\)\s*")
_LETTERS = "abcde"


def _find_option_runs(body: str) -> list[list[re.Match]]:
    """Sequências completas a),b),c),d),e) em ordem estrita — âncora
    inequívoca de "aqui há uma questão real", ao contrário de uma linha com
    um número sozinho (que também aparece em textos de apoio numerados e em
    entradas de matrizes)."""
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
    """Divide o texto em (área_canônica, corpo) usando os cabeçalhos de área.

    `validate_options=True` (prova): descarta ocorrências espúrias de um
    cabeçalho (ex.: o nome de uma área citado numa página de capa/instruções,
    antes do conteúdo real) exigindo que exista pelo menos uma sequência
    a)-e) completa antes do próximo cabeçalho — e, entre ocorrências
    duplicadas do mesmo nome, mantém só a última (a real é sempre a mais
    tardia; menções em capa/sumário vêm antes do conteúdo).
    `validate_options=False` (gabarito): não há alternativas lettered no
    gabarito, então essa validação não se aplica.
    """
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
    """Acha a linha "<expected_num>" (dentro de [search_from, search_to)) que
    é seguida de uma letra maiúscula (início de frase) — é a assinatura de um
    cabeçalho de questão real, ao contrário de números de linha de apoio
    (seguidos por continuação de frase em minúscula) ou de entradas de
    matriz. Se nenhuma bater com essa assinatura, usa a última ocorrência de
    qualquer número como fallback best-effort."""
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
        # Inglês/Espanhol: cabeçalhos adjacentes sem corpo entre eles, seguidos
        # de um bloco combinado (números de Inglês, números de Espanhol
        # repetidos, respostas de Inglês, respostas de Espanhol).
        if area == "INGLÊS" and i + 1 < len(sections) and sections[i + 1][0] == "ESPANHOL" and not body.strip():
            esp_area, esp_body = sections[i + 1]
            tokens = esp_body.split()
            n = 0
            while n < len(tokens) and tokens[n] == str(n + 1):
                n += 1
            idx = n + n  # pula as duas listas de números (Inglês e Espanhol)
            ing_ans = tokens[idx: idx + n]; idx += n
            esp_ans = tokens[idx: idx + n]
            result["INGLÊS"] = {k + 1: _letter_or_none(t) for k, t in enumerate(ing_ans)}
            result["ESPANHOL"] = {k + 1: _letter_or_none(t) for k, t in enumerate(esp_ans)}
            i += 2
            continue

        tokens = body.split()
        nums = []
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
    return m.group(1) if m else None  # None cobre "Anulada" e afins


# ── Persistência ────────────────────────────────────────────────────────────

def run_migrations_unicentro(conn) -> None:
    """Cria as tabelas UNICENTRO caso não existam e garante a coluna `area`
    (adicionada depois da criação inicial do modelo) via ALTER incremental —
    mesmo molde de `run_migrations_ufpr`."""
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS unicentro_questions (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """))
    conn.execute(text("ALTER TABLE unicentro_questions ADD COLUMN IF NOT EXISTS area VARCHAR(100)"))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS unicentro_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES unicentro_questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_unicentro_questions_year ON unicentro_questions (year)"
    ))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_unicentro_question_options_question_id "
        "ON unicentro_question_options (question_id)"
    ))


def _persist_year(db, year: int, by_area: dict[str, list[dict]], gabarito: dict[str, dict[int, Optional[str]]]) -> dict:
    added = 0
    skipped_no_answer = 0
    for area, questions in by_area.items():
        area_answers = gabarito.get(area, {})
        for q in questions:
            correct = area_answers.get(q["number"])
            if correct is None:
                # sem gabarito pra essa questão (não localizado, ou anulada) —
                # não dá pra saber a resposta certa, então não persiste.
                skipped_no_answer += 1
                continue
            question = UnicentroQuestion(
                year=year,
                number=q["number"],
                area=area,
                statement=q["statement"],
            )
            db.add(question)
            db.flush()
            for order, (letter, text_) in enumerate(q["alternatives"]):
                db.add(UnicentroQuestionOption(
                    question_id=question.id,
                    text=text_,
                    is_correct=(letter == correct),
                    order=order,
                ))
            added += 1
    db.commit()
    return {"total_added": added, "skipped_no_answer": skipped_no_answer}


def import_unicentro_year(db, year: int, prova_url: str, gabarito_url: str) -> dict:
    """Importa a prova de um único ano (prova + gabarito já resolvidos)."""
    import tempfile

    already = db.query(UnicentroQuestion).filter(UnicentroQuestion.year == year).count()
    if already > 0:
        return {"year": year, "total_parsed": 0, "total_added": 0, "skipped_existing": already}

    with tempfile.TemporaryDirectory() as tmp_dir:
        prova_path = Path(tmp_dir) / "prova.pdf"
        gabarito_path = Path(tmp_dir) / "gabarito.pdf"
        download_pdf(prova_url, prova_path)
        download_pdf(gabarito_url, gabarito_path)

        by_area = parse_prova(prova_path)
        gabarito = parse_gabarito(gabarito_path)

    total_parsed = sum(len(v) for v in by_area.values())
    if not total_parsed:
        return {
            "year": year,
            "total_parsed": 0,
            "total_added": 0,
            "skipped": True,
            "reason": "Nenhuma questão reconhecida (provável formato de PDF antigo/incompatível — "
                      "confirmado em 2020: layout com caixas de texto fora de ordem de leitura).",
        }

    result = _persist_year(db, year, by_area, gabarito)
    return {
        "year": year,
        "total_parsed": total_parsed,
        "areas": {a: len(v) for a, v in by_area.items()},
        **result,
    }


def import_all_unicentro_exams(since_year: Optional[int] = None, until_year: Optional[int] = None,
                                db=None, task_id: Optional[str] = None, **kwargs) -> dict:
    """Importa TODAS as provas da UNICENTRO listadas em
    unicentro.br/vestibular/anteriores/, uma a uma. Cada ano é tentado de
    forma independente — link fora do ar, PDF em formato não reconhecido, ou
    ano já importado não interrompem o lote, só são reportados."""
    from app.database import SessionLocal, engine

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with engine.begin() as conn:
            run_migrations_unicentro(conn)
    except Exception as e:
        if close_after:
            db.close()
        if task_id:
            fail_task(task_id, f"Falha ao criar tabelas: {e}")
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    try:
        links = fetch_exam_links()
    except Exception as e:
        if close_after:
            db.close()
        if task_id:
            fail_task(task_id, f"Falha ao acessar a página de provas anteriores: {e}")
        return {"error": f"Falha ao acessar a página de provas anteriores: {e}"}

    if since_year:
        links = [l for l in links if l["year"] >= since_year]
    if until_year:
        links = [l for l in links if l["year"] <= until_year]
    links.sort(key=lambda l: -l["year"])

    results = []
    total_added = 0
    try:
        for idx, link in enumerate(links):
            year = link["year"]
            try:
                r = import_unicentro_year(db, year, link["prova_url"], link["gabarito_url"])
            except Exception as e:
                db.rollback()
                r = {"year": year, "skipped": True, "reason": str(e)}
            results.append(r)
            total_added += r.get("total_added", 0)
            db.expunge_all()
            gc.collect()
            if task_id:
                update_task_progress(task_id, current=idx + 1, total=len(links),
                                      log=f"UNICENTRO {year}: {r.get('total_added', 0)} questões adicionadas"
                                          if not r.get("skipped") else f"UNICENTRO {year}: pulado ({r.get('reason')})")

        summary = {"status": "success", "total_links_found": len(links), "total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, summary)
        return summary
    finally:
        if close_after:
            db.close()
