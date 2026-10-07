"""Importa questões da UDESC (Universidade do Estado de Santa Catarina) direto
do site oficial (udesc.br/vestibular/provasanteriores), sem depender de
arquivo local.

Cada edição (ano.semestre) publica DUAS provas verdadeiramente distintas —
não variantes embaralhadas da mesma prova, mas conteúdo diferente — uma
aplicada de manhã ("Matutino": Matemática, Biologia, Língua Estrangeira,
Língua Portuguesa e Literatura Brasileira) e outra à tarde ("Vespertino":
Física, Química, História, Geografia). As duas têm numeração própria 1-50 e
compartilham um único PDF de gabarito, organizado em colunas por matéria
("Período Matutino" / "Período Vespertino").

A seção de Língua Estrangeira (Inglês OU Espanhol, à escolha do candidato)
reaproveita a mesma faixa de números do gabarito (normalmente 29-36), mas o
PDF da prova só imprime o idioma que a UDESC arquivou naquela edição — o
marcador da questão nessa seção usa a palavra "Question" (inglês) ou
"Pregunta" (espanhol) em vez de "Questão" (português). Isso é o que permite
casar cada questão com a coluna certa do gabarito, sem precisar adivinhar.

O formato do PDF mudou por volta de 2024: os cadernos passaram a ser
gerados de um jeito que não expõe texto extraível (nem imagem simples) para
as questões — só cabeçalho/rodapé têm texto real, o resto é vetor puro. Não
reconhecido por este parser (ver `_MIN_QUESTIONS`): detectado automaticamente
e pulado, sem travar o lote.
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
_INDEX_URL = "https://www.udesc.br/vestibular/provasanteriores"

_PARA_RE = re.compile(r"<p[^>]*>(.*?)</p>", re.I | re.S)
_LINK_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)
_YEAR_SEM_RE = re.compile(r"(20\d{2})\s*[-_.]\s*0?([12])\b")


def fetch_udesc_editions() -> list[dict]:
    """Varre a página de provas anteriores e retorna uma edição por
    ano.semestre: {year, semester, matutino_url, vespertino_url, gabarito_url}
    (as três chaves de URL são opcionais — algumas edições antigas podem não
    ter todos os três documentos)."""
    resp = requests.get(_INDEX_URL, timeout=30, headers=_HEADERS)
    resp.raise_for_status()

    editions: dict[tuple[int, int], dict] = {}
    for para in _PARA_RE.findall(resp.text):
        text_only = re.sub(r"<[^>]+>", " ", para)
        text_only = re.sub(r"&nbsp;", " ", text_only)
        m = _YEAR_SEM_RE.search(text_only)
        if not m:
            continue
        year, semester = int(m.group(1)), int(m.group(2))

        urls: dict[str, str] = {}
        for href, atext in _LINK_RE.findall(para):
            clean = re.sub(r"<[^>]+>", " ", atext)
            clean = re.sub(r"\s+", " ", clean).strip().lower()
            if "matutin" in clean:
                urls.setdefault("matutino_url", href)
            elif "vespertin" in clean:
                urls.setdefault("vespertino_url", href)
            elif "gabarito" in clean:
                urls.setdefault("gabarito_url", href)

        if "matutino_url" not in urls and "vespertino_url" not in urls:
            continue
        key = (year, semester)
        editions.setdefault(key, {"year": year, "semester": semester}).update(urls)

    return [editions[k] for k in sorted(editions.keys(), reverse=True)]


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=90, headers=_HEADERS)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Gabarito ─────────────────────────────────────────────────────────────────
#
# O PDF do gabarito lista, por turno ("Período Matutino" / "Período
# Vespertino"), N cabeçalhos de matéria seguidos de linhas "Nª Questão
# (LETRA)" repetidas em grupos de N (uma por matéria, na mesma ordem dos
# cabeçalhos) — mesmo princípio de leitura posicional já usado nos
# importadores de ACAFE/FUVEST, só que aqui os "rótulos" são nomes de
# matéria em vez de versões de caderno.

_KNOWN_SUBJECTS = [
    "Língua Portuguesa e Literatura Brasileira",
    "Língua Portuguesa",
    "Literatura Brasileira",
    "Literatura",
    "Português",
    "Matemática", "Física", "Química", "Biologia", "História", "Geografia",
    "Filosofia", "Sociologia", "Inglês", "Espanhol", "Francês", "Alemão",
]
_SUBJECT_ALT_RE = re.compile(
    "|".join(re.escape(s) for s in sorted(_KNOWN_SUBJECTS, key=len, reverse=True)),
    re.I,
)
_NEW_ENTRY_RE = re.compile(r"(\d{1,3})ª?\s*Quest[ãa]o\s*\(([^)]*)\)", re.I)
_OLD_ENTRY_RE = re.compile(r"(\d{1,3})\.\s*(Anulada|[A-E])\b", re.I)
# Formato tabular (2024.2+): sem parênteses nem ponto, "N\nLETRA\n" — cada
# número e letra numa linha própria (colunas "Questão"/"Alternativa" lado a
# lado no PDF, mas o texto extraído vem linearizado linha a linha).
_TABULAR_ENTRY_RE = re.compile(r"(\d{1,3})\s*\n\s*(Anulada|[A-E])\b", re.I)

# Faixas de número por matéria — usadas só como fallback pro formato antigo
# de gabarito (sequencial "NN. LETRA", sem agrupar por coluna, então não dá
# pra saber onde uma matéria termina e a próxima começa só pelo texto).
# Validado idêntico em edições de 2019 e 2024 (5 anos de intervalo, dois
# formatos de PDF diferentes) — assumido estável no período coberto.
_RANGES: dict[str, list[tuple[int, int, str, Optional[str]]]] = {
    "Matutino": [
        (1, 14, "Matemática", None),
        (15, 28, "Biologia", None),
        (29, 36, "Língua Estrangeira", "Inglês"),
        (29, 36, "Língua Estrangeira", "Espanhol"),
        (37, 50, "Língua Portuguesa e Literatura Brasileira", None),
    ],
    "Vespertino": [
        (1, 14, "Física", None),
        (15, 28, "Química", None),
        (29, 39, "História", None),
        (40, 50, "Geografia", None),
    ],
}

_SHIFT_MARKER_RE = re.compile(r"\b(Matutino|Manh[ãa]|Vespertino|Tarde)\b", re.I)
_SHIFT_NAME = {"matutino": "Matutino", "manha": "Matutino", "vespertino": "Vespertino", "tarde": "Vespertino"}


_LANGUAGE_NAMES = {"inglês": "Inglês", "espanhol": "Espanhol", "francês": "Francês", "alemão": "Alemão"}


def _classify_subject(name: str) -> tuple[str, Optional[str]]:
    """(área, idioma) a partir do nome da matéria no cabeçalho do gabarito."""
    low = name.lower()
    if low in _LANGUAGE_NAMES:
        return "Língua Estrangeira", _LANGUAGE_NAMES[low]
    if low == "português":
        return "Língua Portuguesa e Literatura Brasileira", None
    return name, None


def _range_lookup(shift: str, number: int, occurrence_index: int) -> tuple[Optional[str], Optional[str]]:
    candidates = [r for r in _RANGES.get(shift, []) if r[0] <= number <= r[1]]
    if not candidates:
        return None, None
    idx = min(occurrence_index, len(candidates) - 1)
    _, _, area, language = candidates[idx]
    return area, language


def _parse_gabarito_section(section_text: str, shift: str) -> dict[tuple[int, Optional[str]], tuple[Optional[str], str]]:
    """Retorna {(número, idioma): (letra_ou_None, área)} de UMA seção
    (Matutino ou Vespertino) do gabarito. Tenta primeiro o formato novo
    (entradas "Nª Questão (LETRA)" agrupadas por coluna de matéria, ~2023+);
    se não encontrar, cai pro formato antigo (entradas sequenciais "NN.
    LETRA", sem agrupamento — usa `_RANGES` pra saber a matéria)."""
    new_entries = _NEW_ENTRY_RE.findall(section_text)
    if new_entries:
        first_entry = _NEW_ENTRY_RE.search(section_text)
        header_text = re.sub(r"\s+", " ", section_text[: first_entry.start()]).strip()
        subjects = _SUBJECT_ALT_RE.findall(header_text)
        if subjects:
            n = len(subjects)
            result: dict[tuple[int, Optional[str]], tuple[Optional[str], str]] = {}
            for i, (num_s, val) in enumerate(new_entries):
                area, language = _classify_subject(subjects[i % n])
                num = int(num_s)
                val = val.strip()
                letter = None if not val or "anulad" in val.lower() else val.upper()[0]
                result[(num, language)] = (letter, area)
            return result

    entries = _OLD_ENTRY_RE.findall(section_text)
    if not entries:
        entries = _TABULAR_ENTRY_RE.findall(section_text)
    return _entries_to_result(entries, shift)


def _entries_to_result(
    entries: list[tuple[str, str]], shift: str
) -> dict[tuple[int, Optional[str]], tuple[Optional[str], str]]:
    """Formato sequencial "NN. LETRA" ou tabular "NN\\nLETRA" (sem
    agrupamento por coluna no texto) — usa `_RANGES` pra saber a matéria, com
    contagem de ocorrência pra distinguir colunas repetidas (ex.: Inglês vs.
    Espanhol, ambos na faixa 29-36)."""
    result = {}
    occurrence_count: dict[int, int] = {}
    for num_s, val in entries:
        num = int(num_s)
        idx = occurrence_count.get(num, 0)
        occurrence_count[num] = idx + 1
        area, language = _range_lookup(shift, num, idx)
        if area is None:
            continue
        letter = None if "anulad" in val.lower() else val.upper()
        result[(num, language)] = (letter, area)
    return result


def _split_by_shift_marker(full_text: str) -> dict[str, str]:
    """Formato clássico (até 2024.1): o marcador de turno vem ANTES dos
    dados de cada seção. O texto que anuncia cada turno mudou de "Prova
    Manhã" (2015) pra "Prova do Período Matutino/Vespertino" (anos
    seguintes) — em vez de depender da frase inteira, procura direto pelas
    palavras Matutino/Manhã/Vespertino/Tarde em qualquer lugar do texto e
    fatia entre uma ocorrência e a próxima."""
    matches = list(_SHIFT_MARKER_RE.finditer(full_text))
    sections: dict[str, str] = {}
    for i, m in enumerate(matches):
        key = m.group(1).lower().replace("ã", "a")
        shift = _SHIFT_NAME.get(key)
        if not shift or shift in sections:
            continue
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        sections[shift] = full_text[start:end]
    return sections


def _split_tabular_entries(full_text: str) -> dict[str, list[tuple[str, str]]]:
    """Formato tabular (2024.2+): o marcador de turno só aparece no rodapé,
    depois de todos os dados — inútil pra fatiar. O texto do cabeçalho de
    coluna também não é estável entre edições ("Questão/Alternativa",
    "Questão/14 Questões", "Questão/14" sem rótulo...), então em vez de
    cortar por cabeçalho, corta pela posição: a questão 1 é sempre a
    primeira entrada de CADA bloco (Matutino depois Vespertino, mesma ordem
    do formato clássico), então a 2ª ocorrência do número 1 na sequência
    global de entradas marca onde o bloco Vespertino começa."""
    entries = _TABULAR_ENTRY_RE.findall(full_text)
    ones = [i for i, (num_s, _) in enumerate(entries) if num_s == "1"]
    if len(ones) < 2:
        return {}
    split = ones[1]
    return {"Matutino": entries[:split], "Vespertino": entries[split:]}


def parse_udesc_gabarito(pdf_path: Path) -> dict[str, dict[tuple[int, Optional[str]], tuple[Optional[str], str]]]:
    """Retorna {"Matutino": {...}, "Vespertino": {...}}, cada valor mapeado
    como em `_parse_gabarito_section`."""
    doc = fitz.open(str(pdf_path))
    full_text = "\n".join(p.get_text() for p in doc)
    doc.close()

    sections = _split_by_shift_marker(full_text)
    result = {shift: _parse_gabarito_section(text, shift) for shift, text in sections.items()}
    if not result.get("Matutino") or not result.get("Vespertino"):
        tabular_entries = _split_tabular_entries(full_text)
        for shift, entries in tabular_entries.items():
            if not result.get(shift):
                result[shift] = _entries_to_result(entries, shift)

    return result


# ── Prova ────────────────────────────────────────────────────────────────────
#
# Marcador de questão: "Questão NN" (português), "Question NN" (seção de
# língua estrangeira em inglês) ou "Pregunta NN" (em espanhol) — a própria
# palavra usada já identifica o idioma da seção de língua estrangeira, sem
# precisar de heurística separada. Alternativas: "A. (  ) texto".

_Q_MARK_RE = re.compile(r"^(Quest[ãa]o|Question|Pregunta)\s*0?(\d{1,3})\b", re.I)
_OPT_LINE_RE = re.compile(r"^([A-E])\.\s*\(\s*\)\s*(.*)$")
_MARKER_LANGUAGE = {"question": "Inglês", "pregunta": "Espanhol"}


def parse_udesc_pdf(pdf_path: Path) -> list[dict]:
    """Parseia UMA prova (um turno) e retorna a lista de questões:
    {number, language, statement, options: [(letra, texto)], images,
    image_base64}."""
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

                m_q = _Q_MARK_RE.match(text)
                if m_q:
                    language = _MARKER_LANGUAGE.get(m_q.group(1).lower())
                    events.append((pno, y, "q", (int(m_q.group(2)), language)))
                    continue

                m_opt = _OPT_LINE_RE.match(text)
                if m_opt:
                    events.append((pno, y, "opt", (m_opt.group(1), m_opt.group(2))))
                    continue

                events.append((pno, y, "text", text))

        for y, xref in _page_content_images(page):
            events.append((pno, y, "img", xref))

    events.sort(key=lambda e: (e[0], e[1]))

    questions: list[dict] = []
    cur: Optional[dict] = None
    images_by_key: dict[tuple[int, Optional[str]], list[str]] = {}
    seen_xref: set[int] = set()

    def flush():
        nonlocal cur
        if cur is None:
            return
        opts = cur["options"]
        if len(opts) >= 5:
            seen: set[str] = set()
            built: list[tuple[str, str]] = []
            for letter, lines in opts:
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
                    "language": cur["language"],
                    "statement": statement,
                    "options": built[:5],
                })
        cur = None

    for pno, _y, kind, val in events:
        if kind == "q":
            flush()
            num, language = val
            cur = {"number": num, "language": language, "statement_lines": [], "options": []}
            continue

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
                    key = (cur["number"], cur["language"])
                    images_by_key.setdefault(key, []).append(data_url)
            continue

        # texto comum
        if cur is None:
            continue
        if cur["options"]:
            cur["options"][-1][1].append(val)
        else:
            cur["statement_lines"].append(val)

    flush()

    for q in questions:
        imgs = images_by_key.get((q["number"], q["language"]), [])
        q["images"] = imgs
        q["image_base64"] = imgs[0] if imgs else None

    doc.close()
    return questions


