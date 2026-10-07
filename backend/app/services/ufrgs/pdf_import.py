from __future__ import annotations

from app.services.progress import update_task_progress, complete_task, fail_task
from typing import Optional
import gc
"""Importa questões do vestibular da UFRGS (COPERSE) direto de uma URL pública
(ex.: fisica.net/passenaufrgs), sem exigir upload manual do PDF pelo Owner.

Prova em múltipla escolha A-E tradicional (não é somatório como UFSC). O
gabarito não vem embutido no PDF — o Owner cola o texto do gabarito (como
publicado, por exemplo, na home do site de origem) e um parser tolerante
extrai os pares questão→letra.
"""


import re
import unicodedata
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

_AREA_NAMES = {
    "LÍNGUA PORTUGUESA": "Língua Portuguesa",
    "LINGUA PORTUGUESA": "Língua Portuguesa",
    "LITERATURA": "Literatura",
    "HISTÓRIA": "História",
    "HISTORIA": "História",
    "GEOGRAFIA": "Geografia",
    "MATEMÁTICA": "Matemática",
    "MATEMATICA": "Matemática",
    "FÍSICA": "Física",
    "FISICA": "Física",
    "QUÍMICA": "Química",
    "QUIMICA": "Química",
    "BIOLOGIA": "Biologia",
    "INGLÊS": "Língua Estrangeira",
    "INGLES": "Língua Estrangeira",
    "ESPANHOL": "Língua Estrangeira",
}

# Exige 2 dígitos (zero à esquerda) — questões reais são sempre "01." .. "75.".
# Sem essa exigência, listas de associação dentro de uma questão (ex.: "1. Pronome
# relativo.", "2. Conjunção integrante.") são confundidas com início de nova questão.
_Q_START = re.compile(r"^(\d{2})\.\s+(\S.*)$")
_OPT = re.compile(r"^\(([A-E])\)\s*(.*)$")

_NOISE_PATTERNS = [
    re.compile(r"UFRGS-VESTIBULAR", re.I),
    re.compile(r"^\d{1,3}\s*$"),  # número de página isolado
    re.compile(r"^\d{1,2}\.\s*$"),  # marcador do cartão-resposta reimpresso, sem texto
]


def _is_noise(text: str) -> bool:
    return any(p.search(text) for p in _NOISE_PATTERNS)


