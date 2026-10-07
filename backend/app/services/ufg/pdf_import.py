from __future__ import annotations

"""Importa questões do "Vestibular UFG" (Universidade Federal de Goiás),
processo seletivo próprio administrado pelo Instituto Verbena/UFG (antigo
Centro de Seleção, centrodeselecao.ufg.br -> sistemas.institutoverbena.ufg.br,
mesmo CPF/organização, só trocou de nome/domínio).

Descoberta de site (não presumida, confirmada navegando o site real): UFG
NÃO tem um vestibular próprio recorrente há muitos anos -- a admissão
regular é via SISU. Pesquisando o histórico de páginas do Centro de
Seleção/Instituto Verbena (procurando por "vestibular-ufg" ano a ano de
2018 a 2025), só existem duas edições REAIS de vestibular próprio com
provas objetivas publicadas:
  - "Vestibular UFG 2026" (processo rodado em 2025, pasta
    /2025/vestibular-ufg/ em sistemas.institutoverbena.ufg.br) -- primeira
    edição do vestibular retomado pela UFG.
  - "Processo Seletivo/Vestibular Cidade Ocidental - GO 2025/2" (pasta
    /2025/ps-ufg-cidade-ocidental/), um vestibular à parte, específico
    para o campus de Cidade Ocidental, também de 2025.
Não existe nenhuma pasta .../vestibular-ufg/ ou .../ps-ufg-cidade-ocidental/
para 2018-2024 (testado diretamente, HTTP 404) -- ou seja, ao contrário dos
outros vestibulares deste repo, aqui não há "anos anteriores" reais para
importar além dessas duas edições; o importador trata cada uma como uma
"edição" (`process`) independente, e caso o Instituto Verbena publique
"Vestibular UFG 2027" no futuro, `build_editions` já a descobre sozinho
(basta que a página `_INDEX_CANDIDATES` abaixo continue linkando pra ela).

Estrutura de cada edição (confirmada baixando PDFs reais de 2025/2026):
  - 2 turnos: MATUTINO (Linguagens, Códigos e suas Tecnologias) e
    VESPERTINO (Matemática, Ciências da Natureza, Ciências Humanas), cada
    um com sua prova e gabarito próprios.
  - 2 "tipos" de caderno (A/B), mesma prova com ordem de alternativas
    embaralhada -- tratados como cadernos independentes.
  - Só no turno MATUTINO (Linguagens), as 6 primeiras questões (a
    interpretação de texto de língua estrangeira) existem em 2 ou 3
    variantes ("OPÇÃO INGLÊS"/"OPÇÃO ESPANHOL"/"OPÇÃO FRANCÊS" -- o
    candidato escolhe uma), cada uma com enunciado e gabarito PRÓPRIOS
    para as questões 01-06; as questões 07-24 são comuns a todas as
    opções (confirmado comparando os 3 gabaritos: closed 07-24 idênticos
    entre opções). O importador trata cada opção de idioma como uma
    edição própria (mesmas 18 questões comuns entre elas, mais as 6
    questões específicas da opção).

Peculiaridades de layout descobertas inspecionando o texto extraído
(fitz) de PDFs reais das 2 edições antes de escrever o parser:
  - Ao contrário de outros importadores deste repo (UFJF, UNAERP...), os
    cadernos de prova da UFG são de coluna única e o texto do
    `page.get_text()` simples já sai na ordem de leitura correta -- não é
    necessário usar blocos por posição (x0/y0) para a PROVA.
  - As alternativas são marcadas explicitamente no texto como "(A)",
    "(B)", "(C)", "(D)", "(E)" -- não há ambiguidade posicional aqui.
  - O cabeçalho de página ("VESTIBULAR UFG/2026 ... PROCESSO SELETIVO
    IV/UFG ... <nome do caderno>") se repete em toda página e teria que
    ser descartado explicitamente pra não contaminar o enunciado da
    questão em aberto quando ela atravessa uma quebra de página.
  - O GABARITO, por outro lado, É uma tabela em blocos do PyMuPDF (um
    bloco com números "01\n02\n03\n04" seguido de um bloco com letras
    "A\nC\nB\nE" logo abaixo) -- mesma técnica de pareamento por posição Y
    já usada em unaerp/ufjf/pdf_import.py. A diferença aqui é que os
    números de questão SE REPETEM (01-24) uma vez por opção de idioma no
    mesmo PDF (matutino) -- por isso o parser rastreia qual cabeçalho de
    seção ("OPÇÃO INGLÊS/ESPANHOL/FRANCÊS", ou "geral" quando não há
    opção) está em vigor no momento de cada par número/letra, evitando
    que a 2ª e 3ª ocorrência de "01" sobrescrevam a 1ª incorretamente.
    "X" no gabarito marca questão anulada e fica de fora do dicionário.
"""

