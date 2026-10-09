from __future__ import annotations

"""Importa questões do vestibular da PUC-Campinas (Pontifícia Universidade
Católica de Campinas) direto da página oficial de provas anteriores
(https://vestibular.puc-campinas.edu.br/provas-anteriores/) — página
WordPress estática (sem JS/paginação), com um `<a href=".../*.pdf">` por
caderno/gabarito organizados sob `<h2>ANO</h2>` e, dentro de cada ano, sob
`<h5>Vestibular</h5>` / `<h5>Vestibular de Inverno</h5>`.

Cada "trilha" (curso) de uma edição publica um caderno de prova e um ou mais
PDFs de gabarito, sempre nesta ordem no HTML: "Prova <Trilha>" (abre a
trilha) seguido imediatamente por 1+ links cujo texto contém "Gabarito"
(associados à trilha em aberto) até a próxima "Prova <Trilha>". Isso permite
um parser puramente sequencial (sem casar nomes) em `fetch_exam_tracks`.
Medicina é a única trilha com 2 gabaritos por edição — ver abaixo.

Confirmado baixando e inspecionando PDFs reais de 2020 a 2025 (Geral,
Direito, Medicina, Arquitetura, Design de Games):

  - 2025: prova e gabarito são texto puro (PyMuPDF extrai tudo).
  - 2021 e 2020: prova e gabarito também são texto puro.
  - 2022: caderno de prova é texto puro, mas o gabarito é uma imagem
    escaneada (0 caracteres de texto, 1 imagem JPEG por página) — recuperado
    via OCR da grade número→letra (ver `_ocr_gabarito_grid` abaixo).
  - 2023: tanto prova quanto gabarito têm texto extraível, mas a prova usa
    uma fonte corrompida para os números de questão e letras de alternativa
    (o corpo dos parágrafos vem legível, mas o "N." de cada questão e o
    "(A)".."(E)" de cada alternativa vêm com um mapeamento glifo→Unicode
    quebrado — ex.: o cabeçalho de página "PUCCAMP-25-Prova Geral" sai como
    "38&&$033URYD*HUDO"). Não há como extrair as questões de forma confiável
    sem OCR/renderização visual; a edição é pulada.
  - 2024: as trilhas da temporada "Vestibular" (regular, arquivo
    "_compressed.pdf") são puramente escaneadas NO CADERNO DE PROVA (0
    caracteres de texto em todas as páginas) — nenhuma questão é
    recuperável, a edição é pulada. Já as trilhas de "Vestibular de Inverno"
    (arquivo "LIVRETE-DE-QUESTOES-...") têm o CADERNO DE PROVA com texto
    real e extraível (confirmado: enunciados e alternativas corretos) — só
    o GABARITO dessas é uma imagem escaneada de uma grade número→letra,
    recuperada via `_ocr_gabarito_grid`. Isso não estava documentado aqui
    antes porque as duas temporadas de 2024 foram tratadas como uma coisa
    só ao investigar o caso inicial (0 questões importadas), quando na
    verdade eram dois problemas diferentes com soluções diferentes.

Ou seja, das 6 edições publicadas (2020-2025), 2020, 2021 e 2025 têm prova
E gabarito extraíveis como texto direto; 2022 e a Inverno de 2024 têm
prova em texto mas precisam de OCR do gabarito; só a "Vestibular" (regular)
de 2024 e 2023 (fonte corrompida) continuam sem solução.

Alguns nomes de arquivo usam acentuação em forma NFD (ex.: "QUESTÕES"
= "QUESTÕES" com til combinante) enquanto o HTML da página referencia a
forma NFC (precomposta) — baixar com a URL literal do HTML retorna 404 nesses
casos; `download_pdf` tenta a URL literal e, se 404, tenta as variantes
NFD/NFC do mesmo texto.

Estrutura de uma questão objetiva (confirmada nas edições texto-puro): o
número "N." sozinho no início de uma linha (sem espaço obrigatório depois),
seguido do enunciado, seguido de 4-5 alternativas "(A)".."(E)" cada uma no
início de uma linha. Perguntas de Matemática/Física com fórmulas às vezes
têm glifos de fonte matemática colados logo após o "(A)" (ex.: "(A) ;\n#\n:"
em vez de só "(A)"), por isso o regex de alternativa não exige fim de linha
depois da letra — só que ela abra a linha.

A trilha "Medicina" é especial: a partir de pelo menos 2021, o caderno de
prova de Medicina contém duas partes com numeração reiniciada — "Geral"
(compartilhada, mesmo padrão das demais provas, N até ~40-50) seguida de
"Específica" (N reinicia em 1, até ~20) — reconhecida pelo parser ao
detectar que a sequência de números de questão volta a cair (regride) no
meio do caderno. Cada parte tem seu próprio PDF de gabarito (nessa mesma
ordem no HTML: gabarito "Geral" primeiro, "Específica" depois), então as
partes são pareadas por posição com `zip(partes, gabaritos)`. Em edições
mais antigas (2020, 2021) a parte "Específica" de Medicina é discursiva
("Padrão de Respostas" com abordagem esperada por escrito, não A-E) — o
parser não encontra nenhuma alternativa "(A)".." nela, então essa parte
fica com 0 questões e é pulada automaticamente (o mesmo mecanismo genérico
de "0 questões reconhecidas", sem caso especial).

Persistência via adapter unificado `save_vestibular_question`
(app/services/import_batch.py). O modelo original (nunca
populado de verdade) não tinha `exam_name`; foi adicionado (nullable, com
migração incremental em `_run_migrations()`, app/main.py) para diferenciar
as várias trilhas e partes de cada edição — sem ele, `number` sozinho
colidiria entre trilhas/partes diferentes do mesmo ano (ex.: questão 1 de
"Geral" e questão 1 de "Medicina — Específica").
"""

