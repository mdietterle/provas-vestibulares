from __future__ import annotations

"""Importa questões do Vestibular próprio da PUC Minas (Pontifícia
Universidade Católica de Minas Gerais) direto da página oficial de provas e
gabaritos:

    https://www.pucminas.br/formas-ingresso/vestibular/Paginas/provas-e-gabaritos.aspx

Página estática (sem JavaScript), com um link `<a href="...pdf">` por
documento — mesmo padrão de UNIMONTES/UNAERP/UFJF neste repo. A URL fixa
inventada do stub anterior (`pucminas.br/vestibular/2026/prova.pdf`) nunca
existiu de verdade; os PDFs reais ficam em
`www.pucminas.br/formas-ingresso/vestibular/Documents/<ano>/...pdf` (edições
mais antigas, 2019, ficam direto em `Documents/` sem subpasta de ano). A
descoberta é sempre feita raspando a página, nunca por URL fixa — a
convenção de nome de arquivo mudou várias vezes ao longo dos anos
(maiúsculas/minúsculas, presença ou não de "caderno"/"gabarito" no nome,
acentos escapados como "%C3%87OS", às vezes hospedado no host antigo sem
"www" e sem HTTPS).

ESTRUTURA REAL (confirmada baixando e inspecionando PDFs de 2019, 2021,
2022, 2023, 2024, 2025 e 2026 — não um palpite):

Cada edição semestral do vestibular publica DOIS (ou mais) CADERNOS
distintos, um por "trilha" de cursos, cada um com sua PRÓPRIA numeração de
questões reiniciada em 1 — a trilha MEDICINA tem sempre 50 questões, e
qualquer outra trilha ("Demais Cursos", ou cadernos específicos para
grupos de cursos como "Direito/Psicologia/Relações Internacionais/
Odontologia" vistos em 2023 e 2024) tem sempre 40 questões. Esse número
declarado no próprio PDF ("ESTA PROVA CONTÉM NN (...) QUESTÕES") é usado
como parte da chave de casamento caderno↔gabarito — mais confiável do que
tentar casar pelo texto livre do nome do curso, que varia demais entre
edições (às vezes é só "MEDICINA", às vezes uma lista enorme de cursos por
campus e turno, às vezes "DIREITO (Coração Eucarístico e Praça da
Liberdade) - Manhã e PSICOLOGIA (Coração Eucarístico) - Manhã" etc., e a
lista de "Demais Cursos" às vezes cita cursos com "Medicina" no nome, como
"Medicina Veterinária", o que quebraria um casamento por palavra-chave
"MEDICINA" sozinha).

O gabarito de TODAS as trilhas de um mesmo semestre costuma vir num único
PDF, com UMA PÁGINA POR TRILHA (cada página com seu próprio cabeçalho
"CURSO: <nome>" e sua própria grade de respostas "NN\nLETRA" repetida) — é
por isso que o índice de gabaritos é construído por (ano, semestre,
quantidade de respostas na página), não por PDF inteiro.

Dentro de cada caderno, a Língua Estrangeira aparece como duas seções
("PROVA DE ESPANHOL" / "PROVA DE INGLÊS"), cada uma com as MESMAS questões
de número (ex. 26-30) — por isso o metadata JSONB guarda a matéria
`subject` (a seção "PROVA DE <disciplina>"), evitando colisão quando as
duas versões de língua estrangeira usam o mesmo número. O gabarito não
diferencia por idioma (só um valor por número), então a mesma letra correta
é aplicada às duas variantes — cada uma validada contra seu próprio
conjunto de alternativas.

Alternativas aparecem como "(A)".."(E)" sozinhas no início de linha, com o
texto da alternativa na(s) linha(s) seguinte(s) — não "A)" nem "a)". Esse
formato foi confirmado estável em TODAS as edições de 2021 a 2026
inspecionadas.

LIMITAÇÃO CONHECIDA (documentada, não escondida): a edição de 2019 (a mais
antiga ainda linkada na página oficial, e a única anterior a 2021) usa um
formato de alternativas completamente diferente — letras minúsculas
"a).."d)" com o texto por vezes na mesma linha, por vezes quebrado de forma
irregular entre "letra" e "texto" (aparentemente por causa de caixas de
texto sobrepostas no PDF original), sem o padrão "(A)\n<texto>" que o
parser abaixo reconhece. `parse_prova` não encontra nenhuma alternativa
nesse formato e o caderno é descartado (não crasha o restante da
importação) — o alcance real de importação, no momento desta implementação,
é 2021 em diante (e o que a universidade publicar no mesmo formato nas
próximas edições)."""