import re
import urllib.parse
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.import_batch import save_vestibular_question

_HEADERS = {"User-Agent": "Mozilla/5.0"}

# Cada "processo" é uma edição de vestibular próprio da UFG encontrada no
# site (ver docstring do módulo -- não há mais nenhuma além destas duas).
_PROCESSES = [
    {
        "process": "vestibular-ufg",
        "year": 2026,
        "label": "Vestibular UFG",
        "base": "https://sistemas.institutoverbena.ufg.br/2025/vestibular-ufg/sistema/provas_gabaritos",
        "index_html": "https://sistemas.institutoverbena.ufg.br/2025/vestibular-ufg/sistema/provas_gabaritos/Provas_gabaritos_finais_VESTIBULAR%20UFG%202026.html",
    },
    {
        "process": "ps-ufg-cidade-ocidental",
        "year": 2025,
        "label": "PS Vestibular UFG Cidade Ocidental - GO",
        "base": "https://sistemas.institutoverbena.ufg.br/2025/ps-ufg-cidade-ocidental/sistema/provas_gabaritos",
        "index_html": "https://sistemas.institutoverbena.ufg.br/2025/ps-ufg-cidade-ocidental/sistema/provas_gabaritos/Provas_gabaritos_finais_PS_CIDADE_OCIDENTAL_UFG_2025.html",
    },
]

_LINK_RE = re.compile(r'href="([^"]+\.pdf)"', re.IGNORECASE)

_TURNO_RE = re.compile(r'(?i)matutino|vespertino')
_TIPO_RE = re.compile(r'(?i)tipo[\s_]*([AB])\b')


def fetch_html(url: str) -> str:
    """Baixa uma página HTML pública do Instituto Verbena/UFG. Mesmo
    fallback de TLS documentado em app/services/ufjf/pdf_import.py: tenta
    verificado, só cai pra sem verificação se a falha for de SSL."""
    try:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=30, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    return resp.text


def download_pdf(url: str, dest: Path) -> None:
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (link provavelmente fora do ar).")
    dest.write_bytes(resp.content)


def _classify(url: str) -> Optional[dict]:
    """Classifica um PDF de uma página de provas/gabaritos pelo NOME do
    arquivo em {kind, turno, tipo}."""
    fname = urllib.parse.unquote(url.rsplit("/", 1)[-1])
    low = fname.lower()
    if "gabarito" in low:
        kind = "gabarito"
    elif "prova" in low or "caderno" in low:
        kind = "prova"
    else:
        return None

    tm = _TURNO_RE.search(fname)
    turno = tm.group(0).lower() if tm else None

    tp = _TIPO_RE.search(fname)
    if tp:
        tipo = tp.group(1).upper()
    elif kind == "gabarito":
        # Nomes de gabarito de algumas edições (ex.: Cidade Ocidental) não
        # usam a palavra "Tipo", só a letra solta ("gabarito A matutino -
        # final.pdf") -- procura a letra A/B isolada como fallback (só
        # pra gabarito: em provas isso arriscaria casar letras soltas de
        # outras palavras do nome do arquivo).
        tp2 = re.search(r'(?i)\b([AB])\b', fname)
        tipo = tp2.group(1).upper() if tp2 else None
    else:
        tipo = None
    if not turno or not tipo:
        return None
    return {"kind": kind, "turno": turno, "tipo": tipo}


def fetch_process_pdfs(process: dict) -> list[dict]:
    """Extrai e classifica os PDFs de prova/gabarito de uma edição,
    resolvendo URLs relativas contra a própria página HTML (necessário
    porque os hrefs no site são relativos ao diretório da página, que às
    vezes NÃO bate com `base`, ex.: cidade-ocidental usa
    "gabarito_final/..." relativo à página index, não a "sistema/
    provas_gabaritos/gabarito_final/...")."""
    html = fetch_html(process["index_html"])
    items = []
    seen = set()
    for href in _LINK_RE.findall(html):
        if href in seen:
            continue
        seen.add(href)
        info = _classify(href)
        if not info:
            continue
        full_url = urllib.parse.urljoin(process["index_html"], href)
        items.append({"url": full_url, **info})
    return items


