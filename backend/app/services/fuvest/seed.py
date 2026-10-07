from __future__ import annotations

"""Importa questões da FUVEST (1ª fase do vestibular da USP) direto do site
oficial (fuvest.br/acervo-vestibular-{ano}), sem depender de arquivo local.

A 1ª fase é sempre multidisciplinar ("Prova de Conhecimentos Gerais"), sem
cabeçalhos de matéria no texto — a área é inferida por palavra-chave,
reaproveitando a mesma heurística já usada pela UFPR (`_infer_area`).

Cada edição publica o caderno em 1 ou mais "versões" (cadernos embaralhados
com as mesmas questões em ordem diferente — ex.: V1-V4 nos anos recentes,
V/K/Q/X/Z em anos mais antigos). Importamos só a PRIMEIRA versão listada na
página (rotulada a partir do texto do link, ex. "Prova 2026 V1" → "V1";
"Prova V" → "V"); as demais têm o mesmo conteúdo, from app.services.progress import update_task_progress, complete_task, fail_task
import gc
importar todas seria
duplicata.

O gabarito vem sempre separado (não há "comentada" com resposta destacada
como na ACAFE/PUCPR). O layout do PDF de gabarito é uma tabela por versão,
lida por posição: um cabeçalho "PROVA {label}" por versão (nessa ordem), e
depois os dados em grupos de 4 tokens (número, letra, número+45, letra) por
versão, repetidos por linha — ver `_parse_gabarito`. Confirmado idêntico em
2015 (rótulos V/K/Q/X/Z) e 2020/2026 (V/K/Q/X/Z ou V1-V4), apesar do
separador entre número e letra mudar de "‐" (2015) para quebra de linha
(2020+) — a extração por posição de token não depende desse detalhe.

Segunda fase (discursiva), simulados e provas de treineiros são ignorados —
só a 1ª fase objetiva (múltipla escolha A-E) entra no banco de questões.
"""


import re
import unicodedata
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.ufpr.seed import _infer_area, _xref_to_dataurl


def _page_content_images_xy(page) -> list[tuple[float, float, int]]:
    """[(x0, y0, xref)] das imagens de conteúdo da página (sem fundos/logos).
    Como `_page_content_images` da UFPR, mas também com x0 — necessário pra
    saber em qual coluna (esquerda/direita) a imagem está."""
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

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_INDEX_URL = "https://www.fuvest.br/acervo-vestibular"
_LINK_RE = re.compile(r'<a\b[^>]*href="([^"]+\.pdf)"[^>]*>(.*?)</a>', re.I | re.S)

# Palavras (sem separadores) que indicam 1ª fase, vs. as que indicam outra
# coisa (2ª fase, simulado, treineiro, locais de prova etc.) — a distinção
# entre 1ª/2ª fase normalmente só existe no HREF, não no texto do link (que
# costuma ser só "Prova").
_PHASE1_MARKERS = ("1fase", "fase1", "primeirafase")
_EXCLUDE_MARKERS = ("2fase", "fase2", "segundafase", "simulado", "treineiro", "locais", "correspond")


def _normalize(s: str) -> str:
    return re.sub(r"[_\-\s]", "", s.lower())


