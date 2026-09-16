from __future__ import annotations

"""Importa questões do vestibular da UNAERP (Universidade de Ribeirão Preto)
direto da página oficial de provas anteriores
(conteudo.unaerp.br/provas-anteriores) — página estática, sem JavaScript,
com um link por PDF (mesmo padrão fácil de raspar já usado em UFSC/ACAFE/UFPR
neste repo).

Cada edição (ano/semestre) publica DOIS cadernos de prova (PDFs de texto
puro, sem OCR necessário):
  - "Prova Tipo 5" — demais cursos (exceto Medicina), 40 questões objetivas.
  - "Prova Tipo 1" — Medicina, 60 questões objetivas.
e UM único PDF de gabarito, contendo uma tabela número→letra para cada uma
das sete versões embaralhadas da prova impressa ("Tipo 01" a "Tipo 07").
Só as versões "01" (Medicina) e "05" (demais cursos) têm caderno de prova
publicado — as outras (02, 03, 04, 06, 07) são aplicações da mesma prova em
ordem diferente, dadas a outros candidatos, sem PDF de prova correspondente
disponível publicamente. `_detect_tipo` lê, na própria prova, o rodapé
"Processo Seletivo N" para saber com qual coluna do gabarito casar (em vez
de assumir "5"/"1" fixos pelo nome do arquivo, que já mudou de convenção
entre edições).

Cada questão tem exatamente 4 alternativas (A-D), sem qualquer marcação de
"correta" no texto da prova em si — a resposta certa só existe no PDF de
gabarito separado. O gabarito é uma tabela de 7 colunas (uma por Tipo) que o
PyMuPDF expõe como blocos de texto: um bloco de 2 palavras ("Tipo", "NN")
sempre imediatamente acima (menor y0) do bloco da tabela correspondente —
usamos isso para associar cada tabela ao seu Tipo, em vez de tentar
reconstruir colunas por posição x (mais frágil). Ocasionalmente uma questão
aparece marcada "anulada" em vez de uma letra (questão anulada pela banca);
nesse caso ela fica de fora do dicionário de respostas e é simplesmente
pulada na importação — sem gabarito não há como saber a resposta certa.

Uma seção de redação de 3 páginas fixas (sempre encaixada entre duas
questões objetivas consecutivas do bloco de Português/Literatura, não no
fim do caderno) interrompe o meio do PDF; o parser localiza e descarta esse
trecho pelo cabeçalho "Instrução geral" antes de fatiar as alternativas de
cada questão.

Limitação conhecida: algumas alternativas de Física/Química/Matemática são
imagens (fórmulas, gráficos) sem texto extraível — ficam com texto vazio.
O modelo `UnaerpQuestion` não tem campo de imagem, então essas alternativas
não podem ser reconstruídas sem OCR/renderização de página; states destas
questões continuam corretos e o gabarito ainda é aplicado corretamente às
alternativas restantes.
"""

import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task
from app.models import UnaerpQuestion, UnaerpQuestionOption

_PROVAS_ANTERIORES_URL = "https://conteudo.unaerp.br/provas-anteriores"
_HEADERS = {"User-Agent": "Mozilla/5.0"}

_HEADING_RE = re.compile(r"Processo Seletivo (\d{4})/(\d)")
_LINK_RE = re.compile(r'<a\b[\s\S]*?href="([^"]+\.pdf)"[\s\S]*?>([\s\S]*?)</a>')

_QSTART_RE = re.compile(r"(?m)^(\d{2})\.(?!º)\s*")
_OPT_RE = re.compile(r"(?m)^\(([A-E])\)\s*")
_REDACAO_RE = re.compile(r"instru[cç][aã]o geral", re.IGNORECASE)
_TIPO_FOOTER_RE = re.compile(r"Processo Seletivo (\d)\D")


