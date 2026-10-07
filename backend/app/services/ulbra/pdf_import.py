from __future__ import annotations

"""Importa questões objetivas do vestibular da ULBRA (Universidade Luterana
do Brasil), campus Canoas/RS — que é o único campus da ULBRA cuja Comissão
do Vestibular publica provas + gabarito anteriores em PDF (os demais
campi — Gravataí, Torres, Guaíba, São Jerônimo, Santa Maria — têm páginas
próprias de "regulamentos" em ulbra.br, mas nenhuma delas tem seção de
provas anteriores com PDFs; confirmado abrindo cada uma ao vivo).

Descoberta da URL (pesquisada e confirmada manualmente, não é um chute):
  - Busca web por "vestibular ULBRA provas anteriores" apontou para
    `www.ulbra.br/vestibular/canoas/regulamentos/provas-anteriores`.
    Buscando esse mesmo domínio + "provas anteriores" via WebSearch, os
    resultados também trouxeram as páginas de regulamentos dos outros
    campi (Gravataí, Guaíba, São Jerônimo, Torres, Santa Maria) — nenhuma
    delas tem o mesmo padrão de URL "/provas-anteriores" nem lista PDFs de
    provas ao ser aberta.
  - A página de Canoas foi baixada ao vivo (`curl` bruto, é HTML estático
    sem JS) e contém uma lista `<li>` por edição, cada uma com 2 links
    `<a>`: "Vestibular de <data> - Prova completa/reduzida" e "Gabarito",
    apontando para `https://www.ulbra.br/upload/<hash-md5>.pdf`. Cada
    link foi conferido individualmente com GET real (HTTP 200 e magic
    bytes `%PDF` no início do conteúdo) antes de entrar em `_EDITIONS`.
  - A ULBRA publica DUAS provas por ano-calendário (uma no meio do ano —
    processo seletivo de inverno, ingresso no 2º semestre — e outra no
    fim do ano — ingresso no 1º semestre do ano seguinte —, por isso o
    rótulo de edição usado aqui é "<ano>-1"/"<ano>-2", não o ano sozinho.
    Cada prova tem duas versões — "completa" (todas as áreas, a que este
    importador usa) e "reduzida" (só parte das questões, dispensada para
    quem já prestou a completa em edição anterior) — a "reduzida" é
    pulada de propósito porque é um subconjunto redundante da "completa"
    do mesmo dia, geraria questões duplicadas.
  - Também há uma prova avulsa "Prova Medicina" (20/10/2019, vaga
    específica de Medicina) e uma "Redação" (sem gabarito, não é questão
    objetiva) — nenhuma das duas é um caderno "completo" do vestibular
    regular e por isso ficam fora de `_EDITIONS`.
  - A edição de 28/11/2015 aparece na página, mas seus 2 links apontam
    para o host antigo `sites.ulbra.br` (`novo-comuns/files/...`), que
    está fora do ar (conferido: a conexão trava/não responde, sem status
    HTTP algum, tanto para a prova quanto para o gabarito) — pulada
    honestamente por link morto, não por falha de parsing.
  - Anos anteriores a 2016 não aparecem na página de provas anteriores
    (ela lista só até 28/11/2015, que por sua vez está com link morto —
    ver acima), portanto não há edição mais antiga coberta por este
    importador.

Cobertura real, confirmada baixando e parseando de verdade (ver
`_EDITIONS` abaixo): 2016-1 (fim de 2016), 2016-2 (meio de 2016), 2017-1,
2017-2, 2018-1, 2018-2, 2019-2 (2/6/2019) — todas com 65 questões no
gabarito e 64-65 reconhecidas na prova (uma questão eventualmente cai por
ambiguidade de layout, ver `parse_exam`, sem travar o resto do caderno).
A edição "2019-1" (a mais recente, 20/10/2019, rótulo textual da própria
página) na verdade é a "Prova Medicina" avulsa citada acima — não é o
vestibular regular e fica fora.

Estrutura da prova (confirmada inspecionando `page.get_text(sort=True)`
de várias páginas): cada questão começa com o número sozinho no início da
linha seguido de 2+ espaços e o enunciado ("1     Assinale a única
alternativa..."), e as 5 alternativas vêm sempre entre parênteses
"(A)".."(E)" (nunca "A)" sem parênteses, diferente da maioria dos outros
importadores desta base). Como o enunciado de questões de associação de
colunas usa parênteses vazios "(    )" para marcar onde o candidato
escreveria a letra, e como o cabeçalho de número pode colidir com
enumerações do tipo "1.  Verifique..." nas instruções, a validação usada
é a mesma adotada em UFSM/UNIOESTE: só aceita uma questão cujas 5
alternativas apareçam em sequência completa A,B,C,D,E (evita "(A)" solto
de outro contexto) e só aceita o número de cabeçalho se ele também
aparecer no gabarito oficial daquele caderno. Questões que não passam
nessa validação são puladas individualmente.

Estrutura do gabarito: uma lista simples "<número> <letra ou ANULADA>"
uma por linha, agrupada visualmente por disciplina (mas o agrupamento não
importa para o parsing, só o par número/letra). Um detalhe real do
formato: as últimas 5 questões (Língua Estrangeira) aparecem DUAS vezes
no gabarito — uma vez para quem escolheu Inglês e outra para quem
escolheu Espanhol, com números de questão iguais (61-65) mas
gabaritos diferentes. Como não há como saber qual idioma o candidato
"hipotético" teria escolhido, essas questões são tratadas como
ambíguas — a resposta correta vira `None` (nenhuma alternativa marcada
como certa) só para esses números duplicados, sem descartar a questão em
si (o enunciado e as alternativas continuam válidos e são gravados).

SSL: `_get` tenta `verify=True` primeiro e cai para `verify=False` só se a
primeira tentativa falhar.
"""

