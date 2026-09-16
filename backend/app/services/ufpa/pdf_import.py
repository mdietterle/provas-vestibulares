from __future__ import annotations

"""Importa questões do Processo Seletivo (vestibular) da UFPA (Universidade
Federal do Pará) a partir dos boletins de questões e gabaritos publicados
pelo CEPS/UFPA (Centro de Processos Seletivos, ceps.ufpa.br).

LIMITAÇÃO CENTRAL, CONFIRMADA E NÃO CONTORNÁVEL: a UFPA aplicou uma prova
OBJETIVA PRÓPRIA (o "Boletim de Questões" que este módulo parseia) somente
até o Processo Seletivo 2013. A partir do PS 2014 a seleção da UFPA passou a
usar exclusivamente o ENEM/SISU como critério de ingresso — as páginas
"Provas e Gabaritos" de PS2014 em diante, confirmadas navegando
ceps.ufpa.br/index.php/ps-anteriores e as páginas individuais de cada PS,
não existem mais (só há editais, demanda e pontuação máxima/mínima). O único
exame com boletim/gabarito próprio ainda publicado depois disso é o THEMUS
(Teste de Habilidade Específica em Música, para o curso de Licenciatura em
Música) — um teste de habilidade específica, não o vestibular geral, fora do
escopo deste importador. Por isso o alcance real de importação é fixo:
PS 2011, PS 2012 e PS 2013 — não uma limitação de scraping, mas o universo
inteiro de anos em que o boletim de questões geral existe.

Os PDFs desses 3 anos não ficam mais linkados em nenhuma página navegável do
site atual (Joomla, ceps.ufpa.br) — foram localizados via
web.archive.org/cdx (busca por URLs arquivadas contendo
"vestibular/PS ####/.../prova" e "gabarito") e cada um foi confirmado como
ainda servido, ao vivo, pelo host antigo (ceps.ufpa.br/legado/arquivos/...).
As URLs têm capitalização inconsistente por ano (pasta "PS 2011" e "PS 2013"
maiúsculas, mas "ps 2012" minúscula — o servidor é case-sensitive, então cada
uma precisa ser exata) — por isso o índice abaixo é uma lista fixa
(hardcoded), não descoberta por raspagem de uma página-índice (não existe
mais nenhuma página assim para estes anos).

ESTRUTURA DO PDF (confirmada baixando e inspecionando os 3 anos): o boletim
de questões tem 55 questões objetivas de 5 alternativas (A-E), organizadas
SEMPRE na mesma ordem fixa e com a mesma contagem por disciplina (confirmado
pelo próprio texto de instruções do boletim, item 1: "contém 55 QUESTÕES
OBJETIVAS (5 de Língua Portuguesa, 5 de Matemática, 5 de História, 5 de
Geografia, 5 de Física, 5 de Química, 5 de Biologia, 5 de Literatura, 5 de
Filosofia, 5 de Sociologia e 5 de Língua Estrangeira)"): questões 1-5 Língua
Portuguesa, 6-10 Matemática, 11-15 História, 16-20 Geografia, 21-25 Física,
26-30 Química, 31-35 Biologia, 36-40 Literatura, 41-45 Filosofia, 46-50
Sociologia, e 51-55 repetidos 5 vezes — uma vez por idioma de Língua
Estrangeira (Espanhol, Inglês, Alemão, Francês, Italiano, sempre nessa
ordem, confirmada tanto no boletim quanto no gabarito) — cada candidato só
responde a UMA dessas 5 seções, mas o boletim traz todas, e o gabarito traz
a resposta certa de cada uma separadamente. É por isso que `UfpaQuestion`
precisa de uma coluna `subject`: sem ela, as 5 variantes de idioma da mesma
questão 51 (por exemplo) colidiriam todas no mesmo (year, number).

RECONHECIMENTO DE QUESTÕES (lição já aplicada nos importadores de
UNIMONTES/PUC Minas/UNAERP deste repo, adaptada aqui): o boletim tem, antes
de cada questão de leitura de texto, uma lista de números de linha do
próprio texto de apoio ("01\n02\n03...\n36" um por linha) que colide em
formato com a numeração de questão se reconhecida ingenuamente. A lista de
números de apoio nunca tem uma LETRA maiúscula (nem aspas/parênteses) na
mesma linha ou logo após a quebra de linha seguinte — só outro dígito — e é
isso que o regex de início de questão exige (uma letra maiúscula, aspas ou
parêntese logo em seguida, no fim da mesma linha ou já na linha seguinte:
2012/2013 quebram entre o número e o início do enunciado, 2011 não). Mesmo
assim, alguns enunciados citam coeficientes/variáveis que colidem em forma
com "número seguido de maiúscula" (ex.: uma equação química "2 CO(g) +
O2(g)..." dentro do enunciado de uma questão de Química) — por isso a
extração final não aceita qualquer correspondência do regex isoladamente:
`_select_sequential` só aceita candidatos que sigam a ordem 1..55 esperada
(com tolerância a pequenas lacunas, quando uma questão pontual não é
reconhecida), descartando qualquer "correspondência" fora de sequência como
ruído, sem nunca roubar o texto da questão real.

Nem toda questão de todo ano é recuperada: quando uma tabela ou gráfico
(ex.: uma questão de Física com alternativas sendo gráficos V×T sem texto
extraível, vista no PS 2011; ou uma tabela estatística de Geografia que
quebra a extração da questão seguinte, vista em PS 2012 e PS 2013 — mesma
questão de Geografia nº 18 nos dois anos) impede reconhecer exatamente 5
alternativas em sequência A-E, a questão é descartada (não inventada) — o
restante do boletim continua sendo processado normalmente. Nos 3 anos
testados isso afetou no máximo 1-2 questões de 75 por ano.

O layout de página é as vezes em 3 colunas (questões de Matemática/Física
com tabelas/gráficos), mas a extração linear padrão do PyMuPDF
(`page.get_text()`) já produz texto na ordem de leitura correta o
suficiente para o parser de sequência funcionar (a validação de sequência
1..55 filtra os poucos pontos de desordem residual em vez de exigir
reconstrução de colunas por bounding-box)."""

