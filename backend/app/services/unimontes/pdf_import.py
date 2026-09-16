from __future__ import annotations

"""Importa questões do "Vestibular Próprio da UNIMONTES" (Universidade
Estadual de Montes Claros), organizado pela COTEPS/COTEC, direto da página
oficial de editais (coteps.unimontes.br/vestibular/) — página estática, sem
JavaScript, com um link por PDF (mesmo padrão de UFSC/ACAFE/UFPR/UNAERP
neste repo). A antiga URL fixa `unimontes.br/vestibular/2026/prova.pdf` do
stub anterior nunca existiu de verdade; o site real é hospedado em
coteps.unimontes.br, sob wp-content/uploads/AAAA/MM/, com nomes de arquivo
que mudam de convenção a cada edição — por isso a descoberta é sempre feita
raspando a página, nunca por URL fixa.

Estrutura de uma edição ("Edital N/AAAA"): 2 GRUPOS (turnos/datas de
aplicação), cada um com 4 CADERNOS — um por ÁREA (Biológicas, Humanas,
Sociais Aplicadas, Exatas) — totalizando 8 cadernos por edição. Cada
caderno tem 45 questões objetivas (numeradas 1-45, todas com exatamente 4
alternativas A-D) mais uma redação (descartada: sem marcação objetiva,
nada a importar). As primeiras 25 questões (Português, Literatura, Língua
Estrangeira, Filosofia, Sociologia) são as MESMAS em todos os cadernos de
uma edição; só as questões 26-45 variam por área (Biologia/Química,
História/Geografia, História/Matemática, Física/Matemática). A Língua
Estrangeira (questões 16-19) é publicada em DUAS versões (Espanhol e
Inglês, à escolha do candidato) sob os MESMOS números de questão — por
isso o modelo `UnimontesQuestion` tem uma coluna `subject` (além de
`exam_name`/`area`): sem ela, as duas versões colidiriam no mesmo (exam,
número).

Cada caderno é publicado como PDF próprio (o "caderno de prova", com
enunciados e alternativas) e o gabarito de TODOS os cadernos de um mesmo
grupo vem consolidado em UM ÚNICO PDF (uma seção "CADERNO NNN" por área,
com uma tabela "Nº QUESTÕES" / "RESPOSTAS" por disciplina). O código do
caderno ("101", "102"...) é arbitrário (não corresponde ao número da área:
caderno 101 é Biológicas, não Área 1) — por isso o vínculo caderno↔gabarito
usa esse código como chave opaca, lido de dentro de cada PDF (nunca do
nome do arquivo, que mudou de convenção entre 2024 e 2025: com/sem sufixo
"-gb", "-APOS-RECURSOS" em posições diferentes etc.).

LIMITAÇÃO CONHECIDA (documentada, não escondida): o Edital 1/2024 (a
edição mais antiga ainda linkada na página de vestibular) usa um formato de
gabarito completamente diferente — uma sequência "achatada" de números e
letras, sem os marcadores "Nº QUESTÕES"/"RESPOSTAS" que o parser abaixo
usa para reconhecer o layout "moderno" (Edital 4/2024 em diante, único
formato confirmado nas duas edições reais inspecionadas: 2024 e 2025).
`parse_gabarito_pdf` detecta a ausência desses marcadores e retorna None
nesse caso — o gabarito do Edital 1/2024 não é reconhecido, e por
consequência os cadernos dessa edição (nomeados diferente também:
"Biologicas-grupo-1-gab.pdf" em vez de "101-GRUPO-1-AREA-3-...pdf") nem
entram na descoberta de `fetch_exam_links` (o regex de caderno exige o
prefixo numérico "NNN-GRUPO-N-AREA-N-"). Página histórica não encontrada
com edições anteriores a 2024 (busca web não retornou arquivo/acervo
anterior no domínio oficial) — o alcance real de importação, no momento
desta implementação, é Edital 4/2024 e Edital 4/2025 (e o que a
universidade publicar no mesmo formato nas próximas edições).
"""

