interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}

export default function Pagination({ page, totalPages, total, pageSize, onChange }: Props) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const btn = (label: React.ReactNode, target: number, disabled: boolean, active = false) => (
    <button
      key={String(label)}
      onClick={() => !disabled && onChange(target)}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-[#4f46e5] text-white'
          : disabled
          ? 'text-gray-300 dark:text-[#475569] cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-0.5">
        {btn('‹', page - 1, page === 1)}
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
            : btn(p, p as number, false, p === page)
        )}
        {btn('›', page + 1, page === totalPages)}
      </div>
    </div>
  )
}
