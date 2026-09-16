from __future__ import annotations

"""Importa questões do vestibular próprio da UTFPR (Universidade Tecnológica
Federal do Paraná) direto do site institucional — não há núcleo de concursos
externo, tudo é hospedado no próprio Plone/Volto (www.utfpr.edu.br), sob
/cursos/estudenautfpr/vestibular.

Descoberta confirmada navegando o site real (não supondo): a listagem
"Provas Anteriores" (.../vestibular/vestibular/provas-anteriores/) só cobre
2023 em diante e usa páginas-satélite ("Caderno de Provas"/"Gabarito
Definitivo" — meros LINKS que redirecionam pra outra árvore, "editais1/
edicoes-anteriores/..."). A fonte estável usada por este importador é outra:
a pasta "edicoes" (.../vestibular/edicoes/<AAAA>-<N>/provas-e-gabaritos/),
que existe uma por edição (ex.: "2023-2", "2024-1", "2024-2", "2025-1",
"2026-1"...) e hospeda os PDFs DIRETO nela mesma como itens de pasta — sem
indireção. Cada edição é "Verão" (semestre 1) ou "Inverno" (semestre 2);
`fetch_editions` resolve a lista de edições via a REST API do Plone
(`++api++`, JSON puro, sem precisar renderizar o React/Volto do front-end).

Formato de cada edição: 1 ÚNICO caderno de prova (60 questões, numeração
global 01-60) + 1 gabarito definitivo. Peculiaridade: as questões 13-18 são
de Língua Estrangeira e aparecem DUAS VEZES no caderno sob os MESMOS
números — uma vez em Inglês, uma vez em Espanhol (o candidato escolhe uma
das opções na inscrição). Só o bloco de Inglês é importado (ver
`parse_exam_pdf`): a técnica de "só avança pra próxima questão quando o
número bate com o esperado" (mesma usada em unioeste/pdf_import.py) resolve
isso sozinha — a repetição em Espanhol aparece DEPOIS que o número esperado
já passou de 18, então é ignorada automaticamente, sem lógica extra.

O formato do caderno mudou pelo menos uma vez entre 2023 e 2026:
  - "Verão 2024" (2024-1), "Inverno 2023" (2023-2) e "Verão 2025" (2025-1):
    questões marcadas "NN." (com zero à esquerda) e alternativas "(A)".
  - "Inverno 2024" (2024-2): questões marcadas "Questão NN – " (hífen OU
    en-dash "–", um ano usa cada) e alternativas "a)".
`parse_exam_pdf` tenta o formato "Questão N -" primeiro e só cai pro formato
"NN." se o primeiro reconhecer poucas questões (< 40) — evita falso-positivo
de um formato "vazando" sobre o outro.

O gabarito é uma tabela de 2 colunas (questões 1-30 à esquerda, 31-60 à
direita) que o PyMuPDF às vezes entrega em ORDEM DE LEITURA correta
(números e letras intercalados coerentemente) e às vezes completamente
embaralhada (todos os números primeiro, depois todos os cabeçalhos "Questão"
repetidos, depois as letras soltas — comprovado baixando o gabarito de
Inverno 2023 e comparando com o de Verão 2025) — por isso `parse_gabarito_text`
NUNCA usa a ordem linear de `get_text()`: agrupa as palavras (via
`get_text("words")`) por posição Y (linha visual) e X (coluna esquerda vs.
direita), o que é estável nos dois casos. Questões 13-18 têm DUAS letras na
mesma linha (Inglês, depois Espanhol, nessa ordem — confirmado comparando os
textos linearizados com os agrupamentos); questões anuladas aparecem como
"ANULADA" (ou "Anulado", com essa grafia, em pelo menos uma edição) em vez
de uma letra A-E — tratadas como sem resposta certa (correct=None), nunca
como falso-positivo de alguma letra.

Validado baixando e parseando de verdade os PDFs de 4 edições (Inverno
2023, Verão 2024, Inverno 2024, Verão 2025): 60/60 questões reconhecidas em
cada uma, com as 5 alternativas completas, e o gabarito bateu question-a-
question com as questões não anuladas (59, 58, 58 e 59 de 60 batendo; as
diferenças são exatamente as questões anuladas de cada edição, sem nenhum
mismatch verdadeiro).

Limitação de modelagem: `UtfprQuestion` só tinha (year, number, statement) —
sem campo para diferenciar duas edições do mesmo ano civil (ex.: Verão 2024
e Inverno 2024 são ambas "year=2024"). Adicionado `exam_name` (migração em
app/main.py) para armazenar "Verão AAAA"/"Inverno AAAA"; `(year, exam_name)`
é a chave de idempotência na importação (em vez de só `year`).
"""

