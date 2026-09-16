"""UFPR seed logic — importa questões da coletânea de provas da UFPR.

Diferente da ACAFE (um PDF por prova), a UFPR vem como UMA coletânea com
várias provas (anos) num único PDF. Cada prova é delimitada por uma capa
"PROCESSO SELETIVO <ANO>" e, ao final, traz um GABARITO (página escaneada com
o gabarito oficial). Não há resposta destacada nas questões — o gabarito é a
única fonte da alternativa correta.

Estratégia de parsing (PyMuPDF / fitz), validada contra a coletânea
2010–2026:
  - O mapa de provas (ano + intervalo de páginas + página do gabarito) é fixo
    para este arquivo; recalculá-lo a cada questão seria frágil.
  - Gabarito: extração POSICIONAL — para cada número, a letra mais próxima à
    direita na mesma linha. Corrige quirks de OCR (e→C, minúsculas, "Anulada",
    "n"→77).
  - Questões: caminhada sequencial pelas linhas; um marcador "NN -" é uma
    questão real se NN for o número esperado (ou um pequeno salto à frente, para
    ressincronizar após um marcador truncado/ilegível).
  - Alternativas: A)–E) (maiúsculas nas provas novas, minúsculas nas antigas).
  - Área: cabeçalhos explícitos quando existem (provas novas + Inglês/Espanhol
    sempre); heurística conservadora por palavras-chave nas provas antigas
    (cai em "Geral" quando não há sinal forte).
  - Imagens: associadas por ordem de leitura (igual à ACAFE).

Questões sem gabarito confiável, anuladas, ou sem as 5 alternativas completas
são PULADAS (não importadas).

Importado apenas sob demanda pela rota admin (parsing de PDF é pesado).
"""

import base64
import re
from pathlib import Path

import fitz  # PyMuPDF
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import UfprQuestion, UfprQuestionImage, UfprQuestionOption

UFPR_DIR = Path(__file__).parent.parent.parent.parent / "provas" / "ufpr"

# Mapa fixo das provas na coletânea: (ano, página_inicial, página_final_questões, página_gabarito).
# Páginas 1-indexadas. Validado contra "Coletânea UFPR - 2009 a 2025.pdf".
_EXAMS = [
    (2026, 4, 63, 64),
    (2024, 67, 91, 92),
    (2023, 95, 119, 120),
    (2022, 123, 141, 142),
    (2021, 145, 162, 163),
    (2020, 166, 194, 195),
    (2019, 198, 224, 225),
    (2018, 228, 253, 254),
    (2017, 257, 282, 283),
    (2016, 286, 313, 314),
    (2015, 317, 344, 345),
    (2014, 348, 378, 379),
    (2013, 382, 413, 414),
    (2012, 417, 444, 445),
    (2011, 448, 475, 476),
    (2010, 479, 501, 502),
]

# Cabeçalhos de área (caixa alta, linha própria). Ordenados por especificidade.
_AREA_HEADERS = [
    ("LÍNGUA PORTUGUESA E LITERATURA", ("Língua Portuguesa", None)),
    ("LITERATURA BRASILEIRA", ("Literatura", None)),
    ("LÍNGUA PORTUGUESA", ("Língua Portuguesa", None)),
    ("LITERATURA", ("Literatura", None)),
    ("MATEMÁTICA", ("Matemática", None)),
    ("FÍSICA", ("Física", None)),
    ("QUÍMICA", ("Química", None)),
    ("BIOLOGIA", ("Biologia", None)),
    ("GEOGRAFIA", ("Geografia", None)),
    ("HISTÓRIA", ("História", None)),
    ("FILOSOFIA", ("Filosofia", None)),
    ("SOCIOLOGIA", ("Sociologia", None)),
    ("ESPANHOL", ("Língua Estrangeira", "Espanhol")),
    ("INGLÊS", ("Língua Estrangeira", "Inglês")),
    ("ALEMÃO", ("Língua Estrangeira", "Alemão")),
    ("FRANCÊS", ("Língua Estrangeira", "Francês")),
    ("ITALIANO", ("Língua Estrangeira", "Italiano")),
    ("JAPONÊS", ("Língua Estrangeira", "Japonês")),
    ("POLONÊS", ("Língua Estrangeira", "Polonês")),
]
_AREA_HEADER_MAP = dict(_AREA_HEADERS)