# ── Persistência ─────────────────────────────────────────────────────────────

_MIN_QUESTIONS = 15  # abaixo disso, provável falha de parsing (ver docstring do módulo)


def run_migrations_udesc(conn):
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS udesc_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            shift VARCHAR(20),
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
        CREATE TABLE IF NOT EXISTS udesc_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES udesc_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS udesc_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES udesc_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


def _merge_gabarito(parsed: list[dict], section: dict) -> None:
    for q in parsed:
        entry = section.get((q["number"], q["language"]))
        if entry is None:
            continue
        letter, area = entry
        q["correct"] = letter
        q["area"] = area


def import_udesc_shift(db, year: int, semester: int, shift: str, prova_url: str, gabarito_map: dict) -> dict:
    from app.services.import_batch import save_vestibular_question

    exam_name = f"UDESC {year}.{semester} – {shift}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "prova.pdf"
        download_pdf(prova_url, pdf_path)
        parsed = parse_udesc_pdf(pdf_path)

    if len(parsed) < _MIN_QUESTIONS:
        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": 0,
            "skipped": True,
            "reason": f"Só {len(parsed)} questões reconhecidas (provável falha de parsing nesse formato de PDF)",
        }

    _merge_gabarito(parsed, gabarito_map.get(shift, {}))

    added = 0
    skipped_existing = 0
    seen: set[tuple[int, Optional[str]]] = set()
    for q in parsed:
        key = (q["number"], q["language"])
        if key in seen:
            continue
        seen.add(key)

        correct = q.get("correct")
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
            "semester": semester,
            "shift": shift,
            "area": q.get("area"),
            "language": q["language"],
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="udesc",
            exam_name=exam_name,
            year=year,
            number=q["number"],
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


