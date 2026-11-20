"""Importa provas do UFMS a partir dos PDFs espelhados pelo Brasil Escola
(vestibular.brasilescola.uol.com.br).

O site oficial (vestibular.ufms.br) não responde e as URLs antigas em
concurso.fapec.org retornam 404. O Brasil Escola espelha provas+gabarito em
PDF unico, acessivel via link "/baixar/<id>" que redireciona 302 para o PDF
no CDN do UOL.

Disponiveis como PDF direto (prova + gabarito combinados):
    2026, 2025, 2023 e 2022 (EaD).

Edicoes em .zip/.rar (Passe, PSV, 2006-2021 presencial) nao sao tratadas aqui
— precisariam de suporte a arquivo compactado (ver app/services/acafe/seed.py
para exemplo de .zip).

Fonte: https://vestibular.brasilescola.uol.com.br/downloads/universidade-federal-mato-grosso-sul.htm
"""

from __future__ import annotations

import base64
import re
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.pdf_figures import extract_figure_events
from app.services.pdf_text_utils import join_lines_smart

from app.database import SessionLocal
from app.services.import_batch import save_vestibular_question

# Constantes UFMS
_INDEX_URL = (
    "https://vestibular.brasilescola.uol.com.br/"
    "downloads/universidade-federal-mato-grosso-sul.htm"
)

# ano -> id de download no Brasil Escola (somente links que resolvem para PDF
# direto; links .zip/.rar estao fora do escopo deste importador).
_BRASIL_ESCOLA_IDS: dict[int, int] = {
    2026: 47808,  # Provas e gabaritos UFMS 2026
    2025: 47702,  # Provas e gabaritos UFMS 2025
    2023: 47572,  # Provas e gabaritos UFMS 2023
    2022: 47541,  # Prova e gabarito UFMS EaD 2022
}

# Numero de questoes por disciplina na ordem em que aparecem no gabarito (e
# na prova). Usado apenas para montar o mapa area por numero global da questao.
_DISCIPLINA_COUNTS: list[tuple[str, int]] = [
    ("Espanhol", 5),
    ("Ingles", 5),
    ("Portugues", 10),
    ("Matematica", 10),
    ("Biologia", 10),
    ("Fisica", 10),
    ("Quimica", 5),
    ("Geografia/Historia/Filosofia/Sociologia", 10),
]

_AREA_LABELS: dict[str, str] = {
    "Espanhol": "Espanhol",
    "Ingles": "Inglês",
    "Portugues": "Português",
    "Matematica": "Matemática",
    "Biologia": "Biologia",
    "Fisica": "Física",
    "Quimica": "Química",
    "Geografia/Historia/Filosofia/Sociologia": "Geografia/História/Filosofia/Sociologia",
}

# Numeracao de questoes da prova: "01.", "02.", ... "60." (2 digitos).
# "Questão N" (1 digito, usado na prova online 2025) nao e suportado pelo
# parser de alternativas deste importador — deixamos essas paginas de fora
# por enquanto (elas nao contam como questoes reconhecidas).
_Q_START = re.compile(r"^(\d{1,2})\.\s", re.I)
_ALT_START = re.compile(r"^\s*([A-E])\s*\)\s?(.*)", re.I)
_GABARITO_LETTER = re.compile(r"\b([A-E])\b")

# Paginas de prova tem alternativas no formato "A)" (presencial). Paginas de
# edital, gabarito, instrucoes da capa e redacao nao tem alternativas e devem
# ser ignoradas mesmo que contenham "Pagina X de Y".
_HAS_OPTIONS = re.compile(r"(?m)^\s*[A-E]\s*\)", re.I)

# Instrucoes da pagina de capa usam 1 digito puro ("1.", "2.", ...) e nao
# sao questoes reais.
_INSTRUCTION_KEYWORDS = (
    "instrucoes", "instruções", "manuseie", "cartao-resposta", "cartão-resposta",
    "rasuras", "comunicar-se", "proibido", "proibida", "autorizacao",
    "autorização", "constam todas", "marcacoes indevidas", "marcações indevidas",
)

