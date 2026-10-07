from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa provas do UEM a partir de PDFs enviados pelo Owner (prova + gabarito)
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

from app.services.pdf_figures import extract_figure_events

from app.database import SessionLocal
from app.services.import_batch import save_vestibular_question

# Constantes UEM
_INDEX_URL = "https://www.vestibular.uem.br/?page_id=7069"
_Q_START = re.compile(r"^(?:Questão|QUESTÃO)\s+(\d+)", re.IGNORECASE)
_ALT_PATTERN = re.compile(r"^\s*\(([A-D])\)\s+(.*)")

_AREA_NAMES = {
    "MATEMATICA": "Matemática",
    "FISICA": "Física",
    "QUIMICA": "Química",
    "INGLES": "Inglês",
    "PORTUGUES": "Português",
    "REDACAO": "Português",
}

_Q_START = re.compile(r"^Questao\s+(\d+)\.?\s*(.*)$", re.I)
_OPT_START = re.compile(r"\b([A-E])\s*\(\s*\)")


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


def _parse_gabarito(gabarito_pdf: Path, subject: Optional[str] = None) -> dict[int, str]:
    doc = fitz.open(str(gabarito_pdf))
    answers: dict[int, str] = {}
    
    for page_idx, page in enumerate(doc):
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
        for y, l_text in page_lines:
            l_text_repaired = _repair_pdf_accents(l_text)
            
            area = _match_area(l_text_repaired)
            if area:
                page_events.append((y, "area", area))
                continue
                
            l_text_norm = _normalize_text(l_text_repaired)
            m_q = _Q_START.match(l_text_norm)
            if m_q:
                q_num = int(m_q.group(1))
                original_rest = l_text_repaired[l_text_norm.index(m_q.group(2)):] if m_q.group(2) in l_text_norm else ""
                page_events.append((y, "q_start", (q_num, original_rest.strip())))
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
            
        elif etype == "q_start":
            flush()
            if active_passage_lines:
                candidate = _clean("\n".join(active_passage_lines))
                current_passage = candidate if _looks_like_passage(candidate) else ""
                active_passage_lines = []
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
                
            if q_num is None:
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
    db, exam_name: str, year: int, season: str, parsed: list[dict]
) -> tuple[int, int]:
    added = 0
    skipped_existing = 0
    for q in parsed:
        images = None
        extra = q.get("extra_images")
        if extra:
            images = [{"image_base64": img_b64, "order": idx} for idx, img_b64 in enumerate(extra)]

        metadata = {
            "university": "UEM",
            "season": season,
            "question_type": q.get("question_type"),
            "area": q.get("area"),
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="uem",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=q.get("options", []),
            images=images,
            image_base64=q.get("image_base64"),
            correct_option=q.get("answer") if isinstance(q.get("answer"), str) else None,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue

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


def fetch_uem_exam_links(html: Optional[str] = None) -> list[dict]:
    import urllib.parse
    if html is None:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        import requests
        resp = requests.get("https://www.cvu.uem.br/provas-gabaritos.html", timeout=30, headers=headers, verify=False)
        resp.raise_for_status()
        html = resp.text
        
    # We look for P1G1 (Prova 1) and GabDef1 (Gabarito Definitivo 1) for Vestibular Inverno (in) and Verão (ve)
    link_re = re.compile(r'href=[\"\'](https?://www\.vestibular\.uem\.br/provas/(in|ve)(\d{2})/(P1G1|GabDef1)\.pdf)[\"\']', re.IGNORECASE)
    hrefs = link_re.findall(html)
    
    exams = {}
    for url, season_code, year_code, doc_type in hrefs:
        url_decoded = urllib.parse.unquote(url)
        year = 2000 + int(year_code)
        season = "Inverno" if season_code.lower() == "in" else "Verão"
        
        key = f"{year}_{season}"
        
        if key not in exams:
            exams[key] = {
                "exam_name": f"UEM {season} {year} - Prova 1",
                "year": year,
                "season": season,
                "subject": None,
                "prova_url": None,
                "gabarito_url": None
            }
            
        doc_type = doc_type.lower()
        if doc_type == "p1g1":
            exams[key]["prova_url"] = url
        elif doc_type == "gabdef1":
            exams[key]["gabarito_url"] = url

    valid_exams = [e for e in exams.values() if e["prova_url"] and e["gabarito_url"]]
    valid_exams.sort(key=lambda x: (x["year"], x["season"]), reverse=True)
    return valid_exams


def import_all_uem_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    from app.database import SessionLocal
    from app.services.import_batch import run_batch_import

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _process(link: dict) -> dict:
        year, season, subject = link["year"], link["season"], link["subject"]
        exam_name = link["exam_name"]

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(link["prova_url"], prova_path)

            gabarito_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(link["gabarito_url"], gabarito_path)

            gabarito = _parse_gabarito(gabarito_path, subject=subject)
            parsed = _parse_exam(prova_path, gabarito, subject=subject)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida."}

        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, season, parsed)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}

    try:
        links = fetch_uem_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=lambda l: l["exam_name"], task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()


def import_uem_pdf(
    prova_path: Path,
    gabarito_path: Optional[Path],
    year: int,
    season: str,
    subject: Optional[str] = None,
    db=None,
) -> dict:
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name = f"UEM {season} {year} - Prova 1"
    if subject:
        exam_name += f" ({subject})"

    try:
        gabarito: dict[int, str] = {}
        if gabarito_path is not None:
            gabarito = _parse_gabarito(gabarito_path, subject=subject)

        parsed = _parse_exam(prova_path, gabarito, subject=subject)
        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, season, parsed)

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
