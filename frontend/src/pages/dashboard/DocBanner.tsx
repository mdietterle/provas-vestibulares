export function DocBanner({
  docUrl,
  title,
  description,
  extraLinks,
}: {
  docUrl: string
  title: string
  description: string
  extraLinks?: { label: string; url: string }[]
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', boxShadow: '0 8px 32px rgba(13,148,136,0.25)' }}
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: '#fff' }} />
      <div className="absolute -right-2 bottom-[-30px] w-24 h-24 rounded-full opacity-10" style={{ background: '#fff' }} />

      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">Documentação</span>
        </div>
        <p className="font-display text-base font-bold text-white">{title}</p>
        <p className="text-sm text-white/75 mt-0.5 leading-relaxed">{description}</p>
        {extraLinks && extraLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {extraLinks.map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/80 hover:text-white underline underline-offset-2 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <a
        href={docUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white hover:bg-white/90 z-10 text-teal-600"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Abrir Manual
      </a>
    </div>
  )
}