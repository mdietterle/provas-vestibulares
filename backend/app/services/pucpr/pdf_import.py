from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa questões do vestibular da PUCPR direto de uma URL pública (ex.:
static.pucpr.br/.../gabarito-vestibular-....pdf), nos mesmos moldes da UFRGS
(app/services/ufrgs/pdf_import.py).

A resposta correta vem destacada na própria prova por um retângulo de "grifo"
(cor varia por edição — ciano, amarelo etc., mas nunca preto/branco/cinza)
desenhado atrás da alternativa certa. O parser identifica esses retângulos e
casa cada um com a linha de alternativa (A–E) que ele cobre. `gabarito_text`
continua aceito como override manual opcional, usado só quando o grifo não é
detectado para alguma questão (fallback, não obrigatório).

Os links "[GABARITO DEFINITIVO]" em https://www.pucpr.br/vestibular/editais/
apontam para o caderno de prova completo de cada edição (não um gabarito
separado). `import_all_pucpr_exams` varre essa página, encontra TODOS esses
links (dezenas, de vários anos) e importa cada prova, uma a uma, tolerando
falhas individuais sem abortar o lote inteiro.

Provas de 2020 até 2022/1 ("Vestibular 4.0") usam um layout diferente e não
aparecem sob o rótulo "[GABARITO DEFINITIVO]" — ficam na seção "Gabaritos
Processos Seletivos Anteriores" da mesma página, com rótulos como
"[GABARITO]"/"[GABARITO PROVISÓRIO]" ou até só texto livre "Gabarito ...".
`fetch_gabarito_links` também reconhece esses padrões. Nessas provas as
alternativas não têm letra A–E (são parágrafos soltos) e não há grifo
colorido — a resposta certa é a única alternativa sem um marcador "X" em
negrito impresso na frente das erradas. `_parse_exam_pdf_any` tenta o parser
vigente primeiro e cai para `parse_exam_pdf_legacy` (esse layout antigo)
quando nenhuma questão é reconhecida.

Cada questão tem 5 alternativas A–E. Quando a prova oferece Língua
Estrangeira (Inglês OU Espanhol), os dois idiomas reaproveitam a mesma
numeração — por isso a chave de deduplicação é (número, idioma), como na
ACAFE.

