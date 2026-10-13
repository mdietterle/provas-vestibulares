"""Importador de provas do Cebraspe/UnB.

O caderno de prova do Cebraspe NÃO tem marcador explícito de questão
("Questão N") — o número do item aparece solto no fluxo de texto,
indistinguível por regex simples de outros números (datas, medidas).
A extração usa posição Y + clustering de palavras para identificar
linhas que começam com número de item válido (1-200), validado contra
o gabarito quando disponível.

O gabarito é uma tabela extraída por posição de palavra: linhas cujo
primeiro token é "Item" seguidas da linha "Gabarito" com respostas na
mesma ordem horizontal. Validado manualmente em provas 2019-2025.

Imagens são extraídas via pdf_figures.extract_figure_events() e enviadas
ao Supabase Storage (bucket 'vestibulares') através de save_vestibular_question,
que faz o upload automaticamente e armazena apenas a URL pública.
"""

from __future__ import annotations

import base64
import gc
import re
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.database import SessionLocal
from app.services.pdf_figures import extract_figure_events


# ── URLs conhecidas ───────────────────────────────────────────────────────────
# Formato CDN Cebraspe 2019-2025: cdn.cebraspe.org.br/vestibulares/VESTUNB_{AA}/arquivos/
# 2026+ usa hash em vez de nome previsível — descoberta automática não implementada.
_CE_BRASPE_CDN_BASE = "https://cdn.cebraspe.org.br/vestibulares"

_KNOWN_EXAMS = [
    # year, exam_code, prova_filename, gabarito_filename
    (2025, "009_VEST_UNB_2025_001_01", "009_VEST_UNB_2025_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2025_001_01.PDF"),
    (2024, "009_VEST_UNB_2024_001_01", "009_VEST_UNB_2024_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2024_001_01.PDF"),
    (2023, "009_VEST_UNB_2023_001_01", "009_VEST_UNB_2023_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2023_001_01.PDF"),
    (2022, "009_VEST_UNB_2022_001_01", "009_VEST_UNB_2022_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2022_001_01.PDF"),
    (2021, "009_VEST_UNB_2021_001_01", "009_VEST_UNB_2021_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2021_001_01.PDF"),
    (2020, "009_VEST_UNB_2020_001_01", "009_VEST_UNB_2020_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2020_001_01.PDF"),
    (2019, "009_VEST_UNB_2019_001_01", "009_VEST_UNB_2019_001_01.PDF", "GAB_DEFINITIVO_009_VEST_UNB_2019_001_01.PDF"),
]

_REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


def _build_pdf_url(year: int, filename: str) -> str:
    aa = str(year)[-2:]
    return f"{_CE_BRASPE_CDN_BASE}/VESTUNB_{aa}/arquivos/{filename}"


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=120, headers=_REQUEST_HEADERS, verify=False)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Parsing do gabarito ──────────────────────────────────────────────────────
_ANSWER_TOKEN = re.compile(r"^(?:C|E|[A-E]|\*|ANULADA)$", re.IGNORECASE)


def _parse_gabarito(gabarito_path: Path) -> dict[int, str]:
    """Extrai respostas do gabarito Cebraspe usando posição de palavra.

    O gabarito é uma tabela onde linhas de "Item" (números) são seguidas
    por linhas de "Gabarito" (respostas C/E ou A-E), alinhadas horizontalmente.
    """
    doc = fitz.open(str(gabarito_path))
    answers: dict[int, str] = {}

    for page in doc:
        words = page.get_text("words")
        if not words:
            continue

        # Agrupa palavras por Y (linha visual)
        lines: list[tuple[float, list]] = []
        for w in sorted(words, key=lambda w: w[1]):
            y0 = w[1]
            if lines and abs(lines[-1][0] - y0) <= 4:
                lines[-1][1].append(w)
            else:
                lines.append((y0, [w]))

        i = 0
        while i < len(lines) - 1:
            _y_num, words_num = lines[i]
            toks_num = sorted(words_num, key=lambda w: w[0])

            # Linha de números de item?
            num_tokens = []
            for t in toks_num:
                txt = t[4].strip()
                clean = re.sub(r"[^\d]", "", txt)
                if clean.isdigit():
                    n = int(clean)
                    if 1 <= n <= 200:
                        num_tokens.append((t[0], n))

            if len(num_tokens) >= 3:
                # Próxima linha deve ter as respostas
                _y_ans, words_ans = lines[i + 1]
                toks_ans = sorted(words_ans, key=lambda w: w[0])

                ans_tokens = []
                for t in toks_ans:
                    txt = t[4].strip().upper()
                    if _ANSWER_TOKEN.match(txt):
                        ans_tokens.append((t[0], txt))

                if len(ans_tokens) >= len(num_tokens) * 0.5:
                    for x_num, item_num in num_tokens:
                        best = min(ans_tokens, key=lambda ta: abs(ta[0] - x_num))
                        if abs(best[0] - x_num) < 20:
                            answers[item_num] = best[1]
                    i += 2
                    continue
            i += 1

    doc.close()
    return answers


