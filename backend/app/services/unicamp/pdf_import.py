from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import base64
import gc
import fitz
import re
import tempfile
import requests
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

from app.services.ita.pdf_import import download_pdf
from app.services.pdf_figures import extract_figure_events
from app.services.pdf_text_utils import join_lines_smart

_Q_START = re.compile(r"^QUESTÃO\s+(\d+)$", re.IGNORECASE)
_OPT_START = re.compile(r"^([a-d])\)\s*")


def _parse_gabarito(gabarito_path: Path) -> dict[int, str]:
    doc = fitz.open(str(gabarito_path))
    gabarito = {}

    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"

    lines = [l.strip() for l in text.split('\n') if l.strip()]

    for i in range(len(lines) - 1):
        if lines[i].isdigit() and lines[i+1] in ("A", "B", "C", "D", "*"):
            q_num = int(lines[i])
            if q_num not in gabarito:
                gabarito[q_num] = lines[i+1]

    return gabarito


def _parse_exam(pdf_path: Path, gabarito: dict[int, str], subject: Optional[str] = None) -> list[dict]:
    doc = fitz.open(str(pdf_path))
    all_events = []

    for page_idx, page in enumerate(doc):
        words = page.get_text("words")

        # Agrupa palavras por y0 aproximado
        lines_dict = {}
        for w in words:
            y_coord = w[1]
            matched_y = None
            for y in lines_dict.keys():
                if abs(y - y_coord) <= 4:
                    matched_y = y
                    break
            if matched_y is None:
                lines_dict[y_coord] = [w]
            else:
                lines_dict[matched_y].append(w)

        # Constrói textos de linhas
        page_lines = []
        for y in sorted(lines_dict.keys()):
            line_words = sorted(lines_dict[y], key=lambda w: w[0])
            line_text = " ".join(w[4] for w in line_words).strip()
            page_lines.append((y, line_text))

        # Coleta imagens
        images_on_page = extract_figure_events(page)

        # Monta os eventos da página
        page_events = []
        for y, l_text in page_lines:
            m_q = _Q_START.match(l_text)
            if m_q:
                q_num = int(m_q.group(1))
                page_events.append((y, "q_start", q_num))
                continue

            m_opt = _OPT_START.match(l_text)
            if m_opt:
                letter = m_opt.group(1).lower()
                text_val = _OPT_START.sub("", l_text).strip()
                page_events.append((y, "opt_start", (letter, text_val)))
                continue

            page_events.append((y, "text", l_text))

        for _x_img, y_img, png in images_on_page:
            page_events.append((y_img, "image", png))

        # Ordena eventos da página verticalmente e anexa
        page_events.sort(key=lambda e: e[0])
        all_events.extend(page_events)

    doc.close()

    # Reconstituição de Questões
    questions = []
    q_num = None
    statement_lines = []
    options = []
    in_opt = False
    pending_images = []

    def flush():
        nonlocal q_num, statement_lines, options, in_opt, pending_images
        if q_num is None:
            return

        ans = gabarito.get(q_num)
        for opt in options:
            opt["is_correct"] = (ans == opt["letter"].upper()) if ans else False

        img_b64 = None
        extra_images = []
        if pending_images:
            img_b64 = base64.b64encode(pending_images[0]).decode()
            for img in pending_images[1:]:
                extra_images.append(base64.b64encode(img).decode())

        questions.append({
            "number": q_num,
            "statement": join_lines_smart(statement_lines),
            "options": [{"letter": o["letter"].upper(), "text": "\n".join(o["lines"]).strip(), "is_correct": o["is_correct"]} for o in options],
            "question_type": "MULTIPLE_CHOICE",
            "area": subject or "Geral",
            "answer": ans,
            "image_base64": img_b64,
            "extra_images": extra_images,
        })

        q_num = None
        statement_lines = []
        options = []
        in_opt = False
        pending_images = []

    for _y, etype, val in all_events:
        if etype == "q_start":
            flush()
            q_num = val
            continue

        elif etype == "opt_start":
            letter, text_val = val
            if q_num is not None:
                options.append({"letter": letter, "lines": [text_val] if text_val else []})
                in_opt = True
            continue

        elif etype == "text":
            text_val = val
            # ignore footer page numbers
            if text_val.isdigit() and len(text_val) < 3:
                continue
            if q_num is not None:
                if in_opt and options:
                    options[-1]["lines"].append(text_val)
                else:
                    statement_lines.append(text_val)
            continue

        elif etype == "image":
            if q_num is not None:
                pending_images.append(val)

    flush()
    return questions


