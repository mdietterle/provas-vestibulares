"""Testa o importador real da UFU parseando PDFs reais baixados do Portal de
Seleção (www.portalselecao.ufu.br) e persistindo em SQLite em memória — mesmo
padrão de setup usado em tests/test_models.py.

Os PDFs não são versionados no repo (arquivos grandes de fonte externa); este
teste baixa os cadernos/gabaritos reais das edições 2024, 2025 e 2026 do
Vestibular UFU direto do portal oficial e é pulado (não falha) se a rede não
estiver disponível — mesmo espírito dos demais importadores deste repo, que
dependem de raspagem de sites externos reais."""

import tempfile
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import UfuQuestion, UfuQuestionOption
from app.services.ufu.pdf_import import (
    download_pdf,
    fetch_editions,
    fetch_exam_links,
    parse_gabarito,
    parse_prova,
    _persist_exam,
)

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _network_or_skip(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except Exception as e:  # pragma: no cover - só dispara sem rede
        pytest.skip(f"Portal de Seleção UFU indisponível neste ambiente: {e}")


@pytest.mark.parametrize("year", [2024, 2025, 2026])
def test_import_real_edition_persists_real_question_counts(year):
    db = TestingSessionLocal()

    editions = _network_or_skip(fetch_editions)
    edition = next((e for e in editions if e["year"] == year), None)
    assert edition is not None, f"Edição {year} não encontrada na listagem de editais da UFU"

    links = _network_or_skip(fetch_exam_links, edition["cronograma_id"])
    assert links["gabarito_url"], f"Gabarito não encontrado para {year}"
    assert "1" in links["tipo_urls"], f"Caderno Tipo 1 não encontrado para {year}"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        gabarito_path = tmp / "gabarito.pdf"
        prova_path = tmp / "prova.pdf"
        _network_or_skip(download_pdf, links["gabarito_url"], gabarito_path)
        _network_or_skip(download_pdf, links["tipo_urls"]["1"], prova_path)

        gabarito = parse_gabarito(gabarito_path).get("1", {})
        questions = parse_prova(prova_path)

    assert len(questions) > 0, f"Nenhuma questão reconhecida no caderno {year} Tipo 1"
    assert len(gabarito) > 0, f"Nenhuma resposta reconhecida no gabarito {year} Tipo 1"

    exam_name = f"UFU {year} – Tipo 1 (test)"
    added, skipped_existing = _persist_exam(db, exam_name, year, questions, gabarito)

    print(f"UFU {year}: {len(questions)} questões parseadas, {added} importadas de verdade")
    assert added > 0

    persisted = db.query(UfuQuestion).filter(UfuQuestion.exam_name == exam_name).count()
    assert persisted == added
    options_count = (
        db.query(UfuQuestionOption)
        .join(UfuQuestion, UfuQuestionOption.question_id == UfuQuestion.id)
        .filter(UfuQuestion.exam_name == exam_name)
        .count()
    )
    assert options_count == added * 4  # cada questão UFU tem exatamente 4 alternativas (A-D)

    # Idempotência: reimportar a mesma edição não deve duplicar.
    added_again, existing_again = _persist_exam(db, exam_name, year, questions, gabarito)
    assert added_again == 0
    assert existing_again == added
