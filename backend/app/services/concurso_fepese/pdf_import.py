"""Importa questões de concursos organizados pela banca FEPESE (Fundação de
Estudos e Pesquisas Socioeconômicos), a partir do PDF "Prova e Gabarito
Provisório" publicado no site oficial de cada concurso.

Diferente das universidades (uma tabela por instituição, uma banca própria por
prova), a FEPESE organiza concursos de dezenas de órgãos/municípios diferentes
com o MESMO formato de PDF — um importador só cobre todos, o que muda é o
`concurso_slug` (subdomínio) e o código do cargo (nome do arquivo).

Validado baixando de verdade dois concursos reais e distintos:
  - 2024psconcordiasaude (Processo Seletivo, Município de Concórdia, cargo F1
    "Motorista Socorrista", 20 questões)
  - 2024cidasc (Concurso Público, CIDASC, cargo MV "Médico Veterinário", 40
    questões)
Em ambos, todas as questões foram reconhecidas em sequência (sem lacunas) e a
resposta correta extraída bateu 100% contra a tabela do gabarito oficial
publicado à parte.

Formato do PDF (constante nos dois casos testados):
  - Layout em DUAS COLUNAS por página — a extração de texto "corrida" do
    PyMuPDF intercala as colunas fora de ordem (ex.: questões 1-7, 12-13,
    8-11, ...). Por isso `_page_text_columns` lê os blocos de texto da
    página, separa por coluna (posição X) e concatena coluna esquerda inteira
    antes da direita.
  - Marcador de questão: "N.\\u2002" (número, ponto, ESPAÇO EN — não espaço
    normal) no início de linha.
  - Alternativas: "a." a "e." seguidas de TAB, um ícone de checkbox ("square"
    = não marcada, "check-square" = marcada — a capitalização varia entre
    PDFs, daí o regex ser case-insensitive), TAB, texto da alternativa. A
    resposta certa já vem marcada no próprio caderno (não precisa cruzar com
    o arquivo de gabarito separado, embora ele exista como fonte oficial
    adicional para conferência).
  - Cabeçalho de bloco por matéria: "<Matéria>\\t\\n<N> questões".
  - Cada página traz ruído de cabeçalho/rodapé repetido (numeração de
    página, nome do órgão + edital, código do cargo) removido por
    `LINE_NOISE` antes do parsing.
  - Parsing para no início da "GRADE DE RESPOSTAS" (cartão-resposta em
    branco), que não contém questões.

Não implementado ainda: descoberta automática de concursos/cargos (não há
API/catálogo — cada concurso é um subdomínio manual) e apenas a resposta do
caderno é usada como gabarito; nenhuma comparação automática contra o arquivo
"gabarito_definitivo" pós-recurso foi implementada, então uma correção de
gabarito publicada depois da prova não é refletida automaticamente.
"""

from __future__ import annotations

import gc
import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests


_HEADERS = {"User-Agent": "Mozilla/5.0"}

_QMARK = re.compile(r"\n(\d{1,2})\. ")
_LINE_NOISE = re.compile(r"(?m)^(Página \d+.*|.*Edital \d+/\d{4}.*|[A-Z]{1,4}\d{0,2}  .+)$")
_ALT = re.compile(r"([a-e])\.\t\s*(square|check-square)\t\s*", re.IGNORECASE)
_SUBJECT = re.compile(r"([A-Za-zÀ-ÿ ]+)\t\n(\d+) questões")


def _base_url(concurso_slug: str) -> str:
    return f"https://{concurso_slug}.fepese.org.br"


def download_pdf(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=60, headers=_HEADERS)
    resp.raise_for_status()
    if resp.content[:4] != b"%PDF":
        raise ValueError("A URL não retornou um PDF (link pode não existir mais ou exigir outro parâmetro).")
    dest.write_bytes(resp.content)


def _page_text_columns(page: "fitz.Page") -> str:
    """Reordena os blocos de texto por coluna (esquerda inteira, depois
    direita) — a extração corrida do PyMuPDF intercala as duas colunas do
    layout da FEPESE fora de ordem de leitura."""
    mid = page.rect.width / 2
    blocks = [b for b in page.get_text("blocks") if b[6] == 0]  # só blocos de texto
    left = sorted((b for b in blocks if b[0] < mid), key=lambda b: b[1])
    right = sorted((b for b in blocks if b[0] >= mid), key=lambda b: b[1])
    return "".join(b[4] for b in left) + "\n" + "".join(b[4] for b in right)


