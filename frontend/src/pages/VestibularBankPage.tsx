import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { vestibularApi } from '../api/vestibular'
import type { VestibularQuestion } from '../api/vestibular'
import { getExamBankConfig, type ExamBankConfig } from '../config/examBanks'
import Pagination from '../components/Pagination'

interface Props {
  examType: string
}

export default function VestibularBankPage({ examType }: Props) {
  const config = getExamBankConfig(examType)
  const [searchParams, setSearchParams] = useSearchParams()

  const [questions, setQuestions] = useState<VestibularQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])

  const page = Number(searchParams.get('page')) || 1
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const area = searchParams.get('area') || undefined
  const language = searchParams.get('language') || undefined
  const search = searchParams.get('q') || undefined

  useEffect(() => {
    setLoading(true)
    Promise.all([
      vestibularApi.listQuestions(examType, { page, year, area, language, search, size: 20 }),
      vestibularApi.getYears(examType),
      vestibularApi.getAreas(examType),
      config.filters.includes('language') ? vestibularApi.getLanguages(examType) : Promise.resolve([]),
    ])
      .then(([list, y, a, l]) => {
        setQuestions(list.items)
        setTotal(list.total)
        setYears(y)
        setAreas(a)
        setLanguages(l)
      })
      .finally(() => setLoading(false))
  }, [examType, page, year, area, language, search, config.filters])

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-[#1E293B] dark:text-white">
          Banco de Questões — {config.label}
        </h1>
        <span className="text-sm text-[#64748B]">{total} questões</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {config.filters.includes('year') && (
          <label className="flex flex-col gap-1 text-xs font-medium text-[#334155] dark:text-slate-400">
            Ano
            <select
              value={year ?? ''}
              onChange={e => updateFilter('year', e.target.value || undefined)}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white dark:bg-[#1e1e2e] dark:border-[#334155] text-sm min-w-[100px]"
            >
              <option value="">Todos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}
        {config.filters.includes('area') && (
          <label className="flex flex-col gap-1 text-xs font-medium text-[#334155] dark:text-slate-400">
            Área
            <select
              value={area ?? ''}
              onChange={e => updateFilter('area', e.target.value || undefined)}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white dark:bg-[#1e1e2e] dark:border-[#334155] text-sm min-w-[160px]"
            >
              <option value="">Todas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        )}
        {config.filters.includes('language') && languages.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-[#334155] dark:text-slate-400">
            Idioma
            <select
              value={language ?? ''}
              onChange={e => updateFilter('language', e.target.value || undefined)}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white dark:bg-[#1e1e2e] dark:border-[#334155] text-sm min-w-[120px]"
            >
              <option value="">Todos</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-[#334155] dark:text-slate-400 flex-1 min-w-[200px]">
          Busca
          <input
            type="text"
            placeholder="Buscar no enunciado..."
            defaultValue={search ?? ''}
            onBlur={e => updateFilter('q', e.target.value || undefined)}
            onKeyDown={e => e.key === 'Enter' && updateFilter('q', (e.target as HTMLInputElement).value || undefined)}
            className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white dark:bg-[#1e1e2e] dark:border-[#334155] text-sm w-full"
          />
        </label>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="amber-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 text-[#64748B] text-sm">Nenhuma questão encontrada.</div>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <QuestionCard key={q.id} question={q} config={config} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 20 && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / 20)}
          total={total}
          pageSize={20}
          onChange={(p: number) => updateFilter('page', String(p))}
        />
      )}
    </div>
  )
}

function QuestionCard({ question: q, config }: { question: VestibularQuestion; config: ExamBankConfig }) {
  const areaColor = q.metadata?.area ? config.areaColors[q.metadata.area] ?? 'bg-gray-100 text-gray-600' : ''

  return (
    <div className="bg-white dark:bg-[#1e1e2e] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-amber-500">#{q.number}</span>
          {q.exam_name && <span className="text-xs text-[#64748B]">{q.exam_name}</span>}
          {q.metadata?.area && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${areaColor}`}>
              {q.metadata.area}
            </span>
          )}
          {q.metadata?.language && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {q.metadata.language}
            </span>
          )}
          {q.is_annulled && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Anulada
            </span>
          )}
        </div>
        <span className="text-xs text-[#9ca3af] shrink-0">{q.year}</span>
      </div>

      {/* Statement */}
      <div className="text-sm text-[#1E293B] dark:text-slate-200 leading-relaxed whitespace-pre-line">
        {q.html_statement ? <div dangerouslySetInnerHTML={{ __html: q.html_statement }} /> : q.statement}
      </div>

      {/* Image */}
      {q.image_base64 && (
        <img src={q.image_base64} alt="Enunciado" className="max-h-48 rounded-lg border border-[#E2E8F0]" />
      )}
      {q.images.length > 0 && q.images.map(img => (
        <img key={img.id} src={img.image_base64} alt="Questão" className="max-h-48 rounded-lg border border-[#E2E8F0]" />
      ))}

      {/* Options */}
      <div className="space-y-1.5 pt-1">
        {q.options.sort((a, b) => a.order - b.order).map(opt => (
          <div
            key={opt.id}
            className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              opt.is_correct
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-slate-800'
            }`}
          >
            {config.optionStyle === 'letter' && opt.letter && (
              <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                opt.is_correct ? 'bg-green-600 text-white' : 'bg-white dark:bg-[#334155] text-[#64748B]'
              }`}>
                {opt.letter}
              </span>
            )}
            {config.optionStyle === 'value' && opt.value != null && (
              <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                opt.is_correct ? 'bg-green-600 text-white' : 'bg-white dark:bg-[#334155] text-[#64748B]'
              }`}>
                {opt.value}
              </span>
            )}
            <span className={opt.is_correct ? 'text-green-800 dark:text-green-300 font-medium' : 'text-[#334155] dark:text-slate-300'}>
              {opt.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}