import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.models import UtfprQuestion, UtfprQuestionOption
from app.services.progress import complete_task, fail_task, update_task_progress

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_API_BASE = "https://www.utfpr.edu.br/++api++/cursos/estudenautfpr/vestibular"
_EDICOES_PATH = "/cursos/estudenautfpr/vestibular/edicoes"


def _get(url: str, timeout: int = 60, attempts: int = 3, **kwargs) -> requests.Response:
    """GET com algumas tentativas e fallback de verificação de certificado
    (alguns hosts .edu.br têm cadeia TLS incompleta)."""
    last_exc: Optional[Exception] = None
    for verify in (True, False):
        for _ in range(attempts):
            try:
                resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=verify, **kwargs)
                resp.raise_for_status()
                return resp
            except requests.exceptions.SSLError as e:
                last_exc = e
                break  # não adianta repetir com o mesmo verify=True
            except requests.RequestException as e:
                last_exc = e
    assert last_exc is not None
    raise last_exc


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    if resp.content[:4] != b"%PDF":
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


# ── Descoberta das URLs (API REST do Plone) ─────────────────────────────────

def fetch_editions() -> dict[str, int]:
    """Lista as edições disponíveis em .../vestibular/edicoes/ e retorna
    {slug: year} (ex.: {"2024-1": 2024, "2024-2": 2024, ...}). O slug é
    "<ano>-<semestre>" (1=Verão, 2=Inverno)."""
    resp = _get(
        f"{_API_BASE}/edicoes/@search",
        params={"path.query": _EDICOES_PATH, "path.depth": 1, "b_size": 200},
        timeout=30,
    )
    data = resp.json()
    editions: dict[str, int] = {}
    for item in data.get("items", []):
        slug = item["@id"].rsplit("/", 1)[-1]
        m = re.match(r"^(\d{4})-(\d)$", slug)
        if m:
            editions[slug] = int(m.group(1))
    return editions


def _semester_label(slug: str, year: int) -> str:
    sem = slug.rsplit("-", 1)[-1]
    return f"Verão {year}" if sem == "1" else f"Inverno {year}"


def fetch_edition_files(slug: str) -> list[dict]:
    """Retorna os itens File da pasta 'provas-e-gabaritos' de uma edição
    (cada um já com @id = URL do PDF, sem precisar montar link nenhum)."""
    resp = _get(f"{_API_BASE}/edicoes/{slug}/provas-e-gabaritos", timeout=30)
    data = resp.json()
    return [it for it in data.get("items", []) if it.get("@type") == "File"]


def _classify_files(files: list[dict]) -> tuple[Optional[str], Optional[str]]:
    """Escolhe, entre os arquivos de uma edição, a URL do caderno de prova e
    a do gabarito (definitivo com preferência sobre provisório). Ignora
    quaisquer outros PDFs soltos (ex.: erratas tipo 'q34.pdf')."""
    prova_url: Optional[str] = None
    gabarito_url: Optional[str] = None
    gabarito_is_definitivo = False

    for f in files:
        name = f["@id"].rsplit("/", 1)[-1].lower()
        url = f["@id"] + "/@@download/file"
        if "gabarito" in name:
            is_definitivo = "definitivo" in name
            if gabarito_url is None or (is_definitivo and not gabarito_is_definitivo):
                gabarito_url = url
                gabarito_is_definitivo = is_definitivo
        elif "prova" in name or "caderno" in name:
            if prova_url is None:
                prova_url = url

    return prova_url, gabarito_url


# ── Parsing do gabarito ──────────────────────────────────────────────────────

def _pdf_full_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


_GABARITO_IGNORE_WORDS = {"língua", "estrangeira"}


