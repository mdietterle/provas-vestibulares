from __future__ import annotations

"""Importa questões objetivas do vestibular da UFRN, feito pela COMPERVE
(Comissão Permanente do Vestibular / Núcleo Permanente de Concursos —
comperve.ufrn.br), NÃO de um núcleo externo.

Descoberta da URL (pesquisada e confirmada manualmente, não é um chute):
  - `comperve.ufrn.br/conteudo/provas/provas.htm` lista, por ano, uma página
    `provas<YYYY>.php` (2008-2013) ou `provas<YYYY>.htm` (2001-2007) com os
    links de prova/gabarito daquele ano.
  - O vestibular da UFRN acabou em 2013 — a partir de 2014 a UFRN passou a
    usar só o SiSU/ENEM para o ingresso geral, então `provas2014.php` e
    seguintes retornam 404 (confirmado). Não há vestibular próprio mais
    recente para importar.
  - Cada edição tinha 3 "dias" de prova. O "Dia 2" (Linguagens, Códigos e
    suas Tecnologias — Português e Literatura — mais Ciências Humanas e
    suas Tecnologias) é o único dia inteiramente objetivo (múltipla
    escolha, sempre com exatamente 4 alternativas A-D) nos anos
    verificados — o "Dia 1" mistura objetivas (Natureza/Matemática) com a
    prova de Língua Estrangeira (cujo PDF de prova, quando existe, não tem
    URL estável — só o gabarito combinado sobrevive) e o "Dia 3" é
    inteiramente discursivo (Biologia, História/Geografia, Física/Química
    etc., sem gabarito de múltipla escolha). Por isso este importador
    cobre só o Dia 2: 44 questões objetivas por ano (1-20 Linguagens,
    21-44 Ciências Humanas), com prova em PDF e gabarito em tabela HTML.
  - Layout de arquivo por ano (confirmado baixando e parseando de verdade
    2011, 2012 e 2013):
      * prova:    /conteudo/provas/<YYYY>/dia2.pdf
      * gabarito: /conteudo/provas/<YYYY>/dia2D.php (tabela HTML "Questão"/
        "Alternativa", 44 linhas, layout estável nos 3 anos).
    Anos anteriores (2008-2010) usam nomes de arquivo diferentes
    (`dia2.php`/`dia2def.php`/`dia2Def.php`, sem um `dia2.pdf` direto — a
    prova nesses anos parece não ter sido publicada como PDF avulso) e não
    foram localizados de forma confiável; não estão cobertos por
    `_YEARS_DIA2` abaixo.

SSL: o certificado do host está vencido/inválido (confirmado nesta rodada:
`requests` com `verify=True` falha com CERTIFICATE_VERIFY_FAILED) — por
isso `_get` tenta `verify=True` primeiro e cai para `verify=False` só se a
primeira tentativa falhar, mas na prática sempre cai para `verify=False`
aqui (mesma situação relatada em rodadas anteriores para este host).

Parsing da prova (Dia 2) — cada questão começa com "Questão N" em linha
própria (PyMuPDF não embaralha colunas aqui — layout de coluna única por
questão) e as alternativas vêm em sequência "A) ... B) ... C) ... D) ...".
Diferente de outros importadores deste repo (ex.: UEL), aqui são sempre 4
alternativas (A-D), não 5.
"""

import html as html_lib
import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.models import UfrnQuestion, UfrnQuestionOption
from app.services.progress import complete_task, fail_task, update_task_progress

_HEADERS = {"User-Agent": "Mozilla/5.0"}

# Anos com prova (Dia 2) em PDF avulso e gabarito em dia2D.php, confirmados
# baixando e parseando de verdade. Ver docstring do módulo.
_YEARS_DIA2: list[int] = [2011, 2012, 2013]


def _get(url: str, timeout: int = 60) -> requests.Response:
    """GET com fallback: tenta `verify=True`, só cai para `verify=False` se a
    primeira tentativa falhar (ver docstring do módulo — na prática este
    host sempre cai para `verify=False`, certificado vencido/inválido)."""
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=True)
    except requests.RequestException:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    return resp


def prova_url_for_year(year: int) -> str:
    return f"https://www.comperve.ufrn.br/conteudo/provas/{year}/dia2.pdf"


def gabarito_url_for_year(year: int) -> str:
    return f"https://www.comperve.ufrn.br/conteudo/provas/{year}/dia2D.php"


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    if b"%PDF" not in resp.content[:16]:
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


# ── Parsing do gabarito (tabela HTML "Questão"/"Alternativa") ──────────────

_GAB_ROW_RE = re.compile(r"<strong>(\d{1,2})</strong>\s*</td>\s*<td[^>]*>\s*([A-Za-z\*]?)\s*</td>")


def parse_gabarito_html(html_text: str) -> dict[int, Optional[str]]:
    """Parseia a tabela "Questão"/"Alternativa" do gabarito oficial
    definitivo. Qualquer valor que não seja uma letra A-D vira `None`
    (cobre questão anulada, marcada com "*" nos anos verificados)."""
    result: dict[int, Optional[str]] = {}
    for num_s, val in _GAB_ROW_RE.findall(html_text):
        letter = val.strip().upper()
        result[int(num_s)] = letter if letter in "ABCD" else None
    return result


