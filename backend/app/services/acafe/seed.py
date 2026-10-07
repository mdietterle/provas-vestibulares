"""ACAFE seed logic — importa questões dos PDFs de provas ACAFE.

Diferente do ENEM (que vem de JSON pré-processado), as provas ACAFE são PDFs
oficiais do vestibular de Medicina das faculdades de Santa Catarina. Cada PDF
contém, para cada questão objetiva: o enunciado, 4 alternativas (A–D), a
resposta correta (destacada em vermelho e também explicitada num quadro
"Alternativa correta letra: X"), uma justificativa comentada e, na maioria das
questões, a "Matriz de Referência" (competências/habilidades).

O parsing usa PyMuPDF (fitz) para:
  - identificar as seções de área de conhecimento (cabeçalhos centralizados);
  - localizar a alternativa correta pela cor vermelha das spans;
  - reconstruir enunciado, alternativas, justificativa e matriz a partir do
    texto, usando os quadros "Dados da questão" / "Justificativa" /
    "Matriz de Referência" como delimitadores.

Importado apenas sob demanda pela rota admin (parsing de PDF é pesado).

Além dos PDFs locais em provas/acafe/, é possível importar diretamente a
partir de uma URL pública (ex.: storage.acafe.org.br/.../Prova objetiva
oficial - comentada.pdf) via `import_acafe_from_url`, sem precisar baixar e
commitar o arquivo no repositório — nos mesmos moldes do importador da UFRGS
(app/services/ufrgs/pdf_import.py).
"""

import base64
import re
import tempfile
import zipfile
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.services.progress import update_task_progress, complete_task, fail_task
from app.services.import_batch import save_vestibular_question

ACAFE_DIR = Path(__file__).parent.parent.parent.parent / "provas" / "acafe"

# Listagem oficial de documentos por edição (ano + semestre). A página pública
# https://acafe.org.br/concurso/vestibular/anteriores/?a=ANO&s=SEMESTRE só
# embute um iframe apontando pra esta URL — vamos direto nela. s=1 é Verão,
# s=2 é Inverno.
_LISTING_URL = "https://storage.acafe.org.br/concurso/vestibular/documentos.php"
_LINK_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>([^<]*)</a>', re.I)

# Palavras que descartam um link "prova" candidato (outros documentos da
# edição que também mencionam "prova" no texto, mas não são o caderno).
_PROVA_EXCLUDE_WORDS = (
    "gabarito", "pareceres", "edital", "demanda", "resultado", "abstenç", "abstenc",
    "média", "media", "classificado", "quadro", "portaria", "comunicado", "retificaç", "retific",
)


def _is_prova_candidate(combined: str) -> bool:
    if "prova" not in combined:
        return False
    return not any(bad in combined for bad in _PROVA_EXCLUDE_WORDS)


def _prova_score(combined: str) -> int:
    """Menor = melhor. Prioriza a versão "comentada" (traz o gabarito
    destacado embutido, que é o que `parse_pdf` sabe ler); "não comentada"
    só é usada como último recurso, quando não há outra opção."""
    if "comentada" in combined and "não comentada" not in combined and "nao comentada" not in combined:
        return 0
    if "objetiva" in combined:
        return 1
    if "não comentada" in combined or "nao comentada" in combined:
        return 3
    return 2


def _gabarito_score(combined: str) -> Optional[int]:
    """None = não é um link de gabarito. Menor = melhor (oficial > genérico > preliminar)."""
    if "gabarito" not in combined:
        return None
    if "preliminar" in combined:
        return 2
    if "oficial" in combined:
        return 0
    return 1


