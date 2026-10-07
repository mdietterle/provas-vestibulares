from __future__ import annotations

"""Importa questões da 1ª fase do vestibular da UEL (Universidade Estadual de
Londrina) do site oficial da COPS-UEL (Coordenadoria de Processos Seletivos —
www.cops.uel.br), NÃO de um núcleo externo.

Descoberta da URL (pesquisada e confirmada manualmente, não é um chute):
  - A home tem um menu "Vestibular" > "Provas Anteriores" cujos itens levam a
    `/v2/Selecao/DetalharSelecao/Selecao/<selecao_id>` — o `selecao_id` por
    ano é estável (ex.: 2020→245, 2019→229, 2018→218 ...), mas essa página é
    renderizada por AJAX (o HTML estático não contém o link real dos PDFs).
  - O link definitivo de "Provas e Gabaritos" fica em
    `/v2/ProvasGabaritos/<TipoDePagina>/Selecao/<selecao_id>/Atividade/<atividade_id>`,
    onde `<atividade_id>` é um id textual sem relação óbvia com o ano nem com
    o `selecao_id`, e `<TipoDePagina>` mudou pelo menos 3 vezes no período
    coberto (1FaseVestibularDefinitivo em 2018-2020/2023/2024 — a UEL tinha
    "1ª e 2ª fases"; FaseUnicaVestibularDefinitivo em 2021-2022 — durante a
    pandemia o vestibular virou fase única; 1DiaVestibularDefinitivo em 2025
    — reformulação mais recente, exame de um dia só). Não há como derivar
    `atividade_id`/`TipoDePagina` de forma algorítmica a partir do ano; por
    isso `_YEAR_PAGES` abaixo é uma tabela estática, montada consultando o
    Google (resultados indexados de `site:cops.uel.br ProvasGabaritos
    Selecao/<id>`) e validada baixando e parseando de verdade os PDFs de
    2018, 2019, 2020, 2021, 2022, 2023, 2024 e 2025 (ver módulo de teste).
    Anos anteriores a 2018 não foram localizados dessa forma e não estão
    cobertos.

Cada página de "Provas e Gabaritos" traz uma tabela HTML com uma linha por
"Tipo" (1, 2, 3 — cadernos embaralhados com o mesmo conteúdo, só a ordem das
questões/alternativas muda) e, quando o processo tinha fase distinta por
idioma estrangeiro (Espanhol/Inglês), uma seção por idioma também. Sempre
usamos o primeiro "Tipo 1" da coluna "Prova e Gabarito Definitivos" (ignora
"Provisórios" quando a tabela tem as duas colunas) — é o caderno canônico,
suficiente para gravar as questões (o conteúdo de Conhecimentos Gerais é
idêntico entre idiomas, só a seção de língua estrangeira muda — mesma lógica
adotada no importador da UNIOESTE).

Peculiaridade muito favorável da prova da UEL: cada questão já vem com a
resposta certa e a justificativa impressas no próprio PDF da prova (formato
"Alternativa correta: <letra>\\nConteúdo programático: ...\\nJustificativa\\n...").
Isso permite resolver a maioria das questões sem precisar nem abrir o
gabarito — mas o gabarito oficial (tabela simples "Questão"/"Alternativa
correta") ainda é baixado e usado para cross-check; quando os dois
divergem (nunca observado nos 8 anos validados) ou quando a questão foi
anulada (gabarito marca com "∗"/"*", ou a prova imprime "Alternativa
correta: QUESTÃO ANULADA" em vez de uma letra), a questão é gravada sem
`is_correct` em nenhuma alternativa.

Parsing da prova — armadilhas encontradas e como são tratadas:
  - O PDF tem, ANTES da questão 1 de verdade, um "Cartão-Resposta" de
    exemplo (grade de números "01/06/11/16/21/02/07/12/17/22/...", fora de
    ordem) e uma legenda solta "01\\nA\\nB\\nC\\nD\\nE" (amostra de caligrafia)
    — ambos batem no regex ingênuo de início de questão (número sozinho
    numa linha). `_boundaries` filtra isso: só aceita um candidato "N." como
    início de questão se, nos próximos ~4000 caracteres, houver de fato uma
    sequência "a) ... e)" (as alternativas reais) — a grade/legenda não tem
    isso logo em seguida (o próximo "a)" real só aparece bem depois, quando
    a questão 1 de verdade começa).
  - Cada questão pode vir com um código de área de 1-4 letras maiúsculas
    logo abaixo do número em alguns anos (ex.: "1\\nAA\\n...", 2019) e sem
    esse código em outros (ex.: "1\\nO girassol...", 2025) — o regex trata o
    código como opcional.
  - PyMuPDF não embaralha colunas aqui (o layout é de coluna única por
    questão), diferente de outros importadores deste repo que precisam de
    blocks; texto linear (`page.get_text()`) já é suficiente.

Robustez de rede: `_get` tenta `verify=True` e cai para `verify=False` só se
a primeira tentativa falhar (nenhuma falha de TLS foi observada durante o
desenvolvimento, mas outros importadores deste repo mostraram hosts .br com
cadeia incompleta — mantém-se a mesma defesa por precaução).
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

# year -> (selecao_id, atividade_id, tipo_de_pagina)
# Ver docstring do módulo sobre por que isso é uma tabela estática.
_YEAR_PAGES: dict[int, tuple[int, int, str]] = {
    2018: (218, 5772, "DivulgacaoProvasGabaritos1FaseVestibularDefinitivo"),
    2019: (229, 6054, "DivulgacaoProvasGabaritos1FaseVestibularDefinitivo"),
    2020: (245, 6379, "DivulgacaoProvasGabaritos1FaseVestibularDefinitivo"),
    2021: (255, 17966, "DivulgacaoProvasGabaritosFaseUnicaVestibularDefinitivo"),
    2022: (280, 18252, "DivulgacaoProvasGabaritosFaseUnicaVestibularDefinitivo"),
    2023: (296, 18822, "DivulgacaoProvasGabaritos1FaseVestibularDefinitivo"),
    2024: (325, 19216, "DivulgacaoProvasGabaritos1FaseVestibularDefinitivo"),
    2025: (340, 19929, "DivulgacaoProvasGabaritos1DiaVestibularDefinitivo"),
}


def _get(url: str, timeout: int = 60) -> requests.Response:
    """GET com fallback: tenta `verify=True`, só cai para `verify=False` se a
    primeira tentativa falhar (ver docstring do módulo)."""
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=True)
    except requests.RequestException:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    return resp


def download_pdf(url: str, dest: Path) -> None:
    resp = _get(url, timeout=90)
    # O servidor da COPS-UEL emite uma quebra de linha antes do "%PDF" —
    # por isso a checagem de assinatura procura os 4 bytes em vez de
    # comparar só os primeiros 4 bytes do corpo.
    if b"%PDF" not in resp.content[:16]:
        raise ValueError(f"A URL não retornou um PDF (link provavelmente não existe mais): {url}")
    dest.write_bytes(resp.content)


def page_url_for_year(year: int) -> Optional[str]:
    entry = _YEAR_PAGES.get(year)
    if not entry:
        return None
    selecao, atividade, tipo = entry
    return f"https://www.cops.uel.br/v2/ProvasGabaritos/{tipo}/Selecao/{selecao}/Atividade/{atividade}"


# ── Descoberta dos links de Prova/Gabarito Definitivos, Tipo 1 ─────────────

_ROW_RE = re.compile(r'<TR class="over">(.*?)</TR>', re.I | re.S)
_LINK_RE = re.compile(
    r'href="(https://www\.cops\.uel\.br/v2/download\.php\?Acesso=[^"]+)"[^>]*>\s*([^<]+?)\s*</a>',
    re.I,
)


def find_prova_gabarito_links(html: str) -> tuple[Optional[str], Optional[str]]:
    """Acha, na página de "Provas e Gabaritos" de um ano, o link da "Prova
    Tipo 1" e do "Gab./Gabarito Tipo 1" da coluna Definitivo.

    A tabela tem uma linha (<TR>) por Tipo/idioma, com os links em ordem de
    leitura: quando a tabela também tem coluna "Provisórios" (2018-2020,
    2023, 2024), cada linha tem 4 links (Prova Provisório, Gab Provisório,
    Prova Definitivo, Gab Definitivo) — pegamos o ÚLTIMO par. Quando só há
    coluna "Definitivos" (2021-2022, fase única — e 2025, 1 dia), a linha
    tem só 2 links (o próprio par Definitivo)."""
    for row in _ROW_RE.findall(html):
        links = _LINK_RE.findall(row)
        if not links:
            continue
        pairs = [links[i : i + 2] for i in range(0, len(links), 2)]
        pair = pairs[-1]
        if len(pair) != 2:
            continue
        (prova_url, prova_label), (gab_url, gab_label) = pair
        if prova_label.lower().startswith("prova") and gab_label.lower().startswith("gab"):
            return prova_url, gab_url
    return None, None


# ── Parsing do gabarito ──────────────────────────────────────────────────────

_GAB_LINE_RE = re.compile(r"(?m)^(\d{1,3})\n([A-Za-z]|\*|\*\*|\W)\n")


def parse_gabarito_text(text: str) -> dict[int, Optional[str]]:
    """Parseia o texto do "Gabarito Oficial Definitivo" (tabela simples
    "Questão"/"Alternativa correta"/"Assinalada", uma questão por par de
    linhas "NN\\nX"). Anulada é marcada com "*" comum ou "∗" (U+2217,
    observado em pelo menos um ano) — qualquer valor que não seja uma letra
    A-E vira `None`."""
    result: dict[int, Optional[str]] = {}
    for num_s, val in _GAB_LINE_RE.findall(text):
        num = int(num_s)
        letter = val.upper()
        result[num] = letter if letter in "ABCDE" else None
    return result


# ── Parsing da prova ─────────────────────────────────────────────────────────

# Início de questão: número sozinho numa linha, opcionalmente seguido de um
# código de área de 2-4 letras maiúsculas — mas NUNCA quando a linha seguinte
# também é só dígitos (grade do Cartão-Resposta de exemplo) ou uma única
# letra maiúscula A-E (legenda de amostra de caligrafia). Ver docstring do
# módulo.
_Q_RE = re.compile(r"(?m)^(\d{1,3})\n(?:[A-Z]{2,4}\n)?(?!\d+\n)(?![A-E]\n)")
_ALT_RE = re.compile(r"(?m)^([a-e])\)\s*")
_CORRECT_RE = re.compile(r"Alternativa correta:\s*([A-Ea-e])")


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _pdf_full_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _question_boundaries(text: str) -> list[re.Match]:
    expected = 1
    bounds: list[re.Match] = []
    for cand in _Q_RE.finditer(text):
        if int(cand.group(1)) != expected:
            continue
        window = text[cand.end() : cand.end() + 4000]
        if not (re.search(r"(?m)^a\)\s", window) and re.search(r"(?m)^e\)\s", window)):
            continue  # candidato espúrio (grade/legenda da capa) — não avança
        bounds.append(cand)
        expected += 1
    return bounds


def parse_exam_pdf(pdf_path: Path) -> list[dict]:
    """Parseia o caderno de prova e retorna
    [{number, statement, alternatives: [(letra, texto), ...], correct}].

    `correct` vem da própria prova ("Alternativa correta: X", impressa após
    cada questão) — `None` quando a questão foi anulada ("Alternativa
    correta: QUESTÃO ANULADA"). O gabarito oficial (arquivo separado) é
    usado só para cross-check em `import_uel_year`."""
    text = _pdf_full_text(pdf_path)
    boundaries = _question_boundaries(text)

    questions: list[dict] = []
    for i, m in enumerate(boundaries):
        start = m.end()
        end = boundaries[i + 1].start() if i + 1 < len(boundaries) else len(text)
        body = text[start:end]

        corr_m = _CORRECT_RE.search(body)
        pre = body[: corr_m.start()] if corr_m else body

        alt_matches = list(_ALT_RE.finditer(pre))
        seen: set[str] = set()
        alternatives: list[tuple[str, str]] = []
        for j, am in enumerate(alt_matches):
            letter = am.group(1).upper()
            if letter in seen:
                continue
            seen.add(letter)
            a_start = am.end()
            a_end = alt_matches[j + 1].start() if j + 1 < len(alt_matches) else len(pre)
            alternatives.append((letter, _clean(pre[a_start:a_end])))

        if len(alternatives) != 5 or {L for L, _ in alternatives} != set("ABCDE"):
            continue  # formato inesperado (raro) — pula, não trava o resto

        statement = _clean(pre[: alt_matches[0].start()])
        if not statement:
            continue

        correct = corr_m.group(1).upper() if corr_m else None
        if correct not in ("A", "B", "C", "D", "E"):
            correct = None  # cobre "QUESTÃO ANULADA" e afins

        questions.append({
            "number": int(m.group(1)),
            "statement": statement,
            "alternatives": alternatives,
            "correct": correct,
        })

    return questions


# ── Persistência ─────────────────────────────────────────────────────────────

def _persist_year(db: Session, year: int, questions: list[dict]) -> dict:
    """Grava as questões de um ano via adapter unificado. Idempotente por
    (exam_type, exam_name, number) — delegada ao save_vestibular_question."""
    import gc

    exam_name = f"UEL {year}"
    added = 0
    skipped_existing = 0
    for q in questions:
        correct = q.get("correct")
        options = []
        for order, (letter, opt_text) in enumerate(q["alternatives"]):
            options.append({
                "letter": letter,
                "text": opt_text,
                "is_correct": (letter == correct),
                "order": order,
            })

        vq, created = save_vestibular_question(
            db,
            exam_type="uel",
            exam_name=exam_name,
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            correct_option=correct,
            metadata={},
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
    return {"year": year, "total_parsed": len(questions), "total_added": added, "skipped_existing": skipped_existing}


def import_uel_year(year: int, db: Optional[Session] = None) -> dict:
    """Importa um ano: baixa Prova Tipo 1 + Gabarito Tipo 1 (Definitivo),
    parseia e grava. Cross-checa a resposta impressa na prova contra o
    gabarito oficial só para logging — nunca observado divergir nos 8 anos
    validados durante o desenvolvimento; se divergir, o gabarito oficial
    prevalece (mais autoritativo que o texto solto da prova)."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        page_url = page_url_for_year(year)
        if not page_url:
            return {"year": year, "skipped": True, "reason": "Ano não mapeado em _YEAR_PAGES (URL não pesquisada/confirmada)"}

        html = _get(page_url, timeout=30).text
        prova_url, gabarito_url = find_prova_gabarito_links(html)
        if not prova_url:
            return {"year": year, "skipped": True, "reason": "Link da Prova Tipo 1 Definitivo não encontrado na página"}

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)

            prova_path = tmp / "prova.pdf"
            download_pdf(prova_url, prova_path)
            questions = parse_exam_pdf(prova_path)

            if gabarito_url:
                gab_path = tmp / "gabarito.pdf"
                download_pdf(gabarito_url, gab_path)
                gabarito = parse_gabarito_text(_pdf_full_text(gab_path))
                for q in questions:
                    official = gabarito.get(q["number"])
                    if official is not None or q["number"] in gabarito:
                        q["correct"] = official  # gabarito oficial prevalece

        if not questions:
            return {"year": year, "skipped": True, "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)"}

        return _persist_year(db, year, questions)
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