# ── Extração posicional de itens do caderno de prova ─────────────────────────
# Cebraspe não usa "Questão N". O número do item aparece como primeiro token
# de uma linha, tipicamente seguido do enunciado. Usamos clustering de Y para
# reconstruir linhas e filtramos candidatos a número de item por:
#   1. Valor numérico entre 1 e 200
#   2. Posição X próxima da margem esquerda (itens começam alinhados)
#   3. Validação cruzada com gabarito (se disponível)

_ITEM_NUM_RE = re.compile(r"^(\d{1,3})\b")
_CERTO_ERRADO_RE = re.compile(r"\b(CERTO|ERRADO)\b", re.IGNORECASE)
_MULT_CHOICE_RE = re.compile(r"^\s*([A-E])\s*[).\-]", re.IGNORECASE)


def _extract_items_from_exam(
    exam_path: Path,
    gabarito: dict[int, str],
) -> list[dict]:
    """Extrai itens do caderno de prova usando posição de palavras.

    Retorna lista de dicts com: number, statement, options, question_type,
    image_base64, extra_images.
    """
    doc = fitz.open(str(exam_path))
    all_events: list[tuple[float, str, object]] = []

    for page_idx, page in enumerate(doc):
        words = page.get_text("words")
        images_on_page = extract_figure_events(page)

        # Agrupa palavras por Y (tolerância 4px)
        lines_dict: dict[float, list] = defaultdict(list)
        for w in words:
            y_coord = w[1]
            matched_y = None
            for y in lines_dict.keys():
                if abs(y - y_coord) <= 4:
                    matched_y = y
                    break
            if matched_y is None:
                lines_dict[y_coord].append(w)
            else:
                lines_dict[matched_y].append(w)

        page_lines = []
        for y in sorted(lines_dict.keys()):
            line_words = sorted(lines_dict[y], key=lambda w: w[0])
            line_text = " ".join(w[4] for w in line_words).strip()
            # X do primeiro token (para detectar alinhamento à esquerda)
            first_x = line_words[0][0] if line_words else 0
            page_lines.append((y, line_text, first_x))

        page_events = []
        for y, line_text, first_x in page_lines:
            stripped = line_text.strip()
            if not stripped:
                continue

            # Ignora cabeçalhos/rodapés comuns
            lower = stripped.lower()
            if any(kw in lower for kw in ("cespe", "cebraspe", "unb", "universidade",
                                           "brasília", "página", "rascunho",
                                           "caderno", "prova", "instruções")):
                continue
            if stripped.isdigit() and len(stripped) <= 3:
                continue  # número de página solto

            # Candidato a início de item: número no começo da linha,
            # posicionado próximo à margem esquerda (< 120pt)
            m = _ITEM_NUM_RE.match(stripped)
            if m and first_x < 120:
                num = int(m.group(1))
                if 1 <= num <= 200:
                    rest = stripped[m.end():].strip()
                    page_events.append((y, "item_start", (num, rest)))
                    continue

            # Opções múltipla escolha: "(A) texto" ou "A) texto"
            m_opt = _MULT_CHOICE_RE.match(stripped)
            if m_opt:
                letter = m_opt.group(1).upper()
                opt_text = stripped[m_opt.end():].strip()
                page_events.append((y, "opt", (letter, opt_text)))
                continue

            page_events.append((y, "text", stripped))

        # Imagens
        for _x_img, y_img, png in images_on_page:
            page_events.append((y_img, "image", png))

        page_events.sort(key=lambda e: e[0])
        all_events.extend(page_events)

    doc.close()

    # ── Reconstituição dos itens ──────────────────────────────────────────────
    items: list[dict] = []
    current_num: Optional[int] = None
    statement_lines: list[str] = []
    options: list[dict] = []
    pending_images: list[bytes] = []
    has_certo_errado = False

    def flush():
        nonlocal current_num, statement_lines, options, pending_images, has_certo_errado
        if current_num is None:
            return

        stmt = "\n".join(statement_lines).strip()
        if not stmt:
            current_num, statement_lines, options, pending_images = None, [], [], []
            has_certo_errado = False
            return

        # Determina tipo de questão
        if has_certo_errado or not options:
            q_type = "certo_errado"
        else:
            q_type = "multiple_choice"

        # Marca resposta correta
        correct = gabarito.get(current_num)
        built_opts = []
        for idx, opt in enumerate(options):
            is_correct = False
            if correct:
                if q_type == "certo_errado":
                    is_correct = opt["letter"].upper() == correct.upper()
                else:
                    is_correct = opt["letter"].upper() == correct.upper()
            built_opts.append({
                "letter": opt["letter"],
                "text": opt["text"],
                "is_correct": is_correct,
                "order": idx,
            })

        # Se certo/errado sem opções explícitas, cria C/E
        if q_type == "certo_errado" and not built_opts:
            built_opts = [
                {"letter": "C", "text": "Certo", "is_correct": correct == "C" if correct else False, "order": 0},
                {"letter": "E", "text": "Errado", "is_correct": correct == "E" if correct else False, "order": 1},
            ]

        img_b64 = None
        extra_imgs = []
        if pending_images:
            img_b64 = base64.b64encode(pending_images[0]).decode()
            for img in pending_images[1:]:
                extra_imgs.append(base64.b64encode(img).decode())

        items.append({
            "number": current_num,
            "statement": stmt,
            "options": built_opts,
            "question_type": q_type,
            "answer": correct,
            "image_base64": img_b64,
            "extra_images": extra_imgs,
        })

        current_num, statement_lines, options, pending_images = None, [], [], []
        has_certo_errado = False

    for _y, etype, val in all_events:
        if etype == "item_start":
            flush()
            num, rest = val
            current_num = num
            statement_lines = [rest] if rest else []
            options = []
            has_certo_errado = False

        elif etype == "opt":
            letter, opt_text = val
            if current_num is not None:
                options.append({"letter": letter, "text": opt_text})

        elif etype == "text":
            text_val = val
            if current_num is not None:
                # Detecta Certo/Errado no texto
                if _CERTO_ERRADO_RE.search(text_val):
                    has_certo_errado = True
                if options:
                    options[-1]["text"] += " " + text_val
                else:
                    statement_lines.append(text_val)

        elif etype == "image":
            if current_num is not None:
                pending_images.append(val)

    flush()
    return items