def _persist_parsed_questions(
    db, exam_name: str, year: int, phase: str, parsed: list[dict]
) -> tuple[int, int]:
    from app.services.import_batch import save_vestibular_question
    from app.vestibular.models import VestibularQuestion

    added = 0
    skipped_existing = 0
    for q in parsed:
        existing = (
            db.query(VestibularQuestion)
            .filter_by(exam_type="unicamp", exam_name=exam_name, number=q["number"])
            .first()
        )
        if existing:
            skipped_existing += 1
            continue

        options = [
            {
                "letter": opt["letter"],
                "text": opt["text"],
                "is_correct": opt["is_correct"],
                "order": idx,
            }
            for idx, opt in enumerate(q["options"])
        ]

        images = []
        if q.get("image_base64"):
            images.append({"image_base64": q["image_base64"], "order": 0})
        for idx, img_b64 in enumerate(q.get("extra_images", [])):
            images.append({"image_base64": img_b64, "order": idx + 1})

        vq, created = save_vestibular_question(
            db=db,
            exam_type="unicamp",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            answer=q["answer"],
            image_base64=None,
            options=options,
            images=images,
            metadata={"area": q["area"], "question_type": q["question_type"], "phase": phase},
        )
        if created:
            added += 1
        else:
            skipped_existing += 1

    db.commit()
    return added, skipped_existing


# Anos com URL de prova/gabarito conhecida manualmente antes de existir
# descoberta automática (nomes de arquivo antigos não seguem o padrão
# "*-gabarito.pdf" usado a partir de 2026, então não valia a pena tentar
# generalizar a busca pra eles também).
_UNICAMP_LEGACY_LINKS = [
    {
        "year": 2025,
        "phase": "1",
        "subject": None,
        "prova_url": "https://www.comvest.unicamp.br/vest2025/F1/f12025Q_Z.pdf",
        "gabarito_url": "https://www.comvest.unicamp.br/wp-content/uploads/2024/10/QZ_gabarito_2025_FINAL_site.pdf"
    },
    {
        "year": 2024,
        "phase": "1",
        "subject": None,
        "prova_url": "https://www.comvest.unicamp.br/vest2024/F1/f12024Q_Y.pdf",
        "gabarito_url": "https://www.comvest.unicamp.br/wp-content/uploads/2023/10/Q_Y.pdf"
    }
]

_COMVEST_HOME_URL = "https://www.comvest.unicamp.br/"
_COMVEST_YEAR_RE = re.compile(r"ingresso-(\d{4})", re.I)
_UNICAMP_F1_PROVA_RE = re.compile(r'href="([^"]*/F1/f1(\d{4})([A-Za-z]_[A-Za-z])\.pdf)"', re.I)
_UNICAMP_PDF_HREF_RE = re.compile(r'href="([^"]*\.pdf)"', re.I)