def fetch_fuvest_years() -> list[int]:
    """Varre a página-índice do acervo e retorna os anos disponíveis."""
    resp = requests.get(_INDEX_URL, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    return sorted({int(y) for y in re.findall(r"acervo-vestibular-(\d{4})", resp.text)})


def fetch_fuvest_edition(year: int) -> Optional[dict]:
    """Varre a página de um ano e retorna {prova_url, gabarito_url, version}
    da 1ª fase objetiva, ou None se não encontrado (ano sem prova publicada
    nesse formato, ou página fora do ar)."""
    resp = requests.get(f"https://www.fuvest.br/acervo-vestibular-{year}", timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    html = resp.text

    prova_url: Optional[str] = None
    prova_label: Optional[str] = None
    gabarito_url: Optional[str] = None

    for href, raw_text in _LINK_RE.findall(html):
        text = re.sub(r"<[^>]+>", " ", raw_text)
        text = re.sub(r"\s+", " ", text).strip()
        combined = _normalize(f"{text} {href}")

        if any(bad in combined for bad in _EXCLUDE_MARKERS):
            continue

        if gabarito_url is None and "gabarito" in combined:
            gabarito_url = href
            continue

        if prova_url is None and re.match(r"^prova\b", text, re.I) and any(m in combined for m in _PHASE1_MARKERS):
            prova_url = href
            m = re.search(r"([A-Z]\d{0,2})\s*$", text)
            prova_label = m.group(1) if m else "V"

    if not prova_url:
        return None
    return {"prova_url": prova_url, "gabarito_url": gabarito_url, "version": prova_label}


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=60, headers=_HEADERS)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Gabarito ─────────────────────────────────────────────────────────────────

def _parse_gabarito(text: str, target_label: str) -> dict[int, str]:
    """Extrai {número: letra} pro `target_label` (ex. "V1", "V") a partir do
    texto completo do PDF de gabarito. Ver docstring do módulo pro formato.

    Alguns anos trazem, depois da tabela principal, uma segunda tabela de
    "correspondência" entre versões que REPETE os mesmos cabeçalhos "PROVA
    X" — por isso restringimos tudo (busca de cabeçalhos e dos dados) à
    parte ANTES dela, senão o último cabeçalho encontrado seria o dessa
    segunda tabela, não o da tabela principal."""
    text = text.replace("\xa0", " ")
    main_part = re.split(r"correspond[êe]ncia|RESPOSTA\s+PROVA", text, flags=re.I)[0]

    header_matches = list(re.finditer(r"PROVA\s+([A-Z]\d{0,2})\b", main_part, flags=re.I))
    if not header_matches:
        return {}
    headers = [m.group(1) for m in header_matches]
    n_versions = len(headers)

    last_match = header_matches[-1]
    data = main_part[last_match.end():]

    raw_tokens = re.findall(r"\d{1,3}|[A-E]|\*", data)
    # Gabaritos "retificados" (corrigidos após recurso) às vezes colam uma
    # segunda letra junto da primeira pra uma questão específica (ex.: "48 D
    # E" quando D e E passaram a ser aceitas) — sem isso, o token extra desalinha
    # a leitura por posição de TODAS as questões seguintes. Mantém só a primeira.
    tokens: list[str] = []
    prev_was_letter = False
    for tok in raw_tokens:
        is_letter = tok in "ABCDE*"
        if is_letter and prev_was_letter:
            continue
        tokens.append(tok)
        prev_was_letter = is_letter

    version_index = headers.index(target_label) if target_label in headers else 0

    step = n_versions * 4
    answers: dict[int, str] = {}
    for i in range(0, len(tokens) - step + 1, step):
        group = tokens[i:i + step]
        v = group[version_index * 4: version_index * 4 + 4]
        if len(v) < 4:
            continue
        n1, l1, n2, l2 = v
        if not (n1.isdigit() and n2.isdigit()):
            continue
        if l1 != "*":
            answers[int(n1)] = l1
        if l2 != "*":
            answers[int(n2)] = l2
    return answers


# ── Prova ────────────────────────────────────────────────────────────────────

# O marcador de início de questão mudou de convenção ao longo dos anos: um
# número solto na própria linha (ex.: "07"), nos anos até ~2024, ou "{NN}"
# entre chaves, em 2025+. Como um número solto é um sinal fraco (poderia ser
# parte do enunciado, ano, page footer etc.), usamos a mesma resincronização
# por "número esperado" já validada na UFPR/ACAFE: só vira questão nova se
# bater com o próximo número esperado (ou um pequeno salto à frente).
_Q_MARK_BRACE_RE = re.compile(r"^\{(\d{1,3})\}$")
_Q_MARK_BARE_RE = re.compile(r"^(\d{1,3})$")
# Alternativas: "(A) texto" (uppercase com parênteses, formato usado desde
# ~2018) ou "a) texto" (minúsculo sem parênteses, formato de anos como 2017).
_OPT_LINE_RE = re.compile(r"^(?:\(([A-E])\)|([a-e])\))\s*(.*)$")
_NOISE_LINE_RE = re.compile(r"^(Concurso Vestibular FUVEST\b|#+$|[A-Z]{1,2}$)", re.I)


def parse_fuvest_pdf(pdf_path: Path) -> list[dict]:
    """Parseia o PDF da prova (uma versão) e retorna a lista de questões:
    {number, area, statement, options: [(letra, texto)], images}."""
    doc = fitz.open(str(pdf_path))

    # As provas são impressas em 2 colunas por página — ordenar só por
    # (página, y) embaralha a ordem de leitura (a coluna direita tem y
    # menores que o fim da coluna esquerda). Por isso cada evento carrega
    # também a coluna (0=esquerda, 1=direita, pelo x0 relativo à largura da
    # página), e a ordenação final é por (página, coluna, y).
    events: list[tuple[int, int, float, str, object]] = []
    for pno, page in enumerate(doc):
        mid_x = page.rect.width / 2
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                text = "".join(s["text"] for s in line["spans"])
                text = text.replace("\xa0", " ").replace("¬", " ").strip()
                if not text:
                    continue
                x0, y = line["bbox"][0], line["bbox"][1]
                col = 0 if x0 < mid_x else 1

                m_brace = _Q_MARK_BRACE_RE.match(text)
                if m_brace:
                    events.append((pno, col, y, "q", int(m_brace.group(1))))
                    continue

                m_opt = _OPT_LINE_RE.match(text)
                if m_opt:
                    letter = (m_opt.group(1) or m_opt.group(2)).upper()
                    events.append((pno, col, y, "opt", (letter, m_opt.group(3))))
                    continue

                if _NOISE_LINE_RE.match(text):
                    continue

                m_bare = _Q_MARK_BARE_RE.match(text)
                if m_bare:
                    events.append((pno, col, y, "q", int(m_bare.group(1))))
                    continue

                events.append((pno, col, y, "text", text))

        for x0, y, xref in _page_content_images_xy(page):
            col = 0 if x0 < mid_x else 1
            events.append((pno, col, y, "img", xref))

    events.sort(key=lambda e: (e[0], e[1], e[2]))
    events = [(pno, kind, val) for pno, _col, _y, kind, val in events]

    questions: list[dict] = []
    expected = 1
    cur: Optional[dict] = None
    images_by_number: dict[int, list[str]] = {}
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
                    "area": _infer_area(statement),
                    "statement": statement,
                    "options": built[:5],
                })
        cur = None

    for pno, kind, val in events:
        if kind == "q":
            n = val
            if n == expected or (expected < n <= 99 and n - expected <= 4):
                flush()
                cur = {"number": n, "statement_lines": [], "options": []}
                expected = n + 1
                continue
            # número solto que não bate com o esperado: provavelmente parte
            # do enunciado (ex.: um valor numérico) — trata como texto comum.
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

        # texto comum
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

