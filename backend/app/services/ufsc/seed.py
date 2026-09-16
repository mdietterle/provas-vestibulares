from __future__ import annotations

"""Importa questões do vestibular UFSC/IFSC/IFC a partir de PDFs locais.

Estrutura esperada em backend/provas/ufsc/:
  <ano>_p<fase>_<cor>.pdf          → questões
  <ano>_*gabarito*_p<fase>_*.pdf   → gabarito (texto estruturado)

Questões objetivas: formato somatório (potências de 2).
Questões discursivas: capturadas sem opções.
"""


import base64
import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

from app.services.pdf_figures import extract_figure_events

PROVAS_DIR = Path(__file__).resolve().parents[3] / "provas" / "ufsc"

_AREA_HEADERS = {
    "LÍNGUA PORTUGUESA": "Língua Portuguesa",
    "LINGUA PORTUGUESA": "Língua Portuguesa",
    "INGLÊS": "Língua Estrangeira",
    "INGLES": "Língua Estrangeira",
    "ESPANHOL": "Língua Estrangeira",
    "MATEMÁTICA": "Matemática",
    "MATEMATICA": "Matemática",
    "FÍSICA": "Física",
    "FISICA": "Física",
    "QUÍMICA": "Química",
    "QUIMICA": "Química",
    "BIOLOGIA": "Biologia",
    "HISTÓRIA": "História",
    "HISTORIA": "História",
    "GEOGRAFIA": "Geografia",
    "FILOSOFIA": "Filosofia",
    "SOCIOLOGIA": "Sociologia",
    "ARTES": "Artes",
}

# Regex para cabeçalho de questão objetiva: "21)  Determine..." ou "01)"
_Q_OBJ = re.compile(r"^(\d{1,2})\)\s+")
# Formato alternativo (comum em provas ~2018-2023): "QUESTÃO 04" numa linha em
# negrito isolada, com o enunciado começando só na linha seguinte.
_Q_OBJ_ALT = re.compile(r"^QUESTÃO\s+(\d{1,2})\s*$", re.IGNORECASE)
# Regex para opção de somatório: "01." isolado (formato antigo) OU "01. texto..." na
# mesma linha (formato usado a partir de 2024) — o grupo 2 captura o texto inline, se houver.
_OPT = re.compile(r"^(01|02|04|08|16|32|64)\.\s*(.*)$")
# Regex para questão discursiva
_Q_DISC = re.compile(r"^QUESTÃO DISCURSIVA\s+(\d+)", re.IGNORECASE)


def _clean(text: str) -> str:
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\s*\n\s*\d{1,2}\s*$", "", text)
    return text.strip()


_LATIN_LETTER = re.compile(r"[A-Za-zÀ-ÿ]")


def _looks_like_passage(text: str) -> bool:
    """Filtra conteúdo que não parece um texto de apoio real — em especial,
    folhas de fórmulas matemáticas cujos símbolos vêm corrompidos pela fonte
    do PDF (viram caracteres de outros alfabetos em vez de operadores/gregos),
    que não devem ser anexadas ao enunciado das questões de Matemática."""
    if len(text) < 30:
        return False
    letters = len(_LATIN_LETTER.findall(text))
    return letters / max(len(text), 1) > 0.5


def _parse_filename(filename: str) -> tuple[int, str, str]:
    """Extrai (ano, fase, cor) do nome do arquivo."""
    name = Path(filename).stem
    year_m = re.search(r"(\d{4})", name)
    year = int(year_m.group(1)) if year_m else 0
    phase_m = re.search(r"p(\d)", name, re.IGNORECASE)
    phase = phase_m.group(1) if phase_m else "1"
    parts = re.split(r"[_\-]", name.lower())
    skip = {"gabarito", "novo", "p1", "p2", "p3", str(year).lower()}
    color = next((p for p in reversed(parts) if p and p not in skip and not p.isdigit()), "")
    return year, phase, color


def _parse_gabarito(gabarito_pdf: Path) -> dict[int, int]:
    """Lê o gabarito e retorna {número_questão: resposta_numérica}.

    O PDF do gabarito UFSC tem colunas separadas; agrupa palavras por linha
    (posição y) e extrai o último token numérico de cada linha de questão.
    """
    from collections import defaultdict

    doc = fitz.open(str(gabarito_pdf))
    answers: dict[int, int] = {}
    for page in doc:
        words = page.get_text("words")  # (x0, y0, x1, y1, word, ...)
        rows: dict[int, list[tuple[float, str]]] = defaultdict(list)
        for w in words:
            y_bucket = round(w[1] / 5) * 5
            rows[y_bucket].append((w[0], w[4]))

        for y in sorted(rows.keys()):
            row = [tok for _, tok in sorted(rows[y], key=lambda r: r[0])]
            if not row:
                continue
            # Primeira coluna deve ser número de questão (1–99)
            if not re.match(r"^\d{1,2}$", row[0]):
                continue
            q_num = int(row[0])
            if q_num < 1 or q_num > 99:
                continue
            # Último token numérico da linha = gabarito
            for tok in reversed(row):
                if tok.isdigit():
                    answers[q_num] = int(tok)
                    break

    doc.close()
    return answers


