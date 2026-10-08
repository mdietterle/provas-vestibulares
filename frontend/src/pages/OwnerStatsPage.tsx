import { useState, useEffect, useMemo, Fragment } from 'react'
import { ownerApi } from '../api'
import type { DetailedStatsResponse } from '../api'
import { Activity, ChevronDown, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortDirection = 'asc' | 'desc'

function SortableHeader<K extends string>({
  label,
  sortKey,
  active,
  direction,
  align = 'left',
  onSort,
}: {
  label: string
  sortKey: K
  active: boolean
  direction: SortDirection
  align?: 'left' | 'right'
  onSort: (key: K) => void
}) {
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-600 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-slate-600' : 'text-gray-300'}`} />
      </span>
    </th>
  )
}

type UniversitySortKey = 'university' | 'years' | 'total'

function QuestionBankByUniversity({ questions }: { questions: DetailedStatsResponse['questions'] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<UniversitySortKey>('total')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  function handleSort(key: UniversitySortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'university' ? 'asc' : 'desc')
    }
  }

  const byUniversity = useMemo(() => {
    const map = new Map<string, { total: number; byYear: Map<number, number> }>()
    for (const q of questions) {
      let entry = map.get(q.university)
      if (!entry) {
        entry = { total: 0, byYear: new Map() }
        map.set(q.university, entry)
      }
      entry.total += q.count
      entry.byYear.set(q.year, (entry.byYear.get(q.year) ?? 0) + q.count)
    }
    const dirMult = sortDir === 'asc' ? 1 : -1
    return Array.from(map.entries())
      .map(([university, { total, byYear }]) => ({
        university,
        total,
        years: Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]),
      }))
      .filter(u => u.university.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortKey === 'university') return dirMult * a.university.localeCompare(b.university, 'pt-BR')
        if (sortKey === 'years') return dirMult * (a.years.length - b.years.length)
        return dirMult * (a.total - b.total)
      })
  }, [questions, search, sortKey, sortDir])

  const grandTotal = useMemo(() => questions.reduce((s, q) => s + q.count, 0), [questions])

  function toggle(uni: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(uni) ? next.delete(uni) : next.add(uni)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h4 className="text-sm font-semibold text-[#334155]">
          Questões no Banco <span className="text-xs font-normal text-gray-400">({grandTotal.toLocaleString('pt-BR')} no total, {byUniversity.length} universidades)</span>
        </h4>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar universidade..."
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-600 w-48"
        />
      </div>
      <div className="max-h-[420px] overflow-y-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-100">
              <SortableHeader label="Universidade" sortKey="university" active={sortKey === 'university'} direction={sortDir} onSort={handleSort} />
              <SortableHeader label="Anos" sortKey="years" active={sortKey === 'years'} direction={sortDir} align="right" onSort={handleSort} />
              <SortableHeader label="Questões" sortKey="total" active={sortKey === 'total'} direction={sortDir} align="right" onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {byUniversity.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-6 text-xs text-gray-400">Nenhuma universidade encontrada</td></tr>
            ) : byUniversity.map(u => {
              const isOpen = expanded.has(u.university)
              return (
                <Fragment key={u.university}>
                  <tr
                    onClick={() => toggle(u.university)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-medium text-gray-700 flex items-center gap-1.5">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      {u.university}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400">{u.years.length}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-600">{u.total.toLocaleString('pt-BR')}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={3} className="bg-[#F4F6F9] px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {u.years.map(([year, count]) => (
                            <span key={year} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
                              <span className="text-gray-500">{year}</span>
                              <span className="font-bold text-slate-600">{count}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetailedStatsPanel() {
  const [stats, setStats] = useState<DetailedStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ownerApi.detailedStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-gray-500 p-5">Carregando estatísticas detalhadas...</div>
  if (!stats) return null

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mt-6 mb-6">
      <h3 className="text-lg font-semibold text-[#1E293B] mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-slate-600" />
        Estatísticas Detalhadas
      </h3>

      {/* Questões no banco — universidade x ano, clique para expandir */}
      <div className="mb-8">
        <QuestionBankByUniversity questions={stats.questions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Simulados por etapa */}
        <div>
          <h4 className="text-sm font-semibold text-[#334155] mb-3">Simulados por Etapa</h4>
          <div className="space-y-3">
            {stats.simulados_stages.map(s => (
              <div key={s.status} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <span className="text-xs font-medium text-gray-600 uppercase">{s.status}</span>
                <span className="text-sm font-bold text-slate-600">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Médias por Universidade */}
        <div>
          <h4 className="text-sm font-semibold text-[#334155] mb-3">Média de Acertos por Universidade</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {stats.university_averages.sort((a,b) => b.average - a.average).map(u => (
              <div key={u.university} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <span className="text-xs font-medium text-gray-600">{u.university}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{u.average.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Médias por Escola */}
        <div>
          <h4 className="text-sm font-semibold text-[#334155] mb-3">Média por Escola</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {stats.school_averages.sort((a,b) => b.average - a.average).map(s => (
              <div key={s.school} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <span className="text-xs font-medium text-gray-600 truncate max-w-[200px]" title={s.school}>{s.school}</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{s.average.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}



export default function OwnerStatsPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Estatísticas do Sistema</h1>
          <p className="text-sm text-[#64748B] mt-1">Acompanhe métricas detalhadas de questões e simulados.</p>
        </div>
        <DetailedStatsPanel />
      </div>
    </div>
  )
}