import re
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests

import base64

from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.pdf_figures import extract_figure_events, text_content_y_range

_VESTIBULAR_URL = "https://www.pucminas.br/formas-ingresso/vestibular/Paginas/provas-e-gabaritos.aspx"
_HEADERS = {"User-Agent": "Mozilla/5.0"}

# Só os PDFs dentro de .../vestibular/Documents/ interessam — a página tem
# muitos outros links de PDF (institucional, pesquisa, manual de marca...)
# que não são provas/gabaritos.
_PDF_HREF_RE = re.compile(r'href="([^"]+/vestibular/Documents/[^"]+\.pdf[^"]*)"', re.IGNORECASE)


def fetch_exam_links(html: Optional[str] = None, url: str = _VESTIBULAR_URL) -> dict:
    """Raspa a página oficial e separa os PDFs em cadernos de prova e
    gabaritos. A classificação usa só o nome do arquivo (substring
    "gabarit", case-insensitive) — regra confirmada contra todos os ~45
    links reais encontrados na página (nenhum caderno de prova tem
    "gabarit" no nome, nenhum gabarito deixa de ter)."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    raw_urls = {urljoin(url, m) for m in _PDF_HREF_RE.findall(html)}
    booklets = sorted(u for u in raw_urls if 'gabarit' not in u.lower())
    gabaritos = sorted(u for u in raw_urls if 'gabarit' in u.lower())
    return {"booklets": booklets, "gabaritos": gabaritos}


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público. Mesmo fallback de TLS incompleto documentado em
    app/services/unimontes/pdf_import.py e outros importadores deste repo:
    tenta verificado, e só cai para sem verificação se a falha for
    especificamente de SSL (alguns links antigos apontam para
    `http://pucminas.br` sem `www`, sem HTTPS — `requests` segue como
    veio, sem forçar upgrade)."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def _normspace(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip(' -–:')


_YEAR_SEM_RE = re.compile(r'(\d)\s*[ºo°]?\s*(?:SEMESTRE(?:\s+DE)?\s*(\d{4})|/\s*(\d{4}))', re.IGNORECASE)
_VEST_YEAR_RE = re.compile(r'VESTIBULAR\D{0,15}?(\d{4})', re.IGNORECASE)
_SEM_ONLY_RE = re.compile(r'(\d)\s*[ºo°]\s*SEMESTRE', re.IGNORECASE)
_URL_YEAR_RE = re.compile(r'/(\d{4})/')


def extract_year_semester(text: str, url_hint: Optional[str] = None) -> tuple:
    """Extrai (ano, semestre) do cabeçalho de um caderno ou de uma página de
    gabarito. Formatos vistos: "1º SEMESTRE DE 2025", "2º/2022 – PUC MINAS",
    "VESTIBULAR PUC MINAS 1º e 2º/2019". Quando o ano não aparece no texto
    (alguns cadernos só dizem "1º SEMESTRE", sem ano — o ano vem só da URL,
    pasta Documents/<ano>/), cai para o ano na URL."""
    sem = year = None
    m = _YEAR_SEM_RE.search(text)
    if m:
        sem = int(m.group(1))
        year = int(m.group(2) or m.group(3))
    if year is None:
        m2 = _VEST_YEAR_RE.search(text)
        if m2:
            year = int(m2.group(1))
    if sem is None:
        m3 = _SEM_ONLY_RE.search(text)
        if m3:
            sem = int(m3.group(1))
    if year is None and url_hint:
        m4 = _URL_YEAR_RE.search(url_hint) or re.search(r'(\d{4})', url_hint)
        if m4:
            year = int(m4.group(1))
    if sem is None:
        sem = 1  # melhor esforço: maioria das edições é 1º semestre
    return year, sem


# Onde o bloco de "curso(s)" pode terminar: início da lista de disciplinas
# ("PROVAS:"), início da grade de gabarito, ou a primeira questão (em
# qualquer um dos 3 idiomas usados: português, inglês, espanhol).
_COURSE_STOP_RE = re.compile(
    r'PROVAS\s*:|GABARITO OFICIAL|QUEST[ÃA]O\s+0?1\b|QUESTION\s+0?1\b|CUESTI[ÓO]N\s+0?1\b',
    re.IGNORECASE,
)
_CURSO_LABEL_RE = re.compile(r'CURSOS?\s*:\s*', re.IGNORECASE)


def extract_course_block(text: str) -> str:
    """Extrai o texto (bruto, informativo) que identifica o curso/trilha de
    um caderno ou página de gabarito — usado só para compor `exam_name`
    (não para casar caderno↔gabarito, ver `parse_prova`/`build_gabarito_index`
    sobre por que o casamento usa a contagem de questões, não este texto)."""
    stop_m = _COURSE_STOP_RE.search(text)
    head = text[:stop_m.start()] if stop_m else text[:1000]

    m = _CURSO_LABEL_RE.search(head)
    block = head[m.end():] if m else head

    block = re.sub(r'(?i)VESTIBULAR\s*\d{0,4}', ' ', block)
    block = re.sub(r'(?i)PUC\s*MINAS', ' ', block)
    block = re.sub(r'(?i)\d\s*[ºo°]?\s*/\s*\d{4}', ' ', block)
    block = re.sub(r'(?i)\d\s*[ºo°]\s*SEMESTRE(?:\s+DE\s*\d{4})?', ' ', block)
    block = re.sub(r'(?im)^\s*\d{1,3}\s*$', ' ', block)
    block = re.sub(r'(?i)CADERNO\s*\d+\s*', ' ', block)
    block = re.sub(r'[—\-]{1,}', ' ', block)
    return _normspace(block)


_DECLARED_COUNT_RE = re.compile(r'CONT[ÉE]M\s*(\d+)', re.IGNORECASE)
_QSTART_ANY_RE = re.compile(r'(?m)^(?:QUEST[ÃA]O|QUESTION|CUESTI[ÓO]N)\s+(\d{1,3})\s*$', re.IGNORECASE)


def extract_booklet_meta(path: Path, url: str) -> Optional[dict]:
    """Lê o caderno de prova inteiro e extrai ano, semestre, o texto de
    curso (informativo) e o total de questões declarado (chave real de
    casamento com o gabarito). Retorna None se não achar nem o total
    declarado nem conseguir contar questões pelo texto (caderno em formato
    não reconhecido)."""
    doc = fitz.open(str(path))
    try:
        cover = doc[0].get_text()
        full = "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()

    year, semester = extract_year_semester(cover, url_hint=url)
    if year is None:
        return None

    course = extract_course_block(cover)

    m = _DECLARED_COUNT_RE.search(full)
    if m:
        total = int(m.group(1))
    else:
        nums = [int(n) for n in _QSTART_ANY_RE.findall(full)]
        total = max(nums) if nums else None
    if not total:
        return None

    return {"year": year, "semester": semester, "course": course, "total": total, "url": url}


_SUBJECT_RE = re.compile(r'(?m)^PROVA DE (.+?)\s*$')
_OPT_RE = re.compile(r'(?m)^\(([A-E])\)\s*$')
_INSTRUCAO_RE = re.compile(r'INSTRU[ÇC][ÃA]O')


def _last_option_run(body: str) -> list:
    """Mesma cautela documentada em app/services/unimontes/pdf_import.py:
    entre vários blocos consecutivos de "(A)".."(E)", só o ÚLTIMO bloco
    estritamente sequencial (A, depois B, depois C...) é tratado como as
    alternativas reais — protege contra listas rotuladas "(A)...(D)..." que
    apareçam no próprio enunciado antes das alternativas de verdade (não
    confirmado nos PDFs da PUC Minas inspecionados, mas mantém o parser
    resiliente pelo mesmo motivo)."""
    opts = list(_OPT_RE.finditer(body))
    runs: list[list] = []
    current: list = []
    expected = 'A'
    for om in opts:
        letter = om.group(1)
        if letter == expected:
            current.append(om)
            expected = chr(ord(expected) + 1)
        elif letter == 'A':
            if current:
                runs.append(current)
            current = [om]
            expected = 'B'
    if current:
        runs.append(current)
    return runs[-1] if runs else []


def parse_prova(path: Path) -> list[dict]:
    """Parseia um caderno de prova e retorna
    [{number, subject, statement, alternatives: [(letra, texto), ...]}].

    Disciplinas são delimitadas por cabeçalhos "PROVA DE <NOME>" (um por
    seção — LÍNGUA PORTUGUESA, BIOLOGIA, QUÍMICA, FÍSICA, MATEMÁTICA,
    ESPANHOL, INGLÊS, HISTÓRIA, GEOGRAFIA), e dentro de cada seção as
    questões começam com "QUESTÃO NN" (português), "QUESTION NN" (inglês)
    ou "CUESTIÓN NN" (espanhol) sozinho na linha. As alternativas
    "(A)".."(E)" só são reconhecidas sozinhas no início de linha, com o
    texto na(s) linha(s) seguinte(s) — formato confirmado em todos os
    cadernos de 2021 a 2026 inspecionados; cadernos mais antigos (2019, que
    usa "a).." minúsculo) não são reconhecidos e retornam lista vazia."""
    doc = fitz.open(str(path))
    parts: list[str] = []
    image_events: list[tuple[int, bytes]] = []
    try:
        offset = 0
        for page in doc:
            text = page.get_text()
            # Posição de cada figura (raster ou vetorial nativa, via
            # pdf_figures.extract_figure_events — mesmo mecanismo do ENEM)
            # aproximada linearmente pela fração vertical DENTRO DA FAIXA
            # REALMENTE OCUPADA PELO TEXTO na página (não a altura da
            # página inteira — subestimaria a posição em página com pouco
            # conteúdo), projetada no trecho de texto correspondente. O
            # parser deste vestibular trabalha sobre texto achatado (sem
            # coordenadas), então essa estimativa é o bastante para decidir
            # a qual questão a figura pertence, sem reescrever o parser
            # para operar por coordenada.
            y_min, y_max = text_content_y_range(page)
            span = (y_max - y_min) or 1.0
            for _x0, y0, png in extract_figure_events(page):
                frac = max(0.0, min(1.0, (y0 - y_min) / span))
                image_events.append((offset + int(frac * len(text)), png))
            parts.append(text)
            offset += len(text) + 1  # +1 pelo separador "\n" do join abaixo
        full = "\n".join(parts)
    finally:
        doc.close()

    subj_matches = list(_SUBJECT_RE.finditer(full))
    questions: list[dict] = []
    for i, sm in enumerate(subj_matches):
        subject = sm.group(1).strip()
        start = sm.end()
        stop = subj_matches[i + 1].start() if i + 1 < len(subj_matches) else len(full)
        section = full[start:stop]

        qmatches = list(_QSTART_ANY_RE.finditer(section))
        for j, qm in enumerate(qmatches):
            number = int(qm.group(1))
            qstart = qm.end()
            qstop = qmatches[j + 1].start() if j + 1 < len(qmatches) else len(section)
            body = section[qstart:qstop]

            im = _INSTRUCAO_RE.search(body)
            if im:
                body = body[:im.start()]

            opts = _last_option_run(body)
            if len(opts) < 2:
                continue

            statement = _normspace(body[:opts[0].start()])
            if not statement:
                continue

            alternatives: list[tuple[str, str]] = []
            for k, om in enumerate(opts):
                letter = om.group(1)
                tstart = om.end()
                tend = opts[k + 1].start() if k + 1 < len(opts) else len(body)
                text = re.sub(r'\s+', ' ', body[tstart:tend]).strip()
                alternatives.append((letter, text))

            q_abs_start, q_abs_stop = start + qstart, start + qstop
            images = [png for pos, png in image_events if q_abs_start <= pos < q_abs_stop]

            questions.append({
                "number": number, "subject": subject,
                "statement": statement, "alternatives": alternatives,
                "images": images,
            })

    return questions


_ANSWER_PAIR_RE = re.compile(r'(?m)^(\d{1,3})\s*\n\s*([A-EN])\s*$')


def parse_gabarito_pdf(path: Path, url: str) -> list[dict]:
    """Parseia UM PDF de gabarito, que pode cobrir várias trilhas de curso
    (uma por página, cada página com seu próprio cabeçalho e grade de
    respostas "NN\\nLETRA" repetida). Retorna uma lista de trechos
    reconhecidos: [{"year", "semester", "course", "count", "answers"}, ...]
    — páginas sem nenhum par número/letra reconhecido (formato não
    "moderno", ex. o gabarito compacto de 2019) são simplesmente
    ignoradas, não incluídas no resultado."""
    doc = fitz.open(str(path))
    try:
        chunks = []
        for page in doc:
            text = page.get_text()
            pairs = _ANSWER_PAIR_RE.findall(text)
            if not pairs:
                continue
            answers: dict[int, str] = {}
            for num_s, letter in pairs:
                answers[int(num_s)] = letter
            year, semester = extract_year_semester(text, url_hint=url)
            if year is None:
                continue
            course = extract_course_block(text)
            chunks.append({
                "year": year, "semester": semester, "course": course,
                "count": len(answers), "answers": answers,
            })
        return chunks
    finally:
        doc.close()


def build_gabarito_index(gabarito_urls: list[str]) -> dict:
    """Baixa e parseia todos os gabaritos, indexando por
    (ano, semestre, quantidade de questões) -> {número: letra}. A
    quantidade de questões (40 ou 50, ver docstring do módulo) é a chave
    real de casamento com o caderno — mais confiável que tentar casar pelo
    texto do curso, que varia demais entre edições. Quando mais de um
    gabarito cobre a mesma (ano, semestre, quantidade) — ex. uma versão
    "após recursos" publicada depois — a versão com "RECURSO" no nome do
    arquivo é processada por último e prevalece."""
    import tempfile

    candidates: list[tuple[bool, dict]] = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        for i, url in enumerate(gabarito_urls):
            path = tmp / f"gab_{i}.pdf"
            try:
                download_pdf(url, path)
                chunks = parse_gabarito_pdf(path, url)
            except Exception:
                chunks = []
            is_recurso = 'RECURSO' in url.upper()
            for chunk in chunks:
                candidates.append((is_recurso, chunk))

    index: dict[tuple, dict] = {}
    for is_recurso, chunk in sorted(candidates, key=lambda c: c[0]):
        key = (chunk["year"], chunk["semester"], chunk["count"])
        index[key] = chunk["answers"]
    return index


def _persist_booklet(db, exam_name: str, year: int, questions: list[dict], answers: dict) -> tuple:
    """Grava as questões de UM caderno, pulando cadernos já importados
    (mesmo exam_name), questões sem gabarito conhecido (número ausente,
    anulada — letra "N" — ou que não corresponda a nenhuma alternativa
    extraída)."""
    from app.services.import_batch import save_vestibular_question

    from app.vestibular.models import VestibularQuestion
    already = db.query(VestibularQuestion).filter(
        VestibularQuestion.exam_type == "pucminas",
        VestibularQuestion.exam_name == exam_name,
    ).count()
    if already > 0:
        return 0, already

    added = 0
    for q in questions:
        correct = answers.get(q["number"])
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

        images_raw = q.get("images") or []
        image_list = None
        image_base64_first = None
        if images_raw:
            image_base64_first = f"data:image/png;base64,{base64.b64encode(images_raw[0]).decode()}"
            if len(images_raw) > 1:
                image_list = [
                    f"data:image/png;base64,{base64.b64encode(png).decode()}"
                    for png in images_raw[1:]
                ]

        metadata = {
            "subject": q["subject"],
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="pucminas",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            images=image_list,
            correct_option=correct,
            image_base64=image_base64_first,
            metadata=metadata,
        )
        if not created:
            continue
        added += 1

    db.commit()
    return added, 0


def import_pucminas_booklet(
    db, booklet_url: str, gabarito_index: dict,
    since_year: Optional[int] = None, until_year: Optional[int] = None,
) -> dict:
    """Importa UM caderno de prova, casando-o com o gabarito da sua edição
    pela chave (ano, semestre, total de questões)."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / "booklet.pdf"
        try:
            download_pdf(booklet_url, path)
        except Exception as e:
            return {"exam_name": booklet_url, "skipped": True, "reason": f"Falha ao baixar caderno: {e}"}

        meta = extract_booklet_meta(path, booklet_url)
        if not meta:
            return {"exam_name": booklet_url, "skipped": True, "reason": "Não foi possível identificar ano/semestre/total de questões no caderno"}

        if since_year and meta["year"] < since_year:
            return {"exam_name": booklet_url, "year": meta["year"], "skipped": True, "reason": "Fora do intervalo since_year/until_year"}
        if until_year and meta["year"] > until_year:
            return {"exam_name": booklet_url, "year": meta["year"], "skipped": True, "reason": "Fora do intervalo since_year/until_year"}

        course_label = meta["course"] or ("Medicina" if meta["total"] == 50 else "Demais Cursos")
        exam_name = f"PUC Minas {meta['year']} – {meta['semester']}º Semestre – {course_label}"[:200]

        key = (meta["year"], meta["semester"], meta["total"])
        answers = gabarito_index.get(key)
        if not answers:
            return {"exam_name": exam_name, "year": meta["year"], "skipped": True, "reason": f"Gabarito não encontrado para ano {meta['year']}, semestre {meta['semester']}, {meta['total']} questões"}

        questions = parse_prova(path)
        if not questions:
            return {"exam_name": exam_name, "year": meta["year"], "skipped": True, "reason": "Nenhuma questão reconhecida no PDF (formato de alternativas não reconhecido — provável edição anterior a 2021)"}

        added, skipped_existing = _persist_booklet(db, exam_name, meta["year"], questions, answers)
        return {
            "exam_name": exam_name, "year": meta["year"],
            "total_parsed": len(questions),
            "total_added": added,
            "skipped_existing": skipped_existing,
        }