# Palavras-chave para inferir a área de questões sem cabeçalho (provas antigas
# de "Conhecimentos Gerais"). Conservador: só classifica com sinal claro,
# senão mantém "Geral".
_AREA_KEYWORDS = [
    ("Matemática", ["equação", "função", "triângulo", "polígono", "probabilidade",
                     "logaritmo", "progressão aritmética", "progressão geométrica",
                     "matriz", "vetor", "ângulo", "circunferência", "fração", "número real"]),
    ("Física", ["aceleração", "velocidade", "força", "energia cinética", "campo elétrico",
                "corrente elétrica", "resistor", "newton", "joule", "movimento retilíneo",
                "onda", "frequência", "massa de", "m/s", "gravitacional"]),
    ("Química", ["átomo", "molécula", "reação química", "mol ", "ligação covalente",
                 "tabela periódica", "ácido", "base ", "ph ", "oxidação", "íon",
                 "elétrons", "hidrogênio", "carbono", "solução aquosa"]),
    ("Biologia", ["célula", "dna", "gene", "proteína", "fotossíntese", "ecossistema",
                  "espécie", "evolução", "seleção natural", "organismo", "enzima",
                  "membrana", "cromossomo", "bactéria", "vírus"]),
    ("História", ["século", "guerra", "império", "revolução", "ditadura", "colonial",
                  "escravidão", "constituição de", "república", "idade média", "idade moderna"]),
    ("Geografia", ["clima", "relevo", "população", "urbanização", "território",
                   "bacia hidrográfica", "região ", "agricultura", "industrialização",
                   "globalização", "migração", "bioma"]),
    ("Filosofia", ["filósofo", "filosofia", "ética", "moral", "kant", "platão",
                   "aristóteles", "racionalismo", "epistemologia"]),
    ("Sociologia", ["sociedade", "sociólogo", "classe social", "trabalho assalariado",
                    "capitalismo", "cultura", "estado", "cidadania", "movimento social"]),
]


def _infer_area(statement: str) -> str:
    low = statement.lower()
    best = None
    best_hits = 0
    for area, kws in _AREA_KEYWORDS:
        hits = sum(1 for kw in kws if kw in low)
        if hits > best_hits:
            best_hits = hits
            best = area
    return best if best_hits >= 1 else "Geral"


def run_migrations_ufpr(conn):
    """Cria as tabelas UFPR caso não existam (com uma conexão ativa)."""
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ufpr_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            university VARCHAR(50) NOT NULL DEFAULT 'UFPR',
            year INTEGER NOT NULL,
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
        CREATE TABLE IF NOT EXISTS ufpr_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpr_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ufpr_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpr_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


# ── Gabarito ─────────────────────────────────────────────────────────────────
#
# As páginas de gabarito da UFPR são ESCANEADAS. A camada de texto (OCR embutido
# no PDF) mistura as letras reais com "lixo" decorativo da mesma letra, e a
# proximidade não distingue um do outro — confiar nela produz respostas erradas
# silenciosamente. Por isso lemos o gabarito fazendo OCR da própria imagem
# renderizada, célula a célula, e só marcamos a alternativa correta quando o OCR
# tem confiança alta. Questões sem leitura confiável são importadas SEM resposta
# marcada (nunca salvamos uma resposta possivelmente errada).
#
# Os NÚMEROS das questões na camada de texto são confiáveis (fonte Courier, não
# escaneada) e servem de âncora para localizar a célula da letra à direita.

_OCR_DPI = 300
_OCR_MIN_CONF = 70  # confiança mínima (0–100) para marcar a resposta

# Estado de OCR resolvido uma vez (Tesseract pode não estar disponível).
_ocr_ready: bool | None = None


def _ensure_ocr() -> bool:
    global _ocr_ready
    if _ocr_ready is not None:
        return _ocr_ready
    try:
        import pytesseract  # noqa: F401
        pytesseract.get_tesseract_version()
        _ocr_ready = True
    except Exception:
        _ocr_ready = False
    return _ocr_ready


