from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa questões da UFPR direto do site oficial do Núcleo de Concursos
(NC-UFPR), um PDF por ano — em vez de depender só da coletânea local
(`ufpr/seed.py`), que cobre uma faixa fixa de anos e precisa ser atualizada
manualmente.

Diferente da coletânea (cujo gabarito vem de uma página ESCANEADA, lida por
OCR célula a célula), o PDF oficial de cada ano já traz a resposta certa
marcada diretamente no texto por um símbolo antes da letra da alternativa —
"*" nos anos mais antigos (ex.: 2011: "*e) ..."), "►" nos mais recentes (ex.:
2016 em diante: "►d) ..."). Isso dispensa OCR inteiramente para estas provas.

O site do NC-UFPR passou por pelo menos 3 padrões de URL diferentes ao longo
dos anos (servidor estático antigo até ~2017, portal novo com pastas cujo
nome de arquivo varia, padrão atual "provas/Geral.pdf" desde ~2022) e, pelo
menos duas vezes (2016 e PS2019), removeu o link da página ao vivo mesmo com
o arquivo continuando acessível no caminho previsível. Por isso, em vez de
tentar raspar uma página-índice por ano (frágil e inconsistente entre eras),
`fetch_ufpr_pdf_url` tenta uma lista de candidatos conhecidos, em ordem, e
usa o primeiro que responder com um PDF de verdade.

2021 teve uma aplicação fora do padrão (pasta com ~8 PDFs separados por
idioma/curso, sem um único "Geral") e não é coberto por este scraper.
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

# Anos com aplicação fora do padrão "um PDF geral por ano" (ver docstring do
# módulo) — não tentamos adivinhar candidatos pra eles.
_UNSUPPORTED_YEARS = {2021}


def _candidate_urls(year: int) -> list[str]:
    """Lista de URLs conhecidas onde o PDF da prova de um ano pode estar,
    cobrindo as ~3 eras de estrutura do site do NC-UFPR. Ordem = prioridade."""
    urls: list[str] = []

    # Era atual (~2022+): servicos.nc.ufpr.br, pasta "provas/Geral.pdf" — tenta
    # primeiro o caminho direto (existe e está correto em todos os anos
    # testados, 2022-2026); só cai pras subpastas provisorio/definitivo
    # (usadas a partir de 2025) se o direto não existir. IMPORTANTE: não
    # inverter essa ordem — em 2022 "provas/provisorio/Geral.pdf" é um PDF
    # de ~9.6MB com conteúdo errado/incompleto (só Língua Estrangeira),
    # bem diferente do "Geral.pdf" direto (~600KB, todas as matérias).
    for ps in (f"ps{year}", f"PS{year}"):
        urls.append(f"https://servicos.nc.ufpr.br/documentos/{ps}/provas/Geral.pdf")
        urls.append(f"https://servicos.nc.ufpr.br/documentos/{ps}/provas/definitivo/Geral.pdf")
        urls.append(f"https://servicos.nc.ufpr.br/documentos/{ps}/provas/provisorio/Geral.pdf")

    # Era intermediária (~2018-2020): mesmo domínio novo, pasta antiga "provas1fase".
    for ps in (f"PS{year}", f"ps{year}"):
        for fname in (f"ps{year}_conhecimentos_gerais.pdf", f"PS{year}_conhecimentos_gerais.pdf"):
            urls.append(f"https://servicos.nc.ufpr.br/documentos/{ps}/provas1fase/{fname}")

    # Era antiga (até ~2017): site estático www.nc.ufpr.br. O nome da pasta e
    # do arquivo variou ano a ano (ex.: 2011 usa "prova1fase" no singular).
    for folder in ("provas1fase", "prova1fase", "provas_1fase"):
        for fname in (
            f"PS{year}_conhecimentos_gerais.pdf",
            f"ps{year}_conhecimentos_gerais.pdf",
            f"ps{year}_1fase.pdf",
            f"PS{year}gabarito_geral.pdf",
        ):
            urls.append(f"https://www.nc.ufpr.br/concursos_institucionais/ufpr/ps{year}/{folder}/{fname}")

    return urls


def fetch_ufpr_pdf_url(year: int) -> Optional[str]:
    """Tenta, em ordem, os candidatos de `_candidate_urls` e retorna o
    primeiro que responder com um PDF de verdade (checa os magic bytes —
    o site retorna HTML de erro com status 200 pra links removidos, então
    o status HTTP sozinho não é suficiente pra decidir)."""
    if year in _UNSUPPORTED_YEARS:
        return None
    for url in _candidate_urls(year):
        try:
            resp = requests.get(url, timeout=30, headers=_HEADERS)
        except requests.RequestException:
            continue
        if resp.status_code == 200 and resp.content[:4] == b"%PDF":
            return url
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


def import_ufpr_year(db, year: int, pdf_url: str) -> dict:
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


def import_all_ufpr_exams(since_year: int = 2009, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as provas da UFPR publicadas no site do NC-UFPR, em
    regressão de `until_year` (padrão: 2026) até `since_year` (padrão: 2009).

    Cada ano é tentado de forma independente — URL não encontrada entre os
    candidatos conhecidos (`fetch_ufpr_pdf_url`), PDF num formato não
    reconhecido, ou 2021 (aplicação fora do padrão, não suportada) não
    interrompem o lote, só são reportados como pulados."""
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
            if year in _UNSUPPORTED_YEARS:
                results.append({"year": year, "skipped": True, "reason": "Aplicação fora do padrão (não suportada)"})
                continue

            pdf_url = fetch_ufpr_pdf_url(year)
            if not pdf_url:
                results.append({"year": year, "skipped": True, "reason": "URL não encontrada entre os candidatos conhecidos"})
                continue

            try:
                r = import_ufpr_year(db, year, pdf_url)
                results.append({"year": year, **r})
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})

        return {"total_added": total_added, "exams": results}
    finally:
        if close_after:
            db.close()