import re
import unicodedata
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task
from app.models import UnimontesQuestion, UnimontesQuestionOption

_VESTIBULAR_URL = "https://www.coteps.unimontes.br/vestibular/"
_HEADERS = {"User-Agent": "Mozilla/5.0"}

_PDF_HREF_RE = re.compile(r'href="([^"]+\.pdf)"', re.IGNORECASE)
# Nome de arquivo do formato "moderno" (Edital 4/2024 em diante): um código
# de 3 dígitos (opaco, não é a área) + "GRUPO-N" + "AREA-N" + nome da área,
# com ou sem sufixo "-gb". Layout de pasta (wp-content/uploads/AAAA/MM/) não
# é usado no filtro — só o nome do arquivo, que é o que realmente identifica
# o conteúdo.
_MODERN_BOOKLET_RE = re.compile(r'/\d{3}-GRUPO-\d-AREA-\d-[A-Za-z\-]+?(?:-gb)?\.pdf$', re.IGNORECASE)

_EDITAL_RE = re.compile(r'EDITAL\s*(\d+)\s*/\s*(\d{4})', re.IGNORECASE)
_GRUPO_RE = re.compile(r'GRUPO\s*0?(\d)\b', re.IGNORECASE)
_CADERNO_NUM_RE = re.compile(r'\b([1-4]\d{2})\b')
_AREA_LINE_RE = re.compile(r'(?m)^.*ÁREA.*$')

_SUBJECT_RE = re.compile(r'(?m)^PROVA DE (.+?)\s*$')
_QSTART_RE = re.compile(r'(?m)^QUEST[ÃA]O\s+(\d{1,3})\s*$')
_OPT_RE = re.compile(r'(?m)^([A-E])\)\s*')
_INSTRUCAO_RE = re.compile(r'INSTRU[ÇC][ÃA]O')


def _last_option_run(body: str) -> list:
    """Encontra todas as ocorrências de "A)".."E)" no início de linha e
    devolve só o ÚLTIMO bloco de letras estritamente consecutivas a partir
    de "A)" (A, depois B, depois C...) — ver ponto 2 do docstring de
    `parse_prova` sobre questões de associação que repetem "A)".."D)" duas
    vezes no mesmo enunciado."""
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
        # letra fora de sequência (nem a esperada, nem reinício em "A"):
        # ruído, ignora e mantém o bloco atual em andamento.
    if current:
        runs.append(current)
    return runs[-1] if runs else []

_NAME_LINE_RE = re.compile(r'^[A-ZÀ-Ú][A-ZÀ-Ú0-9 \-–(),./]{2,}$')