def fetch_acafe_editions(year: int, semester: int) -> list[dict]:
    """Varre a página de documentos de uma edição ACAFE (ano + semestre) e
    retorna as "edições" encontradas nela.

    Normalmente é uma edição só: {is_zip: False, label: None, prova_url,
    gabarito_url}. Em 2020 as provas de Medicina saíram em .zip por versão
    (A/B/C), cada uma virando sua própria edição rotulada; o pacote "Outros
    Cursos" é ignorado (o banco ACAFE daqui é só o vestibular de Medicina).

    Se a edição não existir (ex.: vestibular que não ocorreu naquele
    semestre) ou não houver um link de prova reconhecível, retorna [].
    """
    resp = requests.get(
        _LISTING_URL,
        params={"a": year, "s": semester},
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    resp.raise_for_status()
    html = resp.text

    links = [(href, (text or "").strip()) for href, text in _LINK_RE.findall(html)]
    if not links:
        return []

    zip_editions = []
    prova_candidates = []
    gabarito_candidates = []
    for href, text in links:
        # Classifica só pelo texto do link + nome do arquivo (não o caminho
        # inteiro) — pastas como "Provas e Gabaritos/" fariam qualquer prova
        # dentro delas ser descartada por conter "gabarito" no meio do caminho.
        basename = href.rsplit("/", 1)[-1]
        combined = f"{text} {basename}".lower()
        if href.lower().split("?")[0].endswith(".zip") and "prova" in combined and "gabarito" in combined:
            if "outros" in combined:
                continue
            label_m = re.search(r"\(([^)]+)\)", text) or re.search(r"\(([^)]+)\)", href)
            label = label_m.group(1).strip() if label_m else None
            zip_editions.append({"url": urljoin(resp.url, href), "label": label})
            continue
        if _is_prova_candidate(combined):
            prova_candidates.append((_prova_score(combined), href))
        else:
            score = _gabarito_score(combined)
            if score is not None:
                gabarito_candidates.append((score, href))

    if zip_editions:
        return [
            {"is_zip": True, "label": z["label"], "prova_url": z["url"], "gabarito_url": None}
            for z in zip_editions
        ]

    if not prova_candidates:
        return []

    prova_candidates.sort(key=lambda t: t[0])
    prova_url = urljoin(resp.url, prova_candidates[0][1])

    gabarito_url = None
    if gabarito_candidates:
        gabarito_candidates.sort(key=lambda t: t[0])
        gabarito_url = urljoin(resp.url, gabarito_candidates[0][1])

    return [{"is_zip": False, "label": None, "prova_url": prova_url, "gabarito_url": gabarito_url}]


def _extract_zip_pair(zip_path: Path, extract_dir: Path) -> tuple[Path, Optional[Path]]:
    """Extrai um .zip de edição (ex.: 2020, prova+gabarito por curso) e
    identifica dentro dele o PDF da prova e, se houver, do gabarito."""
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)

    members = list(extract_dir.rglob("*.pdf"))
    if not members:
        raise RuntimeError("Nenhum PDF encontrado dentro do .zip")

    gabarito_members = [m for m in members if _gabarito_score(m.name.lower()) is not None]
    prova_members = [m for m in members if m not in gabarito_members] or members

    prova_path = min(prova_members, key=lambda p: _prova_score(p.name.lower()))
    gabarito_path = (
        min(gabarito_members, key=lambda p: _gabarito_score(p.name.lower())) if gabarito_members else None
    )
    return prova_path, gabarito_path


def _parse_gabarito_oficial(pdf_path: Path) -> dict[tuple[int, Optional[str]], str]:
    """Lê o PDF do Gabarito Oficial — uma tabela simples "número → letra"
    organizada em colunas por matéria (mesma ordem de `_AREA_HEADERS`) — e
    retorna {(número, idioma): letra} ("X" para questão anulada).

    Espanhol e Inglês compartilham a mesma faixa de numeração (o candidato
    escolhe um idioma), aparecendo como duas colunas lado a lado com os
    MESMOS números. Como o texto extraído preserva a ordem de leitura da
    tabela (Espanhol sempre antes de Inglês, na mesma linha), a heurística é:
    a 1ª ocorrência de um número duplicado é Espanhol, a 2ª é Inglês; números
    que aparecem uma única vez não têm idioma (None).
    """
    doc = fitz.open(str(pdf_path))
    full_text = "\n".join(page.get_text() for page in doc)
    doc.close()

    pairs = re.findall(r"(\d{1,2})\s+([A-DX])\b", full_text)

    counts: dict[int, int] = {}
    for num_s, _letter in pairs:
        n = int(num_s)
        counts[n] = counts.get(n, 0) + 1

    seen: dict[int, int] = {}
    result: dict[tuple[int, Optional[str]], str] = {}
    for num_s, letter in pairs:
        num = int(num_s)
        if counts[num] == 2:
            seen[num] = seen.get(num, 0) + 1
            language = "Espanhol" if seen[num] == 1 else "Inglês"
        else:
            language = None
        result[(num, language)] = letter
    return result


