from __future__ import annotations

"""Estimativa de nota no estilo ENEM (escala 0-1000) para os simulados.

IMPORTANTE — isso NÃO é a metodologia oficial da TRI (Teoria de Resposta ao
Item) usada pelo INEP. A TRI real calibra cada item com parâmetros de
dificuldade/discriminação obtidos de aplicações em massa (dados que o INEP não
publica por questão), e a nota depende do PADRÃO de acertos (acertar questões
difíceis vale mais que acertar fáceis), não só da quantidade de acertos.

Como não temos acesso a esses parâmetros oficiais para a maioria das questões
importadas, esta é uma ESTIMATIVA simplificada: converte o percentual de
acertos por área numa nota na escala 0-1000, usando uma curva logística que
comprime os extremos — assim como na TRI real, 0% de acerto não vira nota 0
nem 100% vira nota 1000 (ninguém "zera" ou "estoura o teto" com base só na
quantidade de acertos). É apresentada ao aluno como estimativa, não como
promessa de nota real.
"""


import math

# Faixa aproximada de notas observadas historicamente por área no ENEM
# (a grande maioria dos candidatos fica entre ~350 e ~850).
_FLOOR = 320.0
_CEIL = 880.0
_STEEPNESS = 6.0


def estimate_enem_score(pct_correct: float) -> float:
    """pct_correct: fração de acertos entre 0 e 1. Retorna nota estimada 0-1000."""
    pct_correct = max(0.0, min(1.0, pct_correct))
    z = _STEEPNESS * (pct_correct - 0.5)
    sigmoid = 1 / (1 + math.exp(-z))
    return round(_FLOOR + (_CEIL - _FLOOR) * sigmoid, 1)


def build_score_breakdown(area_stats: dict[str, dict[str, int]]) -> dict:
    """area_stats: {area: {"correct": int, "total": int}}.

    Retorna {"overall": float, "by_area": {area: {"correct", "total", "pct", "score"}}}.
    """
    by_area = {}
    for area, stats in area_stats.items():
        total = stats.get("total", 0)
        correct = stats.get("correct", 0)
        pct = correct / total if total > 0 else 0.0
        by_area[area] = {
            "correct": correct,
            "total": total,
            "pct": round(pct * 100, 1),
            "score": estimate_enem_score(pct),
        }

    scores = [v["score"] for v in by_area.values() if v["total"] > 0]
    overall = round(sum(scores) / len(scores), 1) if scores else None

    return {"overall": overall, "by_area": by_area}