import re
import unicodedata
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

import base64

from app.services.pdf_figures import extract_figure_events, text_content_y_range
from app.services.progress import update_task_progress, complete_task, fail_task

_HEADERS = {"User-Agent": "Mozilla/5.0"}
_PROVAS_ANTERIORES_URL = "https://vestibular.puc-campinas.edu.br/provas-anteriores/"

_TOKEN_RE = re.compile(
    r'<h2[^>]*>\s*(?P<year>\d{4})\s*</h2>'
    r'|<h5[^>]*>(?P<season>[^<]*)</h5>'
    r'|<a\s+href="(?P<href>[^"]+\.pdf)"[^>]*>(?P<label>[^<]*)</a>',
    re.IGNORECASE,
)


def _clean(s: str) -> str:
    import html as htmllib
    return htmllib.unescape(s).replace("\xa0", " ").strip()


def fetch_exam_tracks(html: Optional[str] = None, url: str = _PROVAS_ANTERIORES_URL) -> list[dict]:
    """Varre https://vestibular.puc-campinas.edu.br/provas-anteriores/ e
    retorna uma lista de trilhas: [{year, season, track, prova_url,
    gabarito_urls: [url, ...]}, ...], na ordem em que aparecem na página.

    O parser é puramente sequencial (sem casar nomes de trilha): cada link
    cujo texto NÃO contém "gabarito" abre uma nova trilha; cada link cujo
    texto contém "gabarito" é anexado à trilha em aberto mais recente. Isso
    funciona porque o HTML sempre lista "Prova <Trilha>" imediatamente
    seguida de 1+ links de "Gabarito" da mesma trilha, antes da próxima
    trilha começar."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    year: Optional[int] = None
    season: Optional[str] = None
    tracks: list[dict] = []
    current: Optional[dict] = None

    for m in _TOKEN_RE.finditer(html):
        kind = m.lastgroup
        if kind == "year":
            if current:
                tracks.append(current)
                current = None
            year = int(m.group("year"))
            season = None
        elif kind == "season":
            if current:
                tracks.append(current)
                current = None
            season = _clean(m.group("season"))
        else:
            href = m.group("href")
            label = _clean(m.group("label"))
            if "gabarito" not in label.lower():
                if current:
                    tracks.append(current)
                current = {
                    "year": year, "season": season, "track": label,
                    "prova_url": href, "gabarito_urls": [],
                }
            elif current is not None:
                current["gabarito_urls"].append(href)

    if current:
        tracks.append(current)

    return [t for t in tracks if t["year"] and t["gabarito_urls"]]


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público. Dois problemas conhecidos, com fallback:

    1. Normalização Unicode: alguns nomes de arquivo estão salvos no
       servidor em forma NFD (acento como caractere combinante separado),
       mas o HTML da página referencia a forma NFC (precomposta) — a URL
       literal do HTML 404 nesses casos. Tenta a URL literal primeiro e, se
       404, tenta as variantes NFD e NFC do mesmo texto.
    2. TLS incompleto: mesmo fallback documentado em vários outros
       importadores deste repo (ex.: app/services/unaerp/pdf_import.py) —
       tenta verificado, cai para `verify=False` só se a falha for
       especificamente de SSL.
    """
    variants = [url]
    nfd = unicodedata.normalize("NFD", url)
    nfc = unicodedata.normalize("NFC", url)
    if nfd not in variants:
        variants.append(nfd)
    if nfc not in variants:
        variants.append(nfc)

    last_exc: Optional[Exception] = None
    for variant in variants:
        try:
            resp = requests.get(variant, timeout=60, headers=_HEADERS)
        except requests.exceptions.SSLError:
            resp = requests.get(variant, timeout=60, headers=_HEADERS, verify=False)
        if resp.status_code == 404:
            continue
        resp.raise_for_status()
        if resp.content[:4] != b"%PDF":
            last_exc = ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
            continue
        dest.write_bytes(resp.content)
        return
    raise last_exc or ValueError(f"PDF não encontrado em nenhuma variante de URL: {url}")


