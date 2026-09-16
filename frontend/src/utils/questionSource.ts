// Questões importadas de bancos públicos (ENEM, ACAFE, UFPR, UFRGS, UFSC) têm a origem
// embutida no fim do enunciado no formato "[ENEM 2023 – Q45]" pelo backend.
// Estas funções extraem essa marcação para exibi-la como uma tag de "Fonte"
// separada do texto da questão, tanto na prova online quanto no PDF.

export interface ExtractedSource {
  /** Enunciado sem o marcador de fonte. Pode conter HTML. */
  statement: string
  /** Texto da fonte já normalizado (ex.: "ENEM 2023 · Q45"), ou null se não houver. */
  source: string | null
}

/**
 * Remove o marcador "[... – Qn]" do fim do enunciado e devolve a fonte separada.
 * Lida com HTML (o marcador pode estar dentro de uma tag de fechamento, ex.
 * "...texto [ENEM 2023 – Q45]</p>"), removendo apenas o trecho do marcador.
 */
export function extractSource(rawStatement: string): ExtractedSource {
  if (!rawStatement) return { statement: rawStatement, source: null }

  // Tenta casar diretamente no fim do conteúdo textual.
  // Para suportar HTML, procuramos o último "[...]" com o padrão de fonte.
  const matches = [...rawStatement.matchAll(/\[\s*([^\]]*?(?:–|-)\s*Q\s*\d+[^\]]*?)\s*\]/gi)]
  if (matches.length === 0) {
    // fallback: padrão sem "Qn" (ex.: "[ENEM 2023]")
    const simple = rawStatement.match(/\[\s*((?:ENEM|ACAFE|UFPR|UFRGS|UFSC|ITA)[^\]]*?)\s*\]\s*$/i)
    if (simple) {
      return {
        statement: rawStatement.replace(simple[0], '').trimEnd(),
        source: normalizeSource(simple[1]),
      }
    }
    return { statement: rawStatement, source: null }
  }

  const last = matches[matches.length - 1]
  const marker = last[0]
  const sourceText = last[1]

  // Remove apenas a primeira ocorrência do marcador encontrado (a última no texto).
  const idx = rawStatement.lastIndexOf(marker)
  const statement = (rawStatement.slice(0, idx) + rawStatement.slice(idx + marker.length))
    .replace(/\s*<br\s*\/?>\s*$/i, '')
    .trimEnd()

  return { statement, source: normalizeSource(sourceText) }
}

/** Normaliza "ENEM 2023 – Q45" para "ENEM 2023 · Q45" (travessão/hífen → ponto médio). */
function normalizeSource(s: string): string {
  return s.replace(/\s*[–-]\s*/g, ' · ').replace(/\s+/g, ' ').trim()
}
