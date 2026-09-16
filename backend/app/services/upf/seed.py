from __future__ import annotations

"""Importa questões do vestibular da UPF (Universidade de Passo Fundo)
direto do site oficial, upf.br/ingresso/provas/vestibulares-anteriores.

Cada edição (ex.: "verao-2025-1", "inverno-2024-2") tem uma página própria
listando PDFs. Interessam dois: o caderno "Tipo A" (a prova em si) e o
"Gabarito" (tabela com resposta certa de Tipo A e Tipo B lado a lado — só
usamos a coluna Tipo A, já que Tipo B é a mesma prova com alternativas
reordenadas pra dificultar cola, não outra prova).

Formato do caderno de prova: cada questão é demarcada por um separador
"--------- Questão N ----------" no texto extraído do PDF, seguido do
enunciado e das alternativas "a)" a "e)" em sequência. Datas de Língua
Estrangeira (Inglês/Espanhol) reaproveitam a mesma numeração (17-24) —
diferenciadas pelo campo `area`, igual o importador da PUC-Rio faz.

Formato do gabarito: uma tabela com 4 colunas por questão (Número,
Matéria, Tipo A, Tipo B), impressa em duas colunas visuais que a extração
de texto do PyMuPDF lineariza em blocos sequenciais de 4 tokens — não
importa a ordem visual, só extrai em grupos de 4.

Validado contra o Vestibular de Verão 2025/1 (72 questões declaradas, 80
com as duplicatas de idioma): 80/80 casadas no gabarito, 78/80 com
alternativas reconhecidas (2 exceções documentadas abaixo).

Exceções conhecidas:
- Questões cujas alternativas são impressas sem o marcador "a)".."e)" no
  texto (ex.: listas com marcador gráfico/bullet que não vira texto na
  extração) não são reconhecidas — a questão é pulada e reportada, não
  trava o lote.
- Datas anteriores a meados de 2020 podem não ter PDFs digitalizados no
  mesmo padrão (ou nenhum PDF publicado) — edições sem link "Tipo A" ou
  "Gabarito" reconhecível são puladas."""

import re
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_INDEX_URL = "https://www.upf.br/ingresso/provas"
_EDITION_BASE = "https://www.upf.br/ingresso/provas/vestibulares-anteriores/"

_EDITION_SLUG_RE = re.compile(r'vestibulares-anteriores/((?:verao|inverno)-[\w-]+)')
_LINK_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.S | re.I)
_HEADER_FOOTER_RE = re.compile(r'Vestibular d[ei]\s*\w+\s*\d{4}[^\n]*(?:\n\s*UPF[^\n]*)?\s*\n?\s*Prova tipo [AB][^\n]*', re.I)
_QUESTION_RE = re.compile(r'-{3,}\s*Quest(?:ã|a)o\s*(\d+)\s*-{3,}\s*(.*?)(?=-{3,}\s*Quest|\Z)', re.S)
_OPTION_RE = re.compile(r'\n?([a-e])\)\s*(.*?)(?=\n[a-e]\)\s|\Z)', re.S)


def _clean_label(html_label: str) -> str:
    text = re.sub(r'<[^>]+>', '', html_label)
    text = text.replace('&nbsp;', ' ').replace('&atilde;', 'ã').replace('&iacute;', 'í').replace('&ccedil;', 'ç')
    return re.sub(r'\s+', ' ', text).strip()


def _year_and_season_from_slug(slug: str) -> tuple[int, str]:
    # "verao-2025-1" -> (2025, "Verão"); "inverno-2023-02" -> (2023, "Inverno")
    m = re.match(r'(verao|inverno)-(\d{4})', slug)
    if not m:
        raise ValueError(f"Slug de edição não reconhecido: {slug}")
    season = "Verão" if m.group(1) == "verao" else "Inverno"
    return int(m.group(2)), season


