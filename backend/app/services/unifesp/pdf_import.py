"""NÃO HÁ prova objetiva pra importar aqui — investigado e confirmado.

O "Sistema Misto" da UNIFESP (ingresso.unifesp.br/vestibulares-anteriores)
combina a nota do ENEM com uma prova complementar própria (PLIT — Prova de
Leitura e Interpretação de Texto — e PCE — Prova de Conhecimentos
Específicos), e essa prova complementar é **inteiramente discursiva**: o
caderno baixado de verdade (ex.: "caderno de prova 2 dia" do Vestibular
2023) traz no rodapé "Esta prova contém 20 questões discursivas" e não
existe nenhum caderno "1º dia" ou de múltipla escolha em nenhuma edição
verificada (2018-2026) — só o dia único discursivo. Não há gabarito com
letra A-E pra casar, porque não existem alternativas.

Isso não encaixa no modelo `UnifespQuestion`/`UnifespQuestionOption`
(que assume alternativas A-E com uma correta), usado por todos os outros
importadores deste repositório — forçar um "import" aqui produziria
questões sem resposta certa de verdade, exatamente o problema que este
arquivo substituiu (o stub anterior tinha URLs chutadas nunca validadas
e sempre marcava is_correct=False).

Decisão: não implementar. `hasRealImporter` para 'unifesp' foi removido
em frontend/src/data/universities.ts. Se um dia a UNIFESP voltar a
publicar prova objetiva de múltipla escolha, este módulo pode ser escrito
do zero seguindo o padrão dos demais (ver app/services/unesp/pdf_import.py
como referência mais próxima)."""

from typing import Optional


def seed_unifesp(db, year: int, **kwargs) -> dict:
    raise NotImplementedError(
        "A prova complementar da UNIFESP (Sistema Misto) é discursiva, sem "
        "alternativas A-E — não há gabarito objetivo pra importar. Ver "
        "docstring deste módulo para a investigação completa."
    )


def import_all_unifesp_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db=None, task_id: Optional[str] = None, **kwargs) -> dict:
    raise NotImplementedError(
        "A prova complementar da UNIFESP (Sistema Misto) é discursiva, sem "
        "alternativas A-E — não há gabarito objetivo pra importar. Ver "
        "docstring deste módulo para a investigação completa."
    )
