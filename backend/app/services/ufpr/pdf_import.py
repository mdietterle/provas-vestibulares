from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa questões da UFPR a partir dos PDFs disponibilizados pelo Brasil
Escola (vestibular.brasilescola.uol.com.br), que espelha as provas oficiais
do NC-UFPR com o gabarito já marcado no texto ("*" ou "►" antes da alternativa
correta). Isso dispensa OCR e evita a fragilidade das URLs diretas do NC-UFPR,
que mudaram de padrão várias vezes e frequentemente retornam HTML de erro com
status 200.

Fonte: https://vestibular.brasilescola.uol.com.br/downloads/universidade-federal-parana.htm
Cada link "/baixar/<id>" redireciona para o PDF real. O mapeamento ano→id é
extraído dessa página e mantido em `_BRASIL_ESCOLA_IDS`.

Parsing: reaproveita `_parse_exam_questions`/`_assign_images` da coletânea
local (`seed.py`) e usa `_extract_alternatives_marked` para ler a resposta
do marcador no texto.
"""


import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.import_batch import save_vestibular_question
from app.services.ufpr.seed import (
    _assign_images,
    _detect_area_line,
    _infer_area,
    _parse_exam_questions,
    _statement_of,
    run_migrations_ufpr,
)

_HEADERS = {"User-Agent": "Mozilla/5.0"}

# Mapeamento ano → ID de download no Brasil Escola, extraído da página de
# downloads da UFPR. IDs são estáveis; o link "/baixar/<id>" redireciona 302
# para o PDF real (hospedado no CDN do UOL).
_BRASIL_ESCOLA_IDS: dict[int, int] = {
    2026: 47768,
    2025: 47682,
    2024: 47612,
    2023: 47571,
    2022: 47472,  # Fase Única — só Língua Estrangeira
    2021: 47371,  # Aplicação fora do padrão mas PDF único disponível aqui
    2020: 47371,  # Mesma entrada 2021/2022 no site; pulado via lógica abaixo
    2019: 46354,
    2018: 43676,
    2017: 40551,
    2016: 36581,
    2015: 32993,  # 1ª fase
    2014: 24785,  # 1ª fase
    2013: 20831,  # 1ª fase
    2012: 17004,  # 1ª fase
    2011: 12950,  # 1ª fase
    2010: 8860,   # 1ª fase
    2009: 3865,   # 1ª fase
}

# 2020 compartilha o mesmo ID 47371 com 2021 no Brasil Escola (entrada
# "Prova e Gabarito UFPR 2021/2022"). Não há entrada separada pra 2020.
# Removemos 2020 do mapa pra evitar importar o PDF errado sob o ano errado.
_BRASIL_ESCOLA_IDS.pop(2020, None)


def fetch_ufpr_pdf_url(year: int) -> Optional[str]:
    """Resolve a URL do PDF da prova UFPR de um dado ano via Brasil Escola.

    Faz HEAD request no link "/baixar/<id>" seguindo redirects; retorna a
    URL final se apontar para um PDF (Content-Type ou extensão .pdf)."""
    be_id = _BRASIL_ESCOLA_IDS.get(year)
    if be_id is None:
        return None
    url = f"https://vestibular.brasilescola.uol.com.br/baixar/{be_id}"
    try:
        resp = requests.head(url, timeout=30, headers=_HEADERS, allow_redirects=True)
    except requests.RequestException:
        return None
    if resp.status_code != 200:
        return None
    final_url = resp.url
    ct = resp.headers.get("Content-Type", "").lower()
    if "pdf" in ct or final_url.lower().endswith(".pdf"):
        return final_url
    # Fallback: tenta GET com stream pra checar magic bytes se HEAD não
    # revelou Content-Type útil (alguns CDNs não mandam no HEAD).
    try:
        resp = requests.get(url, timeout=30, headers=_HEADERS, stream=True, allow_redirects=True)
        head_bytes = resp.raw.read(4)
        resp.close()
        if head_bytes == b"%PDF":
            return resp.url
    except requests.RequestException:
        pass
    return None


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=60, headers=_HEADERS)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


# Alternativas marcadas com "*" (provas mais antigas) ou "►" (mais recentes)
# indicando a resposta correta — dispensa o OCR usado pela coletânea local.
_RE_ALT_MARKED = re.compile(r"(?m)^\s*([►*]?)\s*([A-Ea-e])\)")


def _statement_of_marked(body: str) -> str:
    m = _RE_ALT_MARKED.search(body)
    raw = body[: m.start()] if m else body
    return re.sub(r"\s+", " ", raw).strip()


def _extract_alternatives_marked(body: str) -> Optional[tuple[list[tuple[str, str]], Optional[str]]]:
    """Como `_extract_alternatives` da coletânea, mas também retorna a letra
    marcada como correta (None se nenhuma alternativa tinha o símbolo)."""
    ms = list(_RE_ALT_MARKED.finditer(body))
    seq: list[tuple[str, str]] = []
    seen: set[str] = set()
    correct: Optional[str] = None
    for i, mm in enumerate(ms):
        marker, letter = mm.group(1), mm.group(2).upper()
        if letter in seen:
            continue
        seen.add(letter)
        if marker:
            correct = letter
        text_start = mm.end()
        text_end = ms[i + 1].start() if i + 1 < len(ms) else len(body)
        text = re.sub(r"\s+", " ", body[text_start:text_end]).strip()
        seq.append((letter, text))
    if not set("ABCDE").issubset({L for L, _ in seq}):
        return None
    order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
    seq = [(L, t) for L, t in seq if L in order]
    seq.sort(key=lambda lt: order[lt[0]])
    return seq[:5], correct


def parse_ufpr_pdf(pdf_path: Path) -> list[dict]:
    """Parseia um PDF oficial de UM ano (não a coletânea) e retorna a lista
    de questões — reaproveita a caminhada por linhas e a associação de
    imagens já usadas na coletânea (`_parse_exam_questions`/`_assign_images`),
    só troca a fonte da resposta certa (marcador no texto, não OCR)."""
    doc = fitz.open(str(pdf_path))
    end = doc.page_count

    images_by_key = _assign_images(doc, 1, end)
    parsed = _parse_exam_questions(doc, 1, end)

    questions: list[dict] = []
    for q in parsed:
        result = _extract_alternatives_marked(q["body"])
        if not result:
            continue
        alts, correct = result
        statement = _statement_of_marked(q["body"])
        if not statement:
            continue

        area = q["area"]
        language = q["language"]
        if area == "Geral" and language is None:
            area = _infer_area(statement)

        imgs = images_by_key.get((q["number"], language), [])
        questions.append({
            "number": q["number"],
            "area": area,
            "language": language,
            "statement": statement,
            "alternatives": alts,
            "correct": correct,
            "images": imgs,
            "image_base64": imgs[0] if imgs else None,
        })

    doc.close()
    return questions


def import_ufpr_year(db, year: int, pdf_url: str, force_reimport: bool = False) -> dict:
    """Importa a prova de um ano a partir de uma URL de PDF já resolvida."""
    import tempfile

    exam_name = f"UFPR {year}"
    from app.vestibular.models import VestibularQuestion
    already = db.query(VestibularQuestion).filter(
        VestibularQuestion.exam_type == "ufpr",
        VestibularQuestion.exam_name == exam_name,
    ).count()
    if already > 0:
        return {"exam_name": exam_name, "total_parsed": 0, "total_added": 0, "skipped_existing": already}

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "prova.pdf"
        download_pdf(pdf_url, pdf_path)
        parsed = parse_ufpr_pdf(pdf_path)

    if not parsed:
        return {
            "exam_name": exam_name,
            "total_parsed": 0,
            "total_added": 0,
            "skipped": True,
            "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)",
        }

    added = 0
    skipped_existing = 0
    seen: set[tuple[int, Optional[str]]] = set()
    for q in parsed:
        key = (q["number"], q["language"])
        if key in seen:
            continue
        seen.add(key)

        options = []
        for order, (letter, text) in enumerate(q["alternatives"]):
            options.append({
                "letter": letter,
                "text": text,
                "is_correct": (letter == q["correct"]),
                "order": order,
            })

        images = None
        if q.get("images"):
            images = [
                {"image_base64": data_url, "order": i}
                for i, data_url in enumerate(q["images"])
            ]

        metadata = {
            "area": q["area"],
            "language": q["language"],
            "university": "UFPR",
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="ufpr",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            images=images,
            image_base64=q.get("image_base64"),
            correct_option=q.get("correct"),
            metadata=metadata,
            force_reimport=force_reimport,
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
    return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}


def import_all_ufpr_exams(since_year: int = 2009, until_year: Optional[int] = None, force_reimport: bool = False, db=None, **kwargs) -> dict:
    """Importa provas da UFPR via Brasil Escola, de `until_year` (padrão: 2026)
    até `since_year` (padrão: 2009). Cada ano é tentado independentemente;
    falhas individuais não interrompem o lote."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    from app.database import engine

    try:
        with engine.begin() as conn:
            run_migrations_ufpr(conn)
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    year_to = until_year or 2026
    year_from = since_year

    results = []
    total_added = 0
    try:
        for year in range(year_to, year_from - 1, -1):
            pdf_url = fetch_ufpr_pdf_url(year)
            if not pdf_url:
                results.append({"year": year, "skipped": True, "reason": "URL não encontrada entre os candidatos conhecidos"})
                continue

            try:
                r = import_ufpr_year(db, year, pdf_url, force_reimport=force_reimport)
                results.append({"year": year, **r})
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})

        return {"total_added": total_added, "exams": results}
    finally:
        if close_after:
            db.close()
