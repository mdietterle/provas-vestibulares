from __future__ import annotations

"""Importa questões do vestibular da UNIOESTE (Universidade Estadual do Oeste
do Paraná) direto do site oficial — não existe núcleo de concursos externo
(tipo NC-UFPR/COPERVE): tudo é hospedado no próprio portal institucional
(www.unioeste.br), sob Coordenadoria/Cogeps.

Página-índice usada como ponto de partida:
    https://www.unioeste.br/portal/vestibular/anteriores/82161-cadernos-de-prova
Ela é um Joomla que lista, por ano (2021 em diante — anos mais antigos não
estão linkados dali), um link para a página "Cadernos de Provas" daquele ano
e outro para a página "Gabarito Definitivo" — cada uma dessas sub-páginas é
que tem os links reais para os PDFs. `fetch_year_pages` resolve essas duas
URLs por ano; `fetch_pdf_links` entra em cada uma e extrai os PDFs.

O caminho/pasta dos PDFs mudou pelo menos 3 vezes entre 2021 e 2025
(2021: ".../Vestibular/2021/Tarde.pdf" direto; 2022: ".../2022/provas/Tarde.pdf";
2023/2024/2025: ".../2024/cadernos/padrao-tarde.pdf", gabarito numa subpasta
"gabaritos/" separada) — por isso a classificação dos links usa só palavras-
chave no NOME do arquivo ("tarde", "espanhol", "ingles"), nunca uma pasta fixa.

Desde ~2025 o vestibular tem dois processos paralelos: "Padrão" (o
tradicional, por prova) e "Seriado" (por notas do ensino médio, 3 séries).
Só o Padrão é importado aqui — cadernos/gabaritos cujo nome contém "seriado"
são ignorados.

Cada edição "Padrão" publica 3 cadernos de prova + 1 gabarito:
  - "Tarde" (2ª etapa): Geografia, História, Filosofia, Sociologia, Biologia,
    Física, Matemática, Química — 9 questões cada, numeradas 01-72
    (56 em edições mais antigas com só 7 questões/matéria), SEM marcação de
    resposta certa no próprio texto (ao contrário da UFPR).
  - "Manhã (Espanhol)" e "Manhã (Inglês)" (1ª etapa): o candidato escolhe UM
    idioma; ambos os cadernos trazem os MESMOS Língua Portuguesa e Literatura
    Brasileira, só a seção de Língua Estrangeira muda. Numeração local
    01-27 (ou 01-21), contínua entre as 3 matérias do mesmo caderno.
  - O gabarito é um PDF único e simples: "Gabarito Definitivo", seções
    "1ª Etapa (manhã)"/"2ª Etapa (tarde)", sub-cabeçalhos por matéria
    (incluindo "Língua Estrangeira: Espanhol"/"Inglês" separados) e linhas
    "NN = X" (X = letra A-E, ou "*" para questão anulada). `parse_gabarito_text`
    faz esse parsing.

Limitação de modelagem: `UnioesteQuestion` só tem (year, number, statement) —
sem campo de sessão/matéria/idioma. Como "Tarde" e "Manhã" numeram cada um a
partir de 1, não dá para gravar os dois com a numeração original sem colidir
(year, number) do mesmo ano. Solução adotada: grava "Tarde" com sua numeração
oficial e desloca a numeração de "Manhã" para continuar depois do maior
número de "Tarde" daquele ano (ex.: Tarde 1-72, Manhã 73-99). Escolhe-se
SEMPRE o caderno em Espanhol como o idioma canônico da manhã (Inglês é
ignorado) — como as duas versões só diferem na seção de língua estrangeira,
importar as duas duplicaria Português/Literatura sem necessidade.

Validado baixando e parseando de verdade os PDFs de 2021, 2023 e 2024
(Tarde + Manhã-Inglês, usado só para validar o parser antes de trocar para
Espanhol): 100% das questões de cada caderno foram reconhecidas com as 5
alternativas (A-E) completas, e o gabarito bateu number-a-number com as
questões (72/72, 56/56 e 27/27, 21/21 conforme o ano). Diferenças de exame
para exame que o parser já tolera: `01.` vs `1.` (uma questão de 2021 usa
"9." sem zero à esquerda) e `NN.Texto` sem espaço depois do ponto (bug do
gerador do PDF em pelo menos um ano). Questões de Química/Física com fórmulas
com sobrescrito/subscrito viram texto capenga (ex.: "LiAlH4" vira "4 LiAlH")
— mesma limitação inerente de extração de texto que já existe nos outros
importadores deste repo (nenhum lida com fórmulas especialmente).

O site é lento e instável mesmo para HTML puro (timeouts de 60-90s e
"connection refused" intermitentes foram observados durante o
desenvolvimento, inclusive em requisições que funcionaram normalmente ao
tentar de novo) — `_get`/`download_pdf` tentam algumas vezes antes de
desistir, e cada ano é importado independentemente (falha num ano não trava
o lote).
"""