import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests

from app.services.progress import update_task_progress, complete_task, fail_task
from app.models import UfpaQuestion, UfpaQuestionOption

_HEADERS = {"User-Agent": "Mozilla/5.0"}

# Índice fixo dos únicos anos em que a UFPA aplicou prova objetiva própria
# (ver docstring do módulo). URLs confirmadas ao vivo no host legado —
# capitalização de pasta é exatamente como está aqui (servidor case-sensitive).
_KNOWN_EXAMS = {
    2011: {
        "prova": "https://ceps.ufpa.br/legado/arquivos/vestibular/PS%202011/arquivos/PROVA.pdf",
        "gabarito": "https://ceps.ufpa.br/legado/arquivos/vestibular/PS%202011/arquivos/GABARITO.pdf",
    },
    2012: {
        "prova": "https://ceps.ufpa.br/legado/arquivos/vestibular/ps%202012/arquivos/Prova_Objetiva_PS_2012.pdf",
        "gabarito": "https://ceps.ufpa.br/legado/arquivos/vestibular/ps%202012/arquivos/Gabarito_Prova_Objetiva_PS_2012%20-%20definitivo.pdf",
    },
    2013: {
        "prova": "https://ceps.ufpa.br/legado/arquivos/vestibular/PS%202013/arquivos/ProvaPS2013.pdf",
        "gabarito": "https://ceps.ufpa.br/legado/arquivos/vestibular/PS%202013/arquivos/GabaritoPS2013_definitivo.pdf",
    },
}

_LANGS = ["ESPANHOL", "INGLÊS", "ALEMÃO", "FRANCÊS", "ITALIANO"]

_SUBJECT_RANGES = [
    ("LÍNGUA PORTUGUESA", 1, 5), ("MATEMÁTICA", 6, 10), ("HISTÓRIA", 11, 15),
    ("GEOGRAFIA", 16, 20), ("FÍSICA", 21, 25), ("QUÍMICA", 26, 30),
    ("BIOLOGIA", 31, 35), ("LITERATURA", 36, 40), ("FILOSOFIA", 41, 45),
    ("SOCIOLOGIA", 46, 50),
]
_NUM_SUBJECT: dict[int, str] = {}
for _name, _lo, _hi in _SUBJECT_RANGES:
    for _n in range(_lo, _hi + 1):
        _NUM_SUBJECT[_n] = _name