def parse_gabarito_pdf(pdf_path: Path) -> dict[int, Optional[str]]:
    """Parseia o gabarito definitivo. Usa posição (X, Y) das palavras em vez
    da ordem linear de `get_text()`, que embaralha em pelo menos uma edição
    observada (ver docstring do módulo). A tabela tem 1 ou 2 colunas de
    questões conforme a edição (60 ou 40 questões, respectivamente) — em vez
    de assumir uma coluna fixa em X, cada linha visual é dividida em quantos
    grupos "número + resposta(s)" ela realmente contiver (identificados
    pelos próprios tokens numéricos 1-60), o que cobre os dois casos sem
    precisar de um threshold de X ajustado por edição.

    Casos especiais tratados:
      - Questões 13-18 (ou 9-12 em edições de 40 questões) têm 2 respostas
        na mesma linha (Inglês, depois Espanholl, nessa ordem) — mantém só
        a primeira (Inglês), idioma importado do caderno.
      - Questão com correção pós-recurso ("Alterado de X para Y") — mantém
        a ÚLTIMA letra (a resposta final), não a original.
      - "ANULADA"/"Anulado" (sem distinção de maiúsculas/acentos) — sem
        letra A-E reconhecida, correct=None."""
    doc = fitz.open(str(pdf_path))
    words = doc[0].get_text("words")
    doc.close()

    rows: dict[float, list[tuple[float, str]]] = {}
    for x0, y0, x1, y1, text, block, line, wordno in words:
        key = round(y0 / 5) * 5
        rows.setdefault(key, []).append((x0, text))

    merged: list[list] = []
    for k in sorted(rows):
        if merged and k - merged[-1][0] <= 6:
            merged[-1][1].extend(rows[k])
        else:
            merged.append([k, list(rows[k])])

    answers: dict[int, Optional[str]] = {}
    for _, ws in merged:
        toks = sorted(ws, key=lambda w: w[0])
        num_idx = [i for i, (x, t) in enumerate(toks) if t.isdigit() and 1 <= int(t) <= 60]
        for j, ni in enumerate(num_idx):
            end = num_idx[j + 1] if j + 1 < len(num_idx) else len(toks)
            num = int(toks[ni][1])
            vals = [t for _, t in toks[ni + 1:end] if t.lower() not in _GABARITO_IGNORE_WORDS]
            if not vals:
                continue
            letters = [t.upper() for t in vals if t.upper() in ("A", "B", "C", "D", "E")]
            if any("alterado" in t.lower() for t in vals):
                answers[num] = letters[-1] if letters else None
            else:
                answers[num] = letters[0] if letters else None

    return answers


# ── Parsing da prova ─────────────────────────────────────────────────────────

def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


_Q_STYLE_RE = re.compile(r"(?m)^\s*Quest[ãa]o\s*(\d{1,3})\s*[-–—]\s*")
_ALT_STYLE_A_RE = re.compile(r"(?m)^\s*([a-e])\)\s*")

_Q1_ANCHOR_RE = re.compile(r"(?m)^\s*01\.\s")
_Q_NUM_RE = re.compile(r"(?m)^\s*(\d{1,3})\.\s*")
_ALT_STYLE_B_RE = re.compile(r"(?m)^\s*\(([A-E])\)\s*")

# Formato "Verão 2026" em diante: número SEM ponto ("01 Assinale...", sem
# "." depois do número) e alternativas "a)" (igual ao estilo Questão-N, mas
# sem o rótulo "Questão"/hífen). `[0-9]` (não `\d`) porque `\d` do Python
# casa dígitos Unicode de outros alfabetos — um glifo de fórmula matemática
# corrompido num PDF real (questão de matrizes) já produziu um falso
# positivo com `\d`.
_Q_NOPERIOD_RE = re.compile(r"(?m)^\s*([0-9]{1,3})\s+(?=\S)")


def _extract_questions(text: str, q_re: re.Pattern, alt_re: re.Pattern, anchor_re: Optional[re.Pattern] = None) -> list[dict]:
    if anchor_re:
        m0 = anchor_re.search(text)
        if m0:
            text = text[m0.start():]

    boundaries = []
    expected = 1
    for cand in q_re.finditer(text):
        if int(cand.group(1)) == expected:
            boundaries.append(cand)
            expected += 1

    questions: list[dict] = []
    for i, m in enumerate(boundaries):
        start = m.end()
        end = boundaries[i + 1].start() if i + 1 < len(boundaries) else len(text)
        body = text[start:end]

        alt_matches = list(alt_re.finditer(body))
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
            continue  # formato inesperado (raro) — pula, não trava o resto

        statement = _clean(body[: alt_matches[0].start()] if alt_matches else body)
        if not statement:
            continue

        questions.append({"number": int(m.group(1)), "statement": statement, "alternatives": alternatives})

    return questions