def _discover_unicamp_years() -> set[int]:
    """A Comvest usa uma URL por ciclo (ingresso-AAAA/vestibular-AAAA/...) —
    mesma armadilha do domínio anual da COPERVE/UFSC: fixar um ano faz o
    importador nunca ganhar o ciclo seguinte. Descobre os anos vigentes a
    partir dos links "ingresso-AAAA" na home da Comvest."""
    try:
        resp = requests.get(_COMVEST_HOME_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        return {int(y) for y in _COMVEST_YEAR_RE.findall(resp.text)}
    except Exception:
        return set()


def _fetch_unicamp_year_links(year: int) -> list[dict]:
    """Varre a página de provas/gabaritos da 1ª fase de um ano e casa cada
    variante (Q_X, R_Y, S_Z, T_W, ...) com seu gabarito pelo código comum no
    nome do arquivo (ignorando "_"/maiúsculas) — evita depender de um padrão
    de nome fixo pro gabarito, que já mudou entre 2024 e 2026."""
    url = f"https://www.comvest.unicamp.br/ingresso-{year}/vestibular-{year}/provas-e-gabaritos-vestibular-{year}/"
    try:
        resp = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
    except Exception:
        return []

    html = resp.text
    all_pdf_links = _UNICAMP_PDF_HREF_RE.findall(html)

    def norm(s: str) -> str:
        return re.sub(r"[^A-Za-z0-9]", "", s).upper()

    links = []
    for prova_url, page_year, code in _UNICAMP_F1_PROVA_RE.findall(html):
        if int(page_year) != year:
            continue
        code_norm = norm(code)
        gabarito_url = next(
            (u for u in all_pdf_links if "gabarito" in u.lower() and code_norm in norm(Path(u).name)),
            None,
        )
        if not gabarito_url:
            continue
        links.append({
            "year": year,
            "phase": "1",
            # As variantes (Q_X, R_Y, S_Z, T_W, ...) têm conteúdo DIFERENTE
            # (línguas estrangeiras diferentes) mas reaproveitam a mesma
            # numeração de questão — sem isso no exam_name, a dedup por
            # (exam_name, number, area) em _persist_parsed_questions trata
            # as questões da 2ª/3ª/4ª variante como duplicatas da 1ª e
            # descarta tudo, mesmo sendo provas diferentes.
            "subject": code,
            "prova_url": prova_url,
            "gabarito_url": gabarito_url,
        })
    return links


def fetch_unicamp_exam_links(html: Optional[str] = None) -> list[dict]:
    known_years = {l["year"] for l in _UNICAMP_LEGACY_LINKS}
    discovered = []
    for year in sorted(_discover_unicamp_years() - known_years):
        discovered.extend(_fetch_unicamp_year_links(year))
    return _UNICAMP_LEGACY_LINKS + discovered


def import_all_unicamp_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, force_reimport: bool = False, db=None, **kwargs) -> dict:
    from app.database import SessionLocal
    from app.services.import_batch import run_batch_import

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _exam_name(link: dict) -> str:
        year, phase, subject = link["year"], link["phase"], link["subject"]
        exam_name = f"UNICAMP {year}"
        if phase == "2":
            exam_name += " – 2ª Fase"
        else:
            exam_name += f" – 1ª Fase"
        if subject:
            exam_name += f" ({subject})"
        return exam_name

    def _process(link: dict, force_reimport: bool = False) -> dict:
        year, phase, subject = link["year"], link["phase"], link["subject"]
        exam_name = _exam_name(link)

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(link["prova_url"], prova_path)

            gabarito_path = Path(tmp_dir) / "gabarito.pdf"
            download_pdf(link["gabarito_url"], gabarito_path)

            gabarito = _parse_gabarito(gabarito_path)
            parsed = _parse_exam(prova_path, gabarito, subject=subject)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida."}

        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, parsed, force_reimport=force_reimport)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}

    try:
        links = fetch_unicamp_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=_exam_name, task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()


def import_unicamp_pdf(
    prova_path: Path,
    gabarito_path: Optional[Path],
    year: int,
    phase: str,
    subject: Optional[str] = None,
    db=None,
    force_reimport: bool = False,
) -> dict:
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name = f"UNICAMP {year}"
    if phase == "2":
        exam_name += " – 2ª Fase"
    else:
        exam_name += f" – 1ª Fase"
    if subject:
        exam_name += f" ({subject})"

    try:
        gabarito: dict[int, str] = {}
        if gabarito_path is not None:
            gabarito = _parse_gabarito(gabarito_path)

        parsed = _parse_exam(prova_path, gabarito, subject=subject)
        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, parsed, force_reimport=force_reimport)

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
