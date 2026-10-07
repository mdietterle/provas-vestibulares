from __future__ import annotations

"""Importa questões do PSC (Processo Seletivo Contínuo) da UFAM
(Universidade Federal do Amazonas), organizado pela COMPEC (antiga
COMVEST), direto do repositório institucional em DSpace
(edoc.ufam.edu.br) — nunca das URLs fixas inventadas do stub anterior
(`ufam.edu.br/psc/2011/prova.pdf`), que nunca existiram de verdade.

ESTRUTURA REAL (confirmada baixando e inspecionando PDFs de 2021, 2023 e
2024 — não um palpite):

O PSC tem 3 ETAPAS anuais independentes (1ª, 2ª e 3ª), cada uma com sua
própria página de listagem em compec.ufam.edu.br/psc{1,2,3}.html. Cada
página lista a edição corrente (bitstreams direto na própria página) e,
numa seção "CONCURSOS ANTERIORES (ENCERRADOS)", um link
`edoc.ufam.edu.br/handle/...` por ano (voltando a 2020 — anos anteriores
só no site antigo, fora do escopo deste importador, ver `fetch_editions`).
Cada handle é uma página de item do DSpace com uma lista de bitstreams
("Arquivo(s)"): editais, resultados de isenção, recursos, e — o que
interessa aqui — UM caderno de prova ("...Prova.pdf", "...Prova
Objetiva.pdf", "...Prova de Conhecimentos Gerais...pdf", nomes variam
por edição) e um ou dois gabaritos ("...Gabarito Preliminar.pdf" e
"...Gabarito Definitivo.pdf" — o Definitivo, quando existe, é usado;
cai para o Preliminar se a etapa ainda não tiver o Definitivo publicado).
Os links de bitstream nem sempre terminam em ".pdf" na URL (o DSpace
serve pelo Content-Type real, não pela extensão), então a descoberta usa
o texto do link, não a extensão.

Cada caderno de prova tem 54 questões objetivas (a-e, 5 alternativas),
divididas em disciplinas fixas com cabeçalho próprio em maiúsculas sozinho
na linha: LÍNGUA PORTUGUESA, LITERATURA, HISTÓRIA, GEOGRAFIA, BIOLOGIA,
QUÍMICA, FÍSICA, MATEMÁTICA (1ª e 2ª etapas) — a 3ª etapa acrescenta LÍNGUA
ESTRANGEIRA, publicada como TRÊS cabeçalhos próprios ("LÍNGUA ESTRANGEIRA
– INGLÊS", "– ESPANHOL", "– FRANCÊS"), cada um com as MESMAS 6 questões de
número (ex. 13-18) — por isso o modelo `UfamQuestion` tem uma coluna
`subject` (o cabeçalho de disciplina), evitando colisão de número dentro
do mesmo exam_name.

QUESTÕES ANULADAS: o gabarito usa a palavra "ANULADA" no lugar da letra
para questões anuladas pela banca — ficam de fora do dicionário de
respostas e são puladas na importação (sem gabarito não há como saber a
resposta certa; documentado, não escondido).

ARMADILHA DE PARSING (a mais chata desta importação): o padrão ingênuo de
início de questão "^NN\\." colide com a notação de fração usada em
questões de Matemática, onde o PyMuPDF extrai uma fração empilhada "3/4"
como duas linhas "3" e "4." (o denominador termina em ponto, sozinho no
início de uma linha) — um "4." solto no meio de uma lista de alternativas
seria capturado como se fosse o início da questão 4, fatiando o caderno no
lugar errado e derrubando a questão real mais adiante. A correção usa a
mesma heurística sugerida para casos assim: uma linha de início de questão
de verdade sempre é seguida por uma letra maiúscula (ignorando aspas ou
parênteses de abertura que às vezes vêm antes, ex. questão que começa com
uma citação entre aspas) — "4." sozinho antes de "b)" não passa nesse
teste e é ignorado.

GABARITO DE LÍNGUA ESTRANGEIRA (3ª etapa): o PDF de gabarito traz uma
mini-tabela de 3 colunas (Inglês/Espanhol/Francês) só para as questões de
língua estrangeira, fisicamente destacada da tabela principal (2 colunas,
resto das disciplinas) — usamos os blocos de palavras do PyMuPDF (posição
x/y), não a ordem linear do texto, para não misturar as 3 respostas por
questão numa só. A coluna de números dessa mini-tabela fica numa posição x
diferente das duas colunas da tabela principal, o que permite isolá-la sem
depender de um offset fixo (calculado a partir do x mínimo/máximo dos
próprios números "NN." da página).

LIMITAÇÃO CONHECIDA (documentada, não escondida): processos anteriores a
2020 só estão disponíveis no site antigo (antigocompec.ufam.edu.br), fora
do escopo deste importador — `fetch_editions` cobre só 2020 em diante, o
que a própria COMPEC já linka nas páginas oficiais atuais."""

