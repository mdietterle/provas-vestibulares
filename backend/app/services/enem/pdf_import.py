from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa questões do ENEM a partir de PDFs (prova + gabarito) enviados pelo Owner.

Baseado no mesmo padrão de extração por posição (PyMuPDF) usado em
`ufsc/seed.py`, adaptado ao layout de prova do ENEM (2 colunas, cabeçalhos de
área, questões numeradas "QUESTÃO NN" e 5 alternativas A-E).

Como o PDF não traz matéria fina nem dificuldade, essas duas informações são
inferidas por IA (Groq) por lote de questões, respeitando um limite de
requisições/minuto (ver `groq_rate_limiter.py`) para não estourar a cota da
conta Groq numa importação com muitas questões.
"""


import base64
import json
import re
import shutil
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

import requests

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:  # pragma: no cover - import fallback for tests
    fitz = None

from app.services.groq_rate_limiter import call_with_rate_limit
from app.services.pdf_figures import extract_figure_events


def _norm(text: str) -> str:
    """Maiúsculas, sem acentos e sem espaços — usado para casar cabeçalhos
    estruturais mesmo quando a extração do PDF insere espaços espúrios ou
    perde acentuação de forma inconsistente (observado em PDFs de anos
    diferentes do ENEM, ex.: "Quest ão 01" em vez de "QUESTÃO 01")."""
    stripped = "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )
    return re.sub(r"\s+", "", stripped).upper()


def _looks_like_pdf(url: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.lower()
    return path.endswith(".pdf") or "pdf" in path or "pdf" in parsed.query.lower()


def download_pdf(url: str, dest: Path) -> None:
    """download.inep.gov.br manda uma cadeia de certificado incompleta (falta
    o intermediário) — clientes que fazem AIA chasing (curl, navegadores)
    passam direto, mas a verificação estrita do Python falha com
    CERTIFICATE_VERIFY_FAILED. Mesmo padrão de fallback já usado nos hosts
    legados da UFSC/UNAERP: tenta verificado, cai pra sem verificação só se
    a causa for mesmo TLS.

    O host também é lento/instável para downloads grandes (a prova do Dia 1
    do ENEM, ~3-4MB com bastante texto de apoio, falhava com read-timeout em
    algumas tentativas mesmo tendo baixado com sucesso em outras) — por isso
    3 tentativas com timeout de leitura maior antes de desistir."""
    headers = {"User-Agent": "Mozilla/5.0"}
    last_error: Optional[Exception] = None
    for attempt in range(3):
        try:
            try:
                resp = requests.get(url, headers=headers, timeout=(15, 180))
            except requests.exceptions.SSLError:
                resp = requests.get(url, headers=headers, timeout=(15, 180), verify=False)
            resp.raise_for_status()
            data = resp.content
            if not data:
                raise ValueError("O download retornou um arquivo vazio.")
            dest.write_bytes(data)
            return
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_error = e
    raise last_error


def _extract_pdf_links(html: str, base_url: Optional[str] = None) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for match in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.I | re.S):
        href = match.group(1).strip()
        if not href:
            continue
        abs_url = urljoin(base_url or "", href)
        if not _looks_like_pdf(abs_url):
            continue
        text = re.sub(r'<[^>]+>', ' ', match.group(2) or '')
        text = re.sub(r'\s+', ' ', text).strip()
        links.append({"url": abs_url, "text": text})
    return links


def _select_pdf_candidate(
    html: str,
    *,
    year: int,
    is_gabarito: bool = False,
    day: Optional[int] = None,
    base_url: Optional[str] = None,
) -> Optional[str]:
    candidates = _extract_pdf_links(html, base_url=base_url)
    if not candidates:
        return None

    def score(item: dict[str, str]) -> int:
        text = f"{item['text']} {item['url']}".lower()
        score = 0
        if str(year) in text:
            score += 4
        if is_gabarito:
            if "gabarito" in text:
                score += 8
            else:
                score -= 2
            if "prova" in text:
                score -= 3
        else:
            if "prova" in text:
                score += 8
            else:
                score -= 2
            if "gabarito" in text:
                score -= 3
        if day is not None:
            day_tokens = [f"dia {day}", f"dia{day}", f"dia {day:02d}", f"dia{day:02d}", str(day)]
            if any(token in text for token in day_tokens):
                score += 3
        return score

    ranked = sorted(candidates, key=lambda item: score(item), reverse=True)
    top = ranked[0]
    return top["url"] if score(top) > -1 else None


def resolve_mec_pdf_urls(
    mec_page_url: str,
    *,
    year: int,
    day: Optional[int] = None,
) -> tuple[Optional[str], Optional[str]]:
    req = Request(mec_page_url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    prova_url = _select_pdf_candidate(html, year=year, is_gabarito=False, day=day, base_url=mec_page_url)
    gabarito_url = _select_pdf_candidate(html, year=year, is_gabarito=True, day=day, base_url=mec_page_url)
    return prova_url, gabarito_url


# ── Descoberta em lote (site oficial do INEP) ───────────────────────────────
#
# https://www.gov.br/inep/.../enem/provas-e-gabaritos/{ano} lista, pra cada
# ano, dezenas de PDFs: prova regular por dia+cor, variantes de acessibilidade
# (ampliada, superampliada, leitor de tela/NVDA, braile) e reaplicação/PPL.
# Confirmado (2015-2025) que o nome de arquivo da PROVA regular é estável:
# "{ano}_PV_impresso_D{dia}_CD{cor}.pdf" — o gabarito, porém, muda de
# convenção de nome ano a ano (ex.: 2016 "GAB_ENEM_2016_DIA_1_01_AZUL.pdf",
# 2019 "gabarito_1_dia_caderno_1_azul_aplicacao_regular.pdf"), então em vez
# de tentar casar por nome, associamos pela ORDEM dos links na página: o
# gabarito de uma prova é o primeiro link seguinte cujo texto é "Gabarito"
# (pulando variantes de acessibilidade da mesma prova, cujo texto começa com
# "Prova"). Anos anteriores a ~2015 usam nomes sem esse padrão e não são
# reconhecidos por este scraper.
_ENEM_INDEX_URL = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
_ENEM_LINK_RE = re.compile(r'<a\b[^>]*href="([^"]+\.pdf)"[^>]*>(.*?)</a>', re.I | re.S)
_ENEM_PROVA_RE = re.compile(r"/\d{4}_PV_impresso_D(\d)_CD(\d+)\.pdf$", re.I)


def fetch_enem_editions(year: int) -> list[dict]:
    """Varre a página oficial do INEP de um ano do ENEM e retorna as edições
    "regulares, impressas" reconhecíveis: uma por dia, usando a cor de menor
    número disponível (todas as cores têm as mesmas questões embaralhadas —
    importar todas seria duplicata). Não inclui reaplicação/PPL nem
    variantes de acessibilidade. Retorna [] se o ano não usa o padrão de
    nome de arquivo esperado (provavelmente anterior a 2015)."""
    url = f"{_ENEM_INDEX_URL}/{year}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    links = [(href, re.sub(r"<[^>]+>", " ", text).strip()) for href, text in _ENEM_LINK_RE.findall(html)]

    by_day: dict[int, tuple[int, str, Optional[str]]] = {}
    for i, (href, _text) in enumerate(links):
        m = _ENEM_PROVA_RE.search(href)
        if not m:
            continue
        day, cd = int(m.group(1)), int(m.group(2))
        if day not in (1, 2):
            # A aplicação nacional regular sempre teve só 2 dias. Em anos
            # com aplicações regionais extras ou reaplicação nacional (ex.:
            # 2025, com "Aplicação BELÉM, ANANINDEUA E MARITUBA" e
            # "Reaplicação" listadas na mesma página), o INEP reaproveita o
            # mesmo padrão de nome com D3, D4... — não são dias novos do
            # exame nacional, são variantes que não queremos importar aqui.
            continue

        gabarito_url = None
        for href2, text2 in links[i + 1 : i + 8]:
            if _ENEM_PROVA_RE.search(href2):
                break  # próxima cor/edição sem ter achado gabarito pra esta
            if re.match(r"^prova\b", text2, re.I):
                continue  # variante de acessibilidade da mesma prova
            if "gabarito" in text2.lower():
                gabarito_url = href2
            break

        current = by_day.get(day)
        if current is None or cd < current[0]:
            by_day[day] = (cd, href, gabarito_url)

    return [
        {"day": day, "cd": cd, "prova_url": prova_url, "gabarito_url": gabarito_url}
        for day, (cd, prova_url, gabarito_url) in sorted(by_day.items())
    ]


def import_all_enem_exams(since_year: int = 2015, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as edições "regulares, impressas" do ENEM disponíveis em
    gov.br/inep/.../enem/provas-e-gabaritos/{ano}, em regressão de
    `until_year` (padrão: 2025, última edição confirmada) até `since_year`
    (padrão: 2015 — limite de estabilidade do padrão de nome de arquivo que
    este scraper reconhece; anos anteriores são pulados e reportados).

    Não inclui reaplicação/PPL nem variantes de acessibilidade (ampliada,
    braile, NVDA) — mesmo conteúdo das provas regulares, sem valor adicional
    pro banco de questões. Cada dia de cada ano é tentado de forma
    independente; falha de rede, PDF num formato não reconhecido, ou um ano
    ainda não coberto pelo scraper não interrompem o lote."""
    from app.database import SessionLocal

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    year_to = until_year or 2025
    year_from = since_year
    years = list(range(year_to, year_from - 1, -1))

    results = []
    total_added = 0
    try:
        # Discover every (year, edition) pair up front — these are cheap HTML
        # fetches (not the multi-MB PDFs), so this finishes fast and gives an
        # accurate denominator for progress, instead of reporting progress
        # per-year (coarse: a single slow year could sit at the same percentage
        # for minutes while both of its editions import) or leaving the bar at
        # 0% while the very first year is still being processed.
        pending: list[tuple[int, dict]] = []
        for year in years:
            if task_id:
                update_task_progress(task_id, current=0, total=max(len(pending), 1), log=f"Verificando ENEM {year}...")
            try:
                editions = fetch_enem_editions(year)
            except Exception as e:
                results.append({"year": year, "skipped": True, "reason": f"Falha ao acessar a listagem do INEP: {e}"})
                continue

            if not editions:
                results.append({
                    "year": year,
                    "skipped": True,
                    "reason": "Padrão de nome de arquivo não reconhecido (provavelmente anterior a 2015)",
                })
                continue

            pending.extend((year, edition) for edition in editions)

        total_editions = len(pending)
        if task_id:
            update_task_progress(task_id, current=0, total=max(total_editions, 1), log=f"{total_editions} edições encontradas.")

        for idx, (year, edition) in enumerate(pending):
            day = edition["day"]
            try:
                r = import_enem_pdf(
                    prova_path=None,
                    gabarito_path=None,
                    year=year,
                    day=day,
                    db=db,
                    prova_url=edition["prova_url"],
                    gabarito_url=edition.get("gabarito_url"),
                    task_id=task_id,
                    items_done_before=total_added,
                )
                results.append({"year": year, "day": day, **r})
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total_editions,
                        log=f"✅ ENEM {year} dia {day}: {r.get('total_added', 0)} adicionadas.",
                        items_done=total_added,
                    )
            except Exception as e:
                db.rollback()
                results.append({"year": year, "day": day, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total_editions,
                        log=f"❌ ENEM {year} dia {day}: {e}",
                        items_done=total_added,
                    )
            finally:
                # Each edition can carry dozens of base64-encoded question images;
                # without releasing them from the session's identity map, a
                # multi-year run keeps every one of them in memory until the very
                # end, which is enough to OOM a small instance partway through.
                db.expunge_all()
                gc.collect()

        res = {"total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, res)
        return res
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()


# ── Áreas / matérias válidas por área (usadas para guiar a classificação da IA) ──
_AREA_HEADERS_NORM: list[tuple[re.Pattern, str]] = [
    # Exige a frase completa "... E SUAS TECNOLOGIAS" (não só a palavra
    # solta) para não confundir um cabeçalho de área com uma menção comum
    # dentro do enunciado de uma questão (ex.: "matemática" no meio do texto).
    (re.compile(r"LINGUAGENS,?CODIGOS.*SUASTECNOLOGIAS"), "Linguagens e Códigos"),
    (re.compile(r"CIENCIASHUMANAS.*SUASTECNOLOGIAS"), "Ciências Humanas"),
    (re.compile(r"CIENCIASDANATUREZA.*SUASTECNOLOGIAS"), "Ciências da Natureza"),
    (re.compile(r"MATEMATICA.*SUASTECNOLOGIAS"), "Matemática"),
]

SUBJECT_OPTIONS: dict[str, list[str]] = {
    "Linguagens e Códigos": ["Língua Portuguesa", "Literatura", "Artes", "Educação Física", "Tecnologias da Informação"],
    "Ciências Humanas": ["História", "Geografia", "Filosofia", "Sociologia"],
    "Ciências da Natureza": ["Biologia", "Física", "Química"],
    "Matemática": ["Matemática"],
}

_KNOWN_COLORS = ["Azul", "Amarelo", "Branco", "Rosa", "Cinza", "Verde", "Laranja", "Cinza-Claro"]

_Q_START_NORM = re.compile(r"^QUESTAO(\d{1,3})\b")
_RANGE_MARK_NORM = re.compile(r"QUESTOESDE\d+A\d+(?:\(OPCAO:?(INGLES|ESPANHOL)\))?")
_ENEM_WATERMARK = re.compile(r"(?:ENEM|ENEN)\d{4}")

_NOISE_PATTERNS = [
    re.compile(r"^\*\w+\*$"),
    re.compile(r"^\d{1,4}$"),
    re.compile(r"Exame Nacional do Ensino M[ée]dio", re.I),
    re.compile(r"1[ªa°]?\s*Aplica[çc][ãa]o", re.I),
    re.compile(r"^(LC|CH|MT|CN)\s*-\s*\d", re.I),
    re.compile(r"\.ind[bd]", re.I),
]


def _is_noise(text: str) -> bool:
    if any(p.search(text) for p in _NOISE_PATTERNS):
        return True
    # Marca d'água "ENEM2025ENEM2025..." repetida, com ou sem espaços entre as ocorrências.
    if _ENEM_WATERMARK.search(text) and not _ENEM_WATERMARK.sub("", text.replace(" ", "")):
        return True
    return False


def _match_area(text: str) -> Optional[str]:
    norm = _norm(text)
    for pattern, area in _AREA_HEADERS_NORM:
        if pattern.search(norm):
            return area
    return None


def _split_options(lines: list[str]) -> tuple[str, list[str]]:
    """Separa o enunciado das 5 alternativas (A-E), ancorando pelo fim do bloco
    (mais robusto do que detectar A-E a partir do início, pois o enunciado
    às vezes começa com uma frase iniciada por uma letra maiúscula isolada)."""
    n = len(lines)

    def find_before(upper_bound: int, letter: str) -> Optional[int]:
        pattern = re.compile(rf"^{letter}\s+\S")
        for i in range(upper_bound - 1, -1, -1):
            if pattern.match(lines[i]):
                return i
        return None

    idx_e = find_before(n, "E")
    if idx_e is None:
        return "\n".join(lines).strip(), []
    idx_d = find_before(idx_e, "D")
    idx_c = find_before(idx_d, "C") if idx_d is not None else None
    idx_b = find_before(idx_c, "B") if idx_c is not None else None
    idx_a = find_before(idx_b, "A") if idx_b is not None else None
    if None in (idx_d, idx_c, idx_b, idx_a):
        return "\n".join(lines).strip(), []

    statement = "\n".join(lines[:idx_a]).strip()
    bounds = [idx_a, idx_b, idx_c, idx_d, idx_e, n]
    options = []
    for k in range(5):
        seg = lines[bounds[k]:bounds[k + 1]]
        first = re.sub(r"^[A-E]\s*", "", seg[0], count=1)
        options.append(" ".join([first] + seg[1:]).strip())
    return statement, options


def parse_exam_pdf(path: Path) -> tuple[list[dict], Optional[str]]:
    """Parseia o PDF da prova e retorna (questões, cor_detectada).
    questões: lista de dicts {number, area, language, statement, options: [5 textos] ou [],
    image_base64, parse_error}. Detecta a cor do caderno na mesma leitura (evita abrir o
    PDF de novo só pra isso)."""
    if fitz is None:
        raise RuntimeError("PyMuPDF não está disponível para ler o PDF do ENEM.")
    doc = fitz.open(str(path))

    detected_color = None
    if doc.page_count:
        text0 = doc[0].get_text().upper()
        for c in _KNOWN_COLORS:
            if c.upper() in text0:
                detected_color = c
                break

    events: list[tuple[int, float, str, object]] = []

    for page_idx, page in enumerate(doc):
        page_dict = page.get_text("dict")
        # Layout de 2 colunas: a ordem de leitura correta é coluna esquerda
        # inteira (topo→base) e só depois a coluna direita — nunca misturada
        # por posição vertical bruta. Cada evento da página (texto OU figura)
        # entra num buffer com (coluna, y) e só é despejado em `events` já
        # ordenado por esse par, para que uma figura da coluna direita não
        # seja atribuída à questão que está sendo lida na coluna esquerda só
        # por compartilhar uma faixa de y parecida.
        mid_x = page.rect.width / 2
        page_events: list[tuple[int, float, str, object]] = []

        for x0, y0, png in extract_figure_events(page):
            col = 0 if x0 < mid_x else 1
            page_events.append((col, y0, "image", png))

        for block in page_dict["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                line_text = "".join(s["text"] for s in line["spans"]).strip()
                if not line_text:
                    continue
                x, y = line["bbox"][0], line["bbox"][1]
                col = 0 if x < mid_x else 1

                area = _match_area(line_text)
                if area:
                    page_events.append((col, y, "area", area))
                    continue

                norm_line = _norm(line_text)

                m_range = _RANGE_MARK_NORM.search(norm_line)
                if m_range:
                    lang_raw = m_range.group(1)
                    lang = None
                    if lang_raw:
                        lang = "Inglês" if lang_raw.startswith("INGLES") else "Espanhol"
                    page_events.append((col, y, "lang", lang))
                    continue

                m_q = _Q_START_NORM.match(norm_line)
                if m_q:
                    page_events.append((col, y, "q_start", int(m_q.group(1))))
                    continue

                if _is_noise(line_text):
                    continue

                page_events.append((col, y, "text", line_text))

        page_events.sort(key=lambda e: (e[0], e[1]))
        for col, y, etype, val in page_events:
            events.append((page_idx, y, etype, val))

    doc.close()

    questions: list[dict] = []
    current_area = "Geral"
    current_lang: Optional[str] = None
    q_num: Optional[int] = None
    statement_lines: list[str] = []
    pending_images: list[bytes] = []

    def flush():
        nonlocal q_num, statement_lines, pending_images
        if q_num is None:
            statement_lines, pending_images = [], []
            return
        stmt, opts = _split_options(statement_lines)
        img_b64 = None
        if pending_images:
            img_b64 = f"data:image/png;base64,{base64.b64encode(pending_images[0]).decode()}"
        questions.append({
            "number": q_num,
            "area": current_area,
            "language": current_lang,
            "statement": stmt,
            "options": opts,
            "image_base64": img_b64,
            "parse_error": not stmt or len(opts) != 5,
        })
        q_num, statement_lines, pending_images = None, [], []

    for _page_idx, _y, etype, val in events:
        if etype == "area":
            flush()
            current_area = val
            current_lang = None
        elif etype == "lang":
            flush()
            current_lang = val
        elif etype == "q_start":
            flush()
            q_num = val
        elif etype == "text":
            if q_num is not None:
                statement_lines.append(val)
        elif etype == "image":
            if q_num is not None:
                pending_images.append(val)

    flush()
    return questions, detected_color


def _parse_gabarito_pdf(path: Path) -> dict[tuple[int, Optional[str]], str]:
    """Lê o PDF do gabarito (tabela QUESTÃO | GABARITO, com colunas extras
    INGLÊS/ESPANHOL para as questões 1-5) e retorna {(número, idioma): letra}."""
    if fitz is None:
        raise RuntimeError("PyMuPDF não está disponível para ler o gabarito do ENEM.")
    doc = fitz.open(str(path))
    answers: dict[tuple[int, Optional[str]], str] = {}

    for page in doc:
        words = page.get_text("words")
        if not words:
            continue
        mid_x = page.rect.width / 2
        columns = (
            [w for w in words if w[0] < mid_x],
            [w for w in words if w[0] >= mid_x],
        )
        for col_words in columns:
            rows: dict[int, list[tuple[float, str]]] = defaultdict(list)
            for w in col_words:
                y_bucket = round(w[1] / 4) * 4
                rows[y_bucket].append((w[0], w[4]))
            for y in sorted(rows.keys()):
                row = [tok for _, tok in sorted(rows[y], key=lambda r: r[0])]
                if not row or not re.match(r"^\d{1,3}$", row[0]):
                    continue
                num = int(row[0])
                if not (1 <= num <= 200):
                    continue
                letters = [t.upper() for t in row[1:] if re.match(r"^[A-E]$", t, re.I)]
                if not letters:
                    continue
                if len(letters) >= 2 and 1 <= num <= 5:
                    answers[(num, "Inglês")] = letters[0]
                    answers[(num, "Espanhol")] = letters[1]
                else:
                    answers[(num, None)] = letters[0]

    doc.close()
    return answers


def _call_groq_classify(prompt: str) -> str:
    from app.core.config import settings
    from groq import Groq

    client = Groq(api_key=settings.GROQ_API_KEY)
    resp = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or ""


def _classify_batch(batch: list[dict], area: str) -> dict[int, dict]:
    """Usa o Groq para inferir matéria fina + dificuldade de um lote de questões
    da mesma área. Chamada já passa pelo rate limiter (call_with_rate_limit)."""
    from app.core.config import settings

    if not settings.GROQ_API_KEY:
        return {}

    subject_options = SUBJECT_OPTIONS.get(area, [])
    options_str = ", ".join(subject_options) if subject_options else "livre, mas coerente com o currículo do ensino médio brasileiro"

    blocks = []
    for q in batch:
        opts_text = "\n".join(f"{letter}) {text}" for letter, text in zip("ABCDE", q["options"]))
        blocks.append(f"Questão {q['number']}:\n{q['statement'][:1200]}\n{opts_text}")

    prompt = (
        "Você é um especialista em classificar questões de vestibular do ENEM.\n\n"
        f"Área: {area}\n"
        f"Matérias válidas para esta área (escolha exatamente uma para cada questão): {options_str}\n\n"
        "Para cada questão abaixo, retorne:\n"
        '- "subject": a matéria mais específica dentre as válidas.\n'
        '- "difficulty": nível de dificuldade — "Fácil", "Médio" ou "Difícil".\n\n'
        + "\n---\n".join(blocks)
        + '\n\nResponda SOMENTE com um objeto JSON no formato exato:\n'
        '{"classifications": [{"number": <int>, "subject": "<matéria>", "difficulty": "<nível>"}, ...]}'
    )

    raw = call_with_rate_limit(_call_groq_classify, prompt)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*"classifications".*\}', raw, re.DOTALL)
        data = json.loads(match.group()) if match else {"classifications": []}

    result: dict[int, dict] = {}
    for item in data.get("classifications", []):
        try:
            result[int(item["number"])] = {
                "subject": (str(item.get("subject") or "").strip() or None),
                "difficulty": (str(item.get("difficulty") or "").strip() or None),
            }
        except (KeyError, TypeError, ValueError):
            continue
    return result


def import_enem_pdf(
    prova_path: Optional[Path],
    gabarito_path: Optional[Path],
    year: int,
    day: int,
    color: Optional[str] = None,
    module_label: Optional[str] = None,
    db=None,
    prova_url: Optional[str] = None,
    gabarito_url: Optional[str] = None,
    mec_page_url: Optional[str] = None,
    task_id: Optional[str] = None,
    items_done_before: int = 0,
) -> dict:
    """Importa um caderno de prova ENEM via PDF local ou URL pública do MEC,
    opcionalmente com gabarito em PDF, classificando matéria e dificuldade via Groq."""
    from app.database import SessionLocal
    from app.services.import_batch import save_vestibular_question

    close_after = db is None
    if db is None:
        db = SessionLocal()

    module_label = module_label or f"Dia {day}"
    temp_dir: Optional[str] = None
    created_paths: list[Path] = []

    try:
        if prova_path is None:
            if not (prova_url or mec_page_url):
                raise ValueError("Informe um PDF da prova, uma URL da prova ou a página do MEC.")
            resolved_prova_url = prova_url
            if not resolved_prova_url and mec_page_url:
                resolved_prova_url, _ = resolve_mec_pdf_urls(mec_page_url, year=year, day=day)
            if not resolved_prova_url:
                raise ValueError("Não foi possível localizar a prova no site oficial do MEC.")
            temp_dir = tempfile.mkdtemp()
            prova_path = Path(temp_dir) / "prova.pdf"
            download_pdf(resolved_prova_url, prova_path)
            created_paths.append(prova_path)

        if gabarito_path is None and (gabarito_url or mec_page_url):
            resolved_gabarito_url = gabarito_url
            if not resolved_gabarito_url and mec_page_url:
                _, resolved_gabarito_url = resolve_mec_pdf_urls(mec_page_url, year=year, day=day)
            if resolved_gabarito_url:
                if temp_dir is None:
                    temp_dir = tempfile.mkdtemp()
                gabarito_path = Path(temp_dir) / "gabarito.pdf"
                download_pdf(resolved_gabarito_url, gabarito_path)
                created_paths.append(gabarito_path)

        gabarito = _parse_gabarito_pdf(gabarito_path) if gabarito_path else {}
        parsed, detected_color = parse_exam_pdf(prova_path)
        color = color or detected_color
        # A cor entra no exam_name porque cadernos de cores diferentes têm as
        # mesmas questões em ordem embaralhada distinta — sem isso, o "número 1"
        # de um caderno Amarelo seria confundido com o "número 1" de um Azul
        # já importado e seria silenciosamente pulado como duplicata.
        exam_name = f"ENEM {year} – Dia {day}" + (f" ({color})" if color else "")

        parse_errors = [q["number"] for q in parsed if q["parse_error"]]
        valid = [q for q in parsed if not q["parse_error"]]

        by_area: dict[str, list[dict]] = {}
        for q in valid:
            if not q["language"]:  # perguntas de língua estrangeira têm matéria fixa, sem IA
                by_area.setdefault(q["area"], []).append(q)

        classifications: dict[int, dict] = {}
        for area, qs in by_area.items():
            for i in range(0, len(qs), 10):
                batch = qs[i:i + 10]
                try:
                    classifications.update(_classify_batch(batch, area))
                except Exception as e:
                    print(f"⚠️  Falha ao classificar lote via Groq ({area}): {e}")

        added = 0
        skipped_existing = 0
        for q in valid:
            gab_letter = gabarito.get((q["number"], q["language"])) or gabarito.get((q["number"], None))
            if q["language"]:
                subject, difficulty = "Língua Estrangeira", None
            else:
                cls = classifications.get(q["number"], {})
                subject, difficulty = cls.get("subject"), cls.get("difficulty")

            options = []
            for i, opt_text in enumerate(q["options"]):
                letter = "ABCDE"[i]
                options.append({
                    "letter": letter,
                    "text": opt_text,
                    "is_correct": (gab_letter == letter),
                    "order": i,
                })

            metadata = {
                "area": q["area"],
                "language": q["language"],
                "color": color,
                "module": module_label,
                "subject": subject,
                "difficulty": difficulty,
            }

            vq, created = save_vestibular_question(
                db,
                exam_type="enem",
                exam_name=exam_name,
                year=year,
                number=q["number"],
                statement=q["statement"],
                options=options,
                image_base64=q.get("image_base64"),
                correct_option=gab_letter,
                metadata=metadata,
            )
            if not created:
                skipped_existing += 1
                continue
            added += 1

            # Commit em lotes de 10 para evitar OOM (identity map acumula
            # objetos com base64 pesado). Adapter já faz flush interno.
            if added % 10 == 0:
                db.commit()
                db.expunge_all()
                gc.collect()
                if task_id:
                    update_task_progress(
                        task_id, current=0, total=1,
                        items_done=items_done_before + added,
                    )

        db.commit()
        return {
            "exam_name": exam_name,
            "color": color,
            "total_parsed": len(parsed),
            "total_added": added,
            "skipped_existing": skipped_existing,
            "parse_errors": parse_errors,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        for temp_path in created_paths:
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass
        if temp_dir:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass
        if close_after:
            db.close()