import re
import tempfile
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.models import UnioesteQuestion, UnioesteQuestionOption
from app.services.progress import complete_task, fail_task, update_task_progress

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_INDEX_URL = "https://www.unioeste.br/portal/vestibular/anteriores/82161-cadernos-de-prova"

_LINK_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)
_YEAR_LINK_RE = re.compile(r"anteriores/\d+-vestibular-(\d{4})$")
_PDF_LINK_RE = re.compile(r'href="([^"]+\.pdf[^"]*)"', re.I)


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s).strip()


def _get(url: str, timeout: int = 60, attempts: int = 3) -> requests.Response:
    """GET com algumas tentativas — o site da Unioeste estoura timeout ou
    recusa conexão de forma intermitente, mesmo para HTML simples."""
    last_exc: Optional[Exception] = None
    for _ in range(attempts):
        try:
            resp = requests.get(url, timeout=timeout, headers=_HEADERS)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            last_exc = e
    assert last_exc is not None
    raise last_exc


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    if resp.content[:4] != b"%PDF":
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


# ── Descoberta das URLs (índice → página do ano → PDFs) ─────────────────────

def fetch_year_pages(html: Optional[str] = None, url: str = _INDEX_URL) -> dict[int, dict]:
    """Varre a página-índice "Cadernos de Prova e Gabaritos" e retorna, por
    ano, as URLs das sub-páginas "Cadernos de Provas" e "Gabarito Definitivo"
    (que por sua vez contêm os links reais para os PDFs — ver `fetch_pdf_links`).

    A página lista os mesmos anos duas vezes (uma seção "Cadernos de Provas",
    outra "Gabaritos Definitivos"), cada item precedido por um link "Vestibular
    AAAA" que serve de âncora para saber a qual ano os links seguintes
    pertencem."""
    if html is None:
        html = _get(url, timeout=30).text

    years: dict[int, dict] = {}
    current_year: Optional[int] = None
    for m in _LINK_RE.finditer(html):
        href, text = m.group(1), _strip_tags(m.group(2))
        ym = _YEAR_LINK_RE.search(href)
        if ym:
            current_year = int(ym.group(1))
            years.setdefault(current_year, {})
            continue
        if current_year is None:
            continue

        # Só considera links que sejam de fato sub-páginas do artigo daquele
        # ano (".../NNNN-vestibular-AAAA/..."). Sem essa checagem, o link do
        # ÚLTIMO ano da lista (2021, sem nenhum ano depois pra "fechar" o
        # current_year) capturava por engano links de rodapé/menu que
        # continham "gabarito" no texto (ex.: o próprio breadcrumb "Cadernos
        # de Prova e Gabaritos Definitivos", que aponta pra página-índice).
        if f"-vestibular-{current_year}/" not in href:
            continue

        low_href, low_text = href.lower(), text.lower()
        page_url = urljoin(url, href)
        if "caderno" in low_href or "caderno" in low_text:
            years[current_year].setdefault("cadernos_url", page_url)
        if "gabarito" in low_href or "gabarito" in low_text:
            is_definitivo = "definitivo" in low_href or "definitivo" in low_text
            if is_definitivo or "gabarito_url" not in years[current_year]:
                years[current_year]["gabarito_url"] = page_url

    return years