import re
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.import_batch import save_vestibular_question

_HEADERS = {"User-Agent": "Mozilla/5.0"}

_STAGE_PAGES = {
    1: "https://compec.ufam.edu.br/psc1.html",
    2: "https://compec.ufam.edu.br/psc2.html",
    3: "https://compec.ufam.edu.br/psc3.html",
}

# Só os links de handle que citam "PSC<ano>" no texto interessam — a
# página também linka handles institucionais genéricos (Portarias,
# Resoluções, Lei de Cotas...) que não são edições do PSC.
_HANDLE_LINK_RE = re.compile(
    r'<a\b[^>]*href="([^"]*edoc\.ufam\.edu\.br/handle/[^"]+)"[^>]*>([^<]*)</a>',
    re.IGNORECASE,
)
_PSC_YEAR_RE = re.compile(r'PSC\s*(\d{4})', re.IGNORECASE)

_BITSTREAM_LINK_RE = re.compile(r'href="(/bitstream/[^"]+)"[^>]*>([^<]*)<')

# Textos de link a excluir da classificação prova/gabarito: recursos,
# interposições, isenções, resultados de atendimento especial etc. —
# todos publicados como .html (nunca o PDF real da prova/gabarito), mas
# alguns citam "prova"/"gabarito" no próprio texto do link (ex. "Recurso
# contra o Gabarito Preliminar das Provas Objetivas"), por isso a exclusão
# roda ANTES da classificação por palavra-chave.
_EXCLUDE_RE = re.compile(r'recurso|interposi', re.IGNORECASE)

_SUBJ_RE = re.compile(
    r'(?m)^(LÍNGUA PORTUGUESA|LITERATURA|'
    r'LÍNGUA ESTRANGEIRA\s*[–\-]\s*(?:INGLÊS|ESPANHOL|FRANC[ÊE]S)|'
    r'HIST[ÓO]RIA|GEOGRAFIA|BIOLOGIA|QU[ÍI]MICA|F[ÍI]SICA|MATEM[ÁA]TICA)\s*$'
)
# Início de questão: "NN." seguido (ignorando aspas/parênteses de abertura)
# por letra maiúscula — ver docstring do módulo sobre a colisão com
# denominadores de fração ("4.\nb)").
_QSTART_RE = re.compile(r'(?m)^(\d{1,2})\.(?!º)\s*(?=["“\'(]{0,2}[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ])')
_OPT_RE = re.compile(r'(?m)^([a-e])\)\s*')
_STOP_RE = re.compile(r'RASCUNHO|PROVA DE REDA[ÇC][ÃA]O', re.IGNORECASE)

_GAB_PAIR_RE = re.compile(r'(?m)^(\d{1,2})\.\s*\n\s*(ANULADA|[A-E])\s*$')
_LE_LANGS = ("Inglês", "Espanhol", "Francês")
_LE_SUBJECT_RE = re.compile(r'LÍNGUA ESTRANGEIRA\s*[–\-]\s*(INGLÊS|ESPANHOL|FRANC[ÊE]S)')