# ── Parsing da prova ─────────────────────────────────────────────────────

# Âncora primária: sequências COMPLETAS "(A)".."(E)" em ordem estrita, cada
# uma no início de uma linha. É inequívoca (ao contrário de uma linha com só
# um número, que também aparece dentro do próprio enunciado de questões que
# citam listas numeradas — ex.: uma questão de Matemática cujo enunciado diz
# "a máquina faz, nessa ordem: 1. dobra o número; 2. subtrai 3..." — essas
# linhas "1." e "2." batem no mesmo regex de número de questão, mas NÃO são
# início de questão real; confirmado na prova de Arquitetura/Inverno-2025,
# questão 17, onde essa lista embutida ficava entre o cabeçalho real "17." e
# as alternativas reais da própria questão 17).
_NUM_LINE_RE = re.compile(r"(?m)^(\d{1,2})\.\s*$")
_OPT_RE = re.compile(r"(?m)^\(([A-E])\)\s*")
_CAP_REST_RE = re.compile(r"\s*[A-ZÀ-Ý(]")
_LETTERS = "ABCDE"


def _extract_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    full = "\n".join(p.get_text() for p in doc)
    doc.close()
    return full


def _extract_text_with_images(pdf_path: Path) -> tuple[str, list[tuple[int, bytes]]]:
    """Como `_extract_text`, mas também retorna uma estimativa de posição
    (offset de caractere no texto concatenado `full`) para cada figura
    encontrada em qualquer página — raster ou desenho vetorial nativo, via
    `pdf_figures.extract_figure_events` (mesmo mecanismo usado no ENEM e
    outros importadores).

    Como o parser deste vestibular trabalha sobre o texto já achatado
    (linear, sem coordenadas), a posição de cada figura é aproximada
    linearmente pela fração vertical (y0 / altura da página) projetada no
    trecho de texto daquela página — suficiente para decidir a qual questão
    (intervalo [início do cabeçalho, início da próxima questão)) a figura
    pertence, sem precisar reescrever o parser para operar por coordenada."""
    doc = fitz.open(str(pdf_path))
    parts: list[str] = []
    events: list[tuple[int, bytes]] = []
    offset = 0
    for page in doc:
        text = page.get_text()
        y_min, y_max = text_content_y_range(page)
        span = (y_max - y_min) or 1.0
        for _x0, y0, png in extract_figure_events(page):
            frac = max(0.0, min(1.0, (y0 - y_min) / span))
            events.append((offset + int(frac * len(text)), png))
        parts.append(text)
        offset += len(text) + 1  # +1 pelo separador "\n" do join abaixo
    doc.close()
    full = "\n".join(parts)
    return full, events