def build_editions(since_year: Optional[int] = None, until_year: Optional[int] = None) -> list[dict]:
    """Monta a lista de cadernos (turno, tipo) a importar, um por
    combinação (processo, turno, tipo), cada um já com prova_url +
    gabarito_url resolvidos."""
    editions: list[dict] = []
    for process in _PROCESSES:
        year = process["year"]
        if since_year and year < since_year:
            continue
        if until_year and year > until_year:
            continue
        try:
            pdfs = fetch_process_pdfs(process)
        except Exception:
            continue

        provas = {}
        gabaritos = {}
        for item in pdfs:
            key = (item["turno"], item["tipo"])
            if item["kind"] == "prova":
                provas[key] = item["url"]
            else:
                gabaritos[key] = item["url"]

        for key, prova_url in provas.items():
            gabarito_url = gabaritos.get(key)
            if not gabarito_url:
                continue
            turno, tipo = key
            editions.append({
                "process": process["process"],
                "label": process["label"],
                "year": year,
                "turno": turno,
                "tipo": tipo,
                "prova_url": prova_url,
                "gabarito_url": gabarito_url,
            })
    return editions


# ---------------------------------------------------------------------
# Gabarito: tabela em blocos do PyMuPDF, com seções (opção de idioma, no
# turno matutino) que reiniciam a numeração -- ver docstring do módulo.
# ---------------------------------------------------------------------

_OPCAO_RE = re.compile(r'(?i)OP[ÇC][ÃA]O\s+(INGL[ÊE]S|ESPANHOL|FRANC[ÊE]S)')
_DISCIPLINA_SEM_OPCAO_RE = re.compile(
    r'(?i)^(LINGUAGENS|MATEM[ÁA]TICA|CI[ÊE]NCIAS DA NATUREZA|CI[ÊE]NCIAS HUMANAS)'
)

_OPCAO_LABELS = {"inglês": "ingles", "ingles": "ingles", "espanhol": "espanhol", "francês": "frances", "frances": "frances"}


def parse_gabarito(gabarito_pdf: Path) -> dict[str, dict[int, str]]:
    """Retorna {secao: {numero_questao: letra}}. `secao` é "geral" (turno
    vespertino, ou parte comum do matutino) ou "ingles"/"espanhol"/
    "frances" (blocos de opção de idioma do turno matutino, cada um com
    sua PRÓPRIA numeração 01-24 -- ver docstring do módulo)."""
    doc = fitz.open(str(gabarito_pdf))
    sections: dict[str, dict[int, str]] = {}
    current = "geral"
    pending_nums: Optional[list[str]] = None

    for page in doc:
        blocks = sorted(page.get_text("blocks"), key=lambda b: (round(b[1]), b[0]))
        for b in blocks:
            text = b[4].strip()
            tokens = text.split()
            if not tokens:
                continue

            # Só o INÍCIO do bloco importa aqui -- alguns blocos de
            # resposta vêm com lixo de rodapé grudado no final (ex.: "E
            # \nB\nA\nD\n \nX – Questão anulada. \nGoiânia, 31 de..."), o
            # que faria um `all(...)` sobre o bloco inteiro descartar as 4
            # respostas válidas do início junto com o lixo. Por isso
            # tomamos só a sequência inicial de tokens válidos.
            num_run = []
            for tok in tokens:
                if re.fullmatch(r"\d{1,3}", tok):
                    num_run.append(tok)
                else:
                    break
            if num_run and len(num_run) == len(tokens):
                pending_nums = tokens
                continue
            if num_run:
                pending_nums = num_run
                continue

            ans_run = []
            for tok in tokens:
                if re.fullmatch(r"[A-E]|X", tok.upper()):
                    ans_run.append(tok.upper())
                else:
                    break
            if ans_run:
                if pending_nums:
                    dest = sections.setdefault(current, {})
                    for nn, aa in zip(pending_nums, ans_run):
                        if aa != "X":
                            dest[int(nn)] = aa
                pending_nums = None
                continue

            m = _OPCAO_RE.search(text)
            if m:
                current = _OPCAO_LABELS.get(m.group(1).lower(), "geral")
            elif _DISCIPLINA_SEM_OPCAO_RE.search(text):
                current = "geral"
            pending_nums = None
    doc.close()
    return sections