def fetch_upf_editions() -> list[dict]:
    """Varre a página índice de provas e retorna uma entrada por edição:
    {slug, year, season, url}."""
    resp = requests.get(_INDEX_URL, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    slugs = sorted(set(_EDITION_SLUG_RE.findall(resp.text)))

    editions = []
    for slug in slugs:
        try:
            year, season = _year_and_season_from_slug(slug)
        except ValueError:
            continue
        editions.append({"slug": slug, "year": year, "season": season, "url": _EDITION_BASE + slug})
    return editions


def _find_pdf_links(edition_url: str) -> dict[str, str]:
    """Abre a página de uma edição e retorna {label: url} pros links de PDF
    encontrados (rótulo já limpo de HTML entities)."""
    resp = requests.get(edition_url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    links = {}
    for href, raw_label in _LINK_RE.findall(resp.text):
        if not href.lower().endswith('.pdf'):
            continue
        label = _clean_label(raw_label)
        if label:
            links[label] = href
    return links


def _pick_link(links: dict[str, str], *candidates: str) -> Optional[str]:
    for label, url in links.items():
        for cand in candidates:
            if cand.lower() in label.lower():
                return url
    return None


def _download_pdf_text(url: str) -> tuple[str, "fitz.Document"]:
    resp = requests.get(url, headers=_HEADERS, timeout=60)
    resp.raise_for_status()
    doc = fitz.open(stream=resp.content, filetype="pdf")
    full_text = "".join(page.get_text() for page in doc)
    return full_text, doc


def _parse_exam_booklet(raw_text: str) -> dict[int, dict]:
    """Retorna {numero: {statement, options: {letra: texto}}}."""
    text = _HEADER_FOOTER_RE.sub('', raw_text)
    questions: dict[int, dict] = {}
    seen_numbers: dict[int, int] = {}
    for num_str, body in _QUESTION_RE.findall(text):
        num = int(num_str)
        # questões de língua estrangeira repetem número (17-24 inglês e
        # espanhol); a 2ª ocorrência do mesmo número vira uma entrada
        # "virtual" que é casada com o gabarito depois pela área.
        seen_numbers[num] = seen_numbers.get(num, 0) + 1
        key = num if seen_numbers[num] == 1 else num + 1000 * (seen_numbers[num] - 1)

        body = body.strip()
        first_opt = re.search(r'\n?a\)\s', body)
        if not first_opt:
            continue
        statement = body[:first_opt.start()].strip()
        opts_text = body[first_opt.start():]
        options = {letter: text.strip() for letter, text in _OPTION_RE.findall(opts_text)}
        if set(options.keys()) != {'a', 'b', 'c', 'd', 'e'}:
            continue
        questions[key] = {"number": num, "statement": statement, "options": options, "occurrence": seen_numbers[num]}
    return questions


def _parse_gabarito(raw_text: str) -> list[dict]:
    """Retorna lista de {number, area, correct_letter} na ordem de leitura
    (2ª ocorrência do mesmo número = 2ª língua estrangeira)."""
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    lines = [
        l for l in lines
        if l not in ('Questão Matéria', 'Tipo A', 'Tipo B')
        and 'Tipo A' not in l
        and not l.upper().startswith('GABARITO')
    ]
    rows = []
    for i in range(0, len(lines) - 3, 4):
        num_s, area, tipo_a, tipo_b = lines[i:i + 4]
        if not num_s.isdigit() or tipo_a.upper() not in 'ABCDE':
            continue
        rows.append({"number": int(num_s), "area": area, "correct_letter": tipo_a.lower()})
    return rows


def import_upf_edition(db, edition: dict) -> dict:
    """Importa uma edição (year/season) do vestibular da UPF. Levanta
    exceção se não achar os PDFs necessários; quem chama decide se
    pula/reporta."""
    from app.models import UpfQuestion, UpfQuestionOption

    links = _find_pdf_links(edition["url"])
    prova_url = _pick_link(links, "Tipo A")
    gabarito_url = _pick_link(links, "Gabarito")
    if not prova_url or not gabarito_url:
        raise RuntimeError(f"PDFs não encontrados (prova={bool(prova_url)}, gabarito={bool(gabarito_url)})")

    prova_text, prova_doc = _download_pdf_text(prova_url)
    gabarito_text, gabarito_doc = _download_pdf_text(gabarito_url)

    parsed_questions = _parse_exam_booklet(prova_text)
    gabarito_rows = _parse_gabarito(gabarito_text)

    # casa cada linha do gabarito (na ordem de leitura) com a ocorrência
    # correspondente da questão de mesmo número no caderno de prova.
    occurrence_counter: dict[int, int] = {}
    exam_name = f"UPF {edition['season']} {edition['year']}"

    total_added = 0
    total_skipped = 0
    for row in gabarito_rows:
        num = row["number"]
        occurrence_counter[num] = occurrence_counter.get(num, 0) + 1
        occ = occurrence_counter[num]
        key = num if occ == 1 else num + 1000 * (occ - 1)
        q = parsed_questions.get(key)
        if not q:
            total_skipped += 1
            continue

        exists = (
            db.query(UpfQuestion)
            .filter(UpfQuestion.exam_name == exam_name, UpfQuestion.number == num, UpfQuestion.area == row["area"])
            .first()
        )
        if exists:
            continue

        db_q = UpfQuestion(
            exam_name=exam_name,
            year=edition["year"],
            number=num,
            area=row["area"],
            statement=q["statement"],
        )
        db.add(db_q)
        db.flush()

        for order, letter in enumerate(['a', 'b', 'c', 'd', 'e']):
            db.add(
                UpfQuestionOption(
                    question_id=db_q.id,
                    letter=letter.upper(),
                    text=q["options"][letter],
                    is_correct=(letter == row["correct_letter"]),
                    order=order,
                )
            )
        total_added += 1

    db.commit()
    prova_doc.close()
    gabarito_doc.close()
    return {"total_added": total_added, "total_skipped": total_skipped, "total_in_gabarito": len(gabarito_rows)}


def import_all_upf_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as edições listadas em upf.br/ingresso/provas. Cada
    edição é tentada de forma independente — falha numa não trava as
    demais."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions = fetch_upf_editions()
        if since_year:
            editions = [e for e in editions if e["year"] >= since_year]
        if until_year:
            editions = [e for e in editions if e["year"] <= until_year]

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(sorted(editions, key=lambda e: e["year"], reverse=True), start=1):
            label = f"UPF {edition['season']} {edition['year']}"
            try:
                r = import_upf_edition(db, edition)
                results.append({"year": edition["year"], "season": edition["season"], **r})
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": edition["year"], "season": edition["season"], "skipped": True, "reason": str(e)})

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=f"Processado {label}")

        result = {"total_editions_found": total, "total_added": total_added, "exams": results}
        if task_id:
            complete_task(task_id, result)
        return result
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()