def _is_area_header(text: str) -> Optional[str]:
    stripped = text.strip().upper().rstrip(":")
    return _AREA_HEADERS.get(stripped)


def _parse_exam(
    exam_pdf: Path,
    gabarito: dict[int, int],
) -> list[dict]:
    """Parseia o PDF da prova e retorna lista de questões como dicts."""
    doc = fitz.open(str(exam_pdf))

    # Stream de eventos: (page_idx, y, type, value)
    events: list[tuple[int, float, str, object]] = []

    for page_idx, page in enumerate(doc):
        page_dict = page.get_text("dict")

        # Coleta imagens com posição vertical (raster + desenhos vetoriais nativos, ver pdf_figures.py)
        for _x0, y0, png in extract_figure_events(page):
            events.append((page_idx, y0, "image", png))

        for block in page_dict["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                line_text = "".join(s["text"] for s in line["spans"]).strip()
                if not line_text:
                    continue
                y = line["bbox"][1]
                is_bold = any(int(s["flags"]) & 16 for s in line["spans"])
                size = line["spans"][0]["size"] if line["spans"] else 0

                # Cabeçalho de área
                if is_bold and size >= 10 and len(line_text) > 3:
                    area = _is_area_header(line_text)
                    if area:
                        lang = None
                        upper = line_text.upper()
                        if "INGLÊS" in upper or "INGLES" in upper:
                            lang = "Inglês"
                        elif "ESPANHOL" in upper:
                            lang = "Espanhol"
                        events.append((page_idx, y, "area", (area, lang)))
                        continue

                # Questão discursiva
                m_disc = _Q_DISC.match(line_text)
                if m_disc:
                    events.append((page_idx, y, "q_disc_start", int(m_disc.group(1))))
                    continue

                # Questão objetiva (número em negrito seguido de texto)
                m_obj = _Q_OBJ.match(line_text)
                if m_obj and is_bold:
                    q_num = int(m_obj.group(1))
                    rest = line_text[m_obj.end():].strip()
                    events.append((page_idx, y, "q_obj_start", (q_num, rest)))
                    continue

                # Formato alternativo: "QUESTÃO 04" isolada, enunciado começa na linha seguinte
                m_obj_alt = _Q_OBJ_ALT.match(line_text)
                if m_obj_alt and is_bold:
                    events.append((page_idx, y, "q_obj_start", (int(m_obj_alt.group(1)), "")))
                    continue

                # Opção de somatório: "01." isolado (formato antigo) ou "01. texto..." (2024+)
                m_opt = _OPT.match(line_text)
                if m_opt:
                    opt_value = int(m_opt.group(1))
                    inline_text = m_opt.group(2).strip()
                    events.append((page_idx, y, "opt_value", (opt_value, inline_text)))
                    continue

                # Marcador de fim de questão objetiva
                if line_text.strip().upper() == "RESPOSTA":
                    events.append((page_idx, y, "resposta", None))
                    continue

                events.append((page_idx, y, "text", line_text))

    doc.close()

    # Bug real (causa das imagens "sumidas" reportadas pelos alunos): pra
    # cada página, TODAS as imagens da página eram anexadas em `events` antes
    # de qualquer linha de texto dela (loop acima: bloco de imagens primeiro,
    # blocos de texto depois) — não em ordem de leitura de verdade. Isso
    # jogava a imagem pro processamento ANTES do "q_obj_start" da questão a
    # que ela pertence (que só aparece mais adiante no texto da mesma
    # página), então `mode` ainda refletia a questão anterior (ou None,
    # logo após um flush) no momento em que a imagem era vista — a imagem
    # ou era descartada (`if mode is not None`) ou grudava na questão
    # errada. Ordenar por (página, y) põe cada imagem no lugar certo do
    # fluxo de leitura antes de montar as questões.
    events.sort(key=lambda e: (e[0], e[1]))

    # ── Montar questões a partir dos eventos ──────────────────────────────────
    questions: list[dict] = []
    current_area = "Geral"
    current_lang: Optional[str] = None

    mode: Optional[str] = None  # "obj" | "disc"
    q_num: int = 0
    disc_num: int = 0
    statement_lines: list[str] = []
    options: list[dict] = []
    in_opt: bool = False
    pending_images: list[bytes] = []
    # Texto de apoio (ex.: "Texto 1") compartilhado por várias questões seguidas —
    # aparece no PDF ANTES da primeira questão que o referencia, sem numeração própria,
    # então é acumulado enquanto não há questão em andamento (mode is None) e prefixado
    # ao enunciado de cada questão do grupo até que um novo texto de apoio apareça.
    active_passage_lines: list[str] = []
    current_passage: str = ""

    def flush_question():
        nonlocal mode, q_num, disc_num, statement_lines, options, in_opt, pending_images
        if mode is None:
            return
        stmt = _clean("\n".join(statement_lines))
        if not stmt:
            mode = None
            return

        built_opts = []
        for i, opt in enumerate(options):
            t = _clean(" ".join(opt["text_lines"]))
            correct = False
            if mode == "obj" and q_num in gabarito:
                correct = bool(gabarito[q_num] & opt["value"])
            built_opts.append({
                "value": opt["value"],
                "text": t,
                "is_correct": correct,
                "order": i,
            })

        img_b64 = None
        extra_images = []
        if pending_images:
            # Precisa ser data URI completa (não só o base64 puro) — é o que
            # todo outro importador grava (enem, puccampinas, pucminas...) e
            # o que o <img src={...}> do frontend espera. Salvar só o base64
            # cru (bug daqui) faz o navegador tratar como URL inválida e
            # mostrar o ícone de imagem quebrada, mesmo com o PNG certinho
            # no banco.
            img_b64 = f"data:image/png;base64,{base64.b64encode(pending_images[0]).decode()}"
            for img in pending_images[1:]:
                extra_images.append(f"data:image/png;base64,{base64.b64encode(img).decode()}")

        questions.append({
            "number": q_num if mode == "obj" else (200 + disc_num),
            "question_type": "summation" if mode == "obj" else "discursive",
            "area": current_area,
            "language": current_lang,
            "statement": stmt,
            "answer": gabarito.get(q_num) if mode == "obj" else None,
            "image_base64": img_b64,
            "extra_images": extra_images,
            "options": built_opts,
        })

        mode = None
        statement_lines = []
        options = []
        in_opt = False
        pending_images = []

    for _page_idx, _y, etype, val in events:
        if etype == "area":
            flush_question()
            current_area, current_lang = val
            current_passage = ""
            active_passage_lines = []

        elif etype == "q_obj_start":
            flush_question()
            if active_passage_lines:
                candidate = _clean("\n".join(active_passage_lines))
                current_passage = candidate if _looks_like_passage(candidate) else ""
                active_passage_lines = []
            q_num, rest = val
            mode = "obj"
            statement_lines = ([current_passage] if current_passage else []) + ([rest] if rest else [])
            in_opt = False

        elif etype == "q_disc_start":
            flush_question()
            if active_passage_lines:
                candidate = _clean("\n".join(active_passage_lines))
                current_passage = candidate if _looks_like_passage(candidate) else ""
                active_passage_lines = []
            disc_num = val
            mode = "disc"
            statement_lines = [current_passage] if current_passage else []
            in_opt = False

        elif etype == "opt_value":
            if mode == "obj":
                opt_value, inline_text = val
                options.append({"value": opt_value, "text_lines": [inline_text] if inline_text else []})
                in_opt = True

        elif etype == "resposta":
            if mode == "obj":
                flush_question()

        elif etype == "text":
            text_val: str = val
            if "COPERVE" in text_val and "VESTIBULAR" in text_val:
                continue
            if re.match(r"^\d{1,2}\s*$", text_val):
                continue
            if "INSTRUÇÕES" in text_val.upper():
                continue

            if mode == "obj":
                if in_opt and options:
                    options[-1]["text_lines"].append(text_val)
                else:
                    statement_lines.append(text_val)
            elif mode == "disc":
                statement_lines.append(text_val)
            else:
                active_passage_lines.append(text_val)

        elif etype == "image":
            if mode is not None:
                pending_images.append(val)

    flush_question()
    _strip_recurring_decorative_images(questions)
    return questions


# Uma figura de conteúdo (diagrama, gráfico, mapa) é renderizada a partir da
# região de desenho DAQUELA questão — não existe duas questões diferentes
# produzindo o MESMO PNG byte a byte. Confirmado depois de reimportar com o
# limiar antigo (>4): um exemplo real (o retângulo de preenchimento do
# cartão-resposta da prova somatório, reportado por aluno) ainda vazava com
# 2 a 7 ocorrências por prova — abaixo do limiar antigo, mas claramente não
# é conteúdo (é o mesmo elemento gráfico repetido por página). Qualquer
# repetição exata já é sinal de elemento decorativo da diagramação (ícone,
# moldura, cartão-resposta), não de conteúdo.
_MAX_QUESTIONS_SHARING_IMAGE = 1


def _strip_recurring_decorative_images(questions: list[dict]) -> None:
    from collections import Counter

    counts: Counter[str] = Counter()
    for q in questions:
        if q["image_base64"]:
            counts[q["image_base64"]] += 1
        for img in q.get("extra_images", []):
            counts[img] += 1

    noisy = {h for h, n in counts.items() if n > _MAX_QUESTIONS_SHARING_IMAGE}
    if not noisy:
        return

    for q in questions:
        if q["image_base64"] in noisy:
            q["image_base64"] = None
        if q.get("extra_images"):
            q["extra_images"] = [img for img in q["extra_images"] if img not in noisy]


def _persist_parsed_questions(
    db, exam_name: str, year: int, phase: str, color: str, parsed: list[dict]
) -> tuple[int, int]:
    """Grava as questões parseadas no banco, pulando as que já existem
    (mesma exam_name + number + language). Retorna (added, skipped_existing)."""
    from app.models import UfscQuestion, UfscQuestionImage, UfscQuestionOption

    added = 0
    skipped_existing = 0
    for q in parsed:
        existing = (
            db.query(UfscQuestion)
            .filter_by(exam_name=exam_name, number=q["number"], language=q["language"])
            .first()
        )
        if existing:
            skipped_existing += 1
            continue

        uq = UfscQuestion(
            exam_name=exam_name,
            university="UFSC",
            year=year,
            phase=phase,
            color=color or None,
            number=q["number"],
            question_type=q["question_type"],
            area=q["area"],
            language=q["language"],
            statement=q["statement"],
            answer=q["answer"],
            image_base64=q["image_base64"],
        )
        db.add(uq)
        db.flush()

        for i, opt in enumerate(q["options"]):
            db.add(UfscQuestionOption(
                question_id=uq.id,
                value=opt["value"],
                text=opt["text"],
                is_correct=opt["is_correct"],
                order=i,
            ))

        for i, img_b64 in enumerate(q.get("extra_images", [])):
            db.add(UfscQuestionImage(
                question_id=uq.id,
                image_base64=img_b64,
                order=i,
            ))

        added += 1

    db.commit()
    return added, skipped_existing


def seed_ufsc(db=None, **kwargs) -> dict:
    """Varre backend/provas/ufsc/ e importa todas as provas encontradas."""
    from app.database import SessionLocal

    if db is None:
        db = SessionLocal()
        _close_db = True
    else:
        _close_db = False

    total_added = 0
    files_report = []

    try:
        pdf_files = list(PROVAS_DIR.glob("*.pdf"))
        gabarito_map: dict[str, Path] = {}
        prova_map: dict[str, Path] = {}

        for f in pdf_files:
            stem = f.stem.lower()
            year_m = re.search(r"(\d{4})", stem)
            phase_m = re.search(r"p(\d)", stem)
            if not (year_m and phase_m):
                continue
            key = f"{year_m.group(1)}_p{phase_m.group(1)}"
            if "gabarito" in stem:
                gabarito_map[key] = f
            else:
                prova_map[key] = f

        for key, prova_pdf in sorted(prova_map.items()):
            year, phase, color = _parse_filename(prova_pdf.name)
            exam_name = f"UFSC {year} – Prova {phase}"
            if color:
                exam_name += f" ({color.capitalize()})"

            gabarito: dict[int, int] = {}
            if key in gabarito_map:
                try:
                    gabarito = _parse_gabarito(gabarito_map[key])
                except Exception as e:
                    print(f"⚠️  Gabarito não lido para {prova_pdf.name}: {e}")

            try:
                parsed = _parse_exam(prova_pdf, gabarito)
            except Exception as e:
                print(f"❌  Erro ao parsear {prova_pdf.name}: {e}")
                files_report.append({"exam": exam_name, "added": 0, "error": str(e)})
                continue

            added, _skipped = _persist_parsed_questions(db, exam_name, year, phase, color, parsed)
            total_added += added
            files_report.append({"exam": exam_name, "added": added})
            print(f"✅  UFSC seed: {exam_name} → {added} questões importadas.")

    except Exception as e:
        db.rollback()
        raise
    finally:
        if _close_db:
            db.close()

    return {"total_added": total_added, "files": files_report}