# ---------------------------------------------------------------------
# Prova: texto linear (coluna única), com marcadores explícitos "QUESTÃO
# NN" e alternativas "(A)".."(E)" -- ver docstring do módulo.
# ---------------------------------------------------------------------

_QSTART_RE = re.compile(r'(?i)^QUEST[ÃA]O\s*0*(\d{1,3})\s*$')
_ALT_RE = re.compile(r'^\(([A-E])\)\s*(.*)$')
_BOILERPLATE_LINE_RE = re.compile(
    r'(?i)^(vestibular ufg|processo seletivo|iv/ufg|p[áa]gina\s*\d+\s*de\s*\d+).*|.*_tipo\s*[ab]\s*$'
)
_REDACAO_RE = re.compile(r'(?i)^(reda[çc][ãa]o|folha rascunho)\s*$')


def parse_prova(prova_pdf: Path) -> dict[str, list[dict]]:
    """Retorna {secao: [{number, statement, alternatives}]}, mesmas
    chaves de seção usadas por `parse_gabarito` (ver lá)."""
    doc = fitz.open(str(prova_pdf))
    lines: list[str] = []
    for page in doc:
        for raw in page.get_text().split("\n"):
            line = raw.strip()
            if not line or _BOILERPLATE_LINE_RE.match(line):
                continue
            lines.append(line)
    doc.close()

    sections: dict[str, list[dict]] = {}
    current_section = "geral"
    current_q: Optional[dict] = None
    stopped = False

    def flush():
        nonlocal current_q
        if current_q and current_q["statement"] and len(current_q["alternatives"]) >= 2:
            sections.setdefault(current_section, []).append(current_q)
        current_q = None

    for line in lines:
        if stopped:
            break
        if _REDACAO_RE.match(line):
            flush()
            stopped = True
            break

        m_opt = _OPCAO_RE.search(line)
        if m_opt:
            flush()
            current_section = _OPCAO_LABELS.get(m_opt.group(1).lower(), "geral")
            continue
        if _DISCIPLINA_SEM_OPCAO_RE.search(line):
            flush()
            current_section = "geral"
            continue

        m_q = _QSTART_RE.match(line)
        if m_q:
            flush()
            current_q = {"number": int(m_q.group(1)), "statement": "", "alternatives": []}
            continue

        if current_q is None:
            continue

        m_alt = _ALT_RE.match(line)
        if m_alt:
            current_q["alternatives"].append(m_alt.group(2).strip())
            continue

        if not current_q["alternatives"]:
            current_q["statement"] = (current_q["statement"] + " " + line).strip()
        else:
            # Continuação de uma alternativa que quebrou linha.
            current_q["alternatives"][-1] = (current_q["alternatives"][-1] + " " + line).strip()

    flush()
    return sections


_TURNO_LABELS = {"matutino": "Matutino", "vespertino": "Vespertino"}
_OPCAO_EXAM_LABELS = {"ingles": "Opção Inglês", "espanhol": "Opção Espanhol", "frances": "Opção Francês", "geral": None}