def fetch_editions(stage: int) -> list[dict]:
    """Raspa a página oficial de uma etapa (1, 2 ou 3) do PSC e retorna as
    edições anunciadas: [{"year", "stage", "handle_url", "label"}], da mais
    antiga à mais nova. Cobre a edição corrente (link "Ver publicações do
    PSC...") e as listadas em "CONCURSOS ANTERIORES (ENCERRADOS)" — que,
    nas páginas atuais, começam em 2020 (anos anteriores só no site antigo,
    ver docstring do módulo)."""
    url = _STAGE_PAGES[stage]
    resp = requests.get(url, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    html = resp.text

    editions: dict[str, dict] = {}
    for handle_url, label in _HANDLE_LINK_RE.findall(html):
        m = _PSC_YEAR_RE.search(label)
        if not m:
            continue
        handle_url = handle_url.replace("http://", "https://")
        editions[handle_url] = {
            "year": int(m.group(1)),
            "stage": stage,
            "handle_url": handle_url,
            "label": re.sub(r"\s+", " ", label).strip(),
        }
    return sorted(editions.values(), key=lambda e: e["year"])


def fetch_edition_files(handle_url: str) -> dict:
    """Abre a página de item do DSpace de uma edição e classifica os
    bitstreams em caderno de prova e gabarito (preferindo "Definitivo" a
    "Preliminar"). Retorna {"prova_url": str|None, "gabarito_url": str|None,
    "gabarito_status": "definitivo"|"preliminar"|None}."""
    resp = requests.get(handle_url, timeout=30, headers=_HEADERS)
    resp.raise_for_status()
    html = resp.text

    prova_url = None
    gabarito_url = None
    gabarito_status = None
    seen: set[str] = set()

    for href, label in _BITSTREAM_LINK_RE.findall(html):
        label_norm = re.sub(r"\s+", " ", label).strip()
        if not label_norm or href in seen:
            continue
        if href.lower().endswith((".html", ".htm")):
            continue
        if _EXCLUDE_RE.search(label_norm):
            continue
        seen.add(href)
        label_lower = label_norm.lower()
        full_url = urljoin(handle_url, href)

        if "prova" in label_lower and prova_url is None:
            prova_url = full_url
        elif "gabarito" in label_lower:
            is_definitivo = "definitivo" in label_lower or "defenitivo" in label_lower
            if gabarito_url is None or (is_definitivo and gabarito_status != "definitivo"):
                gabarito_url = full_url
                gabarito_status = "definitivo" if is_definitivo else "preliminar"

    return {"prova_url": prova_url, "gabarito_url": gabarito_url, "gabarito_status": gabarito_status}


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF/bitstream público. Mesmo fallback de TLS incompleto
    documentado em outros importadores deste repo: tenta verificado, e só
    cai para sem verificação se a falha for especificamente de SSL."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def _normspace(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _last_option_run(body: str) -> list:
    """Mesma cautela documentada em outros importadores deste repo: entre
    vários blocos consecutivos de "a)".."e)", só o ÚLTIMO bloco estritamente
    sequencial (a, depois b, depois c...) é tratado como as alternativas
    reais — protege contra listas "a)...e)" que apareçam no próprio
    enunciado antes das alternativas de verdade."""
    opts = list(_OPT_RE.finditer(body))
    runs: list[list] = []
    current: list = []
    expected = "a"
    for om in opts:
        letter = om.group(1)
        if letter == expected:
            current.append(om)
            expected = chr(ord(expected) + 1)
        elif letter == "a":
            if current:
                runs.append(current)
            current = [om]
            expected = "b"
    if current:
        runs.append(current)
    return runs[-1] if runs else []


def parse_prova(path: Path) -> list[dict]:
    """Parseia um caderno de prova e retorna
    [{number, subject, statement, alternatives: [(letra, texto), ...]}].

    Disciplinas são delimitadas por cabeçalhos fixos sozinhos na linha (ver
    docstring do módulo). Dentro de cada disciplina, as questões começam em
    "NN." seguido de letra maiúscula (ignorando aspas/parênteses de
    abertura) — ver docstring sobre a colisão com denominadores de fração.
    Uma seção de redação (3ª etapa) ou rascunho, sempre depois da última
    questão objetiva, é descartada pelo marcador "RASCUNHO"/"PROVA DE
    REDAÇÃO" antes das alternativas serem fatiadas."""
    doc = fitz.open(str(path))
    try:
        full = "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()

    subj_matches = list(_SUBJ_RE.finditer(full))
    questions: list[dict] = []
    for i, sm in enumerate(subj_matches):
        subject = sm.group(1)
        start = sm.end()
        stop = subj_matches[i + 1].start() if i + 1 < len(subj_matches) else len(full)
        section = full[start:stop]

        qmatches = list(_QSTART_RE.finditer(section))
        for j, qm in enumerate(qmatches):
            number = int(qm.group(1))
            qstart = qm.end()
            qstop = qmatches[j + 1].start() if j + 1 < len(qmatches) else len(section)
            body = section[qstart:qstop]

            stopm = _STOP_RE.search(body)
            if stopm:
                body = body[:stopm.start()]

            opts = _last_option_run(body)
            if len(opts) < 2:
                continue

            statement = _normspace(body[:opts[0].start()])
            if not statement:
                continue

            alternatives: list[tuple[str, str]] = []
            for k, om in enumerate(opts):
                letter = om.group(1).upper()
                tstart = om.end()
                tend = opts[k + 1].start() if k + 1 < len(opts) else len(body)
                text = _normspace(body[tstart:tend])
                alternatives.append((letter, text))

            questions.append({
                "number": number, "subject": subject,
                "statement": statement, "alternatives": alternatives,
            })

    return questions


def parse_gabarito(path: Path) -> dict:
    """Parseia o PDF de gabarito (1 página, na prática, em todas as edições
    inspecionadas — mas itera todas por segurança). Retorna
    {"default": {número: letra}, "le": {"INGLÊS": {...}, "ESPANHOL": {...},
    "FRANCÊS": {...}}} — "le" só vem preenchido em edições com Língua
    Estrangeira (3ª etapa). Questões "ANULADA" ficam de fora de ambos.

    A mini-tabela de Língua Estrangeira (quando existe) é isolada por
    posição (x/y dos blocos de palavra do PyMuPDF), não pela ordem linear
    do texto — ver docstring do módulo. Os números que ela contém também
    aparecem (errado, com a resposta de Inglês) no resultado de `default`
    porque a extração linear não os diferencia dos demais; por isso são
    removidos de `default` explicitamente depois de identificados."""
    doc = fitz.open(str(path))
    default: dict[int, str] = {}
    le: dict[str, dict[int, str]] = {}
    try:
        for page in doc:
            text = page.get_text()
            for num_s, letter in _GAB_PAIR_RE.findall(text):
                if letter != "ANULADA":
                    default[int(num_s)] = letter

            words = page.get_text("words")  # (x0, y0, x1, y1, text, ...)
            anchors = {w[4]: w[0] for w in words if w[4] in _LE_LANGS}
            if not anchors:
                continue

            header_y = min(w[1] for w in words if w[4] in anchors)
            digit_words = [w for w in words if re.fullmatch(r"\d{1,2}\.", w[4])]
            if not digit_words:
                continue

            # A tabela principal (resto das disciplinas) tem 2 colunas de
            # números (esquerda/direita); a mini-tabela de LE fica numa
            # 3ª posição x, entre as duas — isolada aqui sem depender de
            # nenhum offset fixo em pontos.
            left_x = min(w[0] for w in digit_words)
            right_x = max(w[0] for w in digit_words)
            le_number_words = [
                w for w in digit_words
                if abs(w[0] - left_x) > 10 and abs(w[0] - right_x) > 10 and w[1] >= header_y - 5
            ]

            for nw in le_number_words:
                num = int(nw[4].rstrip("."))
                default.pop(num, None)
                row = [w for w in words if abs(w[1] - nw[1]) < 3 and w is not nw]
                for rw in row:
                    lang, ax = min(anchors.items(), key=lambda kv: abs(kv[1] - rw[0]))
                    if abs(ax - rw[0]) < 40 and re.fullmatch(r"[A-E]|ANULADA", rw[4]) and rw[4] != "ANULADA":
                        le.setdefault(lang.upper(), {})[num] = rw[4]
        return {"default": default, "le": le}
    finally:
        doc.close()


def _persist_edition(db, exam_name: str, year: int, stage: int, questions: list[dict], gabarito: dict) -> tuple:
    """Grava as questões de UMA edição (já parseada), pulando edições já
    importadas (mesmo exam_name) e questões sem gabarito conhecido (número
    ausente, anulada, ou que não corresponda a nenhuma alternativa
    extraída)."""
    default_answers = gabarito.get("default", {})
    le_answers = gabarito.get("le", {})

    added = 0
    skipped_existing = 0
    for q in questions:
        le_m = _LE_SUBJECT_RE.search(q["subject"])
        if le_m:
            correct = le_answers.get(le_m.group(1).upper(), {}).get(q["number"])
        else:
            correct = default_answers.get(q["number"])

        if not correct or correct not in ("A", "B", "C", "D", "E"):
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            continue

        options = [
            {
                "letter": letter,
                "text": text,
                "is_correct": (letter == correct),
                "order": order,
            }
            for order, (letter, text) in enumerate(q["alternatives"])
        ]
        metadata = {
            "stage": stage,
            "subject": q["subject"],
            "university": "UFAM",
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="ufam",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            images=None,
            image_base64=None,
            correct_option=correct,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

    db.commit()
    return added, skipped_existing


def import_ufam_edition(db, edition: dict) -> dict:
    """Importa UMA edição (ano/etapa): localiza caderno e gabarito na
    página de item do DSpace, baixa ambos e persiste."""
    import tempfile

    year, stage = edition["year"], edition["stage"]
    exam_name = f"UFAM PSC {year} – {stage}ª Etapa"

    try:
        files = fetch_edition_files(edition["handle_url"])
    except Exception as e:
        return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                "reason": f"Falha ao acessar a página da edição: {e}"}

    if not files["prova_url"]:
        return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                "reason": "Caderno de prova não encontrado (edição ainda em andamento ou fora do padrão de nomes conhecido)"}
    if not files["gabarito_url"]:
        return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                "reason": "Gabarito não encontrado (provavelmente ainda não publicado)"}

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        try:
            prova_path = tmp / "prova.pdf"
            download_pdf(files["prova_url"], prova_path)
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(files["gabarito_url"], gabarito_path)
        except Exception as e:
            return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                    "reason": f"Falha ao baixar prova/gabarito: {e}"}

        try:
            questions = parse_prova(prova_path)
            gabarito = parse_gabarito(gabarito_path)
        except Exception as e:
            return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                    "reason": f"Falha ao parsear PDF (provavelmente prova escaneada/sem texto extraível ou formato não reconhecido): {e}"}

        if not questions:
            return {"exam_name": exam_name, "year": year, "stage": stage, "skipped": True,
                    "reason": "Nenhuma questão reconhecida no PDF (prova escaneada, sem texto extraível, ou formato de alternativas não reconhecido)"}

        added, skipped_existing = _persist_edition(db, exam_name, year, stage, questions, gabarito)
        return {
            "exam_name": exam_name, "year": year, "stage": stage,
            "gabarito_status": files["gabarito_status"],
            "total_parsed": len(questions),
            "total_added": added,
            "skipped_existing": skipped_existing,
        }