def run_migrations_fuvest(conn):
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS fuvest_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            version VARCHAR(10),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS fuvest_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES fuvest_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS fuvest_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES fuvest_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


def import_fuvest_year(db, year: int, edition: dict) -> dict:
    from app.services.import_batch import save_vestibular_question

    exam_name = f"FUVEST {year}"

    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        download_pdf(edition["prova_url"], prova_path)
        parsed = parse_fuvest_pdf(prova_path)

        gabarito: dict[int, str] = {}
        if edition.get("gabarito_url"):
            try:
                gab_path = tmp_path / "gabarito.pdf"
                download_pdf(edition["gabarito_url"], gab_path)
                gdoc = fitz.open(str(gab_path))
                gtext = "\n".join(p.get_text() for p in gdoc)
                gdoc.close()
                gabarito = _parse_gabarito(gtext, edition.get("version") or "V")
            except Exception:
                gabarito = {}  # best-effort: importa a prova mesmo sem gabarito

    # Abaixo de ~20 questões é sinal de falha de parsing (ex.: PDF com fonte
    # customizada onde o número da questão não vem como texto legível, ou
    # texto extraído sem espaços entre palavras), não de uma prova realmente
    # menor — melhor pular e reportar do que gravar um exame manco que
    # trava reimportação futura (a checagem de "já existe" é por exam_name).
    if len(parsed) < 20:
        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": 0,
            "skipped": True,
            "reason": f"Só {len(parsed)} questões reconhecidas de ~90 esperadas (provável falha de parsing nesse formato de PDF)",
        }

    added = 0
    skipped_existing = 0
    seen: set[int] = set()
    for q in parsed:
        if q["number"] in seen:
            continue
        seen.add(q["number"])

        options = []
        correct = gabarito.get(q["number"])
        for order, (letter, text_) in enumerate(q["options"]):
            options.append({
                "letter": letter,
                "text": text_,
                "is_correct": (letter == correct),
                "order": order,
            })

        images = None
        if q.get("images"):
            images = [
                {"image_base64": data_url, "order": order}
                for order, data_url in enumerate(q["images"])
            ]

        metadata = {
            "area": q["area"],
            "version": edition.get("version"),
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="fuvest",
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
    return {
        "exam_name": exam_name,
        "total_parsed": len(parsed),
        "total_added": added,
        "skipped_existing": skipped_existing,
        "gabarito_entries": len(gabarito),
    }


def import_all_fuvest_exams(since_year: int = 2015, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as edições da FUVEST (1ª fase) listadas em
    fuvest.br/acervo-vestibular, em regressão de `until_year` (padrão: ano
    mais recente listado) até `since_year` (padrão: 2015).

    Cada ano é tentado de forma independente: página fora do ar, sem prova
    reconhecível, ou PDF em formato inesperado são pulados e reportados, sem
    travar o lote."""
    from app.database import SessionLocal, engine

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with engine.begin() as conn:
            run_migrations_fuvest(conn)
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    try:
        years = fetch_fuvest_years()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a listagem de anos: {e}")

    year_to = until_year or (max(years) if years else 2026)
    year_from = since_year

    results = []
    total_added = 0
    try:
        for year in range(year_to, year_from - 1, -1):
            try:
                edition = fetch_fuvest_edition(year)
            except Exception as e:
                results.append({"year": year, "skipped": True, "reason": f"Falha ao acessar a página do ano: {e}"})
                continue

            if not edition:
                results.append({"year": year, "skipped": True, "reason": "Nenhum link de prova (1ª fase) reconhecido"})
                continue

            try:
                r = import_fuvest_year(db, year, edition)
                results.append({"year": year, **r})
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})

        return {"total_added": total_added, "exams": results}
    finally:
        if close_after:
            db.close()