_SUBJECT_HEADER_NAMES = [s for s, _, _ in _SUBJECT_RANGES] + _LANGS
_HEADER_STRIP_RE = re.compile(
    r'(?m)^(' + '|'.join(re.escape(s) for s in _SUBJECT_HEADER_NAMES) + r')\s*$'
)
_FIRST_HEADER_RE = re.compile(r'(?m)^LÍNGUA PORTUGUESA\s*$')

# 2 dígitos sempre (2011/2012: "01") ou 1-2 dígitos (2013: "1".."9" sem zero à
# esquerda) — o enunciado pode começar na mesma linha do número (2011,
# 2012) ou só na linha seguinte (2013); em ambos os casos exige-se que o que
# vier a seguir comece com maiúscula/aspas/parêntese (nunca outro dígito —
# isso é o que distingue de uma lista de números de linha de apoio).
_QSTART_STRICT_RE = re.compile(r'(?m)^(\d{2})[ \t]*\n?[ \t]*(?=[A-ZÀ-ÖØ-Þ"“(])')
_QSTART_LOOSE_RE = re.compile(r'(?m)^(\d{1,2})[ \t]*\n?[ \t]*(?=[A-ZÀ-ÖØ-Þ"“(])')

_OPT_RE = re.compile(r'(?m)^\(([A-E])\)\s*')
_GABARITO_PAIR_RE = re.compile(r'(\d{1,3})\s+(Anulada|[A-E])\s')

_MAX_GAP = 4  # tolerância de questões não-reconhecidas em sequência


def fetch_exam_links(since_year: Optional[int] = None, until_year: Optional[int] = None) -> dict:
    """Retorna o índice {ano: {"prova": url, "gabarito": url}} dos anos
    conhecidos (ver `_KNOWN_EXAMS`), filtrado por since_year/until_year.
    Não há raspagem de página: não existe mais nenhuma página no site atual
    listando estes 3 PDFs (ver docstring do módulo) — foram localizados via
    Wayback Machine e confirmados sendo servidos ao vivo pelo host legado."""
    result = {}
    for year, urls in _KNOWN_EXAMS.items():
        if since_year and year < since_year:
            continue
        if until_year and year > until_year:
            continue
        result[year] = urls
    return result


def download_pdf(url: str, dest: Path) -> None:
    """Baixa um PDF público. Mesmo fallback de TLS incompleto documentado em
    app/services/unimontes/pdf_import.py e outros importadores deste repo:
    tenta verificado, e só cai para sem verificação se a falha for
    especificamente de SSL (o host legado do CEPS é antigo)."""
    try:
        resp = requests.get(url, timeout=60, headers=_HEADERS)
    except requests.exceptions.SSLError:
        resp = requests.get(url, timeout=60, headers=_HEADERS, verify=False)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (provavelmente o link não existe mais).")
    dest.write_bytes(resp.content)


def _last_option_run(body: str) -> list:
    """Mesma cautela documentada em app/services/pucminas/pdf_import.py:
    entre vários blocos de "(A)".."(E)", só o ÚLTIMO bloco estritamente
    sequencial (A, B, C, D, E) é tratado como as alternativas reais."""
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


def _select_sequential(matches, n_langs: int = 5) -> list:
    """Filtra os candidatos a início-de-questão encontrados pelo regex,
    aceitando só os que seguem a sequência esperada 1..50 e depois até
    `n_langs` repetições de 51..55 — com tolerância a pequenas lacunas
    (`_MAX_GAP`) quando uma questão pontual não é reconhecida (ex.: página
    com gráfico/tabela que atrapalha a extração). Qualquer correspondência
    fora da faixa esperada (ex.: um coeficiente "2 CO(g)..." dentro do
    enunciado de uma questão de Química, que colide em forma com "número
    seguido de maiúscula") é descartada como ruído — nunca aceita fora de
    ordem."""
    accepted = []
    expected = 1
    lang_run = 0
    for m in matches:
        number = int(m.group(1))
        if expected <= 50:
            if expected <= number <= min(50, expected + _MAX_GAP):
                accepted.append((m, number, None))
                expected = number + 1
            continue
        expected_lang = 51 + ((expected - 51) % 5)
        if expected_lang <= number <= min(55, expected_lang + _MAX_GAP):
            accepted.append((m, number, lang_run))
            expected += number - expected_lang + 1
            if (expected - 51) % 5 == 0:
                lang_run += 1
                if lang_run >= n_langs:
                    break
    return accepted