def _find_option_runs(text: str) -> list[list[re.Match]]:
    """Sequências completas (A),(B),(C),(D),(E) em ordem estrita — todas as
    questões objetivas confirmadas (2020/2021/2025) têm exatamente 5
    alternativas, então runs incompletos (sobra de fórmula garbled, ou "(B)"
    citado como notação de variável no meio de um enunciado) são ignorados."""
    runs: list[list[re.Match]] = []
    current: list[re.Match] = []
    for m in _OPT_RE.finditer(text):
        letter = m.group(1)
        idx = len(current)
        if letter == "A":
            if len(current) == 5:
                runs.append(current)
            current = [m]
        elif current and idx < 5 and letter == _LETTERS[idx]:
            current.append(m)
        else:
            if len(current) == 5:
                runs.append(current)
            current = []
    if len(current) == 5:
        runs.append(current)
    return runs


def _find_header(text: str, search_from: int, search_to: int) -> Optional[re.Match]:
    """Acha, dentro de [search_from, search_to), a linha "<número>." que é o
    cabeçalho real da próxima questão — reconhecida por ser seguida de uma
    letra maiúscula (início de frase), ao contrário de itens de lista
    numerados dentro do próprio enunciado (seguidos de continuação em
    minúscula). Entre candidatos válidos, usa o último (o cabeçalho real
    fica imediatamente antes do enunciado, mais perto da run de
    alternativas do que qualquer lista embutida mais cedo no texto). Sem
    nenhum candidato com essa assinatura, cai para o último número
    encontrado (best-effort)."""
    best = None
    for m in _NUM_LINE_RE.finditer(text, search_from, search_to):
        if _CAP_REST_RE.match(text[m.end():search_to]):
            best = m
    if best is not None:
        return best
    cands = list(_NUM_LINE_RE.finditer(text, search_from, search_to))
    return cands[-1] if cands else None


def _parse_questions(full: str, image_events: Optional[list[tuple[int, bytes]]] = None) -> list[dict]:
    """Extrai todas as questões objetivas reconhecidas num caderno (sem se
    preocupar com reinício de numeração — isso é tratado por
    `_split_segments`)."""
    runs = _find_option_runs(full)
    questions: list[dict] = []
    prev_end = 0
    for i, run in enumerate(runs):
        a_start = run[0].start()
        header = _find_header(full, prev_end, a_start)
        prev_end = run[-1].end()
        if header is None:
            continue

        statement = re.sub(r"\s+", " ", full[header.end():a_start]).strip()
        if not statement:
            continue

        stop = runs[i + 1][0].start() if i + 1 < len(runs) else len(full)
        alternatives: list[tuple[str, str]] = []
        for j, om in enumerate(run):
            tstart = om.end()
            tend = run[j + 1].start() if j + 1 < len(run) else stop
            text = re.sub(r"\s+", " ", full[tstart:tend]).strip()
            alternatives.append((om.group(1), text))

        images = [png for pos, png in (image_events or []) if header.start() <= pos < stop]
        questions.append({
            "number": int(header.group(1)), "statement": statement, "alternatives": alternatives,
            "images": images,
        })

    return questions


def _split_segments(questions: list[dict]) -> list[list[dict]]:
    """Divide a lista de questões em segmentos sempre que a numeração
    regride (ex.: ...,39, 40, 1, 2, ...) — sinal de que uma nova parte do
    caderno começou (ex.: "Específica" depois de "Geral", no caderno de
    Medicina). Cadernos sem regressão viram um único segmento."""
    if not questions:
        return []
    segments: list[list[dict]] = [[questions[0]]]
    for prev, cur in zip(questions, questions[1:]):
        if cur["number"] <= prev["number"]:
            segments.append([])
        segments[-1].append(cur)
    return segments


def parse_prova(pdf_path: Path) -> list[list[dict]]:
    """Retorna a lista de segmentos (partes) de questões reconhecidas no
    caderno. Cadernos normais têm 1 segmento; o caderno combinado de
    Medicina (quando existir) tem 2 ("Geral" + "Específica")."""
    full, image_events = _extract_text_with_images(pdf_path)
    return _split_segments(_parse_questions(full, image_events))


# ── Parsing do gabarito ────────────────────────────────────────────────────

_LETTER_TOKEN_RE = re.compile(r"^[A-E]$")