def import_udesc_edition(db, edition: dict) -> list[dict]:
    """Importa as provas dos turnos disponíveis (Matutino e/ou Vespertino —
    são DIFERENTES, não variantes, então as duas são importadas) de uma
    edição. Cada turno é tentado de forma independente."""
    year, semester = edition["year"], edition["semester"]

    gabarito_map: dict = {}
    if edition.get("gabarito_url"):
        with tempfile.TemporaryDirectory() as tmp_dir:
            gab_path = Path(tmp_dir) / "gabarito.pdf"
            try:
                download_pdf(edition["gabarito_url"], gab_path)
                gabarito_map = parse_udesc_gabarito(gab_path)
            except Exception:
                gabarito_map = {}  # best-effort: importa as provas mesmo sem gabarito

    results = []
    for shift, url_key in (("Matutino", "matutino_url"), ("Vespertino", "vespertino_url")):
        if not edition.get(url_key):
            continue
        try:
            results.append(import_udesc_shift(db, year, semester, shift, edition[url_key], gabarito_map))
        except Exception as e:
            db.rollback()
            results.append({
                "exam_name": f"UDESC {year}.{semester} – {shift}",
                "skipped": True,
                "reason": str(e),
            })
    return results


def import_all_udesc_exams(since_year: int = 2015, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as provas da UDESC listadas em
    udesc.br/vestibular/provasanteriores, uma edição (ano.semestre) de cada
    vez. Cada edição tem até 2 turnos (Matutino/Vespertino — provas
    DIFERENTES, ambas importadas) e um gabarito único compartilhado.

    Formato do PDF mudou por volta de 2024 pra um que não expõe texto
    extraível — detectado automaticamente (menos de ~15 questões
    reconhecidas) e pulado, reportado sem travar o lote. Algumas edições
    entre 2020-2 e 2023-1 não existem (hiato, provavelmente pandemia)."""
    from app.database import SessionLocal, engine

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with engine.begin() as conn:
            run_migrations_udesc(conn)
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    try:
        editions = fetch_udesc_editions()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a listagem de edições: {e}")

    editions = [
        e for e in editions
        if (since_year is None or e["year"] >= since_year) and (until_year is None or e["year"] <= until_year)
    ]

    results = []
    total_added = 0
    try:
        for edition in editions:
            for r in import_udesc_edition(db, edition):
                results.append({"year": edition["year"], "semester": edition["semester"], **r})
                total_added += r.get("total_added", 0)

        return {"total_added": total_added, "exams": results}
    finally:
        if close_after:
            db.close()
