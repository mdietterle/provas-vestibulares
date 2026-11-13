// Tags de bloco: ao remover a tag, o texto de um bloco grudava no do próximo
// ("TEXTO I</p><p>As mariposas" → "TEXTO IAs mariposas"). Viram quebra de linha.
const BLOCK_TAG = /<\/?(?:p|div|br|h[1-6]|li|ul|ol|tr|table|thead|tbody|tfoot|blockquote|pre|section|article|header|footer|figure|figcaption|hr|dd|dt|dl)\b[^>]*>/gi
// Células de tabela/legenda ficam na mesma linha, separadas por espaço.
const INLINE_SEP_TAG = /<\/?(?:td|th|caption|img)\b[^>]*>/gi

/** Strip HTML tags for display-only preview contexts.
 *  Removes <script>/<style> blocks entirely, turns block-level tags into line
 *  breaks (so paragraphs don't glue together), strips remaining tags, then
 *  decodes common HTML entities. Output is plain text — render it with
 *  `whitespace-pre-line` to keep the paragraph breaks, or as-is to fold them
 *  into spaces. */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(BLOCK_TAG, '\n')
    .replace(INLINE_SEP_TAG, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Single-line version of {@link stripHtml} (line breaks folded into spaces),
 *  for table cells, titles and truncated previews. */
export function stripHtmlInline(html: string): string {
  return stripHtml(html).replace(/\s+/g, ' ').trim()
}

/** pt-BR pluralization: singular when count === 1, plural otherwise. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateShortFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const percentIntFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format date as "31 de outubro de 2026". */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return dateFormatter.format(d)
}

/** Format date as "31/10/2026". */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return dateShortFormatter.format(d)
}

/** Format date+time as "31/10/2026 14:30". */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return dateTimeFormatter.format(d)
}

/** Format a 0-100 number as "72,5%". */
export function formatPercent(value: number, decimals = 1): string {
  const fmt = decimals === 0 ? percentIntFormatter : percentFormatter
  return fmt.format(value / 100)
}