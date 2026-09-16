from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa provas UFSC/IFSC/IFC a partir de PDFs enviados pelo Owner (prova +
gabarito) ou, em lote, direto da página oficial de provas anteriores.

Reaproveita o parser já existente em `ufsc/seed.py` (usado hoje pelo fluxo de
seed a partir de arquivos locais) — aqui só trocamos a origem dos arquivos
(upload/URL em vez de disco) e explicitamos ano/fase/cor via formulário/scraper
em vez de depender só do nome do arquivo.

O gabarito pode vir em PDF (formato usado desde ~2024) ou em HTML (formato
usado em provas antigas). Vários domínios legados da UFSC/COPERVE que hospedam
provas antigas (antiga.coperve.ufsc.br, www.coperve.ufsc.br,
dados.coperve.ufsc.br) têm certificado SSL inválido — confirmado que os
servidores respondem normalmente, só a validação do certificado falha.
`download_pdf` tenta a conexão normal e, se falhar por SSL, refaz sem validar
o certificado (só para esses hosts específicos que dão erro de SSL — domínios
com certificado válido nunca passam por esse fallback).
"""


import re
import tempfile
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import requests

from app.services.ufsc.seed import _parse_exam, _parse_filename, _parse_gabarito, _persist_parsed_questions

# A COPERVE publica o vestibular unificado num domínio NOVO a cada ciclo
# (vestibularunificadoAAAA.ufsc.br) e o domínio do ciclo anterior fica
# congelado — nunca ganha as provas do ciclo seguinte. Um domínio fixo aqui
# (ex.: .../2025/) ficava obsoleto assim que a COPERVE virava o ciclo, e a
# prova mais recente (ex.: 2026) simplesmente nunca aparecia. Por isso
# `_current_provas_anteriores_url` descobre o domínio vigente a partir do
# link em coperve.ufsc.br em vez de fixar o ano — com fallback pro último
# domínio conhecido caso a descoberta falhe (site fora do ar, HTML mudou).
_COPERVE_URL = "https://coperve.ufsc.br/"
_CURRENT_DOMAIN_RE = re.compile(r'href="(https://vestibularunificado(\d{4})\.ufsc\.br)/?"', re.I)
_FALLBACK_PROVAS_ANTERIORES_URL = "https://vestibularunificado2025.ufsc.br/provas-anteriores/"

_YEAR_SECTION_RE = re.compile(r'title="(Vestibular[^"]*)"', re.I)
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.I | re.S)
_LINK_RE = re.compile(
    r'<a[^>]*href="([^"]+\.(?:pdf|html?))"[^>]*>\s*(?:<img[^>]*alt="([^"]*)"[^>]*/?>)?\s*([^<]*)\s*</a>',
    re.I,
)
_PHASE_RE = re.compile(r"(\d)\s*[ºo]?\s*(?:dia|fase)", re.I)
_PHASE_RE2 = re.compile(r"prova\s*(\d)", re.I)
_PHASE_RE3 = re.compile(r"^\s*(\d)\s*/", re.I)
_SKIP_WORDS = {"prova", "gabarito", "dia", "fase", "pdf"}


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s).strip()


def _parse_row_label(label: str, prova_url: str) -> tuple[str, str]:
    """Extrai (fase, cor) do texto da linha da tabela; usa o nome do arquivo
    da prova como reforço quando o texto da linha não for conclusivo."""
    m = _PHASE_RE.search(label) or _PHASE_RE2.search(label) or _PHASE_RE3.search(label)
    phase = m.group(1) if m else ""

    words = re.findall(r"[A-Za-zÀ-ÿ]+", label)
    candidates = [w for w in words if w.lower() not in _SKIP_WORDS]
    color = candidates[-1] if candidates else ""

    if not phase or not color:
        _, fphase, fcolor = _parse_filename(Path(prova_url.split("?")[0]).name)
        phase = phase or fphase
        color = color or fcolor
    return phase or "1", color


class _TextExtractor(HTMLParser):
    """Extrai texto puro de um HTML simples, preservando quebras de linha
    aproximadas entre células/linhas de tabela (suficiente para reconstruir
    pares questão→gabarito de uma tabela HTML antiga)."""

    _BREAK_TAGS = {"tr", "br", "p", "div", "td", "th"}

    def __init__(self):
        super().__init__()
        self.chunks: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self._BREAK_TAGS:
            self.chunks.append("\n")

    def handle_data(self, data):
        if data.strip():
            self.chunks.append(data.strip())


def _parse_gabarito_html(gabarito_html: Path) -> dict[int, int]:
    """Lê um gabarito antigo em HTML (tabela simples questão→gabarito).

    Best-effort: assume que, para cada questão, o número da questão aparece
    isolado numa "linha" e o valor numérico do gabarito é o último número
    inteiro que aparece antes da próxima questão.
    """
    parser = _TextExtractor()
    parser.feed(gabarito_html.read_text(encoding="utf-8", errors="ignore"))
    lines = [c for c in parser.chunks if c and c != "\n"]

    answers: dict[int, int] = {}
    current_q: Optional[int] = None
    pending: list[str] = []

    def flush():
        nonlocal current_q, pending
        if current_q is not None:
            numeric = [t for t in pending if re.match(r"^\d{1,3}$", t)]
            if numeric:
                answers[current_q] = int(numeric[-1])
        current_q, pending = None, []

    for tok in lines:
        if re.match(r"^\d{1,2}$", tok) and (current_q is None or int(tok) == current_q + 1):
            flush()
            current_q = int(tok)
            pending = []
        else:
            pending.append(tok)
    flush()

    return answers


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um arquivo (PDF ou HTML) de uma URL pública.

    Alguns domínios legados da UFSC/COPERVE que hospedam provas antigas têm
    certificado SSL inválido, mas respondem normalmente — se a validação do
    certificado falhar, refaz a mesma requisição sem verificar o certificado
    (só nesse caso específico; hosts com certificado válido nunca caem aqui).
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, timeout=120, headers=headers)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=120, headers=headers, verify=False)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def current_provas_anteriores_url() -> str:
    """Descobre o domínio do ciclo vigente do vestibular unificado a partir
    do link em coperve.ufsc.br (esse domínio muda a cada ciclo — ver
    comentário acima de `_FALLBACK_PROVAS_ANTERIORES_URL`). Cai no último
    domínio conhecido se a descoberta falhar por qualquer motivo."""
    try:
        resp = requests.get(_COPERVE_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        m = _CURRENT_DOMAIN_RE.search(resp.text)
        if m:
            return f"{m.group(1)}/provas-anteriores/"
    except Exception:
        pass
    return _FALLBACK_PROVAS_ANTERIORES_URL


def fetch_exam_links(html: Optional[str] = None, url: Optional[str] = None) -> list[dict]:
    """Varre a página de provas anteriores da UFSC e retorna todos os pares
    prova+gabarito encontrados: [{year, phase, color, prova_url, gabarito_url}].

    A página organiza os links em seções por ano (cabeçalhos "Vestibular
    UFSC/AAAA" ou "Vestibular Unificado UFSC/... AAAA"), cada uma com uma
    tabela cujas linhas têm um link de texto "Prova" e um link de texto
    "Gabarito" (PDF ou HTML) lado a lado."""
    if html is None:
        if url is None:
            url = current_provas_anteriores_url()
        resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        html = resp.text

    markers = [(m.start(), m.group(1)) for m in _YEAR_SECTION_RE.finditer(html)]
    sections = []
    for i, (pos, title) in enumerate(markers):
        end = markers[i + 1][0] if i + 1 < len(markers) else len(html)
        sections.append((title, html[pos:end]))

    pairs: list[dict] = []
    for title, sec_html in sections:
        year_m = re.search(r"(\d{4})", title)
        year = int(year_m.group(1)) if year_m else None
        for row_m in _ROW_RE.finditer(sec_html):
            row = row_m.group(1)
            links = _LINK_RE.findall(row)
            if len(links) < 2:
                continue
            prova_url = gabarito_url = None
            for link_url, alt, text in links:
                role = (text or alt or "").strip().lower()
                if "prova" in role:
                    prova_url = urljoin(url, link_url)
                elif "gabarito" in role:
                    gabarito_url = urljoin(url, link_url)
            if not (prova_url and gabarito_url and year):
                continue
            phase, color = _parse_row_label(_strip_tags(row), prova_url)
            pairs.append({
                "year": year,
                "phase": phase,
                "color": color,
                "prova_url": prova_url,
                "gabarito_url": gabarito_url,
            })

    return pairs


def import_all_ufsc_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db=None, **kwargs) -> dict:
    """Importa TODAS as provas listadas em vestibularunificado2025.ufsc.br/provas-anteriores/,
    uma a uma. Cada prova é tentada de forma independente — falha ao baixar,
    SSL de host legado, ou 0 questões reconhecidas (comum em provas muito
    antigas, escaneadas) não interrompe as demais.

    `since_year`/`until_year`: se informados, restringem o intervalo de anos
    importado — essencial para dividir o lote (são ~200 provas no total,
    baixadas e processadas em sequência num único processo) em partes
    pequenas o bastante para não estourar o limite de memória do plano
    gratuito do Render."""
    from app.database import SessionLocal
    from app.services.import_batch import run_batch_import

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    def _exam_name(link: dict) -> str:
        name = f"UFSC {link['year']} – Prova {link['phase']}"
        if link["color"]:
            name += f" ({link['color'].capitalize()})"
        return name

    def _process(link: dict) -> dict:
        year, phase, color = link["year"], link["phase"], link["color"]
        exam_name = _exam_name(link)

        with tempfile.TemporaryDirectory() as tmp_dir:
            prova_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(link["prova_url"], prova_path)

            gabarito_ext = ".html" if link["gabarito_url"].lower().split("?")[0].endswith((".html", ".htm")) else ".pdf"
            gabarito_path = Path(tmp_dir) / f"gabarito{gabarito_ext}"
            download_pdf(link["gabarito_url"], gabarito_path)

            gabarito = (
                _parse_gabarito_html(gabarito_path) if gabarito_ext == ".html" else _parse_gabarito(gabarito_path)
            )
            parsed = _parse_exam(prova_path, gabarito)

        if not parsed:
            return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida (provável prova antiga escaneada, sem texto extraível)."}

        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, color, parsed)
        return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}

    try:
        links = fetch_exam_links()
        if since_year:
            links = [l for l in links if l["year"] >= since_year]
        if until_year:
            links = [l for l in links if l["year"] <= until_year]

        return run_batch_import(links, _process, label=_exam_name, task_id=task_id, db=db)
    finally:
        if close_after:
            db.close()


def import_ufsc_pdf(
    prova_path: Path,
    gabarito_path: Optional[Path],
    year: int,
    phase: str,
    color: Optional[str] = None,
    db=None,
) -> dict:
    """Importa um caderno de prova UFSC (PDF) + gabarito (PDF ou HTML,
    opcional) para o banco `ufsc_questions`."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    color = color or ""
    exam_name = f"UFSC {year} – Prova {phase}"
    if color:
        exam_name += f" ({color.capitalize()})"

    try:
        gabarito: dict[int, int] = {}
        if gabarito_path is not None:
            is_html = gabarito_path.suffix.lower() in (".html", ".htm")
            gabarito = (
                _parse_gabarito_html(gabarito_path) if is_html else _parse_gabarito(gabarito_path)
            )

        parsed = _parse_exam(prova_path, gabarito)
        added, skipped_existing = _persist_parsed_questions(db, exam_name, year, phase, color, parsed)

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
