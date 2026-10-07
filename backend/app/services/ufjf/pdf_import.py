from __future__ import annotations

"""Importa questões do vestibular PISM da UFJF (Universidade Federal de
Juiz de Fora) direto do site oficial da COPESE (Coordenação Geral de
Processos Seletivos, www2.ufjf.br/copese) — WordPress estático, sem
JavaScript, mesmo padrão fácil de raspar já usado em UNAERP/UNIOESTE/UFSC
neste repo.

Estrutura do vestibular (confirmada navegando o site real, não só supondo
pelo nome "PISM"):
  - Cada ANO publica uma página "pism-AAAA" (ou, para edições mais antigas,
    "vestibular-pism-AAAA"/"vestibular-pism-edicoes-anteriores/pism-AAAA")
    listada em .../vestibular-pism-2/vestibular-pism-edicoes-anteriores/.
  - Cada ano tem 1 ou 2 sub-páginas "provas-e-gabaritos-Nº-dia" (1º e 2º
    dia da prova), cada uma listando os cadernos em PDF daquele dia.
  - Cada dia tem 3 "Módulos": Módulo I e II são comuns a todos os
    candidatos; Módulo III é dividido em 4 cadernos por ÁREA (Economia e
    Administração, Exatas, Humanas, Saúde) — cada caderno de Módulo III
    reinicia a numeração das questões em 1, mas comprovamos (baixando e
    comparando os PDFs de 2021/2023) que o gabarito objetivo de Módulo III
    é ÚNICO por dia/ano e vale para as 4 áreas (só a parte discursiva, que
    não importamos, difere por área) — por isso o import casa qualquer
    caderno de Módulo III com o único gabarito de Módulo III daquele
    dia/ano, sem tentar achar um gabarito "por área" que não existe.
  - Não há nenhuma marcação textual ("(A)", "(B)"...) para as letras das
    alternativas nos cadernos de prova — os círculos de marcação são
    puramente gráficos. A única forma de saber a ordem das alternativas é
    a posição delas no PDF (ver `parse_prova`); a resposta certa (letra)
    só existe no PDF de gabarito separado, como nos outros importadores
    deste repo.

Peculiaridades de layout descobertas inspecionando o texto extraído
(fitz) de PDFs reais de 2021 e 2023 antes de escrever o parser:
  - O gabarito é uma tabela em blocos do PyMuPDF: um bloco com os números
    de questão ("01\n02\n...") e, logo abaixo dele na página, um bloco
    com as letras ("C\nB\nA\n..." — às vezes "ANULADA" no lugar de uma
    letra, questão anulada pela banca). `parse_gabarito` empareceha cada
    bloco de números com o bloco de letras mais próximo por posição Y,
    igual à técnica já usada em unaerp/pdf_import.py para não depender da
    ordem linear de `get_text()`.
  - Nos cadernos de prova, cada alternativa é OUTRO bloco de texto — mas a
    indentação (x0) delas é inconsistente: no caso comum, alternativas
    ficam num x0≈61 (deslocadas à direita do marcador gráfico), mas em
    parte das questões de Humanas (Módulo III) — sempre que o texto de
    apoio da questão (uma notícia/citação) é longo o bastante para vir
    diagramado em 2 colunas — o PyMuPDF entrega os blocos da citação
    embaralhados (colunas intercaladas por posição Y, não por ordem de
    leitura) E pelo menos uma das alternativas às vezes aparece com x0≈33
    (mesmo recuo do enunciado) em vez de x0≈61, quebrando qualquer
    heurística baseada só em indentação.
    A solução adotada: (1) descarta-se qualquer bloco com x0 > 70 (esse
    threshold cobre o enunciado normal ~28-46 e as alternativas ~57-65,
    mas exclui exatamente os fragmentos de coluna embaralhada, que caem
    em x0 bem maior, ~200-500) — o preço é perder um pouco do texto de
    apoio dessas questões específicas (a citação/notícia em si fica
    incompleta no `statement`), mas as 5 alternativas continuam corretas;
    (2) a partir do PRIMEIRO bloco no recuo de alternativa, toma-se
    sempre EXATAMENTE os 5 blocos seguintes como as alternativas (A-E),
    não importando o x0 deles individualmente — ver
    `_split_stem_and_alternatives` para o raciocínio completo. Validado
    contra os gabaritos de vários cadernos reais de 2017 a 2024 (todos os
    3 módulos, várias áreas de Módulo III): a enorme maioria das questões
    com gabarito disponível (as não anuladas) bate uma letra válida A-E;
    a minoria que não bate normalmente é uma questão anulada mesmo (sem
    entrada no gabarito) ou uma das limitações abaixo.
  - As questões objetivas (1-20) e discursivas (1-5, numeração que
    REINICIA) convivem no mesmo PDF; o parser corta tudo a partir do
    cabeçalho isolado "QUESTÕES DISCURSIVAS" (exato, não como substring —
    as orientações gerais do início do caderno mencionam a palavra
    "discursivas" numa frase solta, o que causava corte prematuro na
    primeira versão do parser).
  - Um pequeno número de questões (poucas por edição) tem alternativas
    puramente gráficas (fórmulas/fórações químicas como imagem, comuns em
    Física/Química) — mesma limitação já documentada em unaerp/pdf_import.py;
    quando isso reduz a questão a menos de 3 blocos de conteúdo, ela é
    simplesmente pulada (sem gabarito coerente para persistir).
  - Limitação conhecida (rara, confirmada em 1 gabarito de 2020): quando
    o PDF de gabarito tem algum elemento sobreposto/deslocado (ex.: um
    carimbo de retificação ou cabeçalho lateral que invade o corpo da
    tabela), 1-2 questões isoladas no MEIO da tabela podem ficar de fora
    do dicionário de respostas (nem erradas, nem anuladas — simplesmente
    não reconhecidas) — o efeito prático é igual ao de uma anulação: a
    questão não é importada, por falta de gabarito confiável, nunca por
    um gabarito errado sendo inventado.
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
_BASE = "https://www2.ufjf.br/copese"
_INDEX_URLS = [
    f"{_BASE}/vestibular-pism-2/",
    f"{_BASE}/vestibular-pism-2/vestibular-pism-edicoes-anteriores/",
]

_LINK_RE = re.compile(r'<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', re.IGNORECASE)
_YEAR_EDITION_RE = re.compile(r'pism[-\s]*(\d{4})', re.IGNORECASE)
_MUSICA_SELECAO_RE = re.compile(r'(?i)m[uú]sica|sele[cç][ãa]o especial')

_DIA_SUBPAGE_RE = re.compile(r'(?i)provas-e-gabaritos')
_DIA_FROM_URL_RE = re.compile(r'(?i)(\d)[oº]?[-_]?dia')

_MODULO_RE = re.compile(r'M[OÓ]DULO[_\-\s]*([I]{1,3})\b', re.IGNORECASE)
_MODULO_PART_RE = re.compile(r'[-_]P([123])(?:[-_.]|$)', re.IGNORECASE)
_PISM_MODULO_RE = re.compile(r'PISM[-_]([I]{1,3})(?=[-_])', re.IGNORECASE)
_AREA_MAP = [
    ("SAÚDE", "saude"), ("SAUDE", "saude"),
    ("ECONOMIA", "economia"),
    ("EXATAS", "exatas"),
    ("HUMANAS", "humanas"),
]
_DIA_FROM_FNAME_RE = re.compile(r'DIA[-_\s]?(\d)')

_QSTART_RE = re.compile(r'(?i)^quest[ãa]o\s*0*(\d{1,3})\s*[-–.]\s*')
_DISCURSIVA_RE = re.compile(r'(?i)^\s*quest[õo]es\s+discursivas\s*$')
_BOILERPLATE_RE = re.compile(r'(?i)^(p[áa]gina\s*\d+\s*de\s*\d+|pr[óo]-reitoria de gradua)')
_CONTENT_X0_MAX = 70
_N_ALTERNATIVES = 5


def fetch_html(url: str) -> str:
    """Baixa uma página HTML pública da COPESE. Mesmo fallback de TLS
    documentado em app/services/unaerp/pdf_import.py e ufsc/pdf_import.py:
    tenta verificado, só cai pra sem verificação se a falha for de SSL."""
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


def fetch_edition_years(html_pages: Optional[list[str]] = None) -> dict[int, list[str]]:
    """Varre as páginas-índice do site (edição atual + edições anteriores)
    e retorna {ano: [url1, url2, ...]}, restrito ao vestibular PISM
    "principal" (exclui Vestibular de Música e Seleção Especial, que são
    processos seletivos à parte, fora do escopo deste importador).

    Guarda TODAS as URLs encontradas pra um mesmo ano, não só a primeira:
    o mesmo ano aparece com URLs DIFERENTES nas duas páginas-índice (ex.:
    2021 é ".../vestibular-pism-2/pism-2021/" na página atual, mas
    ".../vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2021/"
    na página de edições anteriores) — e nem sempre as duas têm o mesmo
    conteúdo (a primeira, de um ano já encerrado, pode ter só editais e
    resultados, sem a seção de provas e gabaritos, que só existe na
    segunda). `build_editions` tenta todas até achar PDFs."""
    if html_pages is None:
        html_pages = [fetch_html(u) for u in _INDEX_URLS]

    years: dict[int, list[str]] = {}
    for html in html_pages:
        for href, label in _LINK_RE.findall(html):
            label_clean = re.sub(r"<[^>]+>", " ", label)
            label_clean = re.sub(r"\s+", " ", label_clean).strip()
            if _MUSICA_SELECAO_RE.search(label_clean) or _MUSICA_SELECAO_RE.search(href):
                continue
            m = _YEAR_EDITION_RE.search(href) or _YEAR_EDITION_RE.search(label_clean)
            if not m:
                continue
            year = int(m.group(1))
            urls = years.setdefault(year, [])
            if href not in urls:
                urls.append(href)
    return years


def fetch_dia_pages(year_url: str, html: Optional[str] = None) -> list[tuple[Optional[int], str]]:
    """Acha as sub-páginas "provas-e-gabaritos-Nº-dia" de um ano. Se
    nenhuma for encontrada, cai no fallback de usar a própria página do
    ano como única fonte — isso cobre tanto o formato mais antigo (sem
    split por dia) quanto edições (ex.: PISM 2021) em que
    "provas-e-gabaritos" é só uma ÂNCORA de rolagem dentro da própria
    página (`href="#provas-e-gabaritos"`, sem schema/domínio), não uma
    página separada — âncoras desse tipo são explicitamente ignoradas
    (senão a tentativa de baixá-las como HTML quebra com
    `MissingSchema`)."""
    if html is None:
        html = fetch_html(year_url)

    pages: dict[str, Optional[int]] = {}
    for href, _label in _LINK_RE.findall(html):
        if href.startswith("#"):
            continue
        if _DIA_SUBPAGE_RE.search(href):
            resolved = urllib.parse.urljoin(year_url, href)
            m = _DIA_FROM_URL_RE.search(resolved)
            dia = int(m.group(1)) if m else None
            pages[resolved] = dia

    if not pages:
        return [(None, year_url)]
    return [(dia, url) for url, dia in pages.items()]


def _decode_fname(url: str) -> str:
    return urllib.parse.unquote(url.rsplit("/", 1)[-1]).upper()


def classify_pdf(url: str) -> Optional[dict]:
    """Classifica um PDF pelo NOME do arquivo (não pelo path/pasta, que
    muda de convenção ano a ano) em {kind: 'prova'|'gabarito', modulo:
    1|2|3|None, area: 'economia'|'exatas'|'humanas'|'saude'|None}.
    Descarta provas discursivas (não são objetivas, sem gabarito de
    múltipla escolha) e qualquer link que não seja claramente prova nem
    gabarito.

    Cadernos de edições mais antigas (ex.: 2018) nem usam a palavra
    "PROVA" no nome — vêm como "PISM-I-Objetiva-DIA-1_-FINAL.pdf" — por
    isso "OBJETIVA" também conta como sinal de caderno de prova (o
    gabarito é sempre pego primeiro pelo "GABARITO" no nome, então não
    há ambiguidade mesmo que o nome do gabarito também contenha
    "OBJETIVA", como em "GABARITO-...-OBJETIVA-...").

    Também extrai o "dia" (1 ou 2) do PRÓPRIO nome do arquivo quando
    presente ("...DIA-1...", "...DIA_2...") — necessário porque algumas
    edições antigas (ex.: 2017) publicam os cadernos dos 2 dias numa
    ÚNICA página, sem sub-página por dia; sem esse sinal extra, prova e
    gabarito de dias diferentes do mesmo módulo colidiriam na mesma
    chave (modulo) e se misturariam."""
    fname = _decode_fname(url)
    if "DISCURSIVA" in fname:
        return None
    if "GABARITO" in fname:
        kind = "gabarito"
    elif "PROVA" in fname or "OBJETIVA" in fname:
        kind = "prova"
    else:
        return None

    modulo = None
    m = _MODULO_RE.search(fname)
    if m:
        modulo = len(m.group(1))
    else:
        m2 = _MODULO_PART_RE.search(fname)
        if m2:
            modulo = int(m2.group(1))
        else:
            m3 = _PISM_MODULO_RE.search(fname)
            if m3:
                modulo = len(m3.group(1))

    area = None
    for key, val in _AREA_MAP:
        if key in fname:
            area = val
            break

    dia = None
    md = _DIA_FROM_FNAME_RE.search(fname)
    if md:
        dia = int(md.group(1))

    return {"kind": kind, "modulo": modulo, "area": area, "dia": dia}


def fetch_dia_pdfs(dia_url: str, html: Optional[str] = None) -> list[dict]:
    """Extrai e classifica todos os PDFs de uma página de dia, retornando
    [{url, kind, modulo, area}]. Múltiplos links para o mesmo href (ex.:
    label principal + "(retificado)" como <a> separado) colapsam num só
    item, sem duplicar."""
    if html is None:
        html = fetch_html(dia_url)

    seen: set[str] = set()
    items: list[dict] = []
    for href, _label in _LINK_RE.findall(html):
        if not href.lower().endswith(".pdf") or href in seen:
            continue
        seen.add(href)
        info = classify_pdf(href)
        if info:
            items.append({"url": href, **info})
    return items


def build_editions(since_year: Optional[int] = None, until_year: Optional[int] = None) -> list[dict]:
    """Monta a lista de "cadernos" a importar: um item por combinação
    (ano, dia, módulo, área), cada um já com prova_url + gabarito_url
    resolvidos (gabarito de Módulo III é o único do dia/ano, comprovado
    válido pra qualquer área daquele módulo — ver docstring do módulo)."""
    years = fetch_edition_years()
    if since_year:
        years = {y: u for y, u in years.items() if y >= since_year}
    if until_year:
        years = {y: u for y, u in years.items() if y <= until_year}

    editions: list[dict] = []
    for year, year_urls in sorted(years.items()):
        dia_pages: list[tuple[Optional[int], str]] = []
        for year_url in year_urls:
            try:
                found = fetch_dia_pages(year_url)
            except Exception:
                continue
            # Só usa o fallback "página do ano inteira" se nenhuma
            # sub-página de dia foi achada em NENHUMA das URLs do ano —
            # senão duplicaria o próprio ano como se fosse um "dia" extra
            # quando outra URL já resolveu sub-páginas de verdade.
            if len(found) == 1 and found[0][1] == year_url:
                dia_pages.append(found[0])
            else:
                dia_pages.extend(found)

        # Remove duplicatas (mesma URL de dia encontrada via 2 índices).
        dia_pages = list(dict.fromkeys(dia_pages))

        for page_dia, dia_url in dia_pages:
            try:
                pdfs = fetch_dia_pdfs(dia_url)
            except Exception:
                continue

            # O "dia" de cada PDF prioriza o que está no PRÓPRIO nome do
            # arquivo (mais específico) e só cai pro dia da página/sub-
            # página quando o nome não indica nada — necessário pra
            # edições antigas (ex.: 2017) que publicam os cadernos dos 2
            # dias numa página só, sem sub-página por dia (nesse caso
            # `page_dia` é None e o nome do arquivo é a única forma de
            # não misturar prova/gabarito de dias diferentes do mesmo
            # módulo).
            gabaritos: dict[tuple[int, Optional[int]], str] = {}
            provas: list[dict] = []
            for item in pdfs:
                if item["modulo"] is None:
                    continue
                dia = item.get("dia") if item.get("dia") is not None else page_dia
                item["dia"] = dia
                if item["kind"] == "gabarito":
                    gabaritos[(item["modulo"], dia)] = item["url"]
                else:
                    provas.append(item)

            for p in provas:
                gab_url = gabaritos.get((p["modulo"], p["dia"]))
                if not gab_url:
                    continue
                editions.append({
                    "year": year,
                    "dia": p["dia"],
                    "modulo": p["modulo"],
                    "area": p["area"],
                    "prova_url": p["url"],
                    "gabarito_url": gab_url,
                })

    return editions


def parse_gabarito(gabarito_pdf: Path) -> dict[int, str]:
    """Parseia o PDF de gabarito: tabela em blocos do PyMuPDF, um bloco de
    números de questão emparelhado com o bloco de letras mais próximo
    abaixo dele (por posição Y). "ANULADA" (questão anulada pela banca)
    fica de fora do dicionário — sem letra certa não há como importar.

    Tokeniza cada bloco com `.split()` (espaço em branco genérico), não só
    por quebra de linha: em pelo menos uma edição (2023, Módulo III Dia 2,
    versão retificada) 3 questões seguidas anuladas vieram como
    "ANULADA ANULADA ANULADA" numa ÚNICA linha do bloco de respostas (em
    vez de uma por linha) — sem essa tokenização, o bloco inteiro falhava
    a validação e as 10 respostas daquele bloco (não só as 3 anuladas)
    eram perdidas."""
    doc = fitz.open(str(gabarito_pdf))
    answers: dict[int, str] = {}
    for page in doc:
        num_blocks = []
        ans_blocks = []
        for b in page.get_text("blocks"):
            tokens = b[4].split()
            if not tokens:
                continue
            if all(re.fullmatch(r"\d{1,3}", tok) for tok in tokens):
                num_blocks.append((b[1], tokens))
            elif all(re.fullmatch(r"[A-E]|ANULADA", tok.upper()) for tok in tokens):
                ans_blocks.append((b[1], tokens))
        num_blocks.sort(key=lambda x: x[0])
        ans_blocks.sort(key=lambda x: x[0])
        for (_, nums), (_, ans) in zip(num_blocks, ans_blocks):
            for nn, aa in zip(nums, ans):
                if aa.upper() != "ANULADA":
                    answers[int(nn)] = aa.upper()
    doc.close()
    return answers


def _extract_content_blocks(prova_pdf: Path) -> list[tuple[float, str]]:
    doc = fitz.open(str(prova_pdf))
    out: list[tuple[float, str]] = []
    for page in doc:
        for b in page.get_text("blocks"):
            t = b[4].strip()
            if not t or _BOILERPLATE_RE.match(t):
                continue
            out.append((b[0], t))
    doc.close()
    return out


_ALT_INDENT_MIN = 57
_ALT_INDENT_MAX = 65


def _split_stem_and_alternatives(content: list[tuple[float, str]]) -> tuple[list[str], list[str]]:
    """Separa o enunciado das alternativas dentro de UMA questão já
    recortada (lista de blocos (x0, texto), filtrados por x0 <=
    `_CONTENT_X0_MAX`). Ver docstring do módulo para o porquê disto não
    ser trivial: não há letra explícita nas alternativas (só posição), e
    a indentação delas (x0≈61) é o sinal mais confiável, mas nem sempre
    presente/consistente.

    Estratégia: acha o primeiro bloco com x0 no "recuo de alternativa"
    (≈57-65) — é aí que a lista de opções começa (o marcador gráfico da
    própria alternativa A). A partir dali, sempre toma EXATAMENTE os
    próximos N=5 blocos como as 5 alternativas (A-E), qualquer que seja o
    x0 deles — não tenta validar indentação bloco a bloco, porque ela é
    inconsistente dentro da própria lista de alternativas de uma mesma
    questão (comum em fórmulas de física/química, onde uma fração vira 2
    blocos com recuos diferentes para a mesma alternativa; e em algumas
    questões de Humanas, onde 1-2 das 5 alternativas saem coladas no
    recuo do enunciado). Parar exatamente em 5 blocos, a partir do
    primeiro recuo de alternativa encontrado, também descarta de forma
    confiável o material da PRÓXIMA questão que ocasionalmente aparece
    entre o fim das alternativas e o marcador "QUESTÃO N" seguinte (ex.:
    "Leia o texto a seguir para responder à próxima questão") — esse
    texto nunca é o PRIMEIRO bloco no recuo de alternativa, então nunca
    entra nos 5 tomados.

    Se nenhum bloco no recuo de alternativa aparecer (algumas questões
    usam esse mesmo recuo do enunciado para todas as 5 alternativas),
    cai no fallback: assume que os últimos N=5 blocos (ou menos, se a
    questão tiver menos conteúdo) são as alternativas."""
    run_start = next((i for i, (x0, _) in enumerate(content) if _ALT_INDENT_MIN <= x0 <= _ALT_INDENT_MAX), None)

    if run_start is None:
        n_alt = min(_N_ALTERNATIVES, len(content) - 1)
        stem_parts = [t for _, t in content[:-n_alt]]
        alt_parts = [t for _, t in content[-n_alt:]]
        return stem_parts, alt_parts

    run_end = min(run_start + _N_ALTERNATIVES, len(content))
    stem_parts = [t for _, t in content[:run_start]]
    alt_parts = [t for _, t in content[run_start:run_end]]
    return stem_parts, alt_parts


def parse_prova(prova_pdf: Path) -> list[dict]:
    """Parseia um caderno de prova e retorna a lista de questões objetivas:
    [{number, statement, alternatives: [texto, ...]}] (a ordem da lista é
    a ordem A, B, C... das alternativas — ver docstring do módulo e de
    `_split_stem_and_alternatives` sobre por que não há letra explícita
    no PDF, e como o enunciado é separado das alternativas)."""
    blocks = _extract_content_blocks(prova_pdf)

    for i, (_, t) in enumerate(blocks):
        if _DISCURSIVA_RE.match(t):
            blocks = blocks[:i]
            break

    marker_idx = [i for i, (_, t) in enumerate(blocks) if _QSTART_RE.match(t)]
    questions: list[dict] = []
    for k, mi in enumerate(marker_idx):
        x0, t = blocks[mi]
        m = _QSTART_RE.match(t)
        number = int(m.group(1))
        end = marker_idx[k + 1] if k + 1 < len(marker_idx) else len(blocks)

        body = [(x0, t[m.end():].strip())] + blocks[mi + 1:end]
        content = [(xb, tb) for (xb, tb) in body if xb <= _CONTENT_X0_MAX]
        if len(content) < 3:
            continue

        stem_parts, alt_parts = _split_stem_and_alternatives(content)

        statement = re.sub(r"\s+", " ", " ".join(stem_parts)).strip()
        alternatives = [re.sub(r"\s+", " ", a).strip() for a in alt_parts]
        if not statement or len(alternatives) < 2:
            continue

        questions.append({"number": number, "statement": statement, "alternatives": alternatives})

    return questions


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
            "university": "UFJF",
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="ufjf",
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


_AREA_LABELS = {
    "economia": "Economia e Administração",
    "exatas": "Exatas",
    "humanas": "Humanas",
    "saude": "Saúde",
}


def import_ufjf_edition(db, edition: dict) -> dict:
    """Importa UM caderno (ano/dia/módulo/área) já resolvido por
    `build_editions`, baixando prova + gabarito para um diretório
    temporário."""
    import tempfile

    year = edition["year"]
    dia_label = f"Dia {edition['dia']}" if edition["dia"] else "Dia único"
    modulo_label = f"Módulo {'I' * edition['modulo']}" if edition["modulo"] else "Módulo ?"
    area = edition.get("area")
    area_label = f" - {_AREA_LABELS.get(area, area)}" if area else ""
    exam_name = f"UFJF PISM {year} - {dia_label} - {modulo_label}{area_label}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        try:
            prova_path = tmp / "prova.pdf"
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(edition["prova_url"], prova_path)
            download_pdf(edition["gabarito_url"], gabarito_path)

            questions = parse_prova(prova_path)
            gabarito = parse_gabarito(gabarito_path)

            if not questions:
                return {"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida no PDF"}
            if not gabarito:
                return {"exam_name": exam_name, "skipped": True, "reason": "Gabarito vazio/não reconhecido"}

            added, skipped_existing = _persist_exam(db, exam_name, year, questions, gabarito)
            return {
                "exam_name": exam_name,
                "total_parsed": len(questions),
                "total_added": added,
                "skipped_existing": skipped_existing,
            }
        except Exception as e:
            db.rollback()
            return {"exam_name": exam_name, "skipped": True, "reason": str(e)}


async def process_and_import_ufjf_from_url(url: str, year: int, db):
    """Compat: importa um único caderno a partir de uma URL de prova,
    tentando achar automaticamente o gabarito do mesmo módulo/dia/ano via
    `build_editions`. Preferir `import_all_ufjf_exams` para lotes."""
    editions = build_editions(since_year=year, until_year=year)
    for e in editions:
        if e["prova_url"] == url:
            return import_ufjf_edition(db, e)
    return {"status": "not_found", "reason": "URL não corresponde a nenhum caderno de prova conhecido para este ano"}


def import_all_ufjf_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODOS os cadernos objetivos do vestibular PISM da UFJF
    encontrados no site da COPESE. Cada caderno (ano/dia/módulo/área) é
    tentado de forma independente — falha ao baixar/parsear um não
    interrompe os demais. `since_year`/`until_year` restringem o
    intervalo de anos, para dividir o lote em partes menores."""
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
                r = import_ufjf_edition(db, edition)
                results.append(r)
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                results.append({"year": edition["year"], "skipped": True, "reason": str(e)})

            if task_id:
                label = f"UFJF {edition['year']} - Módulo {edition['modulo']}"
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


# Compat com o nome antigo do stub, usado pelo router antes desta implementação.
async def import_all(db=None, task_id: Optional[str] = None, **kwargs):
    return import_all_ufjf_exams(db=db, task_id=task_id, **kwargs)