# ── Parsing da prova ─────────────────────────────────────────────────────

_Q_RE = re.compile(r"(?m)^Quest[ãa]o\s+(\d{1,2})\s*\n")
_ALT_RE = re.compile(r"(?m)^([A-D])\)\s*")


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _pdf_full_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def parse_exam_pdf(pdf_path: Path) -> list[dict]:
    """Parseia o caderno do Dia 2 e retorna
    [{number, statement, alternatives: [(letra, texto), ...]}]. Sem
    `correct` aqui — a resposta vem só do gabarito oficial (arquivo
    separado), que é cruzado em `import_ufrn_year`."""
    text = _pdf_full_text(pdf_path)
    boundaries = list(_Q_RE.finditer(text))

    questions: list[dict] = []
    for i, m in enumerate(boundaries):
        start = m.end()
        end = boundaries[i + 1].start() if i + 1 < len(boundaries) else len(text)
        body = text[start:end]

        alt_matches = list(_ALT_RE.finditer(body))
        seen: set[str] = set()
        alternatives: list[tuple[str, str]] = []
        for j, am in enumerate(alt_matches):
            letter = am.group(1)
            if letter in seen:
                continue
            seen.add(letter)
            a_start = am.end()
            a_end = alt_matches[j + 1].start() if j + 1 < len(alt_matches) else len(body)
            alternatives.append((letter, _clean(body[a_start:a_end])))

        if len(alternatives) != 4 or {L for L, _ in alternatives} != set("ABCD"):
            continue  # formato inesperado (raro) — pula, não trava o resto

        statement = _clean(body[: alt_matches[0].start()]) if alt_matches else ""
        if not statement:
            continue

        questions.append({
            "number": int(m.group(1)),
            "statement": statement,
            "alternatives": alternatives,
        })

    return questions


# ── Persistência ─────────────────────────────────────────────────────────

def _persist_year(db: Session, year: int, questions: list[dict], gabarito: dict[int, Optional[str]]) -> dict:
    """Grava as questões de um ano. Idempotente por ano: se já existirem
    questões daquele ano, não duplica."""
    already = db.query(UfrnQuestion).filter(UfrnQuestion.year == year).count()
    if already > 0:
        return {"year": year, "total_parsed": len(questions), "total_added": 0, "skipped_existing": already}

    added = 0
    for q in questions:
        correct = gabarito.get(q["number"])
        question = UfrnQuestion(year=year, number=q["number"], statement=q["statement"])
        db.add(question)
        db.flush()

        for order, (letter, opt_text) in enumerate(q["alternatives"]):
            db.add(UfrnQuestionOption(
                question_id=question.id,
                text=opt_text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return {"year": year, "total_parsed": len(questions), "total_added": added, "skipped_existing": 0}


def import_ufrn_year(year: int, db: Optional[Session] = None) -> dict:
    """Importa um ano: baixa a prova do Dia 2 + gabarito oficial definitivo,
    parseia e grava."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        if year not in _YEARS_DIA2:
            return {"year": year, "skipped": True, "reason": "Ano não mapeado em _YEARS_DIA2 (URL não pesquisada/confirmada, ou vestibular próprio não existiu/não foi publicado nesse formato)"}

        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp = Path(tmp_dir)
                prova_path = tmp / "dia2.pdf"
                download_pdf(prova_url_for_year(year), prova_path)
                questions = parse_exam_pdf(prova_path)

                gab_resp = _get(gabarito_url_for_year(year), timeout=30)
                gabarito = parse_gabarito_html(html_lib.unescape(gab_resp.text))
        except requests.RequestException as e:
            return {"year": year, "skipped": True, "reason": f"Falha de rede/download: {e}"}
        except ValueError as e:
            return {"year": year, "skipped": True, "reason": str(e)}

        if not questions:
            return {"year": year, "skipped": True, "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)"}
        if not gabarito:
            return {"year": year, "skipped": True, "reason": "Gabarito não reconhecido (HTML em formato inesperado)"}

        return _persist_year(db, year, questions, gabarito)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_ufrn_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os anos mapeados em `_YEARS_DIA2` (2011-2013 — ver
    docstring do módulo; a UFRN não fez vestibular próprio depois de 2013).
    Cada ano é tentado de forma independente: falha de rede, PDF fora do
    padrão esperado, ou link não encontrado não travam o lote, só são
    reportados como pulados."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    years = sorted(_YEARS_DIA2, reverse=True)
    if until_year:
        years = [y for y in years if y <= until_year]
    if since_year:
        years = [y for y in years if y >= since_year]

    results = []
    total_added = 0
    try:
        for i, year in enumerate(years):
            if task_id:
                update_task_progress(task_id, current=i, total=len(years), log=f"Processando Vestibular UFRN {year}...")

            try:
                r = import_ufrn_year(year, db=db)
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
    return import_all_ufrn_exams(since_year=since_year, until_year=until_year, db=db, task_id=task_id, **kwargs)