def parse_exam_pdf(pdf_path: Path) -> list[dict]:
    """Parseia o caderno de prova (numeração global, 60 questões nas edições
    até 2025 e 40 a partir de "Verão 2026" — a prova mudou de estrutura,
    perdendo a Redação enumerada e reduzindo a quantidade de questões por
    matéria). Suporta os três formatos observados (ver docstring do
    módulo), tentados em ordem até um reconhecer pelo menos 30 questões:
    1) "Questão N - " + "a)"; 2) "NN." + "(A)"; 3) "NN " (sem ponto) + "a)"."""
    text = _pdf_full_text(pdf_path)

    for extractor in (
        lambda: _extract_questions(text, _Q_STYLE_RE, _ALT_STYLE_A_RE),
        lambda: _extract_questions(text, _Q_NUM_RE, _ALT_STYLE_B_RE, anchor_re=_Q1_ANCHOR_RE),
        lambda: _extract_questions(text, _Q_NOPERIOD_RE, _ALT_STYLE_A_RE),
    ):
        questions = extractor()
        if len(questions) >= 30:
            return questions

    return []


# ── Persistência ─────────────────────────────────────────────────────────────

def _persist_edition(db: Session, year: int, exam_name: str, questions: list[dict]) -> dict:
    """Grava as questões de uma edição. Idempotente por (year, exam_name):
    se já existirem questões daquela edição, não duplica."""
    already = (
        db.query(UtfprQuestion)
        .filter(UtfprQuestion.year == year, UtfprQuestion.exam_name == exam_name)
        .count()
    )
    if already > 0:
        return {
            "year": year, "exam_name": exam_name,
            "total_parsed": len(questions), "total_added": 0, "skipped_existing": already,
        }

    added = 0
    for q in questions:
        question = UtfprQuestion(year=year, number=q["number"], statement=q["statement"], exam_name=exam_name)
        db.add(question)
        db.flush()

        correct = q.get("correct")
        for order, (letter, opt_text) in enumerate(q["alternatives"]):
            db.add(UtfprQuestionOption(
                question_id=question.id,
                text=opt_text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return {"year": year, "exam_name": exam_name, "total_parsed": len(questions), "total_added": added, "skipped_existing": 0}


def import_utfpr_edition(
    slug: str,
    year: int,
    db: Optional[Session] = None,
) -> dict:
    """Importa uma edição (ex.: "2024-2"): baixa caderno + gabarito, faz o
    parsing e grava no banco."""
    from app.database import SessionLocal

    exam_name = _semester_label(slug, year)
    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        files = fetch_edition_files(slug)
        prova_url, gabarito_url = _classify_files(files)
        if not prova_url:
            return {"year": year, "exam_name": exam_name, "skipped": True, "reason": "Caderno de provas não encontrado na pasta da edição"}

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)

            gabarito: dict[int, Optional[str]] = {}
            if gabarito_url:
                gpath = tmp / "gabarito.pdf"
                download_pdf(gabarito_url, gpath)
                gabarito = parse_gabarito_pdf(gpath)

            ppath = tmp / "prova.pdf"
            download_pdf(prova_url, ppath)
            questions = parse_exam_pdf(ppath)

        if not questions:
            return {"year": year, "exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)"}

        for q in questions:
            q["correct"] = gabarito.get(q["number"])

        return _persist_edition(db, year, exam_name, questions)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_utfpr_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as edições da UTFPR listadas em .../vestibular/edicoes/
    (2023/2 em diante — anos mais antigos não estão nessa pasta e não são
    cobertos). Cada edição é tentada de forma independente. Use
    `since_year`/`until_year` pra restringir o intervalo (por ano civil)."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions = fetch_editions()
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao acessar a listagem de edições da UTFPR: {e}")

    slugs = sorted(editions.keys(), reverse=True)
    if until_year:
        slugs = [s for s in slugs if editions[s] <= until_year]
    if since_year:
        slugs = [s for s in slugs if editions[s] >= since_year]

    results = []
    total_added = 0
    try:
        for i, slug in enumerate(slugs):
            year = editions[slug]
            if task_id:
                update_task_progress(task_id, current=i, total=len(slugs), log=f"Processando edição {slug}...")

            try:
                r = import_utfpr_edition(slug, year, db=db)
                results.append(r)
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=i + 1, total=len(slugs),
                        log=f"✅ {slug}: {r.get('total_added', 0)} adicionadas." if not r.get("skipped") else f"⏭️ {slug}: {r.get('reason')}",
                    )
            except Exception as e:
                db.rollback()
                results.append({"year": year, "exam_name": slug, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(task_id, current=i + 1, total=len(slugs), log=f"❌ Erro em {slug}: {e}")

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
    return import_all_utfpr_exams(db=db, task_id=task_id, **kwargs)