def parse_prova(path: Path) -> tuple[list[dict], list[tuple]]:
    """Parseia o boletim de questões e retorna
    ([{number, subject, statement, alternatives: [(letra, texto), ...]}],
    [(numero, lang_run, n_alternativas_encontradas), ...] questões
    descartadas por não ter exatamente 5 alternativas reconhecidas)."""
    doc = fitz.open(str(path))
    try:
        full = "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()

    m = _FIRST_HEADER_RE.search(full)
    if m:
        full = full[m.end():]
    full = _HEADER_STRIP_RE.sub('', full)

    qstart_re = _QSTART_STRICT_RE if _QSTART_STRICT_RE.search(full[:2000]) else _QSTART_LOOSE_RE
    raw_matches = list(qstart_re.finditer(full))
    accepted = _select_sequential(raw_matches)

    questions: list[dict] = []
    skipped: list[tuple] = []
    for idx, (m, number, lang_run) in enumerate(accepted):
        qstart = m.end()
        qstop = accepted[idx + 1][0].start() if idx + 1 < len(accepted) else len(full)
        body = full[qstart:qstop]

        opts = _last_option_run(body)
        if len(opts) != 5:
            skipped.append((number, lang_run, len(opts)))
            continue

        statement = re.sub(r'\s+', ' ', body[:opts[0].start()]).strip()
        alternatives: list[tuple[str, str]] = []
        for k, om in enumerate(opts):
            letter = om.group(1)
            tstart = om.end()
            tend = opts[k + 1].start() if k + 1 < len(opts) else len(body)
            text = re.sub(r'\s+', ' ', body[tstart:tend]).strip()
            alternatives.append((letter, text))

        subject = _NUM_SUBJECT.get(number) or _LANGS[lang_run]
        questions.append({
            "number": number, "subject": subject,
            "statement": statement, "alternatives": alternatives,
        })

    return questions, skipped


def parse_gabarito(path: Path, n_langs: int = 5) -> tuple[dict[int, str], list[dict[int, str]]]:
    """Parseia o PDF de gabarito, retornando (respostas das questões 1-50,
    [respostas de cada uma das n_langs seções de Língua Estrangeira 51-55,
    na mesma ordem em que aparecem no PDF — Espanhol, Inglês, Alemão,
    Francês, Italiano]).

    O texto extraído por `page.get_text()` já vem em ordem linha-a-linha
    correta para esta tabela (confirmado nos 3 anos): pares "NÚMERO\\nLETRA"
    em sequência de leitura natural, sem precisar de blocos por
    bounding-box como em app/services/unaerp/pdf_import.py. A seção de
    Língua Estrangeira repete os números 51-55 uma vez por idioma, na
    ordem: todos os "51" (um por idioma), depois todos os "52" etc. — por
    isso o agrupamento por idioma usa `indice % n_langs`, não o valor do
    número em si."""
    doc = fitz.open(str(path))
    try:
        full = "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()

    pairs = [(int(n), l) for n, l in _GABARITO_PAIR_RE.findall(full)]
    main: dict[int, str] = {}
    lang_pairs: list[tuple[int, str]] = []
    for num, letter in pairs:
        if num <= 50:
            main[num] = letter
        elif 51 <= num <= 55:
            lang_pairs.append((num, letter))

    langs: list[dict[int, str]] = [dict() for _ in range(n_langs)]
    for i, (num, letter) in enumerate(lang_pairs):
        langs[i % n_langs][num] = letter

    return main, langs