def parse_fepese_pdf(pdf_path: Path) -> list[dict]:
    """Parseia um caderno de prova FEPESE (um cargo) e retorna a lista de
    questões com a alternativa correta já identificada pelo checkbox
    marcado no próprio texto."""
    doc = fitz.open(str(pdf_path))
    full = ""
    for page in doc:
        raw = page.get_text()
        if "GRADE" in raw and "RESPOSTAS" in raw:
            break
        full += "\n" + _page_text_columns(page)
    doc.close()

    full = _LINE_NOISE.sub("", full)

    subjects = list(_SUBJECT.finditer(full))

    def subject_for(pos: int) -> Optional[str]:
        current = None
        for m in subjects:
            if m.start() <= pos:
                current = m.group(1).strip()
            else:
                break
        return current

    marks = list(_QMARK.finditer(full))
    questions: list[dict] = []
    for i, m in enumerate(marks):
        number = int(m.group(1))
        start = m.end()
        end = marks[i + 1].start() if i + 1 < len(marks) else len(full)
        body = full[start:end]

        alts = list(_ALT.finditer(body))
        if len(alts) < 4:
            continue  # questão anulada/fora de padrão nesse caderno — pula

        statement = re.sub(r"\xad\n", "", body[: alts[0].start()])
        statement = re.sub(r"\s+", " ", statement).strip()
        if not statement:
            continue

        options: list[tuple[str, str]] = []
        correct: Optional[str] = None
        for j, am in enumerate(alts):
            letter = am.group(1).upper()
            marker = am.group(2).lower()
            text_start = am.end()
            text_end = alts[j + 1].start() if j + 1 < len(alts) else len(body)
            text = re.sub(r"\xad\n", "", body[text_start:text_end])
            text = re.sub(r"\s+", " ", text).strip()
            options.append((letter, text))
            if marker == "check-square":
                correct = letter

        questions.append({
            "number": number,
            "subject": subject_for(m.start()),
            "statement": statement,
            "options": options,
            "correct": correct,
        })
    return questions


def import_fepese_cargo(
    db,
    concurso_slug: str,
    orgao: str,
    edital: str,
    year: int,
    cargo: str,
    cargo_code: str,
    exam_type: Optional[str] = None,
) -> dict:
    """Importa a prova de UM cargo de um concurso FEPESE já publicado.

    `cargo_code` é o nome do arquivo no site (sem ".pdf"), ex.: "F1", "MV" —
    visível na página `?go=provas&edital=N` de cada concurso."""
    import tempfile

    from app.models import VestibularQuestion
    already = (
        db.query(VestibularQuestion)
        .filter(
            VestibularQuestion.exam_type == "concurso_fepese",
            VestibularQuestion.extra_data["concurso_slug"].astext == concurso_slug,
            VestibularQuestion.extra_data["cargo_code"].astext == cargo_code,
        )
        .count()
    )
    if already > 0:
        return {"concurso_slug": concurso_slug, "cargo_code": cargo_code, "total_parsed": 0, "total_added": 0, "skipped_existing": already}

    url = f"{_base_url(concurso_slug)}/?go=download&path=2&inline=1&arquivo={cargo_code}.pdf"
    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "prova.pdf"
        download_pdf(url, pdf_path)
        parsed = parse_fepese_pdf(pdf_path)

    if not parsed:
        return {
            "concurso_slug": concurso_slug,
            "cargo_code": cargo_code,
            "total_parsed": 0,
            "total_added": 0,
            "skipped": True,
            "reason": "Nenhuma questão reconhecida (PDF em formato inesperado)",
        }

    from app.services.import_batch import save_vestibular_question

    added = 0
    skipped_existing = 0
    for q in parsed:
        if q["correct"] is None:
            continue  # sem alternativa marcada — não dá pra confiar no gabarito
        options = [
            {
                "letter": letter,
                "text": text,
                "is_correct": (letter == q["correct"]),
                "order": order,
            }
            for order, (letter, text) in enumerate(q["options"])
        ]
        metadata = {
            "concurso_slug": concurso_slug,
            "orgao": orgao,
            "edital": edital,
            "cargo": cargo,
            "cargo_code": cargo_code,
            "subject": q["subject"],
        }
        vq, created = save_vestibular_question(
            db,
            exam_type="concurso_fepese",
            exam_name=f"{orgao} {edital}",
            year=year,
            number=q["number"],
            statement=q["statement"],
            options=options,
            correct_option=q["correct"],
            metadata=metadata,
        )
        if not created:
            skipped_existing += 1
            continue
        added += 1

        # Commita em lotes — mesma razão de UFPR/ENEM/ITA: acumular a prova
        # inteira na sessão antes de um único commit já estourou memória em
        # produção (Render free, teto de 512MB).
        if added % 10 == 0:
            db.commit()
            db.expunge_all()
            gc.collect()

    db.commit()
    db.expunge_all()
    gc.collect()
    return {"concurso_slug": concurso_slug, "cargo_code": cargo_code, "total_parsed": len(parsed), "total_added": added, "skipped_existing": skipped_existing}


def import_fepese_concurso(
    db,
    concurso_slug: str,
    orgao: str,
    edital: str,
    year: int,
    cargos: list[dict],
    exam_type: Optional[str] = None,
) -> dict:
    """Importa vários cargos de um mesmo concurso. `cargos` é uma lista de
    `{"cargo": "Motorista Socorrista", "cargo_code": "F1"}` — não há
    descoberta automática dos cargos (sem catálogo/API), precisa ser
    levantada manualmente na página `?go=provas&edital=N` do concurso."""
    results = []
    total_added = 0
    for c in cargos:
        try:
            r = import_fepese_cargo(
                db, concurso_slug, orgao, edital, year,
                cargo=c["cargo"], cargo_code=c["cargo_code"], exam_type=exam_type,
            )
            results.append(r)
            total_added += r.get("total_added", 0)
        except Exception as e:
            db.rollback()
            results.append({"cargo_code": c.get("cargo_code"), "skipped": True, "reason": str(e)})
    return {"concurso_slug": concurso_slug, "total_added": total_added, "cargos": results}