def _number_anchors(page) -> list[tuple[float, float, int]]:
    """Posições (cx, cy, número) das questões, lidas da camada de texto (confiável)."""
    anchors: list[tuple[float, float, int]] = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            for sp in ln["spans"]:
                tok = sp["text"].strip()
                x0, y0, x1, y1 = sp["bbox"]
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                if re.fullmatch(r"\d{1,3}", tok):
                    n = int(tok)
                    if 1 <= n <= 120:
                        anchors.append((cx, cy, n))
                elif tok == "n":  # OCR do número 77 na coluna de números
                    anchors.append((cx, cy, 77))
    return anchors


def _ocr_letter_cell(cx: float, cy: float, scale: float, img) -> str | None:
    """OCR de uma célula à direita do número (cx, cy em pontos PDF). Retorna A–E ou None."""
    import pytesseract
    from PIL import Image

    # Janela da letra: à direita do número, ~25–110px (pontos) adiante, ±9px vertical.
    x0 = (cx + 18) * scale
    x1 = (cx + 130) * scale
    y0 = (cy - 11) * scale
    y1 = (cy + 11) * scale
    W, H = img.size
    box = (max(0, int(x0)), max(0, int(y0)), min(W, int(x1)), min(H, int(y1)))
    if box[2] - box[0] < 5 or box[3] - box[1] < 5:
        return None
    crop = img.crop(box).convert("L")
    crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
    cfg = "--psm 10 -c tessedit_char_whitelist=ABCDE"
    try:
        data = pytesseract.image_to_data(crop, config=cfg, output_type=pytesseract.Output.DICT)
    except Exception:
        return None
    best = None
    best_conf = -1.0
    for txt, conf in zip(data["text"], data["conf"]):
        t = (txt or "").strip().upper()
        try:
            c = float(conf)
        except (TypeError, ValueError):
            c = -1.0
        if len(t) == 1 and t in "ABCDE" and c > best_conf:
            best_conf = c
            best = t
    if best is not None and best_conf >= _OCR_MIN_CONF:
        return best
    return None


def parse_gabarito(page) -> dict[int, str]:
    """Lê o gabarito via OCR da imagem; só inclui respostas de alta confiança.

    Retorna {numero: letra}. Números ausentes = sem resposta confiável (a questão
    será importada sem alternativa marcada).
    """
    if not _ensure_ocr():
        return {}
    from PIL import Image

    anchors = _number_anchors(page)
    if not anchors:
        return {}

    pix = page.get_pixmap(dpi=_OCR_DPI)
    scale = _OCR_DPI / 72.0  # pontos PDF → pixels
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    result: dict[int, str] = {}
    for cx, cy, n in anchors:
        if n in result:
            continue
        letter = _ocr_letter_cell(cx, cy, scale, img)
        if letter:
            result[n] = letter
    return result


# ── Questões ─────────────────────────────────────────────────────────────────

_RE_QMARK = re.compile(r"^(\d{1,3})\s*[-–]\s+(\S.*)")
_RE_ALT = re.compile(r"(?m)^\s*([A-Ea-e])\)")


def _detect_area_line(s: str) -> tuple[str, str | None] | None:
    su = s.upper().strip()
    return _AREA_HEADER_MAP.get(su)


def _extract_alternatives(body: str) -> list[tuple[str, str]] | None:
    """Extrai as 5 alternativas A–E do corpo. Retorna None se incompletas."""
    ms = list(_RE_ALT.finditer(body))
    seq: list[tuple[str, str]] = []
    seen: set[str] = set()
    for i, mm in enumerate(ms):
        letter = mm.group(1).upper()
        if letter in seen:
            continue
        seen.add(letter)
        text_start = mm.end()
        text_end = ms[i + 1].start() if i + 1 < len(ms) else len(body)
        text = re.sub(r"\s+", " ", body[text_start:text_end]).strip()
        seq.append((letter, text))
    if not set("ABCDE").issubset({L for L, _ in seq}):
        return None
    # Mantém somente A–E, na ordem
    order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
    seq = [(L, t) for L, t in seq if L in order]
    seq.sort(key=lambda lt: order[lt[0]])
    return seq[:5]


