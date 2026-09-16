from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa provas do UERJ a partir de PDFs enviados pelo Owner (prova + gabarito)
ou, em lote, direto da página oficial de provas anteriores.

Lê cadernos de prova de 1ª Fase (múltipla escolha) e 2ª Fase (discursivas),
e também os gabaritos oficiais.
"""

import base64
import re
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests

from app.services.pdf_figures import extract_figure_events

from app.database import SessionLocal
from app.models import (
    UerjQuestion,
    UerjQuestionOption,
    UerjQuestionImage,
    Exam,
    Subject,
    Institution
)

# Constantes UERJ
_INDEX_URL = "https://www.vestibular.uerj.br/?page_id=7069"
_Q_START = re.compile(r"^(?:Questão|QUESTÃO)\s+(\d+)", re.IGNORECASE)
_ALT_PATTERN = re.compile(r"^\s*\(([A-D])\)\s+(.*)")

_AREA_NAMES = {
    "MATEMATICA": "Matemática",
    "FISICA": "Física",
    "QUIMICA": "Química",
    "INGLES": "Inglês",
    "PORTUGUES": "Português",
    "REDACAO": "Português",
    # Cabeçalhos de área adicionais observados nas provas 2019+ (a prova
    # antiga misturava tudo em Linguagens/Matemática/Natureza/Humanas, mas os
    # cadernos reais têm um cabeçalho de disciplina por bloco de questões).
    "BIOLOGIA": "Biologia",
    "HISTORIA": "História",
    "GEOGRAFIA": "Geografia",
    "ESPANHOL": "Espanhol",
    "FRANCES": "Francês",
    "LINGUAGENS": "Linguagens",
    "CIENCIASHUMANAS": "Ciências Humanas",
    "CIENCIASDANATUREZA": "Ciências da Natureza",
}

_Q_START = re.compile(r"^Questao\s+(\d+)\.?\s*(.*)$", re.I)
_OPT_START = re.compile(r"\b([A-E])\s*\(\s*\)")

# ── Detecção robusta de "Questão N" ─────────────────────────────────────────
# Nos PDFs reais da UERJ (tanto na era antiga 2012-2018 quanto na nova
# 2019-2026), o agrupamento de palavras em "linhas" por proximidade de Y
# frequentemente separa a palavra "Questão" do número que a segue — e o jeito
# como isso acontece varia por ano/template:
#   • "Questão" sozinha numa linha, "01 <início do enunciado>" na seguinte;
#   • "Questão <início do enunciado...>" (sem número) numa linha, "01" sozinha
#     na seguinte, com o resto do enunciado só retomando depois;
#   • "02 Questão <enunciado>" (número ANTES do rótulo), tudo numa linha só;
#   • "Questão 01 <enunciado>", tudo numa linha só (formato "normal").
# `_Q_LABEL_LEAD`/`_Q_NUM_LEAD` tratam os casos em que o rótulo e o número
# ficam em linhas diferentes; `_Q_REV` trata o número-antes-do-rótulo.
_Q_LABEL_LEAD = re.compile(r"^\s*quest[aã]o\.?\s*(.*)$", re.IGNORECASE)
_Q_NUM_LEAD = re.compile(r"^\s*(\d{1,3})\.?\s*(.*)$")
_Q_REV = re.compile(r"^\s*(\d{1,3})\s*quest[aã]o\.?\s*(.*)$", re.IGNORECASE)
_TEXTO_BASE_MARKER = re.compile(r"^texto\s*base\.?$", re.IGNORECASE)

# Opções de múltipla escolha aparecem como "(A) texto..." (uma por linha), e
# não no formato de bolha "A ( )" que `_OPT_START` (acima) originalmente
# esperava — esse formato de bolha nunca ocorre no corpo das questões reais,
# só é mantido como fallback.
_OPT_PAREN = re.compile(r"^\s*\(([A-E])\)\s*(.*)$")


def _clean(text: str) -> str:
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _looks_like_passage(text: str) -> bool:
    if len(text) < 30:
        return False
    text_clean = text.strip().lower()
    text_norm = "".join(
        c for c in unicodedata.normalize("NFKD", text_clean) if not unicodedata.combining(c)
    )
    if text_norm.startswith("convencoes") or text_norm.startswith("instrucoes") or text_norm.startswith("notacoes"):
        return False
    letters = len(re.findall(r"[A-Za-zÀ-ÿ]", text))
    return letters / max(len(text), 1) > 0.5


def _repair_pdf_accents(text: str) -> str:
    # 1. Ligaturas comuns do LaTeX
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬃ", "ffi").replace("ﬄ", "ffl")
    
    # 2. Til espaçado antes/depois de letras
    text = text.replace("\u02dca", "ã").replace("a\u02dc", "ã")
    text = text.replace("\u02dco", "õ").replace("o\u02dc", "õ")
    text = text.replace("\u02dcA", "Ã")
    text = re.sub(r"\u02dc\s*a", "ã", text)
    text = re.sub(r"\u02dc\s*o", "õ", text)
    text = re.sub(r"\u02dc\s*A", "Ã", text)
    
    # 3. Agudo espaçado
    text = re.sub(r"\u00b4\s*a", "á", text)
    text = re.sub(r"\u00b4\s*e", "é", text)
    text = re.sub(r"\u00b4\s*i", "í", text)
    text = re.sub(r"\u00b4\s*o", "ó", text)
    text = re.sub(r"\u00b4\s*u", "ú", text)
    text = re.sub(r"\u00b4\s*A", "Á", text)
    text = re.sub(r"\u00b4\s*E", "É", text)
    text = re.sub(r"\u00b4\s*I", "Í", text)
    text = re.sub(r"\u00b4\s*O", "Ó", text)
    text = re.sub(r"\u00b4\s*U", "Ú", text)
    # Trata dotless i (ı) comum em LaTeX com acentos
    text = text.replace("\u00b4\u0131", "í").replace("\u00b4\u00a8\u0131", "ï").replace("\u0131", "i")
    
    # 4. Circunflexo espaçado
    text = re.sub(r"\u02c6\s*a", "â", text)
    text = re.sub(r"\u02c6\s*e", "ê", text)
    text = re.sub(r"\u02c6\s*o", "ô", text)
    text = re.sub(r"\u02c6\s*A", "Â", text)
    text = re.sub(r"\u02c6\s*E", "Ê", text)
    text = re.sub(r"\u02c6\s*O", "Ô", text)
    
    # 5. Crase espaçada
    text = re.sub(r"\u0060\s*a", "à", text)
    text = re.sub(r"\u0060\s*A", "À", text)
    
    # 6. Cedilha
    text = text.replace("c\u00b8", "ç").replace("\u00b8c", "ç").replace("C\u00b8", "Ç")
    text = re.sub(r"c\s*\u00b8", "ç", text)
    text = re.sub(r"C\s*\u00b8", "Ç", text)
    
    return text


def _normalize_text(text: str) -> str:
    # Remove acentos espaçados básicos antes de normalizar
    for c in ["\u02dc", "\u00b4", "\u02c6", "\u00a8", "\u0060"]:
        text = text.replace(c, "")
    normalized = "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )
    return normalized


def _match_area(line_text: str) -> Optional[str]:
    # Normaliza a string da linha para bater com as chaves de _AREA_NAMES
    normalized = _normalize_text(line_text.strip()).upper()
    normalized = re.sub(r"[^A-Z]", "", normalized)
    return _AREA_NAMES.get(normalized)


def _map_filename_subject(subj_raw: str) -> Optional[str]:
    s = subj_raw.lower()
    if "matematica" in s:
        return "Matemática"
    if "fisica" in s:
        return "Física"
    if "quimica" in s:
        return "Química"
    if "portugues" in s:
        return "Português"
    if "ingles" in s:
        return "Inglês"
    if "redacao" in s:
        return "Português"
    return None


def download_pdf(url: str, dest: Path) -> None:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    resp = requests.get(url, timeout=120, headers=headers, verify=False)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def extract_options(text: str) -> list[tuple[str, str]]:
    # Formato real (uma opção por "linha" reconstituída): "(A) texto da opção".
    m = _OPT_PAREN.match(text)
    if m:
        return [(m.group(1), m.group(2))]

    # Fallback: formato de bolha "A ( )  B ( )  ..." (não observado nos
    # cadernos de prova reais, mas mantido por segurança/compatibilidade).
    matches = list(_OPT_START.finditer(text))
    if not matches:
        return []

    options = []
    for idx, match in enumerate(matches):
        letter = match.group(1)
        start_idx = match.end()
        end_idx = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        opt_text = text[start_idx:end_idx].strip()
        options.append((letter, opt_text))
    return options


_GRID_ANSWER_TOKEN = re.compile(r"^(?:[A-E]|\*|\(\*\)|ANULADA)$")


def _parse_gabarito_grid(page) -> dict[int, str]:
    """Extrai respostas do layout de gabarito usado a partir de 2019+: uma
    linha inteira de números (uma "leva" de questões daquele bloco/disciplina)
    seguida imediatamente pela linha de respostas correspondente, alinhada
    coluna a coluna pela posição X — bem diferente do layout 2012-2018, que
    lista número+resposta lado a lado numa mesma linha dentro de colunas que
    se repetem página abaixo (ver `_parse_gabarito`).
    """
    words = page.get_text("words")

    lines: list[tuple[float, list]] = []
    for w in sorted(words, key=lambda w: w[1]):
        y0 = w[1]
        if lines and abs(lines[-1][0] - y0) <= 4:
            lines[-1][1].append(w)
        else:
            lines.append((y0, [w]))

    answers: dict[int, str] = {}
    i = 0
    while i < len(lines) - 1:
        _y_num, words_num = lines[i]
        toks_num = sorted(words_num, key=lambda w: w[0])
        if len(toks_num) >= 2 and all(t[4].isdigit() and 1 <= int(t[4]) <= 90 for t in toks_num):
            _y_ans, words_ans = lines[i + 1]
            toks_ans = sorted(words_ans, key=lambda w: w[0])
            if toks_ans and all(_GRID_ANSWER_TOKEN.match(t[4].upper()) for t in toks_ans):
                for tn in toks_num:
                    best = min(toks_ans, key=lambda ta: abs(ta[0] - tn[0]))
                    if abs(best[0] - tn[0]) < 15:
                        answers[int(tn[4])] = best[4].upper()
                i += 2
                continue
        i += 1
    return answers


def _parse_gabarito(gabarito_pdf: Path, subject: Optional[str] = None) -> dict[int, str]:
    doc = fitz.open(str(gabarito_pdf))
    answers: dict[int, str] = {}

    for page_idx, page in enumerate(doc):
        # Camada extra para o layout novo (2019+): preenche apenas os
        # números que a extração por colunas (layout antigo, abaixo) não
        # conseguiu achar nesta página — nunca sobrescreve um resultado já
        # encontrado, então o comportamento já validado para 2012-2018 fica
        # intacto.
        for num, letter in _parse_gabarito_grid(page).items():
            answers.setdefault(num, letter)

        words = page.get_text("words")  # list of (x0, y0, x1, y1, word, ...)
        
        # Encontra todos os x0 de números que aparecem (dígitos entre 1 e 80)
        num_x_coords = sorted([w[0] for w in words if w[4].isdigit() and 1 <= int(w[4]) <= 80])
        if not num_x_coords:
            continue
            
        # Agrupa x_coords em clusters (diferença <= 20px)
        clusters = []
        for x in num_x_coords:
            if not clusters or x - clusters[-1][-1] > 20:
                clusters.append([x])
            else:
                clusters[-1].append(x)
        
        # Filtra clusters para ignorar ruídos (como rodapés)
        clusters = [c for c in clusters if len(c) > 3]
        if not clusters:
            continue
            
        # O x médio de cada cluster de números define o início de uma coluna de questão
        col_centers = [sum(c)/len(c) for c in clusters]
        
        # Agrupa palavras por coluna
        col_words = defaultdict(list)
        for w in words:
            x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
            assigned_col = None
            for idx, center in enumerate(col_centers):
                if center - 25 <= x0 <= center + 75:
                    assigned_col = idx
                    break
            if assigned_col is not None:
                col_words[assigned_col].append(w)
                
        # Processa cada coluna
        for col_idx in sorted(col_words.keys()):
            # Ordena por y0 primeiro, e depois agrupa em sub-linhas para ordenar por x0
            raw_sorted = sorted(col_words[col_idx], key=lambda w: w[1])
            lines_in_col = []
            for w in raw_sorted:
                if not lines_in_col or w[1] - lines_in_col[-1][-1][1] > 4:
                    lines_in_col.append([w])
                else:
                    lines_in_col[-1].append(w)
            
            sorted_words = []
            for line in lines_in_col:
                sorted_words.extend(sorted(line, key=lambda w: w[0]))
            
            # Cabeçalho da coluna
            header_words = []
            for w in sorted_words:
                word_text = w[4]
                if word_text.isdigit() and 1 <= int(word_text) <= 80:
                    break
                if word_text in ("A", "B", "C", "D", "E", "*", "(*)", "4(*)", "10(**)"):
                    if w[1] > 150:
                        break
                header_words.append(word_text)
                
            col_subject = _repair_pdf_accents(" ".join(header_words))
            col_subject_norm = _normalize_text(col_subject).upper()
            col_subject_norm = re.sub(r"[^A-Z]", "", col_subject_norm)
            
            # Filtro por assunto (se fornecido)
            if subject:
                s_norm = _normalize_text(subject).upper()
                s_norm = re.sub(r"[^A-Z]", "", s_norm)
                if s_norm not in col_subject_norm and col_subject_norm not in s_norm:
                    continue
            
            # Lendo os tokens
            col_tokens = [w[4] for w in sorted_words[len(header_words):]]
            i = 0
            while i < len(col_tokens) - 1:
                tok = col_tokens[i]
                tok_clean = re.sub(r"[^\d]", "", tok)
                if tok_clean.isdigit():
                    num = int(tok_clean)
                    next_tok = col_tokens[i+1]
                    next_tok_clean = re.sub(r"[^\w*()#]", "", next_tok).upper()
                    
                    if next_tok_clean in ("A", "B", "C", "D", "E", "*", "(*)", "ANULADA"):
                        answers[num] = next_tok_clean
                        i += 2
                        continue
                i += 1
                
    doc.close()
    return answers


def _parse_exam(
    exam_pdf: Path,
    gabarito: dict[int, str],
    subject: Optional[str] = None,
) -> list[dict]:
    doc = fitz.open(str(exam_pdf))
    all_events = []
    
    for page_idx, page in enumerate(doc):
        words = page.get_text("words")
        
        # Agrupa palavras por y0 aproximado (limiar de 4px)
        lines_dict = defaultdict(list)
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
                
        # Constrói textos de linhas
        page_lines = []
        for y in sorted(lines_dict.keys()):
            line_words = sorted(lines_dict[y], key=lambda w: w[0])
            line_text = " ".join(w[4] for w in line_words).strip()
            page_lines.append((y, line_text))
            
        # Coleta imagens (raster + desenhos vetoriais nativos, ver pdf_figures.py)
        images_on_page = extract_figure_events(page)
                
        # Monta os eventos da página
        page_events = []
        pending_q_label = False
        pending_rest_lines: list[str] = []
        for y, l_text in page_lines:
            l_text_repaired = _repair_pdf_accents(l_text)
            stripped = l_text_repaired.strip()

            area = _match_area(l_text_repaired)
            if area:
                page_events.append((y, "area", area))
                pending_q_label = False
                pending_rest_lines = []
                continue

            # Rótulo "Questão" pendente de uma linha anterior (sem número
            # junto): esta linha deve trazer o número (sozinho, ou seguido do
            # resto do enunciado).
            if pending_q_label:
                m_num = _Q_NUM_LEAD.match(stripped)
                if m_num:
                    q_num = int(m_num.group(1))
                    trailing = m_num.group(2).strip()
                    rest_parts = pending_rest_lines + ([trailing] if trailing else [])
                    page_events.append((y, "q_start", (q_num, " ".join(rest_parts))))
                    pending_q_label = False
                    pending_rest_lines = []
                    continue
                if len(pending_rest_lines) < 5 and not _Q_LABEL_LEAD.match(stripped):
                    # Ainda não achou o número (pode haver uma legenda/título
                    # entre o rótulo e o número) — continua acumulando, com
                    # limite para não crescer indefinidamente se não for isso.
                    pending_rest_lines.append(l_text_repaired)
                    continue
                pending_q_label = False
                pending_rest_lines = []
                # cai para o processamento normal desta linha, abaixo

            m_lbl = _Q_LABEL_LEAD.match(stripped)
            if m_lbl:
                rest_text = m_lbl.group(1).strip()
                m_num_inline = _Q_NUM_LEAD.match(rest_text) if rest_text else None
                if m_num_inline:
                    # "Questão 01 <enunciado>" tudo na mesma linha
                    q_num = int(m_num_inline.group(1))
                    page_events.append((y, "q_start", (q_num, m_num_inline.group(2).strip())))
                    continue
                # Rótulo sem número na mesma linha: espera o número na(s)
                # próxima(s) linha(s), guardando o que já veio depois de
                # "Questão" (pode já ser o início do enunciado).
                pending_q_label = True
                pending_rest_lines = [rest_text] if rest_text else []
                continue

            # "02 Questão <enunciado>": número antes do rótulo, mesma linha.
            m_rev = _Q_REV.match(stripped)
            if m_rev:
                q_num = int(m_rev.group(1))
                page_events.append((y, "q_start", (q_num, m_rev.group(2).strip())))
                continue

            opts = extract_options(l_text_repaired)
            if opts:
                for letter, opt_text in opts:
                    page_events.append((y, "opt_start", (letter, opt_text)))
                continue
                
            page_events.append((y, "text", l_text_repaired))
            
        for _x_img, y_img, png in images_on_page:
            page_events.append((y_img, "image", png))
            
        # Ordena eventos da página verticalmente e anexa
        page_events.sort(key=lambda e: e[0])
        all_events.extend(page_events)
        
    doc.close()
    
    # ── Reconstituição de Questões ──────────────────────────────────────────
    questions = []
    current_area = subject or "Geral"
    q_num = None
    statement_lines = []
    options = []
    active_passage_lines = []
    current_passage = ""
    collecting_passage = False
    in_opt = False
    pending_images = []
    
    def flush():
        nonlocal q_num, statement_lines, options, pending_images
        if q_num is None:
            return
        stmt = _clean("\n".join(statement_lines))
        if not stmt:
            q_num, statement_lines, options, pending_images = None, [], [], []
            return
            
        built_opts = []
        correct_letter = gabarito.get(q_num)
        
        # Ordena e remove duplicatas de opções se houver
        unique_opts = {}
        for opt in options:
            unique_opts[opt["letter"]] = opt
            
        sorted_keys = sorted(unique_opts.keys())
        for idx, k in enumerate(sorted_keys):
            opt = unique_opts[k]
            t = _clean(" ".join(opt["lines"]))
            built_opts.append({
                "letter": opt["letter"],
                "text": t,
                "is_correct": (correct_letter == opt["letter"]) if correct_letter else False,
                "order": idx
            })
            
        img_b64 = None
        extra_images = []
        if pending_images:
            img_b64 = base64.b64encode(pending_images[0]).decode()
            for img in pending_images[1:]:
                extra_images.append(base64.b64encode(img).decode())
                
        questions.append({
            "number": q_num,
            "question_type": "multiple_choice" if built_opts else "discursive",
            "area": current_area,
            "statement": stmt,
            "answer": correct_letter,
            "image_base64": img_b64,
            "extra_images": extra_images,
            "options": built_opts
        })
        q_num, statement_lines, options, pending_images = None, [], [], []
        
    for _y, etype, val in all_events:
        if etype == "area":
            flush()
            current_area = val
            active_passage_lines = []
            current_passage = ""
            collecting_passage = False

        elif etype == "q_start":
            flush()
            if active_passage_lines:
                candidate = _clean("\n".join(active_passage_lines))
                current_passage = candidate if _looks_like_passage(candidate) else ""
                active_passage_lines = []
            collecting_passage = False
            num, rest = val
            q_num = num
            statement_lines = ([current_passage] if current_passage else [])
            if rest:
                statement_lines.append(rest)
            options = []
            in_opt = False

        elif etype == "opt_start":
            letter, opt_text = val
            if q_num is not None:
                options.append({"letter": letter, "lines": [opt_text] if opt_text else []})
                in_opt = True

        elif etype == "text":
            text_val = val
            # Ignora cabeçalhos e notas de rodapé comuns
            if "vestibular" in text_val.lower() or "rascunho" in text_val.lower():
                continue
            if re.match(r"^\d+\s*$", text_val):  # número da página
                continue

            # Marcador explícito de início de um novo texto-base (passagem
            # compartilhada por várias questões seguintes). Sem isso, depois
            # da 1ª questão o `q_num` nunca mais volta a `None`, então um
            # texto-base novo nunca era capturado — ficava sempre reaproveitando
            # o primeiro texto-base do caderno em todas as questões seguintes.
            if _TEXTO_BASE_MARKER.match(_normalize_text(text_val).strip()):
                collecting_passage = True
                active_passage_lines = []
                continue

            if collecting_passage or q_num is None:
                active_passage_lines.append(text_val)
            elif in_opt and options:
                options[-1]["lines"].append(text_val)
            else:
                statement_lines.append(text_val)
                
        elif etype == "image":
            if q_num is not None:
                pending_images.append(val)
                
    flush()
    return questions


def _persist_parsed_questions(
    db, exam_name: str, year: int, phase: str, parsed: list[dict]
) -> tuple[int, int]:
    from app.models import UerjQuestion, UerjQuestionOption, UerjQuestionImage

    added = 0
    skipped_existing = 0
    for q in parsed:
        existing = (
            db.query(UerjQuestion)
            .filter_by(exam_name=exam_name, number=q["number"], area=q["area"])
            .first()
        )
        if existing:
            skipped_existing += 1
            continue

        uq = UerjQuestion(
            exam_name=exam_name,
            university="UERJ",
            year=year,
            phase=phase,
            number=q["number"],
            question_type=q["question_type"],
            area=q["area"],
            statement=q["statement"],
            answer=q["answer"],
            image_base64=q["image_base64"],
        )
        db.add(uq)
        db.flush()

        for idx, opt in enumerate(q["options"]):
            db.add(UerjQuestionOption(
                question_id=uq.id,
                letter=opt["letter"],
                text=opt["text"],
                is_correct=opt["is_correct"],
                order=idx,
            ))

        for idx, img_b64 in enumerate(q.get("extra_images", [])):
            db.add(UerjQuestionImage(
                question_id=uq.id,
                image_base64=img_b64,
                order=idx,
            ))

        added += 1

        # Commita em lotes de 10 em vez de esperar a prova inteira: acumular
        # todas as questões (com suas imagens em base64) na sessão até um
        # único commit final é o que empurrava a memória perto do teto de
        # 512MB do Render free e derrubava o processo (OOM) no meio da
        # importação — mesma causa raiz já corrigida no ENEM e no ITA.
        if added % 10 == 0:
            db.commit()
            db.expunge_all()
            gc.collect()

    db.commit()
    db.expunge_all()
    gc.collect()
    return added, skipped_existing


_REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


def _fetch_html(url: str) -> str:
    resp = requests.get(url, timeout=30, headers=_REQUEST_HEADERS, verify=False)
    resp.raise_for_status()
    return resp.text


# ── Descoberta de páginas "Prova e Gabarito" via o menu do site (2019+) ─────
# A partir de 2019 o site da UERJ parou de listar as provas recentes na
# página estática de "Provas e Gabaritos Anteriores" (`_INDEX_URL`, cujo
# conteúdo não muda desde ~2019 e só cobre 2012-2018). Em vez disso, cada ano
# ganhou seu próprio item no menu de navegação (presente em qualquer página
# do site) — "Vestibular {ano}" → "1º Exame"/"2º Exame" (ou, em anos com só
# um exame regular, direto) → "Prova e Gabarito" — cujo link aponta pra uma
# página com os PDFs de prova/gabarito daquele exame específico, em
# `.../anexos/<id-numérico>/...pdf` (nomes de arquivo genéricos e
# inconsistentes entre anos — só dá pra saber a qual ano/fase pertencem pela
# página em que foram encontrados, não pelo nome do arquivo).
_YEAR_MENU_RE = re.compile(r'id="menu-item-\d+"[^>]*><a href="#">Vestibular (20\d\d)</a>')
_EXAM_GROUP_RE = re.compile(r">(\d)[ºo°]\s*Exame<")
_MENU_LINK_RE = re.compile(r'<a href="([^"]+)">([^<]+)</a>')
_PROVA_GABARITO_TEXT_RE = re.compile(r"prova.*gabarito|gabarito.*prova", re.IGNORECASE)

# Nomes de arquivo a ignorar mesmo que apareçam na página de "Prova e
# Gabarito": redação, padrão de resposta, edital, base legal e o
# "simulado" que a UERJ também publica ao lado da prova real de 2019.
_SUBPAGE_SKIP_KEYWORDS = ("simulado", "redacao", "padrao", "resposta", "edital", "lei")


def discover_uerj_menu_exam_pages(html: Optional[str] = None) -> list[dict]:
    """Varre o menu de navegação do site em busca das páginas "Prova e
    Gabarito" de cada exame a partir de 2019. Retorna uma lista de
    {year, phase, subpage_url} — a extração dos PDFs em si acontece depois,
    em `_extract_pdfs_from_subpage`, ao buscar cada `subpage_url`.
    """
    if html is None:
        html = _fetch_html(_INDEX_URL)

    year_matches = list(_YEAR_MENU_RE.finditer(html))
    found: dict[tuple[int, str], str] = {}

    for i, m in enumerate(year_matches):
        year = int(m.group(1))
        if year < 2019:
            continue
        start = m.end()
        end = year_matches[i + 1].start() if i + 1 < len(year_matches) else len(html)
        block = html[start:end]

        exame_matches = list(_EXAM_GROUP_RE.finditer(block))
        if exame_matches:
            segments = []
            for j, em in enumerate(exame_matches):
                phase = em.group(1)
                seg_start = em.end()
                seg_end = exame_matches[j + 1].start() if j + 1 < len(exame_matches) else len(block)
                segments.append((phase, block[seg_start:seg_end]))
        else:
            # Anos sem "1º/2º Exame" no menu tiveram só um exame escrito
            # regular (o outro processo do ano foi via nota do ENEM, sem
            # prova própria da UERJ) — trata como fase única.
            segments = [("1", block)]

        for phase, seg in segments:
            key = (year, phase)
            if key in found:
                continue
            for url, text in _MENU_LINK_RE.findall(seg):
                norm = _normalize_text(text).lower()
                if "prova" in norm and "gabarito" in norm:
                    found[key] = url
                    break

    results = [
        {"year": year, "phase": phase, "subpage_url": url}
        for (year, phase), url in found.items()
    ]
    results.sort(key=lambda r: (r["year"], r["phase"]))
    return results


def _extract_pdfs_from_subpage(html: str) -> dict:
    """A partir do HTML de uma página "Prova e Gabarito", acha os PDFs reais
    de prova e gabarito. Devolve {"prova_url", "gabarito_url", "annulled"}
    (URLs `None` quando não há um par prova+gabarito publicado ainda)."""
    pdf_re = re.compile(r'href="([^"]+\.pdf)"', re.IGNORECASE)
    hrefs = pdf_re.findall(html)

    candidates = []
    for url in hrefs:
        basename = url.rsplit("/", 1)[-1]
        norm = _normalize_text(basename).lower()
        if any(kw in norm for kw in _SUBPAGE_SKIP_KEYWORDS):
            continue
        candidates.append((url, norm))

    gabarito_candidates = [(u, n) for u, n in candidates if "gabarito" in n]
    prova_candidates = [(u, n) for u, n in candidates if (u, n) not in gabarito_candidates]

    def _pick(cands, prefer_keyword=None):
        if not cands:
            return None
        if prefer_keyword:
            for u, n in cands:
                if prefer_keyword in n:
                    return u
        return cands[0][0]

    gabarito_url = _pick(gabarito_candidates, prefer_keyword="retificado")
    prova_url = _pick(prova_candidates)

    annulled = any("anulada" in n for _u, n in gabarito_candidates)

    return {"prova_url": prova_url, "gabarito_url": gabarito_url, "annulled": annulled}


def fetch_uerj_exam_links(html: Optional[str] = None) -> list[dict]:
    if html is None:
        html = _fetch_html(_INDEX_URL)

    link_re = re.compile(r'href=[\"\'](https?://www\.vestibular\.uerj\.br/wp-content/uploads/\d{4}/\d{2}/(\d{4})_(1eq|2eq)_?(prova|gabarito)[^\.]*\.pdf)[\"\']', re.IGNORECASE)
    hrefs = link_re.findall(html)

    exams = {}
    for url, year_str, phase_str, doc_type in hrefs:
        key = f"{year_str}_{phase_str}"
        if key not in exams:
            exams[key] = {
                "exam_name": f"UERJ {year_str}",
                "year": int(year_str),
                "phase": phase_str.upper(),
                "subject": None,
                "prova_url": None,
                "gabarito_url": None
            }

        doc_type = doc_type.lower()
        if "prova" in doc_type:
            exams[key]["prova_url"] = url
        elif "gabarito" in doc_type:
            exams[key]["gabarito_url"] = url

    valid_exams = [e for e in exams.values() if e["prova_url"] and e["gabarito_url"]]

    # ── Descoberta 2019+ via o menu de navegação (não coberta pela página
    # estática acima, que parou de ser atualizada em ~2019) ────────────────
    skipped_new_scheme = []
    for entry in discover_uerj_menu_exam_pages(html):
        year, phase, subpage_url = entry["year"], entry["phase"], entry["subpage_url"]
        key = f"{year}_{phase}eq_menu"
        if key in exams:
            continue
        try:
            subpage_html = _fetch_html(subpage_url)
            pdfs = _extract_pdfs_from_subpage(subpage_html)
        except Exception as exc:
            skipped_new_scheme.append({"year": year, "phase": phase, "reason": f"Falha ao buscar {subpage_url}: {exc}"})
            continue

        if pdfs["annulled"]:
            skipped_new_scheme.append({"year": year, "phase": phase, "reason": "Exame anulado (gabarito marcado ANULADA)."})
            continue
        if not pdfs["prova_url"] or not pdfs["gabarito_url"]:
            skipped_new_scheme.append({"year": year, "phase": phase, "reason": "Prova e/ou gabarito ainda não publicados nessa página."})
            continue

        exams[key] = {
            "exam_name": f"UERJ {year}",
            "year": year,
            "phase": phase,
            "subject": None,
            "prova_url": pdfs["prova_url"],
            "gabarito_url": pdfs["gabarito_url"],
        }
        valid_exams.append(exams[key])

    valid_exams.sort(key=lambda x: (x["year"], x["phase"]), reverse=True)
    return valid_exams


def import_all_uerj_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    from app.database import SessionLocal
    from app.services.import_batch import run_batch_import

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _exam_name(link: dict) -> str:
        year, phase, subject = link["year"], link["phase"], link["subject"]
        exam_name = f"UERJ {year}"
        if str(phase).upper().startswith("2"):
            exam_name += " – 2ª Fase"
        else:
            exam_name += f" – 1ª Fase" if year >= 2019 else ""
        if subject:
            exam_name += f" ({subject})"
        return exam_name

    def _process(link: dict) -> dict:
        year, phase, subject = link["year"], link["phase"], link["subject"]
        exam_name = _exam_name(link)

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(link["prova_url"], prova_path)

            gabarito_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(link["gabarito_url"], gabarito_path)

            gabarito = _parse_gabarito(gabarito_path, subject=subject)
            parsed = _parse_exam(prova_path, gabarito, subject=subject)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida."}

        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, parsed)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}

    try:
        links = fetch_uerj_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=_exam_name, task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()


def import_uerj_pdf(
    prova_path: Path,
    gabarito_path: Optional[Path],
    year: int,
    phase: str,
    subject: Optional[str] = None,
    db=None,
) -> dict:
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name = f"UERJ {year}"
    if phase == "2":
        exam_name += " – 2ª Fase"
    else:
        exam_name += f" – 1ª Fase" if year >= 2019 else ""
    if subject:
        exam_name += f" ({subject})"

    try:
        gabarito: dict[int, str] = {}
        if gabarito_path is not None:
            gabarito = _parse_gabarito(gabarito_path, subject=subject)

        parsed = _parse_exam(prova_path, gabarito, subject=subject)
        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, parsed)

        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": added,
            "skipped_existing": skipped_existing,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()
