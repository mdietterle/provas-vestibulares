from __future__ import annotations

"""Importa questões objetivas do vestibular da UFSM (Universidade Federal de
Santa Maria), feito pela COPERVES (Comissão Permanente do Vestibular —
coperves.ufsm.br), NÃO de um núcleo externo.

Descoberta da URL (pesquisada e confirmada manualmente, não é um chute):
  - `www.coperves.ufsm.br/provas/` lista PROVAS + PEIES de 2006 a 2012, com
    um link em PDF por prova ("PS1"/"PS2"/"PS3" = os 3 dias/cadernos do
    vestibular "processo seletivo"). Confirmado baixando o HTML bruto (a
    página é estática, sem JS) e conferindo cada link com HEAD/GET real.
  - A partir de 2013 a UFSM foi migrando para o SiSU/ENEM; o vestibular
    próprio "PS" de 2013 (dez/2013, ingresso 2014) foi o último — a página
    de provas não lista mais 2013 (o item do menu está comentado no HTML),
    mas os arquivos continuam publicados em
    `/concursos/vestibular_2013/arquivos/` (confirmado buscando e batendo
    cada URL candidata). Não há vestibular próprio da UFSM depois de 2013.
  - Cada edição publica PS1, PS2 e PS3 (prova + gabarito oficial definitivo
    em PDF cada). O gabarito é uma tabela "Questão"/"Alternativa"/
    "Disciplina" em duas colunas lado a lado (confirmado com
    `page.get_text(sort=True)`, que já devolve a tabela em ordem de leitura
    correta neste layout — extração linear (`get_text()` sem `sort=True`)
    embaralha completamente as colunas aqui).

Cobertura real, confirmada baixando e parseando de verdade (ver
`_EDITIONS` abaixo):
  - 2011 (edição de janeiro/2011, ingresso 2011): PS1 (30 questões), PS2
    (45) e PS3 (53) — prova E gabarito em texto (não digitalizado),
    parseáveis: layout de alternativas em coluna única, "A"-"E" maiúsculas.
    As 3 numerações originais recomeçam em 1 a cada caderno (colidiriam
    entre si); por isso são renumeradas de forma contínua (1..N) dentro do
    ano ao gravar, mesma solução adotada no importador da UNIOESTE para o
    mesmo problema.
  - Vestibular de 2012, dezembro/2011 (ingresso 2012) e dezembro/2013
    (ingresso 2014): PS1/PS2/PS3 têm gabarito PUBLICADO, mas como imagem
    digitalizada em pelo menos um dos cadernos de cada edição (0
    caracteres de texto extraídos pelo PyMuPDF) — sem OCR neste
    importador, não dá para saber a resposta certa desses cadernos. O
    PS2/2013 é o único caderno de 2012+ com prova E gabarito em texto, mas
    usa um layout de alternativas diferente do de 2011 — minúsculas
    "a"-"e" organizadas em DUAS colunas lado a lado por questão (não uma
    coluna só), incompatível com o parser de alternativas usado aqui
    (confirmado: 0 questões reconhecidas ao tentar). Cobrir esse layout
    exigiria reconstrução de coluna por posição (x,y) de cada alternativa,
    não feito nesta rodada — por isso essas edições inteiras (2012,
    dez/2011, dez/2013) são puladas honestamente, não é falha de rede nem
    chute.
  - 2006-2010: a página de provas não publica gabarito nenhum para essas
    edições (só prova e redação) — sem gabarito não dá pra saber a
    resposta certa, então ficam de fora.
  - PEIES (seriado, processo distinto do vestibular "PS") não é coberto
    por este importador.

Parsing da prova: PyMuPDF embaralha a ordem das colunas de alternativas
neste layout se usarmos extração linear simples; `page.get_text(sort=True)`
(ordenação por posição y/x) já resolve isso nos anos cobertos — confirmado
inspecionando bounding boxes de palavra por palavra. Cada questão começa
com um número (1 ou 2 dígitos) sozinho em uma linha, seguido do enunciado e
de exatamente 5 alternativas "A  texto" .. "E  texto" (sempre A-E, nunca
A-D, diferente da UFRN). Como o enunciado pode conter outros números
sozinhos em linha (marcadores de linha de um texto de apoio, expoentes de
fórmula etc.), a validação usada é: (1) só aceita uma questão cujas 5
alternativas apareçam em sequência A,B,C,D,E completa (evita ler qualquer
"A"/"B" solto de enumerações internas do enunciado como se fosse
alternativa) e (2) só aceita o número da questão se ele também aparecer no
gabarito oficial daquele caderno — isso descarta tanto números de linha
falsos quanto páginas de cartão-resposta que repetem os números das
questões no fim do PDF sem o enunciado real. Questões que não passam nessa
validação (formato raro/ambíguo) são puladas individualmente, sem travar o
restante do caderno.

SSL: `_get` tenta `verify=True` primeiro e cai para `verify=False` só se a
primeira tentativa falhar.
"""