def _parse_gabarito_text(full: str) -> dict[int, str]:
    """Casa cada token numérico isolado seguido de um token de 1 letra A-E,
    na ordem linear de extração do PyMuPDF (ver docstring de `parse_gabarito`)."""
    tokens = full.split()
    answers: dict[int, str] = {}
    i = 0
    while i < len(tokens) - 1:
        tok, nxt = tokens[i], tokens[i + 1]
        if tok.isdigit() and _LETTER_TOKEN_RE.match(nxt):
            answers[int(tok)] = nxt
            i += 2
        else:
            i += 1
    return answers


# ── OCR do gabarito escaneado (grade número→letra como imagem) ─────────────
#
# Mesma limitação encontrada no gabarito da UFPR (app/services/ufpr/seed.py):
# o PDF não tem NENHUM texto extraível — a grade inteira (números E letras)
# é uma única imagem raster. Diferente da UFPR (onde os números vêm em texto
# real, servindo de âncora confiável para o OCR da célula da letra), aqui
# tudo precisa ser lido por OCR, então o algoritmo é em duas etapas:
#
#   1. OCR da página inteira (modo "texto esparso") para achar a posição de
#      cada NÚMERO de questão que o OCR conseguir ler — não precisa achar
#      todos: os números encontrados por coluna (a grade tem ~4 colunas de
#      "número | letra" lado a lado) são usados para ajustar uma reta
#      posição-vertical × número por coluna (as linhas são igualmente
#      espaçadas), o que permite estimar a posição de QUALQUER número da
#      coluna, mesmo um que o OCR não tenha lido diretamente.
#   2. Para cada número (lido ou estimado), recorta uma janela pequena à
#      direita da posição estimada — onde deveria estar a letra da resposta
#      — e faz OCR só dessa célula isolada, restrito ao alfabeto A-E.
#
# O Tesseract (motor LSTM) mostra leve não-determinismo entre chamadas para
# o mesmo recorte em casos-limite — confirmado durante o desenvolvimento
# desta função (o mesmo recorte retornou "C" numa chamada e "E" na
# seguinte). Por isso cada célula é lida com 4 configurações (PSM) diferentes
# e só é aceita quando TODAS as leituras não-vazias concordam entre si —
# uma leitura isolada nunca é aceita sozinha. Sem esse cuidado, uma resposta
# errada seria gravada com aparência de alta confiança. Células sem
# consenso ficam sem resposta (mesma filosofia da UFPR: nunca inventar).
_OCR_DPI = 200
_OCR_LETTER_OFFSET_X_AT_200DPI = 100  # calibrado empiricamente contra um gabarito real
_OCR_COLUMN_TOL_AT_200DPI = 40

_ocr_ready: Optional[bool] = None


def _ensure_ocr() -> bool:
    global _ocr_ready
    if _ocr_ready is not None:
        return _ocr_ready
    try:
        import pytesseract  # noqa: F401
        pytesseract.get_tesseract_version()
        _ocr_ready = True
    except Exception:
        _ocr_ready = False
    return _ocr_ready