import re
import tempfile
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests
from sqlalchemy.orm import Session

from app.services.import_batch import save_vestibular_question
from app.services.progress import complete_task, fail_task, update_task_progress

_HEADERS = {"User-Agent": "Mozilla/5.0"}

_BASE = "https://www.ulbra.br/upload"

# Edições confirmadas baixando e parseando de verdade (ver docstring do
# módulo). Cada entrada é (rótulo_edição, ano, url_prova_completa, url_gabarito).
_EDITIONS: list[tuple[str, int, str, str]] = [
    ("2019-2", 2019, f"{_BASE}/e66f60ceeaa3eae2769c4833538c0084.pdf", f"{_BASE}/6528711eb0fd9efb34d1ff3815294316.pdf"),
    ("2018-1", 2018, f"{_BASE}/607694ef7f3a8f0266ce7e027b81e353.pdf", f"{_BASE}/9003879accd8d0e7a93d419171a0e3c0.pdf"),
    ("2018-2", 2018, f"{_BASE}/37ad0c2a079a42a200bb07b8533b70c4.pdf", f"{_BASE}/fcecfd32897013d1062ec5f827a064ab.pdf"),
    ("2017-1", 2017, f"{_BASE}/e351fc4e04d1ff9751f6879ba1521b75.pdf", f"{_BASE}/d4b6e06661a34950a02b6e9b58bcd240.pdf"),
    ("2017-2", 2017, f"{_BASE}/e59454bb5e6fbe150543051957222031.pdf", f"{_BASE}/ada2c5b45739d9d7b8ca1362380becf8.pdf"),
    ("2016-1", 2016, f"{_BASE}/222e8cc177a6a45aa3324905f9c6477d.pdf", f"{_BASE}/e8d0f86be25886a7a88cfed5c74a71ce.pdf"),
    ("2016-2", 2016, f"{_BASE}/ca9df8ac6f8520578c99b99c4474764c.pdf", f"{_BASE}/de93d9b091dd4f78efab63cbe22132b7.pdf"),
]