def import_all_ufam_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todas as edições do PSC (3 etapas, 2020 em diante — ver
    limitação no docstring do módulo) cujo caderno e gabarito estejam
    publicados e num formato reconhecido. Cada edição é tentada de forma
    independente — falha ao baixar, formato inesperado, ou gabarito ainda
    não publicado não interrompem as demais. `since_year`/`until_year`
    restringem o intervalo de anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions: list[dict] = []
        fetch_errors: list[str] = []
        for stage in (1, 2, 3):
            try:
                stage_editions = fetch_editions(stage)
            except Exception as e:
                fetch_errors.append(f"Etapa {stage}: falha ao listar edições ({e})")
                continue
            editions.extend(stage_editions)

        if since_year:
            editions = [e for e in editions if e["year"] >= since_year]
        if until_year:
            editions = [e for e in editions if e["year"] <= until_year]

        if not editions and not fetch_errors:
            if task_id:
                fail_task(task_id, "Nenhuma edição do PSC encontrada nas páginas oficiais")
            return {"status": "error", "reason": "Nenhuma edição do PSC encontrada nas páginas oficiais"}

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(editions, start=1):
            try:
                r = import_ufam_edition(db, edition)
                results.append(r)
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                r = {"exam_name": f"UFAM PSC {edition['year']} – {edition['stage']}ª Etapa", "skipped": True, "reason": str(e)}
                results.append(r)

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=r.get("exam_name", ""))

        summary = {
            "status": "success",
            "total_editions_found": total,
            "total_added": total_added,
            "fetch_errors": fetch_errors,
            "exams": results,
        }
        if task_id:
            complete_task(task_id, summary)
        return summary
    except Exception as e:
        db.rollback()
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()