_AREA_SKIP = re.compile(
    r"LINGUAGENS|CIENCIAS\s+DA\s+NATUREZA|CIENCIAS\s+HUMANAS|PROCESSO\s+SELETIVO",
    re.I,
)


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

    # 2. Til espacado antes/depois de letras
    text = text.replace("˜a", "ã").replace("a˜", "ã")
    text = text.replace("˜o", "õ").replace("o˜", "õ")
    text = text.replace("˜A", "Ã")
    text = re.sub(r"˜\s*a", "ã", text)
    text = re.sub(r"˜\s*o", "õ", text)
    text = re.sub(r"˜\s*A", "Ã", text)

    # 3. Agudo espacado
    text = re.sub(r"´\s*a", "á", text)
    text = re.sub(r"´\s*e", "é", text)
    text = re.sub(r"´\s*i", "í", text)
    text = re.sub(r"´\s*o", "ó", text)
    text = re.sub(r"´\s*u", "ú", text)
    text = re.sub(r"´\s*A", "Á", text)
    text = re.sub(r"´\s*E", "É", text)
    text = re.sub(r"´\s*I", "Í", text)
    text = re.sub(r"´\s*O", "Ó", text)
    text = re.sub(r"´\s*U", "Ú", text)
    # Trata dotless i (ı) comum em LaTeX com acentos
    text = text.replace("´ı", "í").replace("´¨ı", "ï").replace("ı", "i")

    # 4. Circunflexo espacado
    text = re.sub(r"ˆ\s*a", "â", text)
    text = re.sub(r"ˆ\s*e", "ê", text)
    text = re.sub(r"ˆ\s*o", "ô", text)
    text = re.sub(r"ˆ\s*A", "Â", text)
    text = re.sub(r"ˆ\s*E", "Ê", text)
    text = re.sub(r"ˆ\s*O", "Ô", text)

    # 5. Crase espacada
    text = re.sub(r"`\s*a", "à", text)
    text = re.sub(r"`\s*A", "À", text)

    # 6. Cedilha
    text = text.replace("c¸", "ç").replace("¸c", "ç").replace("C¸", "Ç")
    text = re.sub(r"c\s*¸", "ç", text)
    text = re.sub(r"C\s*¸", "Ç", text)

    return text


def _normalize_text(text: str) -> str:
    # Remove acentos espacados basicos antes de normalizar
    for c in ["˜", "´", "ˆ", "¨", "`"]:
        text = text.replace(c, "")
    normalized = "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )
    return normalized


def _match_area(line_text: str) -> Optional[str]:
    # Normaliza a string da linha para bater com as chaves de _AREA_NAMES
    normalized = _normalize_text(line_text.strip()).upper()
    normalized = re.sub(r"[^A-Z]", "", normalized)
    _AREA_NAMES = {
        "MATEMATICA": "Matemática",
        "FISICA": "Física",
        "QUIMICA": "Química",
        "INGLES": "Inglês",
        "PORTUGUES": "Português",
        "REDACAO": "Português",
    }
    return _AREA_NAMES.get(normalized)


_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
]


def download_pdf(url: str, dest: Path, max_retries: int = 3) -> None:
    """Download PDF with retry and rotating User-Agent to avoid CDN blocks.

    Brasil Escola uses Cloudflare which may reject datacenter IPs or
    repeated requests with the same fingerprint. Rotating User-Agent and
    retrying with exponential backoff mitigates transient connection errors
    (Errno 101 Network is unreachable, connection reset, etc.).
    """
    import time
    import random

    last_exc: Optional[Exception] = None
    for attempt in range(max_retries):
        ua = _USER_AGENTS[attempt % len(_USER_AGENTS)]
        headers = {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        try:
            resp = requests.get(
                url, timeout=120, headers=headers, verify=False,
                allow_redirects=True,
            )
            resp.raise_for_status()
            if resp.content[:4] != b"%PDF":
                raise ValueError(f"A URL não retornou um PDF: {url}")
            dest.write_bytes(resp.content)
            return
        except (requests.ConnectionError, requests.Timeout, OSError) as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                wait = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait)
        except requests.HTTPError:
            raise  # HTTP errors (4xx/5xx) are not retried
    raise last_exc  # type: ignore[misc]


def extract_options(text: str) -> list[tuple[str, str]]:
    matches = list(_ALT_START.finditer(text))
    if not matches:
        return []

    options = []
    for idx, match in enumerate(matches):
        letter = match.group(1).upper()
        start_idx = match.end()
        end_idx = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        opt_text = text[start_idx:end_idx].strip()
        options.append((letter, opt_text))
    return options


def _parse_gabarito(text: str) -> list[str]:
    """Extrai as letras do gabarito em ordem sequencial de aparicao.

    O gabarito do Brasil Escola tem blocos:

        DISCIPLINA
        Língua Estrangeira moderna
        Espanhol
        ...
        QUESTÃO 01 02 03 04 05 01 02 ...
        GABARITO E B C C E E B A D C ...

    Retorna a lista plana de letras na ordem em que aparecem (disciplina por
    disciplina, questao por questao), que deve casar com a ordem de aparicao
    das questoes na prova.
    """
    letters: list[str] = []
    in_gabarito = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == "GABARITO":
            in_gabarito = True
            continue
        if stripped == "DISCIPLINA" or stripped == "QUESTÃO":
            in_gabarito = False
            continue
        if in_gabarito:
            for tok in stripped.split():
                if _GABARITO_LETTER.fullmatch(tok):
                    letters.append(tok.upper())
    return letters