Limitação conhecida: questões de Matemática/Física com fórmulas em notação
especial (frações, expoentes) podem ter o texto fragmentado de forma a não
render exatamente 5 alternativas reconhecíveis; essas são puladas e reportadas
em `total_parsed` vs. `total_added` para revisão manual — mesma limitação já
existente no importador da UFRGS para layouts complexos. Editais que não são
provas objetivas padrão (processos seletivos especiais, listas de chamada
etc.) tendem a não produzir nenhuma questão reconhecível e são simplesmente
pulados no lote.
"""


import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

_EDITAIS_URL = "https://www.pucpr.br/vestibular/editais/"

# Provas de 2020/2021 e do início de 2022 (ainda linkadas na seção "Gabaritos
# Processos Seletivos Anteriores" da mesma página) não usam o rótulo
# "[GABARITO DEFINITIVO]" — aparecem como "[GABARITO]"/"[GABARITO PROVISÓRIO]"
# ou até sem colchetes, só como texto livre começando com "Gabarito". Sem
# esse padrão extra, `fetch_gabarito_links` simplesmente não via essas provas
# e o lote pulava esses anos inteiros.
_GABARITO_ANY_LINK_RE = re.compile(
    r'<a[^>]*href="([^"]*\.pdf)"[^>]*>\s*(\[[^\]]*GABARITO[^\]]*\]|Gabarito\b)([^<]*)<',
    re.I,
)

_AREA_NAMES = {
    "LÍNGUA PORTUGUESA": "Língua Portuguesa",
    "LITERATURA BRASILEIRA": "Literatura",
    "LITERATURA": "Literatura",
    "BIOLOGIA": "Biologia",
    "QUÍMICA": "Química",
    "MATEMÁTICA": "Matemática",
    "FÍSICA": "Física",
    "HISTÓRIA": "História",
    "GEOGRAFIA": "Geografia",
    "FILOSOFIA": "Filosofia",
    "SOCIOLOGIA": "Sociologia",
    "LÍNGUA INGLESA": "Língua Estrangeira",
    "LÍNGUA ESPANHOLA": "Língua Estrangeira",
    "LÍNGUA ESTRANGEIRA": "Língua Estrangeira",
    "ARTE": "Arte",
    "ARTES": "Arte",
}

_LANG_SUB = re.compile(r"^[–-]\s*(INGLÊS|ESPANHOL)\s*[–-]$", re.I)
_Q_START = re.compile(r"^(\d{1,2})\.\s+(\S.*)$")
_OPT = re.compile(r"^([A-E])\)\s*(.*)$")

_NOISE_PATTERNS = [
    re.compile(r"Pontifícia Universidade Católica", re.I),
    re.compile(r"^Pág\.\s*\d+/\d+", re.I),
    re.compile(r"^VESTIBULAR DE (VERÃO|INVERNO)", re.I),
    re.compile(r"^VESTIBULAR 4\.0", re.I),  # cabeçalho das provas 2020-2022/1
    re.compile(r"^\d{1,3}\s*$"),  # número de página / marcador de cartão-resposta reimpresso
]


def _is_noise(text: str) -> bool:
    return any(p.search(text) for p in _NOISE_PATTERNS)


def _match_area(line_text: str) -> Optional[str]:
    return _AREA_NAMES.get(line_text.strip().upper())


def _match_language(line_text: str) -> Optional[str]:
    m = _LANG_SUB.match(line_text.strip())
    return m.group(1).capitalize() if m else None


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def _is_highlight_fill(fill) -> bool:
    """True se a cor de preenchimento parece um grifo (não preto/branco/cinza)."""
    if not fill or len(fill) != 3:
        return False
    r, g, b = fill
    if (r, g, b) in ((0, 0, 0), (1, 1, 1)):
        return False
    # Tons de cinza (r≈g≈b) costumam ser elementos decorativos/imagens, não grifo.
    if abs(r - g) < 0.08 and abs(g - b) < 0.08 and abs(r - b) < 0.08:
        return False
    return True


def _page_highlights(page) -> list[tuple[float, float]]:
    """Retorna [(y0, y1), ...] dos retângulos de grifo desta página — a PUCPR
    marca a alternativa correta com um retângulo colorido atrás do texto."""
    ranges = []
    for d in page.get_drawings():
        if not _is_highlight_fill(d.get("fill")):
            continue
        rect = d["rect"]
        height = rect.y1 - rect.y0
        if 6 <= height <= 20:  # altura de uma linha de texto
            ranges.append((rect.y0, rect.y1))
    return ranges


def _is_within_highlight(bbox, highlights: list[tuple[float, float]]) -> bool:
    y0, y1 = bbox[1], bbox[3]
    return any(hy0 - 2 <= y0 and y1 <= hy1 + 2 for hy0, hy1 in highlights)


def parse_exam_pdf(path: Path) -> tuple[list[dict], list[int]]:
    """Retorna (questões, números pulados).

    Cada questão: {number, area, language, statement, correct, options: [{letter, text}]}.
    `correct` vem do grifo detectado na própria prova (None se não identificado).
    """
    doc = fitz.open(str(path))
    events: list[tuple[str, object]] = []

    for page in doc:
        highlights = _page_highlights(page)
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = "".join(s["text"] for s in spans).strip()
                if not text:
                    continue

                area = _match_area(text)
                if area:
                    events.append(("area", area))
                    continue
                lang = _match_language(text)
                if lang:
                    events.append(("lang", lang))
                    continue
                m_q = _Q_START.match(text)
                if m_q:
                    events.append(("q_start", (int(m_q.group(1)), m_q.group(2))))
                    continue
                m_opt = _OPT.match(text)
                if m_opt:
                    is_hl = _is_within_highlight(line["bbox"], highlights)
                    events.append(("opt_start", (m_opt.group(1), m_opt.group(2).strip(), is_hl)))
                    continue
                if _is_noise(text):
                    continue
                events.append(("text", text))

    doc.close()

    questions: list[dict] = []
    skipped: list[int] = []
    current_area = "Geral"
    current_lang: Optional[str] = None
    q_num: Optional[int] = None
    statement_lines: list[str] = []
    options: list[dict] = []

    def flush():
        nonlocal q_num, statement_lines, options
        if q_num is None:
            return
        stmt = _clean("\n".join(statement_lines))
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
                "options": [
                    {"letter": o["letter"], "text": _clean(" ".join(o["lines"]))}
                    for o in options
                ],
            })
        else:
            skipped.append(q_num)
        q_num, statement_lines, options = None, [], []

    for etype, val in events:
        if etype == "area":
            flush()
            current_area = val
            current_lang = None
        elif etype == "lang":
            flush()
            current_lang = val
        elif etype == "q_start":
            flush()
            q_num, rest = val
            statement_lines = [rest]
            options = []
        elif etype == "opt_start":
            letter, rest, is_hl = val
            if q_num is not None:
                options.append({"letter": letter, "lines": [rest] if rest else [], "highlighted": is_hl})
        elif etype == "text":
            if q_num is None:
                continue
            elif options:
                options[-1]["lines"].append(val)
            else:
                statement_lines.append(val)

    flush()
    return questions, skipped


def parse_exam_pdf_legacy(path: Path) -> tuple[list[dict], list[int]]:
    """Parser para provas da PUCPR anteriores a 2022/2 ("Vestibular 4.0",
    2020 a 2022/1): layout diferente do usado por `parse_exam_pdf` — as
    alternativas não têm letra A-E (são parágrafos soltos) e não há grifo
    colorido. A resposta certa é identificada pela AUSÊNCIA de um marcador
    "X" em negrito que a prova imprime na frente de cada alternativa errada
    (4 das 5 trazem o "X", a correta não)."""
    doc = fitz.open(str(path))
    events: list[tuple[str, object]] = []

    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = "".join(s["text"] for s in spans).strip()
                if not text:
                    continue

                area = _match_area(text)
                if area:
                    events.append(("area", area))
                    continue
                lang = _match_language(text)
                if lang:
                    events.append(("lang", lang))
                    continue
                m_q = _Q_START.match(text)
                if m_q:
                    events.append(("q_start", (int(m_q.group(1)), m_q.group(2))))
                    continue
                if _is_noise(text):
                    continue

                is_wrong = spans[0]["text"].strip() == "X" and bool(spans[0].get("flags", 0) & 16)
                if is_wrong:
                    text = re.sub(r"^X\s*", "", text)
                events.append(("line", (text, is_wrong)))

    doc.close()

    questions: list[dict] = []
    skipped: list[int] = []
    current_area = "Geral"
    current_lang: Optional[str] = None
    q_num: Optional[int] = None
    lines: list[tuple[str, bool]] = []

    def flush():
        nonlocal q_num, lines
        if q_num is None:
            return
        if len(lines) < 5:
            skipped.append(q_num)
            q_num, lines = None, []
            return
        opts = lines[-5:]
        stmt = _clean("\n".join(t for t, _ in lines[:-5]))
        wrong_count = sum(1 for _, is_wrong in opts if is_wrong)
        if stmt and wrong_count == 4:
            letters = "ABCDE"
            correct_idx = next(i for i, (_, is_wrong) in enumerate(opts) if not is_wrong)
            questions.append({
                "number": q_num,
                "area": current_area,
                "language": current_lang,
                "statement": stmt,
                "correct": letters[correct_idx],
                "options": [
                    {"letter": letters[i], "text": _clean(t)}
                    for i, (t, _) in enumerate(opts)
                ],
            })
        else:
            skipped.append(q_num)
        q_num, lines = None, []

    for etype, val in events:
        if etype == "area":
            flush()
            current_area = val
            current_lang = None
        elif etype == "lang":
            flush()
            current_lang = val
        elif etype == "q_start":
            flush()
            q_num, rest = val
            lines = [(rest, False)]
        elif etype == "line":
            if q_num is not None:
                lines.append(val)

    flush()
    return questions, skipped


def _clean(text: str) -> str:
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


_GAB_ENTRY = re.compile(r"\b(\d{1,3})\D{0,3}([A-E])\b")


def parse_gabarito_text(text: str) -> dict[int, str]:
    """Extrai pares {número: letra} de um texto colado livremente (ex.: 'Português
    01 B 02 D 03 C ...' ou '01-B / 02-D / 03-C'). Tolerante a separadores.

    Quando a prova tem trilhas de idioma (Inglês/Espanhol) reaproveitando a
    mesma numeração, a mesma letra é aplicada às duas — é assim que a PUCPR
    publica o gabarito oficial (a posição da alternativa correta é a mesma
    nas duas versões da questão)."""
    answers: dict[int, str] = {}
    for m in _GAB_ENTRY.finditer(text):
        num = int(m.group(1))
        if 1 <= num <= 200:
            answers[num] = m.group(2).upper()
    return answers


def _parse_exam_pdf_any(path: Path) -> tuple[list[dict], list[int]]:
    """Tenta o parser vigente (grifo colorido, alternativas A-E); se não
    reconhecer nenhuma questão, tenta o layout legado (2020-2022/1, marcador
    "X" em negrito) antes de desistir — evita que provas antigas sejam
    descartadas só por estarem em formato diferente."""
    parsed, skipped_numbers = parse_exam_pdf(path)
    if parsed:
        return parsed, skipped_numbers
    return parse_exam_pdf_legacy(path)


def _ensure_tables(engine) -> None:
    from sqlalchemy import text as sql_text

    try:
        with engine.begin() as conn:
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS pucpr_questions (
                    id SERIAL PRIMARY KEY,
                    exam_name VARCHAR(200) NOT NULL,
                    year INTEGER NOT NULL,
                    season VARCHAR(20),
                    course VARCHAR(100),
                    color VARCHAR(20),
                    number INTEGER NOT NULL,
                    area VARCHAR(100),
                    language VARCHAR(20),
                    statement TEXT NOT NULL,
                    image_base64 TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(exam_name, number, language)
                )
            """))
            conn.execute(sql_text("""
                CREATE TABLE IF NOT EXISTS pucpr_question_options (
                    id SERIAL PRIMARY KEY,
                    question_id INTEGER NOT NULL REFERENCES pucpr_questions(id) ON DELETE CASCADE,
                    letter VARCHAR(1) NOT NULL,
                    text TEXT NOT NULL,
                    is_correct BOOLEAN DEFAULT FALSE,
                    "order" INTEGER DEFAULT 0
                )
            """))
    except Exception as e:
        raise RuntimeError(f"Falha ao criar tabelas: {e}")


