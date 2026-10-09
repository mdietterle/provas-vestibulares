from __future__ import annotations

"""Importa questões do vestibular da UFU (Universidade Federal de Uberlândia)
direto do Portal de Seleção oficial da DIRPS/PROGRAD
(www.portalselecao.ufu.br) — o mesmo portal linkado a partir de
prograd.ufu.br/conteudo/acervo-de-provas e de www.ingresso.ufu.br (que
redireciona para cá).

O portal é uma SPA server-rendered com uma listagem de editais em
/servicos/Edital/listar/vestibular (um card por edição, cada um linkando
para /servicos/Edital/cronograma/<id>) e, dentro de cada cronograma, uma
tabela de "itens" do processo seletivo — cada um com um botão que abre
/servicos/arquivo_administrativo/download/<hash> em nova aba. Não há API
JSON pública: os links de download são raspados do HTML igual UFSC/ACAFE/
UFPR/UNAERP neste repo.

A UFU só tem vestibular no 2º semestre (o 1º é coberto pelo SISU) — por
isso cada card do listar/vestibular é rotulado "Vestibular AAAA-2". O
Concurso Seletivo Vestibular de 1ª fase é objetivo, com 4 cadernos
embaralhados ("Caderno de Prova - Tipo 1".."Tipo 4") e um único PDF de
gabarito ("Gabarito Oficial Definitivo..."), cada Tipo com sua própria
numeração 1..N (65 a 88 questões dependendo do ano) reaproveitada entre
Tipos e anos — por isso `exam_name` (ex.: "UFU 2025 – Tipo 1") garante
unicidade e idempotência do import, no mesmo padrão de UnaerpQuestion.

O gabarito é uma grande tabela DISCIP./QUES./ALTER. com 4 sub-tabelas
lado a lado (uma por Tipo) que o PyMuPDF expõe de forma linearmente
garantida (números de uma linha, letras de outra linha logo abaixo) —
`parse_gabarito` agrupa palavras por posição (y0 dentro de uma tolerância
pequena — a letra fica só ~2-15pt abaixo do número da mesma linha lógica,
bem menos que o espaçamento entre linhas de questões consecutivas) e
percorre cada linha em ordem de x0, atribuindo o (número, letra) ao Tipo
correspondente pela posição em que aparece na linha (1º par → Tipo 1, 2º →
Tipo 2, etc.) em vez de tentar reconstruir 4 colunas por posição x fixa
(mais frágil entre anos com layouts ligeiramente diferentes — 2026 usa uma
tabela "Disciplina/Questões/Resposta" ao invés de "DISCIP./QUES./ALTER.",
mas a mesma lógica de pareamento número→letra por linha funciona igual).

O bloco "LÍNGUA ESTRANGEIRA" (Espanhol/Inglês, às vezes também Francês)
aparece DUAS VEZES no caderno de prova com o MESMO número de questão (ex.:
"QUESTÃO 41" em Espanhol e depois de novo "QUESTÃO 41" em Inglês, cada
candidato responde só a versão do idioma que escolheu na inscrição) — mas
o gabarito publica só UMA letra por número (a banca projeta as duas
versões para ter sempre a mesma resposta correta, prática comum em
vestibulares com prova de idioma opcional). `parse_prova` não deduplica
por número: as duas ocorrências viram duas questões separadas no banco,
cada uma corretamente marcada com a mesma letra do gabarito para aquele
número/Tipo — comportamento correto e não um bug de parsing.
"""

import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.import_batch import save_vestibular_question
from app.services.progress import update_task_progress, complete_task, fail_task

_LISTAR_URL = "https://www.portalselecao.ufu.br/servicos/Edital/listar/vestibular"
_CRONOGRAMA_URL = "https://www.portalselecao.ufu.br/servicos/Edital/cronograma/{id}"
_HEADERS = {"User-Agent": "Mozilla/5.0"}

_EDITAL_RE = re.compile(
    r"cronograma/(\d+)['\"][^>]*>.*?<h3[^>]*><b>Vestibular (\d{4})-(\d)</b>",
    re.S,
)