def _apply_gabarito_override(parsed: list[dict], gabarito_map: dict[tuple[int, Optional[str]], str]) -> None:
    """Sobrescreve `q["correct"]` com o valor do Gabarito Oficial (fonte mais
    confiável que a detecção por destaque/texto na prova comentada), quando
    disponível para aquela (número, idioma). "X" (questão anulada) vira
    correct=None — nenhuma alternativa marcada."""
    if not gabarito_map:
        return
    for q in parsed:
        override = gabarito_map.get((q["number"], q["language"]))
        if override is None:
            continue
        q["correct"] = override if override in "ABCD" else None


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    dest.write_bytes(resp.content)

# Áreas de conhecimento esperadas (cabeçalhos centralizados, caixa alta, size ~11).
# Espanhol/Inglês compartilham numeração (o candidato escolhe uma língua, como
# no ENEM); são mapeadas para área "Língua Estrangeira" + campo language.
_AREA_HEADERS = {
    "LÍNGUA PORTUGUESA E LITERATURA BRASILEIRA": ("Língua Portuguesa", None),
    "ESPANHOL": ("Língua Estrangeira", "Espanhol"),
    "INGLÊS": ("Língua Estrangeira", "Inglês"),
    "MATEMÁTICA": ("Matemática", None),
    "FÍSICA": ("Física", None),
    "QUÍMICA": ("Química", None),
    "BIOLOGIA": ("Biologia", None),
    "HISTÓRIA": ("História", None),
    "GEOGRAFIA": ("Geografia", None),
}

# Subcabeçalhos que NÃO são áreas (aparecem dentro de Física, etc.)
_NOT_AREAS = {"QUESTÕES OBJETIVAS", "FORMULÁRIO DE FÍSICA", "CONSTANTES FÍSICAS", "TEMAS PARA REDAÇÃO"}


def _is_red(color: int) -> bool:
    r = (color >> 16) & 0xFF
    g = (color >> 8) & 0xFF
    b = color & 0xFF
    return r > 120 and g < 90 and b < 90


def _parse_period_year(stem: str) -> tuple[int, str | None]:
    """Extrai ano e período (Verão/Inverno) do nome do arquivo, ex: 'ACAFE Inverno 2025'."""
    year_m = re.search(r"(19|20)\d{2}", stem)
    year = int(year_m.group(0)) if year_m else 0
    low = stem.lower()
    period = None
    if "inverno" in low:
        period = "Inverno"
    elif "verão" in low or "verao" in low:
        period = "Verão"
    return year, period