def _import_parsed_exam(db, exam_name: str, year: int, season, course, color, parsed, skipped_numbers, gabarito_text: str) -> dict:
    """Grava no banco as questões já parseadas de uma prova. O gabarito
    detectado por grifo na própria prova tem prioridade; `gabarito_text`
    (colado manualmente) só é usado como reforço para questões sem grifo
    identificado."""
    from app.services.import_batch import save_vestibular_question

    gabarito = parse_gabarito_text(gabarito_text) if gabarito_text else {}

    added = 0
    skipped_existing = 0
    for q in parsed:
        correct_letter = q.get("correct") or gabarito.get(q["number"])
        options = [
            {
                "letter": opt["letter"],
                "text": opt["text"],
                "is_correct": (correct_letter == opt["letter"]) if correct_letter else False,
                "order": i,
            }
            for i, opt in enumerate(q["options"])
        ]
        metadata = {
            "season": season,
            "course": course,
            "color": color,
            "area": q["area"],
            "language": q["language"],
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="pucpr",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            correct_option=correct_letter,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

        # Commita em lotes de 10 em vez de esperar a prova inteira: acumular
        # todas as questões na sessão até um único commit final é o que
        # empurrava a memória perto do teto de 512MB do Render free e
        # derrubava o processo (OOM) no meio da importação — mesma causa
        # raiz já corrigida no ENEM e no ITA.
        if added % 10 == 0:
            db.commit()
            db.expunge_all()
            gc.collect()

    db.commit()
    db.expunge_all()
    gc.collect()
    return {
        "exam_name": exam_name,
        "total_parsed": len(parsed),
        "total_added": added,
        "skipped_existing": skipped_existing,
        "skipped_unparsed": sorted(set(skipped_numbers)),
    }


def import_pucpr_exam(
    prova_url: Optional[str],
    prova_path: Optional[Path],
    gabarito_text: str,
    year: int,
    season: Optional[str],
    course: Optional[str],
    color: Optional[str],
    db=None,
) -> dict:
    from app.database import SessionLocal, engine

    _ensure_tables(engine)

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name_parts = ["PUCPR", season, str(year), course, f"({color})" if color else None]
    exam_name = " ".join(p for p in exam_name_parts if p)

    try:
        local_path = prova_path
        tmp_file: Optional[Path] = None
        if local_path is None:
            if not prova_url:
                raise ValueError("Informe a URL da prova ou um arquivo local.")
            import tempfile
            tmp_dir = tempfile.mkdtemp()
            tmp_file = Path(tmp_dir) / "prova.pdf"
            download_pdf(prova_url, tmp_file)
            local_path = tmp_file

        parsed, skipped_numbers = _parse_exam_pdf_any(local_path)

        if tmp_file is not None:
            tmp_file.unlink(missing_ok=True)

        return _import_parsed_exam(db, exam_name, year, season, course, color, parsed, skipped_numbers, gabarito_text)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def fetch_gabarito_links(editais_url: str = _EDITAIS_URL) -> list[dict]:
    """Varre a página de editais e retorna todos os links "[GABARITO DEFINITIVO]"
    (o caderno de prova completo de cada edição), com metadados extraídos da
    URL e do texto do link: {url, label, year, season, course, color}."""
    resp = requests.get(editais_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    html = resp.text

    seen: set[str] = set()
    out: list[dict] = []
    for m in _GABARITO_ANY_LINK_RE.finditer(html):
        url, prefix, rest = m.group(1), m.group(2), m.group(3)
        if url in seen:
            continue
        seen.add(url)

        label = f"{prefix} {rest}".strip()

        year_m = re.search(r"static\.pucpr\.br/(?:pucpr/)?(\d{4})/(\d{2})/", url)
        year = int(year_m.group(1)) if year_m else None
        month = int(year_m.group(2)) if year_m else None

        low = f"{url} {label}".lower()
        if "inverno" in low:
            season = "Inverno"
        elif "verao" in low or "verão" in low:
            season = "Verão"
        elif month is not None:
            # Provas de 2020-2022 costumam não citar "Inverno"/"Verão" no
            # rótulo — usa o mês de publicação como aproximação (mesma
            # convenção observada nas provas 2022+ que citam a estação
            # explicitamente: maio-agosto é Inverno, o resto é Verão).
            season = "Inverno" if 5 <= month <= 8 else "Verão"
        else:
            season = None

        if re.search(r"amarela", label, re.I):
            color = "Amarela"
        elif re.search(r"branca", label, re.I):
            color = "Branca"
        else:
            color = None

        if color or re.search(r"medicina", label, re.I):
            course = "Medicina"
        elif re.search(r"única|unica|demais\s*cursos|\bdc\b", label, re.I):
            course = "Demais Cursos"
        else:
            course = None

        out.append({"url": url, "label": label, "year": year, "season": season, "course": course, "color": color})

    return out


def import_all_pucpr_exams(
    editais_url: str = _EDITAIS_URL,
    db=None,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as provas listadas na página de editais da PUCPR, uma a
    uma. Cada prova é tentada de forma independente — falha ou 0 questões
    reconhecidas numa edição não interrompe as demais (comum em editais que
    não são provas objetivas padrão). `since_year`/`until_year` restringem o
    intervalo de anos. Quando chamada como BackgroundTask (`/admin/import-all`),
    `task_id` é obrigatório para o progresso ser reportado — sem isso a
    tarefa nunca chega a "completed" e o polling do frontend fica parado para
    sempre esperando um status que nunca muda."""
    from app.database import SessionLocal, engine

    _ensure_tables(engine)

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        try:
            links = fetch_gabarito_links(editais_url)
        except Exception as e:
            if task_id:
                fail_task(task_id, str(e))
            return {"status": "error", "reason": f"Falha ao acessar {editais_url}: {e}"}

        if since_year is not None:
            links = [l for l in links if l["year"] is None or l["year"] >= since_year]
        if until_year is not None:
            links = [l for l in links if l["year"] is None or l["year"] <= until_year]

        results = []
        total_added = 0
        total = len(links)
        for i, link in enumerate(links, start=1):
            exam_name_parts = ["PUCPR", link["season"], str(link["year"]) if link["year"] else None, link["course"], f"({link['color']})" if link["color"] else None]
            exam_name = " ".join(p for p in exam_name_parts if p) or link["url"]
            try:
                import tempfile
                tmp_dir = tempfile.mkdtemp()
                tmp_file = Path(tmp_dir) / "prova.pdf"
                download_pdf(link["url"], tmp_file)
                parsed, skipped_numbers = _parse_exam_pdf_any(tmp_file)
                tmp_file.unlink(missing_ok=True)

                if not parsed:
                    results.append({"exam_name": exam_name, "url": link["url"], "skipped": True, "reason": "Nenhuma questão reconhecida (provável edital fora do formato padrão)."})
                else:
                    result = _import_parsed_exam(db, exam_name, link["year"], link["season"], link["course"], link["color"], parsed, skipped_numbers, "")
                    total_added += result["total_added"]
                    results.append({**result, "url": link["url"]})
            except Exception as e:
                db.rollback()
                results.append({"exam_name": exam_name, "url": link["url"], "skipped": True, "reason": str(e)})

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=exam_name)

        summary = {"total_links_found": total, "total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, summary)
        return summary
    except Exception as e:
        db.rollback()
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()