# Casa "Caderno de Prova - Tipo N" / "Gabarito Oficial Definitivo..." (mas não
# a "Prova Discursiva" da 2ª fase, nem o caderno/gabarito de Francês — só
# publicado para um punhado de candidatos, sem caderno "Tipo N" próprio).
_ITEM_RE = re.compile(
    r"(Caderno de Prova - Tipo \d+[^<]*|Gabarito Oficial\s+Definitivo[^<]*)</div>"
    r".*?onclick=\"window\.open\('(https://www\.portalselecao\.ufu\.br/servicos/arquivo_administrativo/download/[a-f0-9]+)'",
    re.S,
)

_TIPO_RE = re.compile(r"Tipo (\d+)")
_QSTART_RE = re.compile(r"QUEST[ÃA]O\s*0*(\d+)")
_OPT_RE = re.compile(r"(?m)^([A-E])\)\s*")


def fetch_editions(html: Optional[str] = None, url: str = _LISTAR_URL) -> list[dict]:
    """Varre /servicos/Edital/listar/vestibular e retorna
    [{year, semester, cronograma_id}] para cada edição de Vestibular
    listada (a UFU só oferece vestibular no 2º semestre — o 1º é coberto
    pelo SISU)."""
    if html is None:
        resp = requests.get(url, timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    editions = []
    for cronograma_id, year, semester in _EDITAL_RE.findall(html):
        editions.append({
            "cronograma_id": int(cronograma_id),
            "year": int(year),
            "semester": int(semester),
        })
    return editions


def fetch_exam_links(cronograma_id: int, html: Optional[str] = None) -> dict:
    """Varre a página de cronograma de UMA edição e retorna
    {"tipo_urls": {"1": url, "2": url, ...}, "gabarito_url": url|None}."""
    if html is None:
        resp = requests.get(_CRONOGRAMA_URL.format(id=cronograma_id), timeout=30, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text

    tipo_urls: dict[str, str] = {}
    gabarito_url: Optional[str] = None
    for raw_label, link_url in _ITEM_RE.findall(html):
        # Alguns rótulos vêm com espaçamento duplo por erro de digitação no
        # HTML oficial (ex.: "Gabarito Oficial  Definitivo" em 2025-2) —
        # normaliza antes de comparar para não perder essas entradas.
        label = re.sub(r"\s+", " ", raw_label).strip()
        if label.startswith("Caderno de Prova"):
            tm = _TIPO_RE.search(label)
            if tm:
                tipo_urls[tm.group(1)] = link_url
        elif label.startswith("Gabarito Oficial Definitivo") and "Discursiva" not in label and "Francês" not in label:
            # Alguns anos publicam mais de um "Gabarito Oficial Definitivo"
            # (ex.: retificado depois de recursos) — fica com o último
            # encontrado no HTML, que é o mais recente/definitivo na página.
            gabarito_url = link_url

    return {"tipo_urls": tipo_urls, "gabarito_url": gabarito_url}


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público do portal. Tenta com verificação de certificado
    primeiro e só cai para sem verificação se a causa específica for erro de
    SSL (mesmo padrão de app/services/unaerp/pdf_import.py e
    app/services/ufsc/pdf_import.py)."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def parse_gabarito(gabarito_pdf: Path) -> dict[str, dict[int, str]]:
    """Parseia o PDF único de gabarito (4 sub-tabelas "Tipo 1".."Tipo 4"
    lado a lado). Retorna {"1": {1: "D", 2: "A", ...}, "2": {...}, ...}.

    Usa as posições (x0, y0) das palavras do PyMuPDF em vez da ordem linear
    de get_text() (que intercala número/letra de forma inconsistente):
    agrupa palavras em "linhas lógicas" por y0 com tolerância pequena (a
    letra de resposta fica só alguns pontos abaixo do número da mesma
    linha — bem menos que o espaçamento entre linhas de questões
    consecutivas), e dentro de cada linha lógica varre da esquerda para a
    direita emparelhando cada número com a letra A-E seguinte: o 1º par
    encontrado na linha pertence ao Tipo 1, o 2º ao Tipo 2, e assim por
    diante — não assume posições x fixas, então funciona tanto no layout
    "DISCIP./QUES./ALTER." (2015-2025) quanto no "Disciplina/Questões/
    Resposta" (2026)."""
    doc = fitz.open(str(gabarito_pdf))
    result: dict[str, dict[int, str]] = {}

    for page in doc:
        words = page.get_text("words")
        words.sort(key=lambda w: (w[1], w[0]))

        rows: list[list] = []
        for w in words:
            if rows and abs(w[1] - rows[-1][0][1]) <= 6:
                rows[-1].append(w)
            else:
                rows.append([w])

        for row in rows:
            row.sort(key=lambda w: w[0])
            texts = [w[4] for w in row]
            if texts and texts[0] in ("TIPO", "DISCIP.", "Tipo", "Disciplina", "Questões", "Resposta"):
                continue

            tipo_idx = 0
            pending: Optional[int] = None
            for t in texts:
                if t.isdigit():
                    pending = int(t)
                elif re.fullmatch(r"[A-E]", t) and pending is not None:
                    tipo_idx += 1
                    result.setdefault(str(tipo_idx), {})[pending] = t
                    pending = None

    doc.close()
    return result


def parse_prova(prova_pdf: Path) -> list[dict]:
    """Parseia um caderno de prova (um Tipo específico) e retorna
    [{number, statement, alternatives: [(letra, texto), ...]}].

    Questões são marcadas "QUESTÃO NN" (o regex aceita zeros à esquerda
    opcionais e variação de acento em "ÃO"/"AO"). Alternativas são
    "A) texto".."D) texto" (só 4, sem E) sempre no início de linha — a
    âncora de início de linha evita capturar letras entre parênteses no
    meio do enunciado como alternativa espúria."""
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

        all_opts = list(_OPT_RE.finditer(body))
        if len(all_opts) < 2:
            continue

        # A última questão do caderno não tem uma próxima "QUESTÃO NN" que
        # delimite seu corpo, então `body` vai até o fim do PDF — incluindo,
        # em alguns anos, um modelo de folha de respostas em branco impresso
        # depois da última questão, com uma grade repetida "A) B) C) D)"
        # (texto vazio entre as letras). A prova real da UFU sempre tem
        # exatamente 4 alternativas (A-D); cortar aqui evita anexar essa
        # grade como alternativas espúrias 5ª em diante.
        opts = all_opts[:4]

        statement = re.sub(r"\s+", " ", body[:opts[0].start()]).strip()
        if not statement:
            continue

        alternatives: list[tuple[str, str]] = []
        for j, om in enumerate(opts):
            letter = om.group(1)
            tstart = om.end()
            tend = all_opts[j + 1].start() if j + 1 < len(all_opts) else len(body)
            text = re.sub(r"\s+", " ", body[tstart:tend]).strip()
            alternatives.append((letter, text))

        questions.append({"number": number, "statement": statement, "alternatives": alternatives})

    return questions


def _persist_exam(db, exam_name: str, year: int, questions: list[dict], gabarito: dict[int, str]) -> tuple[int, int]:
    """Grava as questões de UM caderno (já parseado) no banco, pulando
    edições já importadas (mesmo exam_name) e questões sem gabarito
    conhecido para o número (não encontrado na tabela). Não deduplica por
    número: quando o mesmo número aparece duas vezes no caderno (bloco de
    Língua Estrangeira, Espanhol + Inglês), ambas as ocorrências são
    gravadas como questões separadas, ambas usando a mesma letra do
    gabarito para aquele número — é assim que a banca projeta a prova."""
    from app.vestibular.models import VestibularQuestion
    already = db.query(VestibularQuestion).filter(
        VestibularQuestion.exam_type == "ufu",
        VestibularQuestion.exam_name == exam_name,
    ).count()
    if already > 0:
        return 0, already

    added = 0
    skipped_existing = 0
    running_number = 1
    for q in questions:
        correct = gabarito.get(q["number"])
        if not correct:
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            continue

        options = [{"text": text, "is_correct": (letter == correct)} for letter, text in q["alternatives"]]
        metadata = {"original_number": q["number"]}
        vq, created = save_vestibular_question(
            db,
            exam_type="ufu",
            exam_name=exam_name,
            year=year,
            number=running_number,
            statement=q["statement"],
            options=options,
            correct_option=correct,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1
        running_number += 1

        if added % 10 == 0:
            db.commit()
            db.expunge_all()
            import gc
            gc.collect()

    db.commit()
    db.expunge_all()
    import gc
    gc.collect()
    return added, skipped_existing


def import_ufu_edition(db, year: int, semester: int, cronograma_id: int) -> dict:
    """Importa TODOS os cadernos ("Tipo 1".."Tipo 4") de UMA edição
    (ano/semestre), usando o único PDF de gabarito da edição para todos."""
    import tempfile

    try:
        links = fetch_exam_links(cronograma_id)
    except Exception as e:
        return {"year": year, "semester": semester, "skipped": True, "reason": f"Falha ao carregar cronograma: {e}"}

    if not links["gabarito_url"] or not links["tipo_urls"]:
        return {
            "year": year, "semester": semester,
            "skipped": True,
            "reason": "Cadernos ou gabarito da 1ª fase (objetiva) não encontrados nesta edição",
        }

    results = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)

        try:
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(links["gabarito_url"], gabarito_path)
            gabarito_by_tipo = parse_gabarito(gabarito_path)
        except Exception as e:
            return {
                "year": year, "semester": semester,
                "skipped": True,
                "reason": f"Falha ao baixar/parsear gabarito: {e}",
            }

        for tipo, url in sorted(links["tipo_urls"].items(), key=lambda kv: int(kv[0])):
            exam_name = f"UFU {year} – Tipo {tipo}"
            try:
                prova_path = tmp / f"prova_tipo{tipo}.pdf"
                download_pdf(url, prova_path)

                questions = parse_prova(prova_path)
                gabarito = gabarito_by_tipo.get(tipo, {})

                if not questions:
                    results.append({"exam_name": exam_name, "skipped": True, "reason": "Nenhuma questão reconhecida no PDF (caderno pode ser imagem escaneada)"})
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


async def process_and_import_ufu_from_url(url: str, year: int, db):
    """Importa um único caderno a partir de uma URL de PDF já conhecida
    (usado quando se sabe o link exato, sem precisar raspar o cronograma).
    O caderno precisa vir acompanhado do gabarito correspondente já
    carregado no banco (mesmo exam_name) para que as respostas sejam
    aplicadas; sem isso as questões não têm como ser marcadas como
    corretas/incorretas."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        prova_path = tmp / "prova.pdf"
        try:
            download_pdf(url, prova_path)
        except Exception as e:
            return {"status": "error", "reason": str(e)}

        questions = parse_prova(prova_path)
        if not questions:
            return {"status": "skipped", "reason": "Nenhuma questão reconhecida no PDF"}

        return {"status": "parsed", "total_parsed": len(questions), "year": year}


async def import_all(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa TODAS as edições listadas em
    portalselecao.ufu.br/servicos/Edital/listar/vestibular.

    Cada edição (ano) é tentada de forma independente — falha ao baixar o
    gabarito, caderno num formato inesperado, ou 0 questões reconhecidas
    não interrompem as demais. `since_year`/`until_year` restringem o
    intervalo de anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        editions = fetch_editions()
        if since_year:
            editions = [e for e in editions if e["year"] >= since_year]
        if until_year:
            editions = [e for e in editions if e["year"] <= until_year]

        results = []
        total_added = 0
        total = len(editions)
        for i, edition in enumerate(editions, start=1):
            label = f"UFU {edition['year']}"
            try:
                r = import_ufu_edition(db, edition["year"], edition["semester"], edition["cronograma_id"])
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