# ── Persistência ──────────────────────────────────────────────────────────────
def _persist_parsed_items(
    db,
    exam_name: str,
    year: int,
    parsed: list[dict],
    force_reimport: bool = False,
) -> tuple[int, int]:
    from app.services.import_batch import save_vestibular_question

    added = 0
    skipped_existing = 0

    for q in parsed:
        images = []
        if q.get("image_base64"):
            images.append({"image_base64": q["image_base64"], "order": 0})
        for idx, img_b64 in enumerate(q.get("extra_images", [])):
            images.append({"image_base64": img_b64, "order": idx + 1})

        options = [
            {
                "letter": opt["letter"],
                "text": opt["text"],
                "is_correct": opt["is_correct"],
                "order": opt["order"],
            }
            for opt in q["options"]
        ]

        vq, created = save_vestibular_question(
            db=db,
            exam_type="cebraspe",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            answer=q.get("answer"),
            image_base64=None,  # Images go via `images` list → Supabase Storage
            options=options,
            images=images,
            metadata={"question_type": q["question_type"]},
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


# ── API pública ───────────────────────────────────────────────────────────────
def seed_cebraspe(db, year: int, **kwargs) -> dict:
    """Importa prova de um ano específico do Cebraspe/UnB."""
    exam_entry = None
    for entry in _KNOWN_EXAMS:
        if entry[0] == year:
            exam_entry = entry
            break

    if exam_entry is None:
        return {"error": f"Ano {year} não encontrado na lista de exames conhecidos."}

    yr, _code, prova_file, gab_file = exam_entry
    prova_url = _build_pdf_url(yr, prova_file)
    gab_url = _build_pdf_url(yr, gab_file)
    exam_name = f"Cebraspe/UnB {yr}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        prova_path = Path(tmp_dir) / "prova.pdf"
        gab_path = Path(tmp_dir) / "gabarito.pdf"

        try:
            download_pdf(prova_url, prova_path)
            download_pdf(gab_url, gab_path)
        except Exception as e:
            return {"error": f"Falha ao baixar PDFs: {e}"}

        gabarito = _parse_gabarito(gab_path)
        parsed = _extract_items_from_exam(prova_path, gabarito)

    if not parsed:
        return {"exam_name": exam_name, "total_added": 0, "reason": "Nenhum item reconhecido."}

    added, skipped = _persist_parsed_items(db, exam_name, yr, parsed, force_reimport=kwargs.get("force_reimport", False))
    return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped}


def import_all_cebraspe_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    force_reimport: bool = False,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todas as provas conhecidas do Cebraspe/UnB."""
    from app.services.import_batch import run_batch_import

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exams = _KNOWN_EXAMS[:]
    if since_year:
        exams = [e for e in exams if e[0] >= since_year]
    if until_year:
        exams = [e for e in exams if e[0] <= until_year]

    items = [
        {"year": e[0], "prova_file": e[2], "gab_file": e[3]}
        for e in exams
    ]

    def _label(item: dict) -> str:
        return f"Cebraspe/UnB {item['year']}"

    def _process(item: dict) -> dict:
        yr = item["year"]
        exam_name = f"Cebraspe/UnB {yr}"
        prova_url = _build_pdf_url(yr, item["prova_file"])
        gab_url = _build_pdf_url(yr, item["gab_file"])

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            gab_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(prova_url, prova_path)
            download_pdf(gab_url, gab_path)

            gabarito = _parse_gabarito(gab_path)
            parsed = _extract_items_from_exam(prova_path, gabarito)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhum item reconhecido.", "total_added": 0}

        added, skipped = _persist_parsed_items(db, exam_name, yr, parsed, force_reimport=force_reimport)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped}

    try:
        return run_batch_import(items, _process, label=_label, task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()