def _ocr_gabarito_grid(page, dpi: int = _OCR_DPI) -> dict[int, str]:
    if not _ensure_ocr():
        return {}
    import pytesseract
    from PIL import Image

    pix = page.get_pixmap(dpi=dpi)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    scale = dpi / 200.0

    data = pytesseract.image_to_data(img, config="--psm 11", output_type=pytesseract.Output.DICT)
    points: list[tuple[int, float, float]] = []
    for t, x, y, w, h in zip(data["text"], data["left"], data["top"], data["width"], data["height"]):
        t = t.strip()
        if re.fullmatch(r"\d{1,3}", t):
            n = int(t)
            if 1 <= n <= 200:
                points.append((n, x + w / 2, y + h / 2))
    if not points:
        return {}

    # Agrupa por coluna (proximidade de x) — cada coluna da grade é uma
    # sequência "número | letra" independente das demais.
    points.sort(key=lambda p: p[1])
    tol = _OCR_COLUMN_TOL_AT_200DPI * scale
    columns: list[dict] = []
    for n, x, y in points:
        for col in columns:
            if abs(x - (sum(col["xs"]) / len(col["xs"]))) < tol:
                col["xs"].append(x)
                col["pts"].append((n, x, y))
                break
        else:
            columns.append({"xs": [x], "pts": [(n, x, y)]})

    letter_offset = _OCR_LETTER_OFFSET_X_AT_200DPI * scale
    result: dict[int, str] = {}
    for col in columns:
        pts = col["pts"]
        if len(pts) < 2:
            continue  # precisa de ao menos 2 pontos para ajustar a reta y(n)
        ns = [p[0] for p in pts]
        ys = [p[2] for p in pts]
        mean_x = sum(p[1] for p in pts) / len(pts)
        n_mean, y_mean = sum(ns) / len(ns), sum(ys) / len(ys)
        den = sum((n - n_mean) ** 2 for n in ns)
        if den == 0:
            continue
        b = sum((n - n_mean) * (y - y_mean) for n, y in zip(ns, ys)) / den
        a = y_mean - b * n_mean

        for n in range(max(1, min(ns) - 2), max(ns) + 3):
            y_pred = a + b * n
            letter_x = mean_x + letter_offset
            box = (
                int(letter_x - 25 * scale), int(y_pred - 16 * scale),
                int(letter_x + 40 * scale), int(y_pred + 16 * scale),
            )
            crop = img.crop(box).convert("L")
            crop = crop.resize((crop.width * 5, crop.height * 5), Image.LANCZOS)
            votes = []
            for psm in (8, 13, 7, 10):
                cfg = f"--psm {psm} -c tessedit_char_whitelist=ABCDE"
                txt = pytesseract.image_to_string(crop, config=cfg).strip().upper()
                if len(txt) == 1 and txt in "ABCDE":
                    votes.append(txt)
            if votes and len(set(votes)) == 1 and n not in result:
                result[n] = votes[0]

    return result


def parse_gabarito(pdf_path: Path) -> dict[int, str]:
    """Retorna {número: letra_correta} para um PDF de gabarito em tabela
    número→letra. Percorre os tokens (separados por espaço) na ordem linear
    de extração do PyMuPDF e casa cada token numérico isolado seguido
    imediatamente de um token de 1 letra A-E — essa ordem linear já reflete
    a leitura correta linha-a-linha da tabela (confirmado nos PDFs reais:
    "1 D 11 D 21 D 31 A 41 C 2 C 12 E 22 C ..." é a ordem em que o PyMuPDF
    entrega o texto, varrendo a tabela por linha, não por coluna).

    Se o PDF não tiver texto extraível (gabarito escaneado como imagem),
    cai para `_ocr_gabarito_grid` (ver comentário acima) — recupera as
    respostas que o OCR conseguir ler com confiança, deixando as demais sem
    resposta em vez de arriscar gravar uma letra errada. Se ainda assim não
    encontrar nada (ex.: "padrão de respostas" discursivo, sem grade
    número→letra), retorna um dicionário vazio e o chamador trata como "sem
    gabarito disponível", pulando a trilha."""
    full = _extract_text(pdf_path)
    answers = _parse_gabarito_text(full)
    if answers:
        return answers

    doc = fitz.open(str(pdf_path))
    try:
        if doc.page_count:
            return _ocr_gabarito_grid(doc[0])
    finally:
        doc.close()
    return {}


# ── Persistência ────────────────────────────────────────────────────────────

def _persist_segment(db, exam_name: str, year: int, questions: list[dict], gabarito: dict[int, str]) -> dict:
    """Grava as questões de UMA parte (segmento) já parseada, pulando
    edições já importadas (mesmo exam_name) e questões sem gabarito
    conhecido (não encontrado na tabela de respostas)."""
    from app.services.import_batch import save_vestibular_question
    from app.vestibular.models import VestibularQuestion
    already = db.query(VestibularQuestion).filter(
        VestibularQuestion.exam_type == "puccampinas",
        VestibularQuestion.exam_name == exam_name,
    ).count()
    if already > 0:
        return {"exam_name": exam_name, "skipped": True, "reason": "Já importado", "skipped_existing": already}

    added = 0
    skipped_no_answer = 0
    for q in questions:
        correct = gabarito.get(q["number"])
        if not correct:
            skipped_no_answer += 1
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            skipped_no_answer += 1
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
        images = q.get("images") or []
        image_list = None
        if images:
            image_list = [f"data:image/png;base64,{base64.b64encode(img).decode()}" for img in images]

        vq, created = save_vestibular_question(
            db,
            exam_type="puccampinas",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            images=image_list,
            correct_option=correct,
            metadata={},
        )
        if not created:
            skipped_no_answer += 1
            continue
        added += 1

    db.commit()
    return {"exam_name": exam_name, "total_parsed": len(questions), "total_added": added,
             "skipped_no_answer": skipped_no_answer}