def _get(url: str, timeout: int = 60) -> requests.Response:
    """GET com fallback: tenta `verify=True`, só cai para `verify=False` se a
    primeira tentativa falhar."""
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=True)
    except requests.RequestException:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    return resp


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    if b"%PDF" not in resp.content[:16]:
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


def _sorted_text(pdf_path: Path) -> str:
    """Texto do PDF inteiro, em ordem de leitura (y depois x)."""
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text(sort=True) for page in doc)
    doc.close()
    return text


# ── Parsing do gabarito ("<número> <letra|ANULADA>", uma por linha) ──────

_GAB_RE = re.compile(r"(?m)^[ \t]*(\d{1,3})[ \t]+(ANULADA|[A-E])[ \t]*$")


def parse_gabarito(text: str) -> dict[int, Optional[str]]:
    """Parseia o gabarito oficial (lista número/letra, uma por linha).
    `ANULADA` vira `None`. Quando um mesmo número aparece mais de uma vez
    com valores diferentes (caso real: bloco de Língua Estrangeira
    duplicado para Inglês/Espanhol — ver docstring do módulo), o valor
    final também vira `None` (ambíguo — não dá pra saber qual idioma o
    candidato teria escolhido)."""
    seen: dict[int, Optional[str]] = {}
    ambiguous: set[int] = set()
    for num_s, val in _GAB_RE.findall(text):
        num = int(num_s)
        parsed = None if val == "ANULADA" else val
        if num in seen and seen[num] != parsed:
            ambiguous.add(num)
        seen[num] = parsed
    for num in ambiguous:
        seen[num] = None
    return seen


# ── Parsing da prova ─────────────────────────────────────────────────────

_ALT_RE = re.compile(r"(?m)^[ \t]*\(([A-E])\)[ \t]*(?=\S)")
_NUM_RE = re.compile(r"(?m)^[ \t]*(\d{1,3})[ \t]{2,}(?=\S)")
_ALT_ORDER = "ABCDE"


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parse_exam(text: str, gabarito: dict[int, Optional[str]]) -> list[dict]:
    """Parseia um caderno de prova e retorna
    [{number, statement, alternatives: [(letra, texto), ...]}], já
    validado contra o gabarito (ver docstring do módulo)."""
    alt_matches = list(_ALT_RE.finditer(text))
    num_matches = list(_NUM_RE.finditer(text))

    # Agrupa sequências completas (A),(B),(C),(D),(E) consecutivas.
    groups: list[tuple[int, int]] = []
    i = 0
    while i < len(alt_matches):
        if alt_matches[i].group(1) == "A":
            j, k = i, 0
            while j < len(alt_matches) and k < 5 and alt_matches[j].group(1) == _ALT_ORDER[k]:
                j += 1
                k += 1
            if k == 5:
                groups.append((i, j))
                i = j
                continue
        i += 1

    questions: list[dict] = []
    seen: set[int] = set()
    prev_end = 0
    for gi, (i0, i1) in enumerate(groups):
        g_start = alt_matches[i0].start()
        # Cabeçalho candidato: número sozinho em linha (com 2+ espaços
        # antes do enunciado) mais próximo do início do bloco de
        # alternativas, desde o fim da questão anterior reconhecida.
        candidates = [m for m in num_matches if prev_end <= m.start() < g_start]
        prev_end = alt_matches[i1 - 1].end()
        if not candidates:
            continue
        header = candidates[-1]
        number = int(header.group(1))
        if number not in gabarito or number in seen:
            continue  # não bate com o gabarito oficial — descarta (ver docstring)

        statement = _clean(text[header.end():g_start])
        if not statement:
            continue

        block_end = alt_matches[groups[gi + 1][0]].start() if gi + 1 < len(groups) else len(text)

        alternatives: list[tuple[str, str]] = []
        for idx in range(i0, i1):
            letter = alt_matches[idx].group(1)
            a_start = alt_matches[idx].end()
            a_end = alt_matches[idx + 1].start() if idx + 1 < i1 else block_end
            alternatives.append((letter, _clean(text[a_start:a_end])))

        if len(alternatives) != 5:
            continue

        seen.add(number)
        questions.append({"number": number, "statement": statement, "alternatives": alternatives})

    questions.sort(key=lambda q: q["number"])
    return questions