def fetch_pdf_links(page_url: str) -> list[str]:
    """Extrai todos os links de PDF de uma sub-página (Cadernos de Provas ou
    Gabarito Definitivo de um ano)."""
    html = _get(page_url, timeout=30).text
    return [urljoin(page_url, h) for h in _PDF_LINK_RE.findall(html)]


def _classify_exam_pdfs(urls: list[str]) -> dict[str, str]:
    """Escolhe, entre os PDFs de uma página de Cadernos de Provas, os 3
    cadernos do vestibular Padrão (ignora Seriado e outros documentos
    institucionais que não são da prova, ex.: estatuto/regimento)."""
    result: dict[str, str] = {}
    for u in urls:
        low_url = u.lower()
        if "ingresso" not in low_url:
            continue
        name = low_url.rsplit("/", 1)[-1]
        if "seriado" in name:
            continue
        if "tarde" in name:
            result.setdefault("tarde", u)
        elif "espanhol" in name:
            result.setdefault("manha_espanhol", u)
        elif "ingles" in name or "inglês" in name:
            result.setdefault("manha_ingles", u)
    return result


def _classify_gabarito_pdf(urls: list[str]) -> Optional[str]:
    """Escolhe, entre os PDFs de uma página de Gabarito, o do vestibular
    Padrão (ignora Seriado), priorizando "definitivo" sobre "provisório"."""
    candidates = [
        u for u in urls
        if "ingresso" in u.lower()
        and "gabarito" in u.lower()
        and "seriado" not in u.lower().rsplit("/", 1)[-1]
    ]
    if not candidates:
        return None

    def score(u: str) -> tuple[int, int]:
        low = u.lower()
        return (0 if "definitivo" in low else 1, 0 if "padrao" in low or "padrão" in low else 1)

    candidates.sort(key=score)
    return candidates[0]


# ── Parsing do gabarito ──────────────────────────────────────────────────────

_ETAPA1_RE = re.compile(r"^1\s*ª?\s*Etapa", re.I)
_ETAPA2_RE = re.compile(r"^2\s*ª?\s*Etapa", re.I)
_ANSWER_LINE_RE = re.compile(r"^(\d{1,2})\s*=\s*(\*\*|\*|[A-Ea-e])$")
_IGNORE_LABEL_RE = re.compile(r"^\*|gabarito|universidade estadual|concurso vestibular", re.I)