def _match_area(line_text: str) -> Optional[str]:
    stripped = "".join(
        c for c in unicodedata.normalize("NFKD", line_text.strip()) if not unicodedata.combining(c)
    ).upper()
    return _AREA_NAMES.get(stripped)


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def parse_exam_pdf(path: Path) -> list[dict]:
    """Retorna lista de questões: {number, area, statement, options: [{letter, text}]}."""
    doc = fitz.open(str(path))
    events: list[tuple[float, str, object]] = []

    for page in doc:
        page_dict = page.get_text("dict")
        for block in page_dict["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                line_text = "".join(s["text"] for s in line["spans"]).strip()
                if not line_text:
                    continue
                y = line["bbox"][1]

                area = _match_area(line_text)
                if area:
                    events.append((y, "area", area))
                    continue

                m_q = _Q_START.match(line_text)
                if m_q:
                    events.append((y, "q_start", (int(m_q.group(1)), m_q.group(2))))
                    continue

                m_opt = _OPT.match(line_text)
                if m_opt:
                    events.append((y, "opt_start", (m_opt.group(1), m_opt.group(2).strip())))
                    continue

                if _is_noise(line_text):
                    continue

                events.append((y, "text", line_text))

    doc.close()

    questions: list[dict] = []
    current_area = "Geral"
    q_num: Optional[int] = None
    statement_lines: list[str] = []
    options: list[dict] = []
    active_passage_lines: list[str] = []
    current_passage = ""

    def flush():
        nonlocal q_num, statement_lines, options
        if q_num is None:
            return
        stmt = _clean("\n".join(statement_lines))
        if stmt and len(options) == 5:
            questions.append({
                "number": q_num,
                "area": current_area,
                "statement": stmt,
                "options": [
                    {"letter": o["letter"], "text": _clean(" ".join(o["lines"]))}
                    for o in options
                ],
            })
        q_num, statement_lines, options = None, [], []

    for _y, etype, val in events:
        if etype == "area":
            flush()
            current_area = val
            current_passage = ""
            active_passage_lines = []

        elif etype == "q_start":
            flush()
            if active_passage_lines:
                candidate = _clean("\n".join(active_passage_lines))
                current_passage = candidate if _looks_like_passage(candidate) else ""
                active_passage_lines = []
            q_num, rest = val
            statement_lines = ([current_passage] if current_passage else []) + [rest]
            options = []

        elif etype == "opt_start":
            letter, rest = val
            if q_num is not None:
                options.append({"letter": letter, "lines": [rest] if rest else []})

        elif etype == "text":
            if q_num is None:
                active_passage_lines.append(val)
            elif options:
                options[-1]["lines"].append(val)
            else:
                statement_lines.append(val)

    flush()
    return questions


def _clean(text: str) -> str:
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


_LATIN_LETTER = re.compile(r"[A-Za-zÀ-ÿ]")


def _looks_like_passage(text: str) -> bool:
    if len(text) < 20:
        return False
    letters = len(_LATIN_LETTER.findall(text))
    return letters / max(len(text), 1) > 0.5


_GAB_ENTRY = re.compile(r"\b(\d{1,3})\D{0,3}([A-E])\b")


def parse_gabarito_text(text: str) -> dict[int, str]:
    """Extrai pares {número: letra} de um texto colado livremente (ex.: 'Português
    01 B 02 D 03 C ...' ou '01-B / 02-D / 03-C'). Tolerante a separadores."""
    answers: dict[int, str] = {}
    for m in _GAB_ENTRY.finditer(text):
        num = int(m.group(1))
        if 1 <= num <= 200:
            answers[num] = m.group(2).upper()
    return answers


# ── Descoberta em lote (site oficial da COPERSE/UFRGS) ──────────────────────
#
# Provas: ufrgs.br/coperse/aquisicao-de-provas/ lista uma página por edição
# (cv-2011..cv-2020, cv-2022..cv-2026 — cv-2021 não existe). Cada página tem
# um link "CADERNO DE PROVAS" por dia; quando um dia tem Língua Estrangeira
# Moderna (Inglês/Espanhol/Alemão/Francês/Italiano), existe um PDF completo
# SEPARADO por idioma — só a seção de língua muda, o resto do dia é idêntico
# entre eles, então importamos só uma (Inglês, por padrão).
#
# Gabaritos: vestibular.ufrgs.br/cvANO/gabaritos/ é uma tabela HTML (não
# PDF) por matéria. IMPORTANTE: cada matéria tem sua PRÓPRIA numeração
# reiniciada em 1 dentro do dia (não é uma sequência única 1-75) — inclusive
# as variantes de idioma da Língua Estrangeira Moderna, que reaproveitam a
# MESMA faixa de números entre si (Inglês 1-15, Espanhol 1-15, ...). Por
# isso o gabarito só pode ser lido depois de saber quais matérias (`_match_area`)
# realmente aparecem na prova baixada — do contrário, misturar o bloco errado
# de idioma provocaria respostas trocadas silenciosamente.
_UFRGS_INDEX_URL = "https://www.ufrgs.br/coperse/aquisicao-de-provas/"
_UFRGS_LINK_RE = re.compile(r'<a\b[^>]*href="([^"]+\.pdf)"[^>]*>(.*?)</a>', re.I | re.S)
_UFRGS_DAY_RE = re.compile(r"(\d)\s*[ºo°]\s*dia", re.I)
# Até cv-2025 o texto "N º dia" ficava DENTRO do próprio <a> (por isso
# _UFRGS_LINK_RE bastava). A partir de cv-2026 o site passou a usar um
# template novo em que o link só diz "CADERNO DE PROVAS" — o "do 1º dia
# (29 de novembro)" fica em texto solto DEPOIS do </a>, só dentro do mesmo
# <p>/<li>. `_UFRGS_BLOCK_RE` isola esse bloco pra buscar o dia no texto
# inteiro ao redor do link, não só dentro da tag <a>.
_UFRGS_BLOCK_RE = re.compile(r"<(li|p)\b[^>]*>(.*?)</\1>", re.I | re.S)


def fetch_ufrgs_years() -> dict[int, str]:
    """Varre a página-índice do COPERSE e retorna {ano: url_da_pagina_do_ano}."""
    resp = requests.get(_UFRGS_INDEX_URL, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    years: dict[int, str] = {}
    for m in re.finditer(r'href="(https://www\.ufrgs\.br/coperse/[^"]*cv-(\d{4})[^"]*/?)"', resp.text):
        url, year_s = m.groups()
        years[int(year_s)] = url
    return years


def fetch_ufrgs_prova_editions(year_url: str, language: str = "Inglês") -> dict[int, str]:
    """Varre a página de uma edição e retorna {dia: url_da_prova}. Quando um
    dia tem mais de uma versão (variantes de idioma), escolhe a que contém
    `language` no texto do link; cai na primeira encontrada se não achar."""
    resp = requests.get(year_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()

    candidates: dict[int, list[tuple[str, str]]] = {}
    blocks = [b for _, b in _UFRGS_BLOCK_RE.findall(resp.text)] or [resp.text]
    for block in blocks:
        plain_block = re.sub(r"<[^>]+>", " ", block)
        m = _UFRGS_DAY_RE.search(plain_block)
        if not m:
            continue
        day = int(m.group(1))
        for href, raw_text in _UFRGS_LINK_RE.findall(block):
            # Usa o texto do bloco inteiro (não só da tag <a>) pra decidir o
            # idioma — no template novo o idioma também fica fora do <a>.
            candidates.setdefault(day, []).append((href, plain_block))

    editions: dict[int, str] = {}
    for day, items in candidates.items():
        preferred = next((href for href, text in items if language.lower() in text.lower()), None)
        editions[day] = preferred or items[0][0]
    return editions


def _classify_gabarito_subject(name: str) -> Optional[str]:
    """Classificação tolerante do nome de uma matéria do gabarito HTML pro
    mesmo vocabulário de `_AREA_NAMES` — o texto usado lá vem de dentro do
    PDF da prova, e pode não bater exatamente com o cabeçalho da página de
    gabaritos (ex.: "Literatura em Língua Portuguesa" vs "LITERATURA")."""
    n = "".join(
        c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c)
    ).upper()
    if "LITERATURA" in n:
        return "Literatura"
    if "LINGUA PORTUGUESA" in n and "ESTRANGEIRA" not in n:
        return "Língua Portuguesa"
    if "HISTORIA" in n:
        return "História"
    if "GEOGRAFIA" in n:
        return "Geografia"
    if "MATEMATICA" in n:
        return "Matemática"
    if "FISICA" in n:
        return "Física"
    if "QUIMICA" in n:
        return "Química"
    if "BIOLOGIA" in n:
        return "Biologia"
    if "ESTRANGEIRA" in n or n in ("INGLES", "ESPANHOL", "ITALIANO", "FRANCES", "ALEMAO"):
        return "Língua Estrangeira"
    return None


def _parse_gabarito_html(html: str, wanted_areas: set[str], language: str = "Inglês") -> dict[int, str]:
    """Extrai {número: letra} da página de gabaritos, restrito às matérias
    que `wanted_areas` diz estarem realmente presentes na prova (evita
    colisão de numeração entre blocos que reaproveitam os mesmos números —
    sobretudo as variantes de idioma). Reconhece os dois formatos usados
    historicamente: tabela nova (`<h3 id="...">Matéria</h3>` + `<table>` com
    `<td>número</td><td>letra</td>`) e tabela antiga (`<td class='mark-head'>
    Matéria</td>` + células `"NN- letra"`)."""

    def _keep(subject_name: str) -> bool:
        area = _classify_gabarito_subject(subject_name)
        if area is None or area not in wanted_areas:
            return False
        if area == "Língua Estrangeira" and language.lower() not in subject_name.lower():
            return False
        return True

    answers: dict[int, str] = {}

    new_parts = re.split(r"<h3[^>]*>([^<]+)</h3>", html)
    if len(new_parts) > 1:
        for i in range(1, len(new_parts) - 1, 2):
            subject_name, block = new_parts[i], new_parts[i + 1]
            if not _keep(subject_name):
                continue
            for m in re.finditer(r"<td>\s*(\d{1,3})\s*</td>\s*<td[^>]*>\s*([^<]+?)\s*</td>", block):
                letter = m.group(2).strip().upper()
                if letter in "ABCDE":
                    answers[int(m.group(1))] = letter
        if answers:
            return answers

    old_parts = re.split(r"<td colspan=['\"]5['\"] class=['\"]mark-head['\"]>([^<]+)</td>", html)
    for i in range(1, len(old_parts) - 1, 2):
        subject_name, block = old_parts[i], old_parts[i + 1]
        if not _keep(subject_name):
            continue
        for m in re.finditer(r"(\d{1,3})-\s*([A-E])\b", block):
            answers[int(m.group(1))] = m.group(2)
    return answers


def fetch_ufrgs_gabarito(year: int, wanted_areas: set[str], language: str = "Inglês") -> dict[int, str]:
    """Baixa e parseia a página de gabaritos de um ano (vestibular.ufrgs.br),
    já restrita às matérias esperadas. Retorna {} se a página não existir ou
    não tiver nenhuma matéria reconhecível dentre as esperadas."""
    resp = requests.get(
        f"https://www.ufrgs.br/vestibular/cv{year}/gabaritos/",
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    resp.raise_for_status()
    return _parse_gabarito_html(resp.text, wanted_areas, language=language)


def import_all_ufrgs_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    language: str = "Inglês",
    db=None,
 **kwargs) -> dict:
    """Importa TODAS as edições do vestibular da UFRGS listadas em
    ufrgs.br/coperse/aquisicao-de-provas/ (2011-2026, exceto 2021, que não
    existe). Pra dias com Língua Estrangeira Moderna, importa só a variante
    de `language` (padrão: Inglês) — as demais têm o mesmo conteúdo nas
    outras matérias, só a seção de idioma muda, então importar todas seria
    duplicata sob os mesmos números de questão.

    Cada dia de cada ano é tentado de forma independente; falha de rede, PDF
    num formato não reconhecido, ou gabarito não encontrado não interrompem
    o lote (a prova ainda é importada, só sem o gabarito aplicado)."""
    import gc
    from app.database import SessionLocal
    from app.services.progress import update_task_progress, complete_task, fail_task

    task_id = kwargs.get("task_id")
    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        years = fetch_ufrgs_years()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a listagem de anos da COPERSE: {e}")

    selected = {
        year: url
        for year, url in years.items()
        if (since_year is None or year >= since_year) and (until_year is None or year <= until_year)
    }

    results = []
    total_added = 0
    try:
        # Descobre todas as (ano, dia) antes de importar, igual ao ENEM — dá
        # um denominador de progresso preciso em vez de reportar por ano
        # (um ano lento deixaria a barra parada por minutos na mesma %).
        pending: list[tuple[int, int, str]] = []
        for year in sorted(selected.keys(), reverse=True):
            year_url = selected[year]
            try:
                editions = fetch_ufrgs_prova_editions(year_url, language=language)
            except Exception as e:
                results.append({"year": year, "skipped": True, "reason": f"Falha ao acessar a página do ano: {e}"})
                continue

            if not editions:
                results.append({"year": year, "skipped": True, "reason": "Nenhum link de prova reconhecido nessa página"})
                continue

            pending.extend((year, day, prova_url) for day, prova_url in sorted(editions.items()))

        total = max(len(pending), 1)
        if task_id:
            update_task_progress(task_id, current=0, total=total, log=f"{len(pending)} provas encontradas.")

        for idx, (year, day, prova_url) in enumerate(pending):
            try:
                r = import_ufrgs_exam(
                    prova_url=prova_url,
                    prova_path=None,
                    gabarito_text="",
                    year=year,
                    day=day,
                    db=db,
                    gabarito_year=year,
                    language=language,
                )
                results.append({"year": year, "day": day, **r})
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total,
                        log=f"✅ UFRGS {year} dia {day}: {r.get('total_added', 0)} adicionadas.",
                        items_done=total_added,
                    )
            except Exception as e:
                db.rollback()
                results.append({"year": year, "day": day, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(
                        task_id, current=idx + 1, total=total,
                        log=f"❌ UFRGS {year} dia {day}: {e}",
                        items_done=total_added,
                    )
            finally:
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


def import_ufrgs_exam(
    prova_url: Optional[str],
    prova_path: Optional[Path],
    gabarito_text: str,
    year: int,
    day: int,
    db=None,
    gabarito_year: Optional[int] = None,
    language: str = "Inglês",
) -> dict:
    """`gabarito_year`: se informado (e `gabarito_text` vazio), busca o
    gabarito automaticamente em vestibular.ufrgs.br/cv{gabarito_year}/gabaritos/
    em vez de exigir que o texto seja colado manualmente — só depois de
    parsear a prova, pra restringir a leitura às matérias que ela realmente
    contém (evita colisão de numeração entre variantes de idioma)."""
    from app.database import SessionLocal
    from app.services.import_batch import save_vestibular_question

    close_after = db is None
    if db is None:
        db = SessionLocal()

    exam_name = f"UFRGS {year} – Dia {day}"

    try:
        local_path = prova_path
        tmp_file: Optional[Path] = None
        if local_path is None:
            if not prova_url:
                raise ValueError("Informe a URL da prova ou um arquivo local.")
            import tempfile
            tmp_dir = tempfile.mkdtemp()
            tmp_file = Path(tmp_dir) / "prova.pdf"
            download_pdf(prova_url, tmp_file)
            local_path = tmp_file

        parsed = parse_exam_pdf(local_path)

        if tmp_file is not None:
            tmp_file.unlink(missing_ok=True)

        gabarito = parse_gabarito_text(gabarito_text) if gabarito_text else {}
        if not gabarito and gabarito_year is not None:
            try:
                wanted_areas = {q["area"] for q in parsed}
                gabarito = fetch_ufrgs_gabarito(gabarito_year, wanted_areas, language=language)
            except Exception:
                gabarito = {}  # best-effort: importa a prova mesmo sem gabarito

        added = 0
        skipped_existing = 0
        for q in parsed:
            correct_letter = gabarito.get(q["number"])
            options = [
                {
                    "letter": opt["letter"],
                    "text": opt["text"],
                    "is_correct": (correct_letter == opt["letter"]) if correct_letter else False,
                    "order": i,
                }
                for i, opt in enumerate(q["options"])
            ]

            metadata = {
                "area": q["area"],
                "day": day,
                "language": language,
                "university": "UFRGS",
            }

            vq, created = save_vestibular_question(
                db,
                exam_type="ufrgs",
                exam_name=exam_name,
                year=year,
                number=q["number"],
                statement=q["statement"],
                options=options,
                images=None,
                image_base64=None,
                correct_option=correct_letter,
                metadata=metadata,
            )
            if not created:
                skipped_existing += 1
                continue
            added += 1

            # Commit em lotes de 10 para evitar OOM em sessões longas
            if added % 10 == 0:
                db.commit()
                db.expunge_all()
                gc.collect()

        db.commit()
        db.expunge_all()
        gc.collect()
        return {
            "exam_name": exam_name,
            "total_parsed": len(parsed),
            "total_added": added,
            "skipped_existing": skipped_existing,
            "gabarito_entries": len(gabarito),
        }
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()
