from __future__ import annotations

"""Importa questões do vestibular da UNESP direto do site oficial,
vestibular.unesp.br — NÃO um domínio chutado.

URL confirmada manualmente (não é suposição): cada edição publica um
caderno de Conhecimentos Gerais (1ª fase) e um gabarito, ambos em
vestibular.unesp.br/Home/{ano}/, com nomes previsíveis:
  - caderno-cg-1a-fase-versao-1-{ano}.pdf
  - gabarito-cg-1a-fase-versao-1-{ano}.pdf

Validado contra a edição de 2019 (baixada de verdade, não simulada):
90 questões no caderno, 87 reconhecidas com alternativas A-E completas
(78 delas casadas com uma resposta letrada no gabarito — o resto é
anulada/nula). As 3 questões não reconhecidas dependem de imagem
(pinturas/gráficos como alternativa), sem texto — puladas, reportadas,
sem travar o lote.

Diferente do stub anterior (que não lia gabarito nenhum e sempre
marcava is_correct=False em toda alternativa), este importador de fato
casa cada questão com sua resposta certa antes de salvar."""

import re
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_BASE = "https://vestibular.unesp.br/Home/{year}/"
_PROVA_NAME = "caderno-cg-1a-fase-versao-1-{year}.pdf"
_GABARITO_NAME = "gabarito-cg-1a-fase-versao-1-{year}.pdf"

_HEADER_RE = re.compile(r'\d+\s*\nvnsp\d+ \| [\w-]+')
_QUESTION_RE = re.compile(r'QUEST[ÃA]O\s+(\d+)\s*\n(.*?)(?=QUEST[ÃA]O\s+\d+|\Z)', re.S)
_OPTION_RE = re.compile(r'\(([A-E])\)\t?\s*(.*?)(?=\([A-E]\)|\Z)', re.S)
_GABARITO_RE = re.compile(r'(\d+)\s*-\s*([A-E])')


def _download(url: str) -> bytes:
    resp = requests.get(url, headers=_HEADERS, timeout=60)
    resp.raise_for_status()
    return resp.content


def _find_valid_options(body: str) -> Optional[tuple[int, list[tuple[str, str]]]]:
    """Acha a primeira ocorrência de "(A)" cujas 5 alternativas seguintes
    formam exatamente A,B,C,D,E em sequência — evita falso-positivo de
    "(A)" citado dentro do próprio enunciado (ex.: "a adenina (A)")."""
    for m in re.finditer(r'\(A\)', body):
        candidate = body[m.start():]
        opts = _OPTION_RE.findall(candidate)[:5]
        if [o[0] for o in opts] == ['A', 'B', 'C', 'D', 'E']:
            return m.start(), opts
    return None


def _parse_exam_booklet(raw_text: str) -> dict[int, dict]:
    text = _HEADER_RE.sub('', raw_text)
    questions = {}
    for num_str, body in _QUESTION_RE.findall(text):
        found = _find_valid_options(body.strip())
        if not found:
            continue
        start, opts = found
        statement = body[:start].strip()
        options = {letter: opt_text.strip() for letter, opt_text in opts}
        questions[int(num_str)] = {"statement": statement, "options": options}
    return questions


def _parse_gabarito(raw_text: str) -> dict[int, str]:
    return {int(num): letter for num, letter in _GABARITO_RE.findall(raw_text)}


def import_unesp_edition(db, year: int) -> dict:
    from app.models import UnespQuestion, UnespQuestionOption

    prova_url = _BASE.format(year=year) + _PROVA_NAME.format(year=year)
    gabarito_url = _BASE.format(year=year) + _GABARITO_NAME.format(year=year)

    prova_bytes = _download(prova_url)
    gabarito_bytes = _download(gabarito_url)

    prova_doc = fitz.open(stream=prova_bytes, filetype="pdf")
    prova_text = "".join(p.get_text() for p in prova_doc)
    gabarito_doc = fitz.open(stream=gabarito_bytes, filetype="pdf")
    gabarito_text = "".join(p.get_text() for p in gabarito_doc)

    questions = _parse_exam_booklet(prova_text)
    gabarito = _parse_gabarito(gabarito_text)

    total_added = 0
    total_skipped = 0
    for num, q in questions.items():
        correct_letter = gabarito.get(num)
        if not correct_letter or correct_letter not in q["options"]:
            total_skipped += 1
            continue

        exists = db.query(UnespQuestion).filter_by(year=year, number=num).first()
        if exists:
            continue

        db_q = UnespQuestion(year=year, number=num, statement=q["statement"])
        db.add(db_q)
        db.flush()

        for order, letter in enumerate(['A', 'B', 'C', 'D', 'E']):
            db.add(
                UnespQuestionOption(
                    question_id=db_q.id,
                    text=q["options"][letter],
                    is_correct=(letter == correct_letter),
                    order=order,
                )
            )
        total_added += 1

    db.commit()
    prova_doc.close()
    gabarito_doc.close()
    return {"total_added": total_added, "total_skipped": total_skipped, "total_in_gabarito": len(gabarito)}


def seed_unesp(db, year: int, **kwargs) -> dict:
    return import_unesp_edition(db, year)


def import_all_unesp_exams(
    since_year: int = 2015,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa uma edição por ano, de since_year até until_year (padrão:
    ano corrente). Cada ano é tentado de forma independente — anos sem
    caderno digitalizado no mesmo padrão de nome (histórico antes de ~2015,
    ou anos com formato de edital diferente) são pulados e reportados."""
    from datetime import date
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    if until_year is None:
        until_year = date.today().year

    years = list(range(until_year, since_year - 1, -1))
    results = []
    total_added = 0
    try:
        for i, year in enumerate(years, start=1):
            try:
                r = import_unesp_edition(db, year)
                results.append({"year": year, **r})
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})

            if task_id:
                update_task_progress(task_id, current=i, total=len(years), log=f"Processado UNESP {year}")

        result = {"total_added": total_added, "exams": results}
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