_SEGMENT_LABELS = ("Geral", "Específica")


def import_puccampinas_track(db, track: dict) -> dict:
    """Importa UMA trilha (ano + temporada + curso) — baixa o caderno de
    prova e o(s) gabarito(s), parseia e persiste. Segmentos do caderno
    (partes com numeração reiniciada, ex.: Medicina Geral/Específica) são
    pareados por posição com os gabaritos na mesma ordem em que aparecem no
    HTML."""
    import tempfile

    year = track["year"]
    season = track.get("season") or "Vestibular"
    track_name = track["track"]
    if track_name.lower().startswith("prova "):
        track_name = track_name[len("prova "):].strip()

    label_base = f"PUC-Campinas {year} – {track_name}"
    if "inverno" in season.lower():
        label_base += " (Inverno)"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)

        try:
            prova_path = tmp / "prova.pdf"
            download_pdf(track["prova_url"], prova_path)
            segments = parse_prova(prova_path)
        except Exception as e:
            return {"label": label_base, "skipped": True, "reason": f"Falha ao baixar/parsear a prova: {e}"}

        if not segments:
            return {"label": label_base, "skipped": True,
                     "reason": "Nenhuma questão objetiva reconhecida no PDF (provavelmente "
                                "escaneado como imagem, ou com fonte de numeração/alternativas corrompida)."}

        gabaritos: list[dict[int, str]] = []
        for gabarito_url in track["gabarito_urls"]:
            try:
                gabarito_path = tmp / f"gabarito_{len(gabaritos)}.pdf"
                download_pdf(gabarito_url, gabarito_path)
                gabaritos.append(parse_gabarito(gabarito_path))
            except Exception:
                gabaritos.append({})

        results = []
        multi = len(segments) > 1
        for idx, (questions, gabarito) in enumerate(zip(segments, gabaritos)):
            suffix = f" — {_SEGMENT_LABELS[idx]}" if multi and idx < len(_SEGMENT_LABELS) else (f" — Parte {idx + 1}" if multi else "")
            exam_name = label_base + suffix
            if not gabarito:
                results.append({"exam_name": exam_name, "skipped": True,
                                 "reason": "Gabarito indisponível como texto (imagem escaneada ou "
                                            "padrão de respostas discursivo, sem letra objetiva)."})
                continue
            results.append(_persist_segment(db, exam_name, year, questions, gabarito))

    return {"label": label_base, "segments": results}


def import_all_puccampinas_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as trilhas listadas em
    vestibular.puc-campinas.edu.br/provas-anteriores/. Cada trilha (ano +
    temporada + curso) é tentada de forma independente — caderno escaneado
    como imagem, fonte corrompida, gabarito indisponível, ou trilha já
    importada não interrompem as demais, só são reportados.
    `since_year`/`until_year` restringem o intervalo de anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        try:
            tracks = fetch_exam_tracks()
        except Exception as e:
            raise RuntimeError(f"Falha ao acessar a página de provas anteriores: {e}")

        if since_year:
            tracks = [t for t in tracks if t["year"] >= since_year]
        if until_year:
            tracks = [t for t in tracks if t["year"] <= until_year]

        results = []
        total_added = 0
        total = len(tracks)
        for i, track in enumerate(tracks, start=1):
            try:
                r = import_puccampinas_track(db, track)
            except Exception as e:
                db.rollback()
                r = {"label": f"{track.get('year')} – {track.get('track')}", "skipped": True, "reason": str(e)}
            results.append(r)
            total_added += sum(s.get("total_added", 0) for s in r.get("segments", []))

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=f"Processado {r.get('label')}")

        summary = {"status": "success", "total_tracks_found": total, "total_added": total_added, "tracks": results}
        if task_id:
            complete_task(task_id, summary)
        return summary
    except Exception as e:
        if task_id:
            fail_task(task_id, str(e))
        raise
    finally:
        if close_after:
            db.close()