def _statement_of(body: str) -> str:
    m = _RE_ALT.search(body)
    raw = body[:m.start()] if m else body
    return re.sub(r"\s+", " ", raw).strip()


def _parse_exam_questions(doc, start: int, end: int) -> list[dict]:
    """Caminhada sequencial pelas linhas das páginas [start, end] (1-indexadas)."""
    # Linhas com a página de origem (para associar imagem/área por reading order).
    lines: list[str] = []
    for p in range(start - 1, end):
        lines.extend(doc[p].get_text().split("\n"))

    questions: list[dict] = []
    expected = 1
    cur: dict | None = None
    area: tuple[str, str | None] = ("Geral", None)

    for raw in lines:
        s = raw.strip()
        if not s:
            if cur is not None:
                cur["body"] += "\n"
            continue
        hit = _detect_area_line(s)
        if hit is not None:
            area = hit
            continue
        m = _RE_QMARK.match(s)
        if m:
            n = int(m.group(1))
            # Aceita o número esperado ou um pequeno salto à frente (ressincroniza
            # após um marcador truncado/ilegível). Evita capturar "10 a 18" etc.
            if n == expected or (expected < n <= 99 and n - expected <= 4):
                if cur:
                    questions.append(cur)
                cur = {"number": n, "area": area[0], "language": area[1], "body": m.group(2)}
                expected = n + 1
                continue
        if cur is not None:
            cur["body"] += "\n" + s
    if cur:
        questions.append(cur)
    return questions


# ── Imagens (associação por ordem de leitura) ────────────────────────────────

def _xref_to_dataurl(doc, xref: int) -> str | None:
    try:
        pix = fitz.Pixmap(doc, xref)
        if pix.n - pix.alpha >= 4:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        data = pix.tobytes("png")
        return "data:image/png;base64," + base64.b64encode(data).decode()
    except Exception:
        return None


def _page_content_images(page) -> list[tuple[float, int]]:
    """[(y_topo, xref)] das imagens de conteúdo da página (sem fundos/logos)."""
    pw, ph = page.rect.width, page.rect.height
    out = []
    for im in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = im["bbox"]
        w, h = x1 - x0, y1 - y0
        xref = im.get("xref", 0)
        if not xref or w <= 8 or h <= 8:
            continue
        # descarta fundos de página inteira e o logo do topo-esquerdo
        if w > pw * 0.9 and h > ph * 0.9:
            continue
        if y0 < 40 and x0 < 120 and w < 200:
            continue
        out.append((y0, xref))
    out.sort(key=lambda t: t[0])
    return out


def _assign_images(doc, start: int, end: int) -> dict[tuple[int, str | None], list[str]]:
    """Associa imagens à questão por ordem de leitura, dentro de uma prova."""
    events: list[tuple[int, float, str, object]] = []
    cur_lang: str | None = None
    for pno in range(start - 1, end):
        page = doc[pno]
        for ln in page.get_text("dict")["blocks"]:
            for line in ln.get("lines", []):
                t = "".join(sp["text"] for sp in line["spans"]).strip()
                hit = _detect_area_line(t)
                if hit is not None:
                    cur_lang = hit[1]
                m = _RE_QMARK.match(t)
                if m:
                    events.append((pno, line["bbox"][1], "Q", (int(m.group(1)), cur_lang)))
        for y, xref in _page_content_images(page):
            events.append((pno, y, "IMG", xref))
    events.sort(key=lambda e: (e[0], e[1]))

    images: dict[tuple[int, str | None], list[str]] = {}
    seen_xref: set[int] = set()
    cur_key: tuple[int, str | None] | None = None
    last_num = 0
    for _pno, _y, kind, val in events:
        if kind == "Q":
            num, lang = val
            # Só avança quando o número faz sentido (mesma lógica de ressincronização).
            if num == last_num + 1 or (last_num < num <= 99 and num - last_num <= 4):
                cur_key = (num, lang)
                last_num = num
        elif kind == "IMG" and cur_key is not None:
            xref = val
            if xref in seen_xref:
                continue
            seen_xref.add(xref)
            data_url = _xref_to_dataurl(doc, xref)
            if data_url:
                images.setdefault(cur_key, []).append(data_url)
    return images