def fetch_exam_links(html: Optional[str] = None, url: str = _PROVAS_ANTERIORES_URL) -> list[dict]:
    """Varre a página de provas anteriores da UNAERP e retorna uma lista de
    edições: [{year, semester, geral_url, medicina_url, gabarito_url}].

    A página organiza os links em seções por edição (cabeçalhos "Processo
    Seletivo AAAA/S"), cada uma com 3 botões: "Prova Tipo 5" (demais
    cursos), "Prova Tipo 1" (Medicina) e "Gabarito AAAA/S"."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    markers = [(m.start(), int(m.group(1)), int(m.group(2))) for m in _HEADING_RE.finditer(html)]
    editions: list[dict] = []
    for i, (pos, year, semester) in enumerate(markers):
        end = markers[i + 1][0] if i + 1 < len(markers) else len(html)
        section = html[pos:end]

        geral_url = medicina_url = gabarito_url = None
        for link_url, label in _LINK_RE.findall(section):
            label_clean = re.sub(r"<[^>]+>", " ", label)
            label_clean = re.sub(r"\s+", " ", label_clean).strip().lower()
            if "tipo 5" in label_clean:
                geral_url = link_url
            elif "tipo 1" in label_clean:
                medicina_url = link_url
            elif "gabarito" in label_clean:
                gabarito_url = link_url

        if gabarito_url and (geral_url or medicina_url):
            editions.append({
                "year": year,
                "semester": semester,
                "geral_url": geral_url,
                "medicina_url": medicina_url,
                "gabarito_url": gabarito_url,
            })

    return editions


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público. O host que hospeda os PDFs (unaerp.br,
    wp-content/uploads) manda só o certificado-folha na handshake TLS, sem a
    intermediária (RapidSSL TLS RSA CA G1) — confirmado com `openssl
    s_client -showcerts`, que mostra 1 único certificado na cadeia. Isso é
    aceito por navegadores/curl (que completam a cadeia via AIA ou trust
    store do SO), mas faz `requests`/`certifi` recusar por "unable to get
    local issuer certificate". Mesmo fallback documentado em
    app/services/ufsc/pdf_import.py: tenta verificado, e só sem verificação
    se a falha for especificamente de SSL."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def _detect_tipo(prova_pdf: Path) -> Optional[str]:
    """Lê o rodapé "Processo Seletivo N" (N = 1 dígito) na primeira página
    do caderno de prova para saber qual coluna do gabarito ("Tipo 0N") usar.
    Evita assumir "5"/"1" fixos, já que a numeração de tipos pode variar
    entre edições."""
    doc = fitz.open(str(prova_pdf))
    text = doc[0].get_text()
    if doc.page_count > 1:
        text += doc[1].get_text()
    doc.close()
    m = _TIPO_FOOTER_RE.search(text)
    return m.group(1).zfill(2) if m else None


def parse_gabarito(gabarito_pdf: Path) -> dict[str, dict[int, str]]:
    """Parseia o PDF único de gabarito, que traz uma tabela número→letra
    para cada uma das sete versões embaralhadas da prova ("Tipo 01".."Tipo
    07"). Retorna {"01": {1: "D", 2: "D", ...}, "05": {...}, ...}.

    Usa os blocos de texto do PyMuPDF (não a ordem linear de `get_text()`,
    que intercala colunas de forma inconsistente): cada bloco de 2 palavras
    terminando em ("Tipo", "NN") rotula o próximo bloco-tabela abaixo dele
    na página (por posição vertical). Alguns rótulos vêm colados ao fim do
    bloco anterior (ex.: [..., "BIOLOGIA", "Tipo", "01"]), por isso o teste
    olha as duas últimas palavras do bloco, não o bloco inteiro."""
    doc = fitz.open(str(gabarito_pdf))
    result: dict[str, dict[int, str]] = {}

    for page in doc:
        words = page.get_text("words")  # (x0, y0, x1, y1, text, block_no, line_no, word_no)
        blocks: dict[int, list] = {}
        for w in words:
            blocks.setdefault(w[5], []).append(w)
        for ws in blocks.values():
            ws.sort(key=lambda w: (w[6], w[7]))

        ordered = sorted(blocks.items(), key=lambda kv: min(w[1] for w in kv[1]))

        pending_tipo: Optional[str] = None
        for _, ws in ordered:
            texts = [w[4] for w in ws]

            if len(texts) >= 2 and texts[-2] == "Tipo" and texts[-1].isdigit():
                pending_tipo = texts[-1]
                continue

            if texts and texts[0].isdigit():
                if pending_tipo is None:
                    continue
                answers = result.setdefault(pending_tipo, {})
                i = 0
                while i < len(texts) - 1:
                    tok, nxt = texts[i], texts[i + 1]
                    if tok.isdigit() and re.fullmatch(r"[A-E]", nxt):
                        answers[int(tok)] = nxt
                        i += 2
                    else:
                        # token isolado (ex.: "anulada" sozinho após um
                        # número — questão anulada pela banca, sem letra) ou
                        # ruído; avança 1 e tenta de novo a partir daqui.
                        i += 1
                pending_tipo = None

    doc.close()
    return result


def parse_prova(prova_pdf: Path) -> list[dict]:
    """Parseia um caderno de prova (um Tipo específico) e retorna a lista de
    questões: [{number, statement, alternatives: [(letra, texto), ...]}].

    As questões são numeradas "01." a "NN." no início da linha — mas nem
    sempre com espaço depois do ponto (ex.: edição 2026/1 tem "01.Considerando
    ..." colado, sem espaço), por isso o regex aceita zero ou mais espaços.
    O regex também precisa excluir marcadores de parágrafo dos textos-base
    tipo "10.º§" (10º parágrafo) — só colide com 2 dígitos (parágrafos 1-9
    ficam "1.º§", de 1 dígito só), então a exclusão é um lookahead simples
    negando "º" logo após o ponto.

    Uma seção de redação de 3 páginas fixas, sempre encaixada entre duas
    questões consecutivas do bloco de Português (não no fim do caderno), é
    descartada pelo cabeçalho "Instrução geral" antes das alternativas serem
    fatiadas — sem isso, o texto da redação seria anexado à última
    alternativa da questão anterior à seção.

    As alternativas são "(A)".."(D)" sempre no início de uma linha — o
    regex exige isso (`^` em modo multiline) porque algumas questões de
    Física/Química citam a própria letra entre parênteses como notação de
    variável no meio de uma frase (ex.: "campo magnético uniforme (B) de
    intensidade..." antes das alternativas reais também "(A)".."(D)");
    sem a âncora de início de linha, esse "(B)" seria capturado como uma
    5ª alternativa espúria, com a mesma resposta batendo duas vezes no
    gabarito. Um efeito colateral aceito: quando a próxima questão troca de
    matéria, o cabeçalho da nova matéria (ex.: "MATEMÁTICA") que antecede o
    próximo número de questão acaba anexado ao final do texto da última
    alternativa da questão anterior — ruído inofensivo, não cria
    alternativas extras."""
    doc = fitz.open(str(prova_pdf))
    full = "\n".join(p.get_text() for p in doc)
    doc.close()

    matches = list(_QSTART_RE.finditer(full))
    questions: list[dict] = []
    for i, m in enumerate(matches):
        number = int(m.group(1))
        start = m.end()
        stop = matches[i + 1].start() if i + 1 < len(matches) else len(full)
        body = full[start:stop]

        rm = _REDACAO_RE.search(body)
        if rm:
            body = body[:rm.start()]

        opts = list(_OPT_RE.finditer(body))
        if len(opts) < 2:
            continue

        statement = re.sub(r"\s+", " ", body[:opts[0].start()]).strip()
        if not statement:
            continue

        alternatives: list[tuple[str, str]] = []
        for j, om in enumerate(opts):
            letter = om.group(1)
            tstart = om.end()
            tend = opts[j + 1].start() if j + 1 < len(opts) else len(body)
            text = re.sub(r"\s+", " ", body[tstart:tend]).strip()
            alternatives.append((letter, text))

        questions.append({"number": number, "statement": statement, "alternatives": alternatives})

    return questions


def _persist_exam(db, exam_name: str, year: int, questions: list[dict], gabarito: dict[int, str]) -> tuple[int, int]:
    """Grava as questões de UM caderno (já parseado) no banco, pulando
    edições já importadas (mesmo exam_name) e questões sem gabarito
    conhecido (não encontrado na tabela, ou anuladas pela banca)."""
    already = db.query(UnaerpQuestion).filter(UnaerpQuestion.exam_name == exam_name).count()
    if already > 0:
        return 0, already

    added = 0
    for q in questions:
        correct = gabarito.get(q["number"])
        if not correct:
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            continue

        question = UnaerpQuestion(
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
        )
        db.add(question)
        db.flush()

        for order, (letter, text) in enumerate(q["alternatives"]):
            db.add(UnaerpQuestionOption(
                question_id=question.id,
                text=text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return added, 0


def import_unaerp_edition(db, year: int, semester: int, edition: dict) -> dict:
    """Importa os dois cadernos ("Geral" e "Medicina") de UMA edição
    (ano/semestre), usando o único PDF de gabarito da edição para ambos."""
    import tempfile

    results = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)

        try:
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(edition["gabarito_url"], gabarito_path)
            gabarito_by_tipo = parse_gabarito(gabarito_path)
        except Exception as e:
            return {
                "year": year, "semester": semester,
                "skipped": True,
                "reason": f"Falha ao baixar/parsear gabarito: {e}",
            }

        for track_key, url_key, label in (
            ("geral", "geral_url", "Geral"),
            ("medicina", "medicina_url", "Medicina"),
        ):
            url = edition.get(url_key)
            exam_name = f"UNAERP {year}/{semester} – {label}"
            if not url:
                results.append({"exam_name": exam_name, "skipped": True, "reason": "Sem caderno publicado para esta edição"})
                continue

            try:
                prova_path = tmp / f"prova_{track_key}.pdf"
                download_pdf(url, prova_path)

                tipo = _detect_tipo(prova_path)
                questions = parse_prova(prova_path)
                gabarito = gabarito_by_tipo.get(tipo, {}) if tipo else {}

                if not questions:
                    results.append({"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida no PDF"})
                    continue
                if not gabarito:
                    results.append({"exam_name": exam_name, "skipped": True, "reason": f"Gabarito do Tipo {tipo!r} não encontrado no PDF de gabarito"})
                    continue

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

    return {"year": year, "semester": semester, "exams": results}


def import_all_unaerp_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as edições listadas em conteudo.unaerp.br/provas-anteriores.

    Cada edição (ano/semestre) é tentada de forma independente — falha ao
    baixar o gabarito, caderno num formato inesperado, ou 0 questões
    reconhecidas não interrompem as demais. `since_year`/`until_year`
    restringem o intervalo de anos, para dividir o lote em partes menores."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions = fetch_exam_links()
        if since_year:
            editions = [e for e in editions if e["year"] >= since_year]
        if until_year:
            editions = [e for e in editions if e["year"] <= until_year]

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(editions, start=1):
            label = f"UNAERP {edition['year']}/{edition['semester']}"
            try:
                r = import_unaerp_edition(db, edition["year"], edition["semester"], edition)
                results.append(r)
                total_added += sum(x.get("total_added", 0) for x in r.get("exams", []))
            except Exception as e:
                db.rollback()
                results.append({"year": edition["year"], "semester": edition["semester"], "skipped": True, "reason": str(e)})

            if task_id:
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
