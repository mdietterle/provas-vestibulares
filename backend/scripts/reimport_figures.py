"""Corrige questoes cuja figura (Figura N no enunciado) nao foi capturada na
importacao original, porque era um desenho vetorial nativo do PDF (nao um
XObject de imagem raster) - bug corrigido em app/services/pdf_figures.py.

Este script:
  1. Remove apenas as questoes especificas identificadas como afetadas
     (levantadas via consulta ao banco: statement casa Figura seguido de
     numero, sem imagem associada). Nao mexe na prova inteira - so nas
     questoes quebradas, para o dedup dos importadores (mesma
     exam_name+number+language) pular tudo que ja esta correto e reinserir
     so o que foi removido, agora com a figura capturada.
  2. Reimporta cada prova afetada usando o importador correspondente.

Rodar depois do deploy da correcao em pdf_figures.py, em um ambiente com
acesso ao banco de producao e a internet:

    python reimport_affected_figure_questions.py

UFSC e reimportada online, direto de
vestibularunificado2025.ufsc.br/provas-anteriores/ (mesmo scraper usado pelo
endpoint "Importar todas" do Owner) - nao depende de nenhum PDF local.
"""

from __future__ import annotations

from app.database import SessionLocal
from app.services.enem.pdf_import import import_enem_pdf
from app.services.ufsc.pdf_import import import_all_ufsc_exams

# Levantado em 2026-08-28 via consulta direta ao Supabase (projeto "provas").
ENEM_AFFECTED_IDS = [2777, 2430, 2465, 2612, 1684]
ENEM_EXAMS = [
    (2018, 1),
    (2020, 2),
    (2021, 2),
    (2025, 2),
]

UFSC_AFFECTED_IDS = [
    1650, 1651, 1652, 1653, 1654, 1655,
    1617, 1618, 1619, 1620, 1621, 1622,
    1683, 1684, 1685, 1686, 1687, 1688,
    1551, 1552, 1553, 1554, 1555, 1556,
    1584, 1585, 1586, 1587, 1588, 1589,
    1716, 1717, 1718, 1719, 1720, 1721,
    1738, 1749, 1750, 1751, 1752, 1753, 1754,
    1759, 1782, 1783, 1784, 1785, 1786, 1787,
    1812, 1813, 1852, 1853, 1892, 1893,
    1345, 1346, 1347, 1348, 1350, 1351,
    112, 154, 196, 238, 280, 322, 364, 406, 448,
]


def _remove_questions(db, question_model, option_model, ids, image_model=None):
    if not ids:
        return 0
    if image_model is not None:
        db.query(image_model).filter(image_model.question_id.in_(ids)).delete(synchronize_session=False)
    db.query(option_model).filter(option_model.question_id.in_(ids)).delete(synchronize_session=False)
    n = db.query(question_model).filter(question_model.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return n


def main() -> None:
    from app.models import (
        EnemQuestion, EnemQuestionOption,
        UfscQuestion, UfscQuestionOption, UfscQuestionImage,
    )

    db = SessionLocal()
    try:
        removed_enem = _remove_questions(db, EnemQuestion, EnemQuestionOption, ENEM_AFFECTED_IDS)
        print(f"ENEM: {removed_enem} questoes com figura quebrada removidas.")

        for year, day in ENEM_EXAMS:
            try:
                r = import_enem_pdf(
                    prova_path=None,
                    gabarito_path=None,
                    year=year,
                    day=day,
                    db=db,
                    mec_page_url=(
                        "https://www.gov.br/inep/pt-br/areas-de-atuacao/"
                        f"avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/{year}"
                    ),
                )
                print(f"ENEM {year} dia {day}: {r}")
            except Exception as e:
                print(f"ENEM {year} dia {day}: FALHOU - {e}")

        removed_ufsc = _remove_questions(
            db, UfscQuestion, UfscQuestionOption, UFSC_AFFECTED_IDS, image_model=UfscQuestionImage,
        )
        print(f"UFSC: {removed_ufsc} questoes com figura quebrada removidas.")

        r = import_all_ufsc_exams(since_year=2020, db=db)
        print(f"UFSC reimportado: {r}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