def parse_pdf(pdf_path: Path) -> list[dict]:
    """Faz o parsing completo da coletânea UFPR e retorna a lista de questões."""
    doc = fitz.open(pdf_path)
    all_questions: list[dict] = []

    for year, start, qend, gpage in _EXAMS:
        gabarito = parse_gabarito(doc[gpage - 1])
        images_by_key = _assign_images(doc, start, qend)
        parsed = _parse_exam_questions(doc, start, qend)

        for q in parsed:
            num = q["number"]
            language = q["language"]
            # Gabarito por OCR: só vem A–E quando confiável; senão None (questão
            # importada sem alternativa marcada — nunca salvamos resposta errada).
            correct = gabarito.get(num)
            if correct not in ("A", "B", "C", "D", "E"):
                correct = None
            alts = _extract_alternatives(q["body"])
            if not alts:
                continue
            statement = _statement_of(q["body"])
            if not statement:
                continue

            # Área: se não houve cabeçalho explícito ("Geral"), tenta heurística.
            area = q["area"]
            if area == "Geral" and language is None:
                area = _infer_area(statement)

            imgs = images_by_key.get((num, language), [])
            all_questions.append({
                "year": year,
                "number": num,
                "area": area,
                "language": language,
                "statement": statement,
                "alternatives": alts,
                "correct": correct,
                "images": imgs,
                "image_base64": imgs[0] if imgs else None,
            })

    doc.close()
    return all_questions


def seed_ufpr(db: Session | None = None, **kwargs) -> dict:
    """Importa as questões das coletâneas UFPR locais. Retorna um resumo."""
    if not UFPR_DIR.exists():
        return {"skipped": True, "reason": "Pasta ufpr/ não encontrada"}

    pdf_files = sorted(UFPR_DIR.glob("*.pdf"))
    if not pdf_files:
        return {"skipped": True, "reason": "Nenhum arquivo PDF encontrado"}

    try:
        with engine.begin() as conn:
            run_migrations_ufpr(conn)
    except Exception as e:
        return {"error": f"Falha ao criar tabelas: {e}"}

    close_after = db is None
    if db is None:
        db = SessionLocal()

    total_added = 0
    results = []
    try:
        for pdf_path in pdf_files:
            parsed = parse_pdf(pdf_path)
            # Agrupa por ano → um exam_name por prova.
            by_year: dict[int, list[dict]] = {}
            for q in parsed:
                by_year.setdefault(q["year"], []).append(q)

            for year in sorted(by_year, reverse=True):
                exam_name = f"UFPR {year}"
                already = db.query(UfprQuestion).filter(UfprQuestion.exam_name == exam_name).count()
                if already > 0:
                    results.append({"exam": exam_name, "added": 0, "existing": already})
                    continue

                added = 0
                seen: set[tuple[int, str | None]] = set()
                for q in by_year[year]:
                    key = (q["number"], q["language"])
                    if key in seen:
                        continue
                    seen.add(key)

                    question = UfprQuestion(
                        exam_name=exam_name,
                        university="UFPR",
                        year=year,
                        number=q["number"],
                        area=q["area"],
                        language=q["language"],
                        statement=q["statement"],
                        image_base64=q["image_base64"],
                    )
                    db.add(question)
                    db.flush()

                    for order, (letter, text) in enumerate(q["alternatives"]):
                        db.add(UfprQuestionOption(
                            question_id=question.id,
                            letter=letter,
                            text=text,
                            is_correct=(letter == q["correct"]),
                            order=order,
                        ))
                    for order, data_url in enumerate(q["images"]):
                        db.add(UfprQuestionImage(
                            question_id=question.id,
                            image_base64=data_url,
                            order=order,
                        ))
                    added += 1

                db.commit()
                total_added += added
                results.append({"exam": exam_name, "added": added})

        return {"total_added": total_added, "files": results}
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()