import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.models import UfsmQuestion, UfsmQuestionOption
from app.services.progress import complete_task, fail_task, update_task_progress

_HEADERS = {"User-Agent": "Mozilla/5.0"}

_BASE = "https://www.coperves.ufsm.br"

# Cadernos confirmados baixando e parseando de verdade (ver docstring do
# módulo). Cada edição é uma lista de (nome_caderno, url_prova, url_gabarito).
_EDITIONS: dict[int, list[tuple[str, str, str]]] = {
    2011: [
        ("PS1", f"{_BASE}/concursos/vestibular_2011/arquivos/Prova_PS1.pdf",
                f"{_BASE}/concursos/vestibular_2011/arquivos/GABARITO_PS1.pdf"),
        ("PS2", f"{_BASE}/concursos/vestibular_2011/arquivos/Prova_PS2.pdf",
                f"{_BASE}/concursos/vestibular_2011/arquivos/GABARITO_PS2.pdf"),
        ("PS3", f"{_BASE}/concursos/vestibular_2011/arquivos/Prova_PS3.pdf",
                f"{_BASE}/concursos/vestibular_2011/arquivos/GABARITO_PS3.pdf"),
    ],
}


def _get(url: str, timeout: int = 60) -> requests.Response:
    """GET com fallback: tenta `verify=True`, só cai para `verify=False` se a
    primeira tentativa falhar."""
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=True)
    except requests.RequestException:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    return resp


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    if b"%PDF" not in resp.content[:16]:
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


def _sorted_text(pdf_path: Path) -> str:
    """Texto do PDF inteiro, em ordem de leitura (y depois x) — necessário
    porque a extração linear padrão do PyMuPDF embaralha a ordem das
    colunas de alternativas neste layout (ver docstring do módulo)."""
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text(sort=True) for page in doc)
    doc.close()
    return text


# ── Parsing do gabarito (tabela "Questão"/"Alternativa"/"Disciplina" em
#    duas colunas lado a lado) ──────────────────────────────────────────

_GAB_RE = re.compile(r"(\d{1,2})\s+(A|B|C|D|E|Anulada)\s+[A-ZÁ-Úa-zá-ú.]")


def parse_gabarito(text: str) -> dict[int, Optional[str]]:
    """Parseia a tabela "Questão"/"Alternativa"/"Disciplina" do gabarito
    oficial definitivo (duas colunas lado a lado, por isso não ancoramos em
    início de linha — cada linha física tem 2 pares número/letra). Qualquer
    valor que não seja uma letra A-E vira `None` (cobre questão anulada)."""
    result: dict[int, Optional[str]] = {}
    for num_s, val in _GAB_RE.findall(text):
        result[int(num_s)] = val if val in "ABCDE" else None
    return result


# ── Parsing da prova ─────────────────────────────────────────────────────

_ALT_RE = re.compile(r"(?m)^[ \t]*([A-E])[ \t]{2,}(?=\S)")
_NUM_RE = re.compile(r"(?m)^[ \t]*(\d{1,2})[ \t]*\n")
_ALT_ORDER = "ABCDE"


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parse_exam(text: str, gabarito: dict[int, Optional[str]]) -> list[dict]:
    """Parseia um caderno de prova e retorna
    [{number, statement, alternatives: [(letra, texto), ...]}], já
    validado contra o gabarito (ver docstring do módulo)."""
    alt_matches = list(_ALT_RE.finditer(text))
    num_matches = list(_NUM_RE.finditer(text))

    # Agrupa sequências completas A,B,C,D,E consecutivas.
    groups: list[tuple[int, int]] = []
    i = 0
    while i < len(alt_matches):
        if alt_matches[i].group(1) == "A":
            j, k = i, 0
            while j < len(alt_matches) and k < 5 and alt_matches[j].group(1) == _ALT_ORDER[k]:
                j += 1
                k += 1
            if k == 5:
                groups.append((i, j))
                i = j
                continue
        i += 1

    questions: list[dict] = []
    seen: set[int] = set()
    prev_end = 0
    for gi, (i0, i1) in enumerate(groups):
        g_start = alt_matches[i0].start()
        # Cabeçalho candidato: primeiro número sozinho em linha desde o fim
        # da questão anterior (evita pegar de propósito um número solto
        # colado nas alternativas, tipo expoente de fórmula).
        candidates = [m for m in num_matches if prev_end <= m.start() < g_start]
        prev_end = alt_matches[i1 - 1].end()
        if not candidates:
            continue
        header = candidates[0]
        number = int(header.group(1))
        if number not in gabarito or number in seen:
            continue  # não bate com o gabarito oficial — descarta (ver docstring)

        statement = _clean(text[header.end():g_start])
        if not statement:
            continue

        # Fim da última alternativa: começo da próxima questão reconhecida
        # (ou fim do texto, se for a última do caderno).
        block_end = alt_matches[groups[gi + 1][0]].start() if gi + 1 < len(groups) else len(text)

        alternatives: list[tuple[str, str]] = []
        for idx in range(i0, i1):
            letter = alt_matches[idx].group(1)
            a_start = alt_matches[idx].end()
            a_end = alt_matches[idx + 1].start() if idx + 1 < i1 else block_end
            alternatives.append((letter, _clean(text[a_start:a_end])))

        if len(alternatives) != 5:
            continue

        seen.add(number)
        questions.append({"number": number, "statement": statement, "alternatives": alternatives})

    questions.sort(key=lambda q: q["number"])
    return questions