# ── Persistência ─────────────────────────────────────────────────────────

def _persist_edition(db: Session, edition: str, year: int, questions: list[dict], gabarito: dict[int, Optional[str]]) -> dict:
    """Grava as questões de uma edição (ex.: "2019-2") via adapter unificado.
    Idempotente por (exam_type, exam_name, number)."""
    import gc
    exam_name = f"ULBRA {edition}"
    added = 0
    skipped_existing = 0
    for q in questions:
        correct = gabarito.get(q["number"])
        options = []
        for order, (letter, opt_text) in enumerate(q["alternatives"]):
            options.append({
                "letter": letter,
                "text": opt_text,
                "is_correct": (letter == correct),
                "order": order,
            })
        metadata = {"edition": edition}
        vq, created = save_vestibular_question(
            db,
            exam_type="ulbra",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            correct_option=correct,
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1
        if added % 10 == 0:
            db.commit()
            db.expunge_all()
            gc.collect()

    db.commit()
    db.expunge_all()
    gc.collect()
    return {"edition": edition, "year": year, "total_parsed": len(questions), "total_added": added, "skipped_existing": skipped_existing}


def import_ulbra_edition(edition: str, year: int, prova_url: str, gabarito_url: str, db: Optional[Session] = None) -> dict:
    """Importa uma edição: baixa prova completa + gabarito oficial, parseia
    e grava."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp = Path(tmp_dir)
                prova_path = tmp / "prova.pdf"
                gab_path = tmp / "gabarito.pdf"
                download_pdf(prova_url, prova_path)
                download_pdf(gabarito_url, gab_path)

                gabarito = parse_gabarito(_sorted_text(gab_path))
                if not gabarito:
                    return {"edition": edition, "year": year, "skipped": True, "reason": "Gabarito em formato inesperado (0 pares número/letra reconhecidos)"}
                questions = parse_exam(_sorted_text(prova_path), gabarito)
        except requests.RequestException as e:
            return {"edition": edition, "year": year, "skipped": True, "reason": f"Falha de rede/download: {e}"}
        except ValueError as e:
            return {"edition": edition, "year": year, "skipped": True, "reason": str(e)}

        if not questions:
            return {"edition": edition, "year": year, "skipped": True, "reason": "Nenhuma questão reconhecida (prova em formato inesperado)"}

        return _persist_edition(db, edition, year, questions, gabarito)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_ulbra_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todas as edições mapeadas em `_EDITIONS` (2016-2019 — ver
    docstring do módulo). Cada edição é tentada de forma independente:
    falha de rede, PDF fora do padrão esperado, ou link não encontrado não
    travam o lote, só são reportados como pulados."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    editions = list(_EDITIONS)
    if until_year:
        editions = [e for e in editions if e[1] <= until_year]
    if since_year:
        editions = [e for e in editions if e[1] >= since_year]

    results = []
    total_added = 0
    try:
        for i, (edition, year, prova_url, gab_url) in enumerate(editions):
            if task_id:
                update_task_progress(task_id, current=i, total=len(editions), log=f"Processando Vestibular ULBRA {edition}...")

            try:
                r = import_ulbra_edition(edition, year, prova_url, gab_url, db=db)
                results.append(r)
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=i + 1, total=len(editions),
                        log=f"✅ {edition}: {r.get('total_added', 0)} adicionadas." if not r.get("skipped") else f"⏭️ {edition}: {r.get('reason')}",
                    )
            except Exception as e:
                db.rollback()
                results.append({"edition": edition, "year": year, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(task_id, current=i + 1, total=len(editions), log=f"❌ Erro em {edition}: {e}")

        res = {"total_added": total_added, "editions": results}
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


async def import_all(
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    **kwargs,
) -> dict:
    return import_all_ulbra_exams(since_year=since_year, until_year=until_year, db=db, task_id=task_id, **kwargs)