def parse_gabarito_text(text: str) -> dict[str, dict[int, Optional[str]]]:
    """Parseia o texto extraído do PDF de Gabarito Definitivo (ver docstring
    do módulo pro formato). Retorna {"tarde": {num: letra|None}, "manha_espanhol":
    {...}, "manha_ingles": {...}} — os dois mapas da manhã já vêm com a seção
    compartilhada (Português/Literatura) mesclada, prontos para uso direto
    contra a numeração local de cada caderno."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    etapa: Optional[str] = None
    label: Optional[str] = None
    manha_shared: dict[int, Optional[str]] = {}
    manha_espanhol: dict[int, Optional[str]] = {}
    manha_ingles: dict[int, Optional[str]] = {}
    tarde: dict[int, Optional[str]] = {}

    for line in lines:
        if _ETAPA1_RE.match(line):
            etapa, label = "manha", None
            continue
        if _ETAPA2_RE.match(line):
            etapa, label = "tarde", None
            continue

        m = _ANSWER_LINE_RE.match(line)
        if m:
            num = int(m.group(1))
            val = m.group(2).upper()
            correct = None if val in ("*", "**") else val
            if etapa == "tarde":
                tarde[num] = correct
            elif etapa == "manha":
                low_label = (label or "").lower()
                if "espanhol" in low_label:
                    manha_espanhol[num] = correct
                elif "ingl" in low_label:
                    manha_ingles[num] = correct
                else:
                    manha_shared[num] = correct
            continue

        if _IGNORE_LABEL_RE.search(line):
            continue
        label = line  # cabeçalho de matéria/idioma (ex.: "Geografia", "Língua Estrangeira: Espanhol")

    return {
        "tarde": tarde,
        "manha_espanhol": {**manha_shared, **manha_espanhol},
        "manha_ingles": {**manha_shared, **manha_ingles},
    }


# ── Parsing da prova ─────────────────────────────────────────────────────────

_Q_RE = re.compile(r"(?m)^\s*(\d{1,2})\.(?!\d)\s*")
_ALT_RE = re.compile(r"(?m)^\s*([a-e])\)\s*")
_Q1_RE = re.compile(r"(?m)^\s*01\.(?!\d)\s*")


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _pdf_full_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def parse_exam_pdf(pdf_path: Path) -> list[dict]:
    """Parseia um caderno de prova (Tarde ou Manhã) e retorna a lista de
    questões [{number, statement, alternatives: [(letra, texto), ...]}].

    A numeração de questão no PDF é sempre "NN." com zero à esquerda (ex.:
    "01.", "02."), MAS pelo menos um ano (2021, questão 9) imprime sem o
    zero ("9."), e em outro caso o gerador do PDF não deixa espaço depois do
    ponto ("50.As substâncias..."). Por isso a extração:
      1) localiza o início real das questões pelo primeiro "01." (evita
         confundir com a numeração dos itens de instrução da capa, "1.
         CADERNO DE PROVAS:", "2. CARTÃO-RESPOSTA:" etc, que também é
         sequencial a partir de 1 e senão seria pega por engano);
      2) dentro do conteúdo real, aceita "N." ou "NN." mas só avança pra
         próxima questão quando o número bate com o próximo esperado
         (1, 2, 3, ...) — filtra naturalmente qualquer número solto que não
         seja de fato o marcador da próxima questão.
    """
    text = _pdf_full_text(pdf_path)
    m0 = _Q1_RE.search(text)
    if m0:
        text = text[m0.start():]

    boundaries = []
    expected = 1
    for cand in _Q_RE.finditer(text):
        if int(cand.group(1)) == expected:
            boundaries.append(cand)
            expected += 1

    questions: list[dict] = []
    for i, m in enumerate(boundaries):
        start = m.end()
        end = boundaries[i + 1].start() if i + 1 < len(boundaries) else len(text)
        body = text[start:end]

        alt_matches = list(_ALT_RE.finditer(body))
        seen: set[str] = set()
        alternatives: list[tuple[str, str]] = []
        for j, am in enumerate(alt_matches):
            letter = am.group(1).upper()
            if letter in seen:
                continue
            seen.add(letter)
            a_start = am.end()
            a_end = alt_matches[j + 1].start() if j + 1 < len(alt_matches) else len(body)
            alternatives.append((letter, _clean(body[a_start:a_end])))

        if len(alternatives) != 5 or {L for L, _ in alternatives} != set("ABCDE"):
            continue  # questão em formato inesperado (raro) — pula, não trava o resto

        statement = _clean(body[: alt_matches[0].start()] if alt_matches else body)
        if not statement:
            continue

        questions.append({
            "number": int(m.group(1)),
            "statement": statement,
            "alternatives": alternatives,
        })

    return questions


# ── Persistência ─────────────────────────────────────────────────────────────

def _persist_year(db: Session, year: int, questions: list[dict]) -> dict:
    """Grava as questões de um ano (já com `correct` resolvido pelo
    gabarito). Idempotente por ano: se já existirem questões daquele ano,
    não duplica (não há campo de sessão/exame no modelo para distinguir
    reimportações parciais)."""
    already = db.query(UnioesteQuestion).filter(UnioesteQuestion.year == year).count()
    if already > 0:
        return {"year": year, "total_parsed": len(questions), "total_added": 0, "skipped_existing": already}

    added = 0
    for q in questions:
        question = UnioesteQuestion(year=year, number=q["number"], statement=q["statement"])
        db.add(question)
        db.flush()

        correct = q.get("correct")
        for order, (letter, opt_text) in enumerate(q["alternatives"]):
            db.add(UnioesteQuestionOption(
                question_id=question.id,
                text=opt_text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return {"year": year, "total_parsed": len(questions), "total_added": added, "skipped_existing": 0}


def import_unioeste_year(
    year: int,
    cadernos_url: str,
    gabarito_url: Optional[str],
    db: Optional[Session] = None,
) -> dict:
    """Importa a edição 'Padrão' de um ano: baixa Tarde + Manhã-Espanhol (ver
    docstring do módulo sobre a escolha do idioma) e o Gabarito Definitivo, e
    grava tudo no banco. Tarde mantém a numeração oficial (01-NN); Manhã é
    deslocada para continuar depois do maior número de Tarde, pra não colidir
    (year, number) — limitação do modelo `UnioesteQuestion`."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        exam_urls = fetch_pdf_links(cadernos_url)
        exams = _classify_exam_pdfs(exam_urls)
        if "tarde" not in exams:
            return {"year": year, "skipped": True, "reason": "Caderno 'Tarde' não encontrado na página de cadernos"}

        gabarito_urls = fetch_pdf_links(gabarito_url) if gabarito_url else []
        gabarito_pdf_url = _classify_gabarito_pdf(gabarito_urls)
        gabarito = {"tarde": {}, "manha_espanhol": {}, "manha_ingles": {}}

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)

            if gabarito_pdf_url:
                gpath = tmp / "gabarito.pdf"
                download_pdf(gabarito_pdf_url, gpath)
                gabarito = parse_gabarito_text(_pdf_full_text(gpath))

            tarde_path = tmp / "tarde.pdf"
            download_pdf(exams["tarde"], tarde_path)
            tarde_qs = parse_exam_pdf(tarde_path)
            for q in tarde_qs:
                q["correct"] = gabarito["tarde"].get(q["number"])

            manha_qs: list[dict] = []
            manha_url = exams.get("manha_espanhol") or exams.get("manha_ingles")
            manha_key = "manha_espanhol" if "manha_espanhol" in exams else "manha_ingles"
            if manha_url:
                manha_path = tmp / "manha.pdf"
                download_pdf(manha_url, manha_path)
                raw_manha_qs = parse_exam_pdf(manha_path)
                offset = max((q["number"] for q in tarde_qs), default=0)
                for q in raw_manha_qs:
                    manha_qs.append({
                        "number": q["number"] + offset,
                        "statement": q["statement"],
                        "alternatives": q["alternatives"],
                        "correct": gabarito[manha_key].get(q["number"]),
                    })

        all_qs = tarde_qs + manha_qs
        if not all_qs:
            return {"year": year, "skipped": True, "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)"}

        return _persist_year(db, year, all_qs)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_unioeste_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as edições 'Padrão' da UNIOESTE listadas na página-índice
    (2021 em diante — anos mais antigos não estão linkados dali e não são
    cobertos). Cada ano é tentado de forma independente: página de cadernos
    não encontrada, PDF fora do padrão esperado, ou falha de rede não travam
    o lote, só são reportados como pulados. Use `since_year`/`until_year` pra
    restringir o intervalo."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        year_pages = fetch_year_pages()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a página de cadernos de prova: {e}")

    years = sorted(year_pages.keys(), reverse=True)
    if until_year:
        years = [y for y in years if y <= until_year]
    if since_year:
        years = [y for y in years if y >= since_year]

    results = []
    total_added = 0
    try:
        for i, year in enumerate(years):
            if task_id:
                update_task_progress(task_id, current=i, total=len(years), log=f"Processando Vestibular {year}...")

            pages = year_pages[year]
            cadernos_url = pages.get("cadernos_url")
            gabarito_url = pages.get("gabarito_url")
            if not cadernos_url:
                results.append({"year": year, "skipped": True, "reason": "Página de cadernos não encontrada no índice"})
                continue

            try:
                r = import_unioeste_year(year, cadernos_url, gabarito_url, db=db)
                results.append(r)
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=i + 1, total=len(years),
                        log=f"✅ {year}: {r.get('total_added', 0)} adicionadas." if not r.get("skipped") else f"⏭️ {year}: {r.get('reason')}",
                    )
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(task_id, current=i + 1, total=len(years), log=f"❌ Erro em {year}: {e}")

        res = {"total_added": total_added, "years": results}
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


# Compat: nome usado historicamente pelo router.
def import_all(db: Optional[Session] = None, task_id: Optional[str] = None, **kwargs) -> dict:
    return import_all_unioeste_exams(db=db, task_id=task_id, **kwargs)