# ── Persistência ─────────────────────────────────────────────────────────

def _persist_year(db: Session, year: int, cadernos: list[dict]) -> dict:
    """Grava as questões de um ano, renumerando de forma contínua (1..N)
    entre os cadernos (PS1/PS2/PS3) do mesmo ano, já que a numeração
    original recomeça em 1 em cada um e colidiria. Idempotente por ano: se
    já existirem questões daquele ano, não duplica."""
    already = db.query(UfsmQuestion).filter(UfsmQuestion.year == year).count()
    total_parsed = sum(len(c["questions"]) for c in cadernos)
    if already > 0:
        return {"year": year, "total_parsed": total_parsed, "total_added": 0, "skipped_existing": already}

    added = 0
    running_number = 0
    for caderno in cadernos:
        for q in caderno["questions"]:
            running_number += 1
            correct = caderno["gabarito"].get(q["number"])
            question = UfsmQuestion(year=year, number=running_number, statement=q["statement"])
            db.add(question)
            db.flush()

            for order, (letter, opt_text) in enumerate(q["alternatives"]):
                db.add(UfsmQuestionOption(
                    question_id=question.id,
                    text=opt_text,
                    is_correct=(letter == correct),
                    order=order,
                ))
            added += 1

    db.commit()
    return {"year": year, "total_parsed": total_parsed, "total_added": added, "skipped_existing": 0}


def import_ufsm_year(year: int, db: Optional[Session] = None) -> dict:
    """Importa um ano: baixa prova(s) + gabarito(s) oficiais definitivos dos
    cadernos mapeados em `_EDITIONS`, parseia e grava."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        cadernos_cfg = _EDITIONS.get(year)
        if not cadernos_cfg:
            return {"year": year, "skipped": True, "reason": "Ano não mapeado em _EDITIONS (gabarito não publicado, digitalizado sem texto, ou vestibular próprio não existiu nesse ano — ver docstring de app/services/ufsm/pdf_import.py)"}

        cadernos: list[dict] = []
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp = Path(tmp_dir)
                for nome, prova_url, gab_url in cadernos_cfg:
                    prova_path = tmp / f"{nome}_prova.pdf"
                    gab_path = tmp / f"{nome}_gab.pdf"
                    download_pdf(prova_url, prova_path)
                    download_pdf(gab_url, gab_path)

                    gabarito = parse_gabarito(_sorted_text(gab_path))
                    if not gabarito:
                        continue  # gabarito digitalizado/formato inesperado — pula só este caderno
                    questions = parse_exam(_sorted_text(prova_path), gabarito)
                    if not questions:
                        continue
                    cadernos.append({"nome": nome, "questions": questions, "gabarito": gabarito})
        except requests.RequestException as e:
            return {"year": year, "skipped": True, "reason": f"Falha de rede/download: {e}"}
        except ValueError as e:
            return {"year": year, "skipped": True, "reason": str(e)}

        if not cadernos:
            return {"year": year, "skipped": True, "reason": "Nenhum caderno reconhecido (prova/gabarito digitalizados ou em formato inesperado)"}

        return _persist_year(db, year, cadernos)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_ufsm_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os anos mapeados em `_EDITIONS` (2011 e 2013 — ver
    docstring do módulo). Cada ano é tentado de forma independente: falha
    de rede, PDF fora do padrão esperado, ou link não encontrado não travam
    o lote, só são reportados como pulados."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    years = sorted(_EDITIONS.keys(), reverse=True)
    if until_year:
        years = [y for y in years if y <= until_year]
    if since_year:
        years = [y for y in years if y >= since_year]

    results = []
    total_added = 0
    try:
        for i, year in enumerate(years):
            if task_id:
                update_task_progress(task_id, current=i, total=len(years), log=f"Processando Vestibular UFSM {year}...")

            try:
                r = import_ufsm_year(year, db=db)
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


async def import_all(
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    **kwargs,
) -> dict:
    return import_all_ufsm_exams(since_year=since_year, until_year=until_year, db=db, task_id=task_id, **kwargs)
