import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

/** Trilha "você está aqui", reutilizável em qualquer página de detalhe
 * (universidade, exame, redação...). Último item nunca é link. */
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-300">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg className="w-3.5 h-3.5 text-[#c5c5d3] dark:text-[#3a4a6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.to && !isLast ? (
                <Link to={item.to} className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-semibold text-[#1E293B] dark:text-[#e5e9f5]' : 'font-medium'} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