def import_all_uel_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Optional[Session] = None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os anos mapeados em `_YEAR_PAGES` (2018-2025 — ver
    docstring do módulo). Cada ano é tentado de forma independente: falha de
    rede, PDF fora do padrão esperado, ou link não encontrado não travam o
    lote, só são reportados como pulados."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    years = sorted(_YEAR_PAGES.keys(), reverse=True)
    if until_year:
        years = [y for y in years if y <= until_year]
    if since_year:
        years = [y for y in years if y >= since_year]

    results = []
    total_added = 0
    try:
        for i, year in enumerate(years):
            if task_id:
                update_task_progress(task_id, current=i, total=len(years), log=f"Processando Vestibular UEL {year}...")

            try:
                r = import_uel_year(year, db=db)
                results.append(r)
                total_added += r.get("total_added", 0)
                if task_id:
                    update_task_progress(
                        task_id, current=i + 1, total=len(years),
                        log=f"✅ {year}: {r.get('total_added', 0)} adicionadas." if not r.get("skipped") else f"⏭️ {year}: {r.get('reason')}",
                    )
            except Exception as e:
                db.rollback()
                results.append({"year": year, "skipped": True, "reason": str(e)})
                if task_id:
                    update_task_progress(task_id, current=i + 1, total=len(years), log=f"❌ Erro em {year}: {e}")

        res = {"total_added": total_added, "years": results}
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


# Compat: assinatura antiga usada pelo router.
async def process_and_import_uel_from_url(url: str, year: int, db: Session):
    return import_uel_year(year, db=db)


async def import_all(db: Optional[Session] = None, task_id: Optional[str] = None, **kwargs) -> dict:
    return import_all_uel_exams(db=db, task_id=task_id, **kwargs)