def _parse_prova_pages(doc, page_indices: list[int]) -> list[dict]:
    """Extrai questoes das paginas indicadas, em ordem de aparicao.

    Numeracao e sequencial global (1..N) baseada na ordem de deteccao, nao
    no numero impresso no PDF (que reinicia por disciplina). O casamento com
    o gabarito tambem e sequencial, entao ambos devem usar a mesma ordem.
    """
    all_questions: list[dict] = []
    global_counter = 0

    for page_idx in page_indices:
        page = doc[page_idx]
        words = page.get_text("words")

        # Agrupa palavras por linha (y0 aproximado, limiar 4px)
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

        page_lines: list[tuple[float, str]] = []
        for y in sorted(lines_dict.keys()):
            line_words = sorted(lines_dict[y], key=lambda w: w[0])
            line_text = " ".join(w[4] for w in line_words).strip()
            page_lines.append((y, line_text))

        images_on_page = extract_figure_events(page)

        page_events: list[tuple[float, str, object]] = []
        for y, l_text in page_lines:
            l_text_repaired = _repair_pdf_accents(l_text)

            m_q = _Q_START.match(l_text_repaired)
            if m_q:
                # Instrucoes da pagina de capa usam 1 digito puro ("1.", "2.", ...)
                # e nao sao questoes reais.
                q_num = int(m_q.group(1))
                if q_num < 10 and any(k in l_text_repaired.lower() for k in _INSTRUCTION_KEYWORDS):
                    continue
                rest = l_text_repaired[m_q.end():].strip()
                page_events.append((y, "q_start", (q_num, rest)))
                continue

            opts = extract_options(l_text_repaired)
            if opts:
                for letter, opt_text in opts:
                    page_events.append((y, "opt_start", (letter, opt_text)))
                continue

            page_events.append((y, "text", l_text_repaired))

        for _x_img, y_img, png in images_on_page:
            page_events.append((y_img, "image", png))

        page_events.sort(key=lambda e: e[0])

        # Reconstituicao de questoes desta pagina
        q_num: Optional[int] = None
        statement_lines: list[str] = []
        options: list[dict] = []
        pending_images: list[bytes] = []
        current_passage = ""
        active_passage_lines: list[str] = []
        in_opt = False

        def flush():
            nonlocal q_num, statement_lines, options, pending_images
            if q_num is None:
                return
            stmt = _clean(join_lines_smart(statement_lines))
            if not stmt:
                q_num, statement_lines, options, pending_images = None, [], [], []
                return

            unique_opts: dict[str, dict] = {}
            for opt in options:
                unique_opts[opt["letter"]] = opt

            built_opts = []
            sorted_keys = sorted(unique_opts.keys())
            for order_idx, k in enumerate(sorted_keys):
                opt = unique_opts[k]
                t = _clean(" ".join(opt["lines"]))
                built_opts.append({
                    "letter": opt["letter"],
                    "text": t,
                    "order": order_idx,
                })

            img_b64 = None
            extra_images = []
            if pending_images:
                img_b64 = base64.b64encode(pending_images[0]).decode()
                for img in pending_images[1:]:
                    extra_images.append(base64.b64encode(img).decode())

            nonlocal global_counter
            global_counter += 1
            all_questions.append({
                "number": global_counter,
                "statement": stmt,
                "options": built_opts,
                "image_base64": img_b64,
                "extra_images": extra_images,
            })
            q_num, statement_lines, options, pending_images = None, [], [], []

        for _y, etype, val in page_events:
            if etype == "q_start":
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
                if "vestibular" in text_val.lower() or "rascunho" in text_val.lower():
                    continue
                if re.match(r"^\d+\s*$", text_val):  # numero da pagina solto
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

    return all_questions


def _build_area_map(total_questions: int) -> dict[int, str]:
    """Mapa numero global da questao -> area, baseado na ordem das disciplinas."""
    area_map: dict[int, str] = {}
    current = 1
    for disciplina, count in _DISCIPLINA_COUNTS:
        label = _AREA_LABELS[disciplina]
        for _ in range(count):
            if current > total_questions:
                break
            area_map[current] = label
            current += 1
    return area_map