def _persist_exam(db, exam_name: str, year: int, questions: list[dict], gabarito: dict[int, str]) -> tuple[int, int]:
    added = 0
    skipped_existing = 0
    for q in questions:
        correct = gabarito.get(q["number"])
        if not correct:
            continue
        letters = [chr(65 + i) for i in range(len(q["alternatives"]))]
        if correct not in letters:
            continue

        options = [
            {
                "letter": letters[order],
                "text": text,
                "is_correct": (letters[order] == correct),
                "order": order,
            }
            for order, text in enumerate(q["alternatives"])
        ]
        metadata = {
            "university": "UFG",
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="ufg",
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


def import_ufg_edition(db, edition: dict) -> dict:
    """Importa UM caderno (processo/turno/tipo) já resolvido por
    `build_editions`, baixando prova + gabarito para um diretório
    temporário. Como o turno matutino tem seções por opção de idioma
    (ver docstring do módulo), este caderno pode gerar MAIS de um "exame"
    persistido (um por seção encontrada em ambos prova e gabarito)."""
    import tempfile

    year = edition["year"]
    turno_label = _TURNO_LABELS.get(edition["turno"], edition["turno"])
    base_name = f"{edition['label']} {year} - {turno_label} - Tipo {edition['tipo']}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        try:
            prova_path = tmp / "prova.pdf"
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(edition["prova_url"], prova_path)
            download_pdf(edition["gabarito_url"], gabarito_path)

            prova_sections = parse_prova(prova_path)
            gabarito_sections = parse_gabarito(gabarito_path)
        except Exception as e:
            db.rollback()
            return {"exam_name": base_name, "skipped": True, "reason": str(e)}

        if not prova_sections:
            return {"exam_name": base_name, "skipped": True, "reason": "Nenhuma questão reconhecida no PDF"}

        # No turno Matutino, a seção "geral" (questões 07-24, comuns a
        # todas as opções de idioma) não é um caderno à parte -- ela
        # completa cada opção (que sozinha só tem as 6 questões
        # específicas de interpretação de texto). Funde as questões
        # comuns em cada seção de opção e descarta a chave "geral" (o
        # gabarito de cada opção já inclui as respostas 07-24 duplicadas,
        # ver docstring do módulo, então nada se perde).
        opcao_sections = [s for s in prova_sections if s in _OPCAO_LABELS.values()]
        if opcao_sections and "geral" in prova_sections:
            common = prova_sections.pop("geral")
            for s in opcao_sections:
                prova_sections[s] = sorted(prova_sections[s] + common, key=lambda q: q["number"])

        results = []
        for section, questions in prova_sections.items():
            gabarito = gabarito_sections.get(section)
            opcao_label = _OPCAO_EXAM_LABELS.get(section)
            exam_name = f"{base_name} - {opcao_label}" if opcao_label else base_name

            if not questions:
                results.append({"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida no PDF"})
                continue
            if not gabarito:
                results.append({"exam_name": exam_name, "skipped": True, "reason": "Gabarito vazio/não reconhecido para esta seção"})
                continue
            try:
                added, skipped_existing = _persist_exam(db, exam_name, year, questions, gabarito)
                results.append({
                    "exam_name": exam_name,
                    "total_parsed": len(questions),
                    "total_added": added,
                    "skipped_existing": skipped_existing,
                })
            except Exception as e:
                db.rollback()
                results.append({"exam_name": exam_name, "skipped": True, "reason": str(e)})

        return {"exam_name": base_name, "sections": results}


async def process_and_import_ufg_from_url(url: str, year: int, db):
    """Compat: importa um único caderno a partir de uma URL de prova,
    tentando achar automaticamente o gabarito via `build_editions`.
    Preferir `import_all_ufg_exams` para lotes."""
    editions = build_editions(since_year=year, until_year=year)
    for e in editions:
        if e["prova_url"] == url:
            return import_ufg_edition(db, e)
    return {"status": "not_found", "reason": "URL não corresponde a nenhum caderno de prova conhecido para este ano"}


def import_all_ufg_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODOS os cadernos objetivos das edições REAIS de Vestibular
    UFG encontradas no site (ver docstring do módulo -- não há mais que
    as 2 edições listadas em `_PROCESSES`, pois UFG não tinha vestibular
    próprio antes de 2025). Cada caderno é tentado de forma independente
    -- falha ao baixar/parsear um não interrompe os demais.
    `since_year`/`until_year` restringem o intervalo de anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions = build_editions(since_year=since_year, until_year=until_year)

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(editions, start=1):
            try:
                r = import_ufg_edition(db, edition)
                results.append(r)
                for s in r.get("sections", []):
                    total_added += s.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": edition["year"], "skipped": True, "reason": str(e)})

            if task_id:
                label = f"{edition['label']} {edition['year']} - {edition['turno']} Tipo {edition['tipo']}"
                update_task_progress(task_id, current=i, total=total, log=f"Processado {label}")

        result = {"total_editions_found": total, "total_added": total_added, "editions": results}
        if task_id:
            complete_task(task_id, result)
        return result
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()


async def import_all(db=None, task_id: Optional[str] = None, **kwargs):
    return import_all_ufg_exams(db=db, task_id=task_id, **kwargs)
