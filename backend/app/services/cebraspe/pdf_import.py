"""Investigado, URLs reais confirmadas, mas parsing ainda não validado
— NÃO marcar como importador real até terminar.

O stub anterior deste arquivo tinha dois problemas sérios: URLs
chutadas em `vestibular.cebraspe.br/pdf/{ano}/Prova_1fase.pdf` (nunca
testadas, formato que não existe) e a resposta de toda alternativa
sempre marcada `is_correct=False` (sem ler gabarito nenhum).

O que já foi confirmado de verdade nesta investigação:
  - URLs reais existem em `cdn.cebraspe.org.br/vestibulares/VESTUNB_{AA}/
    arquivos/` (edições 2019-2025 têm nomes previsíveis por prova/dia,
    ex.: `009_VEST_UNB_2025_001_01.PDF` + gabarito
    `GAB_DEFINITIVO_009_VEST_UNB_2025_001_01.PDF`; 2026+ usa hash em vez
    de nome). Confirmado baixando o PDF de verdade (200 OK, texto
    extraível).
  - O gabarito é uma tabela — extraível de forma confiável usando
    posição de palavra (fitz `page.get_text("words")`), agrupando por
    linha: toda linha cujo primeiro token é "Item" é seguida da linha
    "Gabarito" com as respostas na mesma ordem horizontal. Validado
    manualmente contra o PDF de 2025 (30 itens por bloco, 3 blocos).
  - O que NÃO está resolvido: o caderno de prova NÃO tem um marcador
    de questão como "Questão N" ou "--------- N ---------" (usado por
    praticamente todos os outros importadores deste repo) — o número
    do item aparece solto no meio do parágrafo (ex.: "20 El enunciado
    «El fondo...»"), indistinguível por regex simples de qualquer outro
    número solto no texto (datas, medidas, etc.), sem arriscar
    resultado errado silencioso. Também mistura itens Certo/Errado
    (sem alternativas impressas) com itens de múltipla escolha A-E no
    mesmo caderno, exigindo lógica de classificação por item.

Decisão: não implementado ainda. Precisa de extração posicional do
caderno de prova também (não só do gabarito) pra achar o número do
item com confiança — não dá pra fazer isso com o mesmo nível de certeza
dos outros importadores no tempo investido até agora. `hasRealImporter`
para 'cebraspe' foi removido em frontend/src/data/universities.ts
até este módulo ser terminado e validado."""

from typing import Optional


def seed_cebraspe(db, year: int, **kwargs) -> dict:
    raise NotImplementedError(
        "Importador do Cebraspe/UnB ainda não implementado de verdade — "
        "ver docstring deste módulo para o que já foi investigado e "
        "confirmado (URLs reais, estrutura do gabarito) e o que falta "
        "(parser do caderno de prova, que não tem marcador de questão "
        "claro)."
    )


def import_all_cebraspe_exams(since_year: Optional[int] = None, until_year: Optional[int] = None, db=None, task_id: Optional[str] = None, **kwargs) -> dict:
    raise NotImplementedError(
        "Importador do Cebraspe/UnB ainda não implementado de verdade — "
        "ver docstring deste módulo."
    )