def _parse_pdf(pdf_path: Path) -> list[dict]:
    """Le um PDF combinado (edital+gabarito+prova) e retorna questoes parseadas."""
    doc = fitz.open(str(pdf_path))

    gabarito_letters: list[str] = []
    prova_pages: list[int] = []
    for page_idx, page in enumerate(doc):
        text = page.get_text()
        if "GABARITO PRELIMINAR" in text:
            gabarito_letters.extend(_parse_gabarito(text))
        # Pagina de prova tem alternativas "A)" E nao e pagina de edital/gabarito/
        # instrucoes/redacao. Essas paginas podem conter "A)" em tabelas mas nao
        # sao questoes reais.
        is_non_prova = any(kw in text for kw in (
            "GABARITO PRELIMINAR", "EDITAL Nº", "DOS RECURSOS",
            "CRITÉRIOS DE AVALIAÇÃO", "RASCUNHO", "Tabela Periódica",
        ))
        if _HAS_OPTIONS.search(text) and not is_non_prova:
            prova_pages.append(page_idx)

    all_questions = _parse_prova_pages(doc, prova_pages)

    doc.close()

    # Casamento sequencial: i-esima questao da prova recebe i-esima resposta
    # do gabarito (ambas em ordem de aparicao).
    for idx, q in enumerate(all_questions):
        if idx < len(gabarito_letters):
            q["answer"] = gabarito_letters[idx]
        else:
            q["answer"] = None

    area_map = _build_area_map(len(all_questions))
    for q in all_questions:
        q["area"] = area_map.get(q["number"], "Geral")

    return all_questions


def _persist_parsed_questions(
    db, exam_name: str, year: int, season: str, parsed: list[dict],
    force_reimport: bool = False,
) -> tuple[int, int]:
    added = 0
    skipped_existing = 0
    for q in parsed:
        images = None
        extra = q.get("extra_images")
        if extra:
            images = [{"image_base64": img_b64, "order": idx} for idx, img_b64 in enumerate(extra)]

        metadata = {
            "university": "UFMS",
            "season": season,
            "question_type": q.get("question_type", "multiple_choice"),
            "area": q.get("area"),
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="ufms",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=q.get("options", []),
            images=images,
            image_base64=q.get("image_base64"),
            correct_option=q.get("answer") if isinstance(q.get("answer"), str) else None,
            metadata=metadata,
            force_reimport=force_reimport,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

        # Commita em lotes de 10 para nao acumular tudo na sessao (evita OOM
        # no plano free do Render, mesmo problema ja corrigido em ENEM e ITA).
        if added % 10 == 0:
            db.commit()
            db.expunge_all()

    db.commit()
    db.expunge_all()
    return added, skipped_existing


def fetch_ufms_exam_links(html: Optional[str] = None) -> list[dict]:
    """Devolve links de prova do UFMS espelhados pelo Brasil Escola.

    `html` e ignorado (mantido por compatibilidade com a assinatura usada por
    outros importadores): os links sao estaticos porque a pagina oficial nao
    responde e os links diretos do concurso.fapec.org estao fora do ar.
    """
    links: list[dict] = []
    for year, be_id in _BRASIL_ESCOLA_IDS.items():
        label = "EaD " if year == 2022 else ""
        links.append({
            "exam_name": f"UFMS {year}",
            "year": year,
            "stage": 1,
            "subject": None,
            "prova_url": f"https://vestibular.brasilescola.uol.com.br/baixar/{be_id}",
            "gabarito_url": None,  # gabarito vem no mesmo PDF da prova
        })
    return links


def import_all_ufms_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, force_reimport: bool = False, db=None, **kwargs) -> dict:
    from app.services.import_batch import run_batch_import

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _process(link: dict, force_reimport: bool = False) -> dict:
        year = link["year"]
        exam_name = link["exam_name"]

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(link["prova_url"], prova_path)

            # O PDF do Brasil Escola ja traz gabarito + prova num so arquivo.
            parsed = _parse_pdf(prova_path)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida."}

        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, "1", parsed, force_reimport=force_reimport)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}

    try:
        links = fetch_ufms_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=lambda l: l["exam_name"], task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()


def import_ufms_pdf(
    prova_path: Path,
    gabarito_path: Optional[Path],
    year: int,
    season: str,
    subject: Optional[str] = None,
    db=None,
    force_reimport: bool = False,
) -> dict:
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name = f"UFMS {season} {year} - Prova 1"
    if subject:
        exam_name += f" ({subject})"

    try:
        # Se um gabarito separado nao for fornecido, tenta extrair do proprio
        # PDF da prova (o Brasil Escola entrega ambos combinados).
        parsed = _parse_pdf(prova_path)
        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, season, parsed, force_reimport=force_reimport)

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
