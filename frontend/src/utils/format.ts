/** Sanitize HTML for safe rendering with dangerouslySetInnerHTML.
 *  Uses DOMParser to parse the HTML, removes dangerous elements/attributes,
 *  and returns clean HTML string. Falls back to stripHtml if DOMParser unavailable. */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') return stripHtml(html)

  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Remove dangerous elements
  const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button, link, meta, base, applet')
  dangerous.forEach(el => el.remove())

  // Remove event handler attributes from all elements
  const allElements = doc.body?.querySelectorAll('*') ?? []
  allElements.forEach(el => {
    const attrs = Array.from(el.attributes)
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.trim().startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
    // Remove href/src with javascript: protocol
    const href = el.getAttribute('href')
    const src = el.getAttribute('src')
    if (href && href.trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('href')
    if (src && src.trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('src')
  })

  return doc.body?.innerHTML ?? ''
}

/** Strip HTML tags for display-only preview contexts.
 *  Removes <script>/<style> blocks entirely, then strips remaining tags,
 *  then decodes common HTML entities. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
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