def import_all_pucminas_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os cadernos de prova listados na página oficial de
    provas e gabaritos da PUC Minas cujo formato é reconhecido (2021 em
    diante — ver limitação de 2019 no docstring do módulo). Cada caderno é
    tentado de forma independente — falha ao baixar, formato inesperado, ou
    gabarito não encontrado não interrompem os demais. `since_year`/
    `until_year` restringem o intervalo de anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        try:
            links = fetch_exam_links()
        except Exception as e:
            if task_id:
                fail_task(task_id, str(e))
            return {"status": "error", "reason": f"Falha ao acessar {_VESTIBULAR_URL}: {e}"}

        gabarito_index = build_gabarito_index(links["gabaritos"])
        booklet_urls = links["booklets"]

        results = []
        total_added = 0
        total = len(booklet_urls)
        for i, url in enumerate(booklet_urls, start=1):
            try:
                r = import_pucminas_booklet(db, url, gabarito_index, since_year=since_year, until_year=until_year)
                results.append(r)
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                r = {"exam_name": url, "skipped": True, "reason": str(e)}
                results.append(r)

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=r.get("exam_name", url))

        summary = {
            "status": "success",
            "total_booklets": total,
            "gabaritos_found": len(links["gabaritos"]),
            "gabaritos_recognized": len(gabarito_index),
            "total_added": total_added,
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