def _persist_exam(db, exam_name: str, year: int, questions: list[dict],
                   main_answers: dict[int, str], lang_answers: list[dict[int, str]]) -> tuple:
    """Grava as questões de UM ano, pulando anos já importados (mesmo
    exam_name) e questões sem gabarito conhecido (não encontrado, anuladas
    pela banca — "Anulada" — ou letra que não bate com nenhuma alternativa
    extraída)."""
    already = db.query(UfpaQuestion).filter(UfpaQuestion.exam_name == exam_name).count()
    if already > 0:
        return 0, already

    added = 0
    for q in questions:
        if q["subject"] in _LANGS:
            li = _LANGS.index(q["subject"])
            correct = lang_answers[li].get(q["number"])
        else:
            correct = main_answers.get(q["number"])

        if not correct or correct not in ("A", "B", "C", "D", "E"):
            continue
        if not any(letter == correct for letter, _ in q["alternatives"]):
            continue

        question = UfpaQuestion(
            exam_name=exam_name,
            subject=q["subject"],
            year=year,
            number=q["number"],
            statement=q["statement"],
        )
        db.add(question)
        db.flush()

        for order, (letter, text) in enumerate(q["alternatives"]):
            db.add(UfpaQuestionOption(
                question_id=question.id,
                text=text,
                is_correct=(letter == correct),
                order=order,
            ))
        added += 1

    db.commit()
    return added, 0


def import_ufpa_year(db, year: int, urls: dict) -> dict:
    """Importa o boletim de questões de UM ano do Processo Seletivo UFPA,
    casando-o com seu gabarito oficial."""
    import tempfile

    exam_name = f"UFPA {year}"
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        try:
            prova_path = tmp / "prova.pdf"
            gabarito_path = tmp / "gabarito.pdf"
            download_pdf(urls["prova"], prova_path)
            download_pdf(urls["gabarito"], gabarito_path)
        except Exception as e:
            return {"exam_name": exam_name, "year": year, "skipped": True,
                    "reason": f"Falha ao baixar prova/gabarito: {e}"}

        try:
            questions, skipped_parse = parse_prova(prova_path)
        except Exception as e:
            return {"exam_name": exam_name, "year": year, "skipped": True,
                    "reason": f"Falha ao parsear o boletim de questões (PDF pode estar escaneado/corrompido): {e}"}

        if not questions:
            return {"exam_name": exam_name, "year": year, "skipped": True,
                    "reason": "Nenhuma questão reconhecida no boletim (formato não reconhecido)"}

        try:
            main_answers, lang_answers = parse_gabarito(gabarito_path)
        except Exception as e:
            return {"exam_name": exam_name, "year": year, "skipped": True,
                    "reason": f"Falha ao parsear o gabarito: {e}"}

        added, skipped_existing = _persist_exam(db, exam_name, year, questions, main_answers, lang_answers)
        return {
            "exam_name": exam_name, "year": year,
            "total_parsed": len(questions),
            "total_added": added,
            "skipped_existing": skipped_existing,
            "unrecognized_questions": len(skipped_parse),
        }


def import_all_ufpa_exams(
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db=None,
    task_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """Importa todos os anos do Processo Seletivo UFPA com boletim de
    questões próprio conhecido — só PS 2011, 2012 e 2013 (ver docstring do
    módulo: a partir de PS 2014 a UFPA usa exclusivamente ENEM/SISU, sem
    prova própria). `since_year`/`until_year` restringem o intervalo, mas
    não ampliam o alcance real além desses 3 anos."""
    from app.database import SessionLocal

    close_after = db is None
    if db is None:
        db = SessionLocal()

    try:
        exams = fetch_exam_links(since_year=since_year, until_year=until_year)

        results = []
        total_added = 0
        total = len(exams)
        for i, (year, urls) in enumerate(sorted(exams.items()), start=1):
            try:
                r = import_ufpa_year(db, year, urls)
                results.append(r)
                total_added += r.get("total_added", 0)
            except Exception as e:
                db.rollback()
                r = {"exam_name": f"UFPA {year}", "year": year, "skipped": True, "reason": str(e)}
                results.append(r)

            if task_id:
                update_task_progress(task_id, current=i, total=total, log=r.get("exam_name", str(year)))

        summary = {
            "status": "success",
            "total_years_found": total,
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


# Compatibilidade com o nome antigo do stub, usado por app/routers/ufpa.py.
async def import_all(db, task_id: Optional[str] = None):
    return import_all_ufpa_exams(db=db, task_id=task_id)


async def process_and_import_ufpa_from_url(url: str, year: int, db):
    """Mantido por compatibilidade de assinatura com o stub anterior — não é
    mais o caminho usado por `import_all_ufpa_exams`, que já resolve as
    URLs de prova/gabarito de cada ano via `_KNOWN_EXAMS`."""
    return {"status": "not_implemented", "reason": "use import_all_ufpa_exams"}