def fetch_exam_links(html: Optional[str] = None, url: str = _VESTIBULAR_URL) -> dict:
    """Raspa a página de vestibular da COTEPS e separa os PDFs em cadernos
    de prova (formato moderno) e gabaritos (qualquer link cujo nome contenha
    "gabarit" e "grupo" — o conteúdo real de cada gabarito só é confirmado
    depois, ao abrir o PDF em `parse_gabarito_pdf`)."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    urls = set(_PDF_HREF_RE.findall(html))
    booklets = sorted(u for u in urls if _MODERN_BOOKLET_RE.search(u))
    gabaritos = sorted(u for u in urls if 'gabarit' in u.lower() and 'grupo' in u.lower())
    return {"booklets": booklets, "gabaritos": gabaritos}


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público. Mesmo fallback de TLS incompleto documentado em
    app/services/ufsc/pdf_import.py e app/services/unaerp/pdf_import.py:
    tenta verificado, e só cai para sem verificação se a falha for
    especificamente de SSL."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def _normalize(s: str) -> str:
    s = s.upper()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^A-Z]', '', s)


def _subject_key(name: str) -> str:
    """Chave usada só para desambiguar Espanhol x Inglês (única disciplina
    com números de questão repetidos dentro do mesmo caderno). Para as
    demais disciplinas a chave não precisa bater exatamente entre caderno e
    gabarito — só é usada quando há mais de uma resposta candidata para o
    mesmo número de questão."""
    norm = _normalize(name)
    if 'ESPANHOL' in norm:
        return 'ESPANHOL'
    if 'INGLES' in norm:
        return 'INGLES'
    return norm


# Fallback só usado quando a linha "ÁREA – N" vem sem nome entre parênteses
# (visto no caderno de EXATAS de algumas edições: "ÁREA – 4" sozinho, sem
# "(EXATAS)" ao lado) — mapeamento confirmado nos PDFs reais inspecionados
# (gabarito e outros cadernos da mesma edição sempre nomeiam as 4 áreas
# assim), não um palpite.
_AREA_NUM_FALLBACK = {"1": "HUMANAS", "2": "SOCIAIS APLICADAS", "3": "BIOLÓGICAS", "4": "EXATAS"}


def _extract_area(text: str) -> Optional[str]:
    """Extrai o nome da área da linha que contém "ÁREA", em qualquer um dos
    formatos vistos: "ÁREA – 3 (BIOLÓGICAS)" (gabarito), "CURSOS – ÁREA 3
    (CIÊNCIAS BIOLÓGICAS)" (caderno de prova) ou "ÁREA – 4" sozinho, sem
    nome (caderno de Exatas de algumas edições — usa `_AREA_NUM_FALLBACK`)."""
    m = _AREA_LINE_RE.search(text)
    if not m:
        return None
    line = m.group()
    idx = line.find('ÁREA')
    tail = line[idx + 4:]
    tail = re.sub(r'^[\s\-–]+', '', tail)
    num_m = re.match(r'^(\d)\s*', tail)
    tail = re.sub(r'^\d+\s*', '', tail)
    tail = re.sub(r'^[\s\-–]+', '', tail)
    area = tail.strip(' ()').strip()
    if area:
        return area
    if num_m:
        return _AREA_NUM_FALLBACK.get(num_m.group(1))
    return None


def extract_booklet_meta(path: Path) -> Optional[dict]:
    """Lê a primeira página do caderno de prova e extrai ano, edital, grupo,
    código do caderno e nome da área — tudo do próprio conteúdo do PDF, não
    do nome do arquivo (que mudou de convenção entre edições)."""
    doc = fitz.open(str(path))
    text = doc[0].get_text()
    if doc.page_count > 1:
        text += "\n" + doc[1].get_text()
    doc.close()

    m = _EDITAL_RE.search(text)
    if not m:
        return None
    edital_num, year = int(m.group(1)), int(m.group(2))

    gm = _GRUPO_RE.search(text)
    group = int(gm.group(1)) if gm else None

    cm = _CADERNO_NUM_RE.search(text)
    caderno = cm.group(1) if cm else None

    area = _extract_area(text)

    if group is None or caderno is None or area is None:
        return None

    return {"year": year, "edital": edital_num, "group": group, "caderno": caderno, "area": area}


def parse_prova(path: Path) -> list[dict]:
    """Parseia um caderno de prova e retorna a lista de questões:
    [{number, subject, statement, alternatives: [(letra, texto), ...]}].

    As disciplinas são delimitadas por cabeçalhos "PROVA DE <NOME>" (uma
    seção por disciplina), e dentro de cada seção as questões começam com
    "QUESTÃO NN" sozinho na linha. As alternativas "A)".."E)" só são
    reconhecidas no início de linha (mesma cautela documentada em
    app/services/unaerp/pdf_import.py contra notações de variável tipo
    "(A)" citadas no meio do enunciado) — não que isso tenha ocorrido nos
    PDFs inspecionados (Física/Química usam LaTeX-like inline sem colidir),
    mas mantém o parser resiliente. Como a UNIMONTES sempre usa exatamente 4
    alternativas (A-D), a letra E nunca aparece na prática — o regex aceita
    até E só por robustez a mudanças futuras.

    A Língua Estrangeira aparece como DUAS seções distintas ("PROVA DE
    LÍNGUA ESTRANGEIRA – LÍNGUA ESPANHOLA" / "... INGLESA", ou só "PROVA DE
    LÍNGUA ESPANHOLA" / "...INGLESA" em edições mais antigas), cada uma com
    suas próprias questões 16-19 — o resultado terá, de propósito, duas
    entradas com o mesmo `number` e `subject` diferente.

    Duas armadilhas de "A)".."D)" que NÃO são as alternativas reais da
    questão, confirmadas em PDFs reais:
    1) Quando o enunciado de uma questão termina logo antes de um novo bloco
       "INSTRUÇÃO:" (material de apoio — texto/citações — para a PRÓXIMA
       questão, ainda sem o cabeçalho "QUESTÃO NN"), esse material às vezes
       cita uma lista rotulada "A) ... B) ... C) ... D) ..." (ex.: citações
       atribuídas a autores) que nada tem a ver com a questão atual. Por
       isso o corpo de cada questão é truncado no primeiro "INSTRUÇÃO"
       encontrado antes de procurar alternativas.
    2) Questões de associação/relacione ("relacione a segunda coluna...")
       repetem "A) ... D) ..." DUAS vezes dentro do MESMO enunciado: a
       primeira vez como rótulos das categorias a associar (parte do
       enunciado), a segunda como as alternativas finais de verdade (as
       sequências de números, ex. "A) 2, 4, 1, 3."). Por isso, entre vários
       blocos consecutivos de A(-E), só o ÚLTIMO é tratado como as
       alternativas reais — os anteriores viram parte do enunciado."""
    doc = fitz.open(str(path))
    full = "\n".join(p.get_text() for p in doc)
    doc.close()

    subj_matches = list(_SUBJECT_RE.finditer(full))
    questions: list[dict] = []
    for i, sm in enumerate(subj_matches):
        subject = sm.group(1).strip()
        start = sm.end()
        stop = subj_matches[i + 1].start() if i + 1 < len(subj_matches) else len(full)
        section = full[start:stop]

        qmatches = list(_QSTART_RE.finditer(section))
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

            statement = re.sub(r'\s+', ' ', body[:opts[0].start()]).strip()
            if not statement:
                continue

            alternatives: list[tuple[str, str]] = []
            for k, om in enumerate(opts):
                letter = om.group(1)
                tstart = om.end()
                tend = opts[k + 1].start() if k + 1 < len(opts) else len(body)
                text = re.sub(r'\s+', ' ', body[tstart:tend]).strip()
                alternatives.append((letter, text))

            questions.append({
                "number": number, "subject": subject,
                "statement": statement, "alternatives": alternatives,
            })

    return questions


def _parse_gabarito_caderno_chunk(chunk: str) -> dict:
    """Máquina de estados linha-a-linha para UM trecho "CADERNO NNN ...":
    cada disciplina aparece como um nome em CAIXA ALTA (às vezes duas juntas,
    quando compartilham a mesma dupla coluna, ex. Português+Literatura ou
    Espanhol+Inglês) seguido de um bloco "Nº QUESTÕES" com os números e,
    mais adiante, um bloco "RESPOSTAS" com as letras — na MESMA ordem de
    aparição (por isso zipar q_groups[i] com r_groups[i] por índice funciona
    mesmo quando os blocos de números de duas disciplinas aparecem juntos
    antes dos blocos de respostas correspondentes, como no PDF real).

    Retorna dict[qnum] -> dict[subject_key] -> letra ("N" = questão anulada
    pela banca, sem letra certa — fica no dicionário mas `_persist_booklet`
    descarta essas questões, sem gabarito válido para aplicar)."""
    lines = [l.strip() for l in chunk.splitlines()]
    state: Optional[str] = None
    q_groups: list[list[int]] = []
    r_groups: list[list[str]] = []
    name_queue: list[str] = []
    cur_nums: list[int] = []
    cur_resp: list[str] = []

    for s in lines:
        if not s:
            continue
        if s.startswith('NOTA'):
            break
        if re.match(r'^N[ºo°]?\s*QUEST', s):
            if state == 'nums' and cur_nums:
                q_groups.append(cur_nums); cur_nums = []
            state = 'nums'
            continue
        if s == 'RESPOSTAS':
            if state == 'nums' and cur_nums:
                q_groups.append(cur_nums); cur_nums = []
            if state == 'resp' and cur_resp:
                r_groups.append(cur_resp); cur_resp = []
            state = 'resp'
            continue
        if state == 'nums':
            if re.fullmatch(r'\d{1,3}', s):
                cur_nums.append(int(s))
                continue
            q_groups.append(cur_nums); cur_nums = []
            state = None
        if state == 'resp':
            if re.fullmatch(r'[A-EN]', s):
                cur_resp.append(s)
                continue
            r_groups.append(cur_resp); cur_resp = []
            state = None
        if _NAME_LINE_RE.match(s) and 'ÁREA' not in s and 'CADERNO' not in s and 'GABARITO' not in s:
            name_queue.append(s)

    if cur_nums:
        q_groups.append(cur_nums)
    if cur_resp:
        r_groups.append(cur_resp)

    answers: dict[int, dict[str, str]] = {}
    for i, (nums, resp) in enumerate(zip(q_groups, r_groups)):
        if len(nums) != len(resp):
            continue
        name = name_queue[i] if i < len(name_queue) else f"DISCIPLINA_{i}"
        key = _subject_key(name)
        for n, letter in zip(nums, resp):
            answers.setdefault(n, {})[key] = letter
    return answers


def parse_gabarito_pdf(path: Path) -> Optional[dict]:
    """Parseia UM PDF de gabarito (cobre todos os cadernos de um grupo).
    Retorna dict[caderno_str] -> {"year", "edital", "group", "area",
    "answers"}, ou None se o PDF não usar o layout "moderno" reconhecido
    (ausência dos marcadores "Nº QUESTÕES"/"RESPOSTAS" — ver limitação do
    Edital 1/2024 no docstring do módulo)."""
    doc = fitz.open(str(path))
    full = "\n".join(p.get_text() for p in doc)
    doc.close()

    if 'QUESTÕES' not in full.upper() or 'RESPOSTAS' not in full.upper():
        return None

    m = _EDITAL_RE.search(full)
    if not m:
        return None
    edital_num, year = int(m.group(1)), int(m.group(2))

    gm = _GRUPO_RE.search(full)
    group = int(gm.group(1)) if gm else None

    positions = [(mm.start(), mm.group(1)) for mm in re.finditer(r'CADERNO\s+(\d+)', full)]
    if not positions:
        return None

    result: dict[str, dict] = {}
    for i, (pos, num) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(full)
        chunk = full[pos:end]
        result[num] = {
            "year": year, "edital": edital_num, "group": group,
            "area": _extract_area(chunk),
            "answers": _parse_gabarito_caderno_chunk(chunk),
        }
    return result


def build_gabarito_index(gabarito_urls: list[str]) -> dict:
    """Baixa e parseia todos os PDFs de gabarito descobertos, indexando por
    (ano, edital, grupo) -> {caderno: answers}. Quando mais de um gabarito
    existe para a mesma edição/grupo (ex.: "GABARITOS-VEST-GRUPO-1.pdf" e a
    versão "...-APOS-RECURSOS.pdf" definitiva, publicada depois), a versão
    "recurso" é processada por último e sobrescreve — é a oficial final."""
    import tempfile

    candidates: list[tuple[bool, dict]] = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        for i, url in enumerate(gabarito_urls):
            path = tmp / f"gab_{i}.pdf"
            try:
                download_pdf(url, path)
                parsed = parse_gabarito_pdf(path)
            except Exception:
                parsed = None
            if not parsed:
                continue
            is_recurso = 'RECURSO' in url.upper()
            candidates.append((is_recurso, parsed))

    index: dict[tuple, dict] = {}
    for is_recurso, parsed in sorted(candidates, key=lambda c: c[0]):
        for caderno, data in parsed.items():
            key = (data["year"], data["edital"], data["group"])
            index.setdefault(key, {})[caderno] = data["answers"]
    return index


def _persist_booklet(db, exam_name: str, area: Optional[str], year: int, questions: list[dict], answers: dict) -> tuple[int, int]:
    """Grava as questões de UM caderno (já parseado), pulando cadernos já
    importados (mesmo exam_name), questões sem gabarito conhecido (número
    ausente na tabela, anulada — resposta "N" — ou ambígua sem chave de
    disciplina compatível), e garantindo que a letra correta realmente
    corresponde a uma das alternativas extraídas."""
    already = db.query(UnimontesQuestion).filter(UnimontesQuestion.exam_name == exam_name).count()
    if already > 0:
        return 0, already

    added = 0
    for q in questions:
        entries = answers.get(q["number"], {})
        if not entries:
            continue
        if len(entries) == 1:
            correct = next(iter(entries.values()))
        else:
            correct = entries.get(_subject_key(q["subject"]))
        if not correct or correct not in ("A", "B", "C", "D", "E"):
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            continue

        question = UnimontesQuestion(
            exam_name=exam_name,
            area=area,
            subject=q["subject"],
            year=year,
            number=q["number"],
            statement=q["statement"],
        )
        db.add(question)
        db.flush()

        for order, (letter, text) in enumerate(q["alternatives"]):
            db.add(UnimontesQuestionOption(
                question_id=question.id,
                text=text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return added, 0


def import_unimontes_booklet(
    db, booklet_url: str, gabarito_index: dict,
    since_year: Optional[int] = None, until_year: Optional[int] = None,
) -> dict:
    """Importa UM caderno de prova, casando-o com o gabarito da sua edição
    (ano/edital/grupo) pelo código de caderno lido de dentro do próprio
    PDF."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / "booklet.pdf"
        try:
            download_pdf(booklet_url, path)
        except Exception as e:
            return {"exam_name": booklet_url, "skipped": True, "reason": f"Falha ao baixar caderno: {e}"}

        meta = extract_booklet_meta(path)
        if not meta:
            return {"exam_name": booklet_url, "skipped": True, "reason": "Não foi possível identificar ano/edital/grupo/caderno/área no caderno"}

        if since_year and meta["year"] < since_year:
            return {"exam_name": booklet_url, "year": meta["year"], "skipped": True, "reason": "Fora do intervalo since_year/until_year"}
        if until_year and meta["year"] > until_year:
            return {"exam_name": booklet_url, "year": meta["year"], "skipped": True, "reason": "Fora do intervalo since_year/until_year"}

        exam_name = f"UNIMONTES {meta['year']} – Edital {meta['edital']}/{meta['year']} – Grupo {meta['group']} – {meta['area']}"

        key = (meta["year"], meta["edital"], meta["group"])
        gab = gabarito_index.get(key, {}).get(meta["caderno"])
        if not gab:
            return {"exam_name": exam_name, "year": meta["year"], "skipped": True, "reason": f"Gabarito não encontrado para caderno {meta['caderno']} (ano {meta['year']}, edital {meta['edital']}, grupo {meta['group']})"}

        questions = parse_prova(path)
        if not questions:
            return {"exam_name": exam_name, "year": meta["year"], "skipped": True, "reason": "Nenhuma questão reconhecida no PDF"}

        added, skipped_existing = _persist_booklet(db, exam_name, meta["area"], meta["year"], questions, gab)
        return {
            "exam_name": exam_name, "year": meta["year"],
            "total_parsed": len(questions),
            "total_added": added,
            "skipped_existing": skipped_existing,
        }


def import_all_unimontes_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os cadernos de prova listados em
    coteps.unimontes.br/vestibular/ cujo formato de gabarito é reconhecido
    (ver limitação do Edital 1/2024 no docstring do módulo). Cada caderno é
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
                r = import_unimontes_booklet(db, url, gabarito_index, since_year=since_year, until_year=until_year)
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
            "gabaritos_recognized": len({k for k in gabarito_index}),
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