def run_migrations_acafe(conn):
    """Cria as tabelas ACAFE caso não existam (com uma conexão ativa)."""
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS acafe_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            period VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            justification TEXT,
            reference_matrix TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS acafe_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES acafe_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS acafe_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES acafe_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )
    """))


# ── Parsing de página ────────────────────────────────────────────────────────

def _page_lines(page) -> list[dict]:
    """Retorna linhas da página como dicts {text, x0, x1, y0, size, bold, red, center}.

    Linhas são reconstruídas a partir das spans, preservando metadados que
    distinguem cabeçalhos de área, marcadores de questão e a alternativa correta.
    """
    pw = page.rect.width
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            text = "".join(s["text"] for s in spans)
            if not text.strip():
                continue
            sp = spans[0]
            x0, y0, x1, _ = line["bbox"]
            lines.append({
                "text": text,
                "x0": x0,
                "x1": x1,
                "y0": y0,
                "size": sp["size"],
                "bold": bool(sp["flags"] & 16),
                "red": any(_is_red(s["color"]) for s in spans if s["text"].strip()),
                "center": abs(((x0 + x1) / 2) - pw / 2) < 40,
            })
    return lines


def _detect_area(line: dict) -> tuple[str, str | None] | None:
    t = line["text"].strip()
    # O tamanho da fonte dos cabeçalhos varia entre edições (ex.: ~11pt nas
    # provas mais recentes, ~9.96pt em edições anteriores raspadas do site
    # oficial) — a faixa larga é só uma guarda contra texto de corpo bold
    # centralizado; quem realmente decide é o match exato contra o texto do
    # cabeçalho logo abaixo.
    if not (line["bold"] and line["center"] and 8.5 <= line["size"] <= 13.0):
        return None
    if t in _NOT_AREAS:
        return None
    return _AREA_HEADERS.get(t)


def _xref_to_dataurl(doc, xref: int) -> str | None:
    """Converte uma imagem embutida (por xref) em data-URL base64 PNG."""
    try:
        pix = fitz.Pixmap(doc, xref)
        if pix.n - pix.alpha >= 4:  # CMYK → RGB
            pix = fitz.Pixmap(fitz.csRGB, pix)
        data = pix.tobytes("png")
        return "data:image/png;base64," + base64.b64encode(data).decode()
    except Exception:
        return None


def _page_image_positions(page) -> list[tuple[float, int]]:
    """Retorna [(y_topo, xref)] das imagens "reais" da página, em ordem de leitura.

    Filtra imagens decorativas/artefatos (área desprezível), que poluiriam a
    associação por proximidade.
    """
    out = []
    for im in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = im["bbox"]
        if (y1 - y0) <= 5 or (x1 - x0) <= 5:
            continue
        xref = im.get("xref", 0)
        if not xref:
            continue
        out.append((y0, xref))
    out.sort(key=lambda t: t[0])
    return out


# Marcadores de delimitação dentro do texto de uma questão
_RE_QNUM = re.compile(r"^\s*(\d{1,2})\)\s")
_RE_ALT = re.compile(r"^\s*([A-D])\.\s")
_RE_CORRECT = re.compile(r"Alternativa correta letra:\s*([A-D])")


def _strip_page_number(text: str) -> str:
    """Remove número de página solto que sobra no fim de um bloco (ex.: '...texto. \\n \\n7')."""
    # Remove linhas finais que contenham apenas um número (número de página do PDF).
    return re.sub(r"\s*\n\s*\d{1,3}\s*$", "", text)


def _clean(text: str) -> str:
    """Normaliza espaços e remove números de página soltos / quebras de página."""
    text = _strip_page_number(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _clean_option(text: str) -> str:
    """Limpeza de alternativa: junta quebras de linha (wrap) num parágrafo só."""
    text = _strip_page_number(text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


# Âncora do gabarito de cada questão: "Dados da questão" ou "Informações da
# questão" (o cabeçalho mudou de nome entre edições, por isso as duas
# variantes) seguido de "Alternativa correta letra: X" (esse último sempre
# presente nos cadernos com gabarito comentado embutido, ~2022 em diante).
# Provas mais antigas não têm cabeçalho algum antes de "Alternativa correta
# letra: X", então essa frase isolada não serve como âncora universal — mas
# com o prefixo opcional, a âncora recua até o cabeçalho quando ele existe
# (preservando o comportamento já validado nas provas mais recentes) e cai
# direto em "Alternativa correta" quando não existe.
#
# Limitação conhecida: provas de ~2021 e anteriores usam um formato ainda
# mais antigo ("Alternativa correta." sem letra explícita, marcador de
# alternativa não-padrão) que este parser não reconhece — ficam de fora,
# reportadas como "Nenhuma questão reconhecida" em vez de importadas.
_GABARITO_ANCHOR = re.compile(r"(?:(?:Dados|Informações) da questão\s*\n?\s*)?Alternativa correta letra:\s*[A-D]")


def _parse_question_text(region: str) -> dict | None:
    """Do trecho que antecede 'Dados da questão', extrai número, enunciado e alternativas."""
    # Encontra o ÚLTIMO marcador de questão "NN)" no início de linha
    matches = list(re.finditer(r"(?m)^\s*(\d{1,2})\)\s", region))
    if not matches:
        return None
    m = matches[-1]
    number = int(m.group(1))
    body = region[m.end():]

    # Separa enunciado das alternativas. As alternativas começam no primeiro
    # "A." de início de linha que seja seguido (em algum ponto) por B./C./D.
    alt_iter = list(re.finditer(r"(?m)^\s*([A-D])\.\s", body))
    if len(alt_iter) < 4:
        return None
    # Pega o índice da primeira alternativa "A."
    first_a = next((am for am in alt_iter if am.group(1) == "A"), None)
    if not first_a:
        return None
    statement = _clean(body[:first_a.start()])

    # Coleta as 4 alternativas A–D na ordem
    options = {}
    # Reconstrói posições de A,B,C,D (a primeira ocorrência de cada, após first_a)
    letters_seen = []
    seq = [am for am in alt_iter if am.start() >= first_a.start()]
    for idx, am in enumerate(seq):
        letter = am.group(1)
        if letter in options:
            continue
        if letter not in "ABCD":
            continue
        text_start = am.end()
        text_end = seq[idx + 1].start() if idx + 1 < len(seq) else len(body)
        options[letter] = _clean_option(body[text_start:text_end])
        letters_seen.append(letter)
        if len(options) == 4:
            break

    if set(options.keys()) != set("ABCD"):
        return None
    return {"number": number, "statement": statement, "options": options}


def _parse_gabarito(gabarito: str) -> dict:
    """Do bloco de gabarito extrai letra correta, justificativa e matriz."""
    correct_m = _RE_CORRECT.search(gabarito)
    correct = correct_m.group(1) if correct_m else None

    justification = None
    reference_matrix = None
    just_m = re.search(r"Justificativa", gabarito)
    matrix_m = re.search(r"Matriz de Referência[^\n]*", gabarito)
    if just_m:
        just_end = matrix_m.start() if matrix_m else len(gabarito)
        justification = _clean(gabarito[just_m.end():just_end])
    if matrix_m:
        reference_matrix = _clean(gabarito[matrix_m.start():])
    return {"correct": correct, "justification": justification, "reference_matrix": reference_matrix}


def _assign_images_by_reading_order(doc, started_page: int) -> dict[tuple[int, str | None], list[str]]:
    """Associa cada imagem à questão em cujo trecho (ordem de leitura) ela aparece.

    Constrói um fluxo global de eventos — marcadores de questão "NN)" e imagens —
    ordenado por (página, y). Cada imagem é atribuída à questão mais recente que a
    antecede no fluxo, o que trata corretamente imagens no topo de páginas de
    continuação (que pertencem à questão iniciada na página anterior).

    Retorna {(numero, language): [data_url, ...]}. A chave usa o language vigente
    (Espanhol/Inglês) porque Espanhol e Inglês reutilizam a mesma numeração.
    """
    # Eventos: (page, y, tipo, valor)  — tipo ∈ {"Q", "IMG"}
    events: list[tuple[int, float, str, object]] = []
    page_lang: list[str | None] = []
    started = False
    cur_lang: str | None = None

    for pno in range(doc.page_count):
        page = doc[pno]
        for ln in _page_lines(page):
            if "QUESTÕES OBJETIVAS" in ln["text"]:
                started = True
            area = _detect_area(ln)
            if area is not None and started:
                cur_lang = area[1]
            m = _RE_QNUM.match(ln["text"])
            if m and started:
                events.append((pno, ln["y0"], "Q", (int(m.group(1)), cur_lang)))
        page_lang.append(cur_lang)
        if pno >= started_page:
            for y, xref in _page_image_positions(page):
                events.append((pno, y, "IMG", xref))

    events.sort(key=lambda e: (e[0], e[1]))

    images: dict[tuple[int, str | None], list[str]] = {}
    seen_xref: set[int] = set()
    cur_key: tuple[int, str | None] | None = None
    for _pno, _y, kind, val in events:
        if kind == "Q":
            cur_key = val  # (number, language)
        elif kind == "IMG" and cur_key is not None:
            xref = val
            if xref in seen_xref:
                continue
            seen_xref.add(xref)
            data_url = _xref_to_dataurl(doc, xref)
            if data_url:
                images.setdefault(cur_key, []).append(data_url)
    return images


def parse_pdf(pdf_path: Path) -> list[dict]:
    """Faz o parsing completo de um PDF de prova ACAFE e retorna a lista de questões."""
    doc = fitz.open(pdf_path)

    # 1) Mapeia, por página, a área vigente e as spans vermelhas (gabarito por cor).
    page_area: list[tuple[str, str | None]] = []
    current_area: tuple[str, str | None] = ("Geral", None)
    started_objetivas = False
    started_page = doc.page_count  # primeira página de "QUESTÕES OBJETIVAS"
    page_red_texts: list[list[str]] = []

    for pno in range(doc.page_count):
        page = doc[pno]
        lines = _page_lines(page)
        reds = []
        for ln in lines:
            if "QUESTÕES OBJETIVAS" in ln["text"]:
                started_objetivas = True
                started_page = min(started_page, pno)
            area = _detect_area(ln)
            if area is not None and started_objetivas:
                current_area = area
            if ln["red"]:
                reds.append(ln["text"].strip())
        page_area.append(current_area)
        page_red_texts.append(reds)

    # 1b) Associa imagens às questões por ordem de leitura (trata continuações).
    images_by_key = _assign_images_by_reading_order(doc, started_page)

    # 2) Texto completo + offsets de início de cada página (para saber a área/imagem).
    page_texts = [doc[p].get_text() for p in range(doc.page_count)]
    offsets = []
    acc = 0
    for t in page_texts:
        offsets.append(acc)
        acc += len(t) + 1  # +1 pelo \n usado no join
    full_text = "\n".join(page_texts)

    def page_of(char_idx: int) -> int:
        # offset → página
        pno = 0
        for i, off in enumerate(offsets):
            if char_idx >= off:
                pno = i
            else:
                break
        return pno

    # 3) Quebra em blocos e parseia cada questão.
    questions = []
    anchors = [m.start() for m in _GABARITO_ANCHOR.finditer(full_text)]
    for i, gab_start in enumerate(anchors):
        region_start = anchors[i - 1] if i > 0 else 0
        region = full_text[region_start:gab_start]
        gab_end = anchors[i + 1] if i + 1 < len(anchors) else len(full_text)
        gabarito = full_text[gab_start:gab_end]

        parsed = _parse_question_text(region)
        if not parsed:
            continue
        gab = _parse_gabarito(gabarito)

        # Página onde a questão começa (último "NN)" antes do gabarito) → área/imagem
        q_marker = list(re.finditer(r"(?m)^\s*\d{1,2}\)\s", region))[-1]
        q_char = region_start + q_marker.start()
        pno = page_of(q_char)
        area, language = page_area[pno] if pno < len(page_area) else ("Geral", None)

        # Resposta correta: prioriza o quadro "letra: X"; confere com a cor vermelha.
        correct = gab["correct"]
        if not correct:
            # Fallback: casa o texto da alternativa com alguma span vermelha da página.
            reds = page_red_texts[pno] if pno < len(page_red_texts) else []
            for letter, otext in parsed["options"].items():
                snippet = otext[:25].strip()
                if snippet and any(snippet in r or r in otext for r in reds):
                    correct = letter
                    break

        # Imagens: todas as figuras associadas à questão por ordem de leitura.
        imgs = images_by_key.get((parsed["number"], language), [])

        questions.append({
            "number": parsed["number"],
            "area": area,
            "language": language,
            "statement": parsed["statement"],
            "options": parsed["options"],
            "correct": correct,
            "justification": gab["justification"],
            "reference_matrix": gab["reference_matrix"],
            "images": imgs,
            "image_base64": imgs[0] if imgs else None,  # 1ª imagem (compat. campo único)
        })

    doc.close()
    return questions


def _persist_parsed_acafe_questions(
    db: Session, exam_name: str, year: int, period: Optional[str], parsed: list[dict]
) -> dict:
    """Grava questões ACAFE já parseadas (e, opcionalmente, com o gabarito
    sobrescrito por `_apply_gabarito_override`). Compartilhado pelo seed
    local, pelo importador por URL e pelo importador em lote (site oficial)."""
    added = 0
    skipped_existing = 0
    seen: set[tuple[int, str | None]] = set()
    for q in parsed:
        if not q["statement"]:
            continue
        key = (q["number"], q["language"])
        if key in seen:
            continue
        seen.add(key)

        options = []
        for order, letter in enumerate("ABCD"):
            options.append({
                "letter": letter,
                "text": q["options"][letter],
                "is_correct": (letter == q["correct"]),
                "order": order,
            })

        images = None
        if q.get("images"):
            images = [
                {"image_base64": data_url, "order": order}
                for order, data_url in enumerate(q["images"])
            ]

        metadata = {
            "area": q["area"],
            "language": q["language"],
            "period": period,
            "justification": q.get("justification"),
            "reference_matrix": q.get("reference_matrix"),
        }

        vq, created = save_vestibular_question(
            db,
            exam_type="acafe",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            images=images,
            image_base64=q.get("image_base64"),
            correct_option=q.get("correct"),
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

    db.commit()
    return {"exam_name": exam_name, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}


def _import_pdf_file(db: Session, pdf_path: Path, year: int, period: Optional[str]) -> dict:
    """Importa um único PDF de prova ACAFE já parseável. Compartilhado pelo
    seed local (arquivos em provas/acafe/) e pelo importador por URL."""
    exam_name = f"ACAFE {period or ''} {year}".replace("  ", " ").strip()
    parsed = parse_pdf(pdf_path)
    return _persist_parsed_acafe_questions(db, exam_name, year, period, parsed)


def seed_acafe(db: Session | None = None, **kwargs) -> dict:
    """Importa as questões dos PDFs ACAFE locais. Retorna um resumo."""
    if not ACAFE_DIR.exists():
        return {"skipped": True, "reason": "Pasta acafe/ não encontrada"}

    pdf_files = sorted(ACAFE_DIR.glob("*.pdf"))
    if not pdf_files:
        return {"skipped": True, "reason": "Nenhum arquivo PDF encontrado"}

    try:
        with engine.begin() as conn:
            run_migrations_acafe(conn)
    except Exception as e:
        return {"error": f"Falha ao criar tabelas: {e}"}

    close_after = db is None
    if db is None:
        db = SessionLocal()

    total_added = 0
    results = []
    try:
        for pdf_path in pdf_files:
            year, period = _parse_period_year(pdf_path.stem)
            r = _import_pdf_file(db, pdf_path, year, period)
            if r["skipped_existing"]:
                results.append({"exam": r["exam_name"], "added": 0, "existing": r["skipped_existing"]})
            else:
                total_added += r["total_added"]
                results.append({"exam": r["exam_name"], "added": r["total_added"]})

        return {"total_added": total_added, "files": results}
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_acafe_from_url(url: str, year: int, period: str | None = None, db: Session | None = None) -> dict:
    """Baixa o PDF oficial de uma prova ACAFE a partir de uma URL pública
    (ex.: storage.acafe.org.br/.../Prova objetiva oficial - comentada.pdf) e
    importa as questões, sem exigir que o arquivo esteja commitado no repo.

    Diferente da UFRGS, o gabarito não precisa ser colado à parte: o PDF
    oficial "comentada" já traz a resposta correta destacada em vermelho e
    explicitada em "Alternativa correta letra: X", extraída por parse_pdf().
    """
    try:
        with engine.begin() as conn:
            run_migrations_acafe(conn)
    except Exception as e:
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "prova.pdf"
            download_pdf(url, pdf_path)
            return _import_pdf_file(db, pdf_path, year, period)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_acafe_edition(db: Session, year: int, period: str, edition: dict) -> dict:
    """Baixa e importa uma edição encontrada por `fetch_acafe_editions`
    (prova avulsa ou par prova+gabarito dentro de um .zip). Quando há um
    gabarito oficial separado, ele sobrescreve a resposta que `parse_pdf` já
    detecta na prova comentada (mais confiável para questões anuladas)."""
    label = edition.get("label")
    exam_name = f"ACAFE {period} {year}".replace("  ", " ").strip()
    if label:
        exam_name += f" ({label})"

    from app.models import VestibularQuestion
    already = db.query(VestibularQuestion).filter(
        VestibularQuestion.exam_type == "acafe",
        VestibularQuestion.exam_name == exam_name,
    ).count()
    if already > 0:
        return {"exam_name": exam_name, "total_parsed": 0, "total_added": 0, "skipped_existing": already}

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        if edition.get("is_zip"):
            zip_path = tmp_path / "edicao.zip"
            download_pdf(edition["prova_url"], zip_path)
            extract_dir = tmp_path / "extraido"
            extract_dir.mkdir()
            prova_path, gabarito_path = _extract_zip_pair(zip_path, extract_dir)
        else:
            prova_path = tmp_path / "prova.pdf"
            download_pdf(edition["prova_url"], prova_path)
            gabarito_path = None
            if edition.get("gabarito_url"):
                gabarito_path = tmp_path / "gabarito.pdf"
                download_pdf(edition["gabarito_url"], gabarito_path)

        parsed = parse_pdf(prova_path)
        if gabarito_path is not None:
            try:
                gabarito_map = _parse_gabarito_oficial(gabarito_path)
                _apply_gabarito_override(parsed, gabarito_map)
            except Exception:
                pass  # best-effort: mantém as respostas já embutidas na prova comentada

    if not parsed:
        return {
            "exam_name": exam_name,
            "total_parsed": 0,
            "total_added": 0,
            "skipped": True,
            "reason": "Nenhuma questão reconhecida (PDF em formato inesperado, sem os marcadores 'Dados da questão').",
        }

    return _persist_parsed_acafe_questions(db, exam_name, year, period, parsed)


def import_all_acafe_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db: Session | None = None, task_id: Optional[str] = None, **kwargs) -> dict:
    """Importa TODAS as provas ACAFE (vestibular de Medicina) publicadas em
    storage.acafe.org.br, varrendo cada combinação ano+semestre em regressão
    de `until_year` (padrão 2026) até `since_year` (padrão 2014). s=1 é
    Verão, s=2 é Inverno.

    Cada edição é tentada de forma independente — ano/semestre sem
    vestibular naquele período (ex.: Inverno de anos sem 2ª chamada), falha
    de rede, ou PDF num formato não reconhecido não interrompem o lote; são
    só reportados como pulados. Use `since_year`/`until_year` para dividir o
    lote em partes menores."""
    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        with engine.begin() as conn:
            run_migrations_acafe(conn)
    except Exception as e:
        if close_after:
            db.close()
        raise RuntimeError(f"Falha ao criar tabelas: {e}")

    year_from = since_year or 2014
    year_to = until_year or 2026
    total_periods = (year_to - year_from + 1) * 2

    results = []
    total_added = 0
    try:
        period_index = 0
        for year in range(year_to, year_from - 1, -1):
            for semester in (1, 2):
                period = "Verão" if semester == 1 else "Inverno"
                if task_id:
                    update_task_progress(task_id, current=period_index, total=total_periods, log=f"Verificando {period} {year}...")
                period_index += 1
                try:
                    editions = fetch_acafe_editions(year, semester)
                except Exception as e:
                    results.append({"year": year, "period": period, "skipped": True, "reason": f"Falha ao acessar listagem: {e}"})
                    continue

                if not editions:
                    results.append({"year": year, "period": period, "skipped": True, "reason": "Edição não encontrada/não disponível"})
                    continue

                for edition in editions:
                    try:
                        r = import_acafe_edition(db, year, period, edition)
                        results.append({"year": year, "period": period, **r})
                        total_added += r.get("total_added", 0)
                        if task_id:
                            update_task_progress(task_id, current=period_index, total=total_periods, log=f"✅ {period} {year}: {r.get('total_added', 0)} adicionadas.")
                    except Exception as e:
                        db.rollback()
                        results.append({
                            "year": year,
                            "period": period,
                            "label": edition.get("label"),
                            "skipped": True,
                            "reason": str(e),
                        })
                        if task_id:
                            update_task_progress(task_id, current=period_index, total=total_periods, log=f"❌ Erro em {period} {year}: {e}")

        res = {"total_added": total_added, "exams": results}
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
