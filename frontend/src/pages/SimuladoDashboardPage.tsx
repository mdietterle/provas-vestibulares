import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { simuladosApi, type SimuladoDashboard } from '../api/simulados'

import { EXAM_TYPE_LABEL, EXAM_TYPE_COLOR } from '../utils/exams'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Em andamento',
  correcting: 'Corrigindo',
  done: 'Concluído',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <p className="text-xs text-[#64748B] font-medium">{label}</p>
      <p className="text-2xl font-bold text-[#1E293B] mt-1">{value}</p>
      {sub && <p className="text-xs text-[#64748B] mt-1">{sub}</p>}
    </div>
  )
}

function ScoreBar({ pct, color = 'slate-600' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function AreaTable({ byArea }: { byArea: Record<string, { total: number; correct: number; pct: number }> }) {
  const sorted = Object.entries(byArea).sort((a, b) => b[1].pct - a[1].pct)
  if (sorted.length === 0) {
    return <p className="text-sm text-[#64748B] text-center py-6">Nenhum dado disponível ainda.</p>
  }
  return (
    <div className="space-y-3">
      {sorted.map(([area, data]) => {
        const color = data.pct >= 70 ? '#10b981' : data.pct >= 50 ? '#f59e0b' : '#ef4444'
        return (
          <div key={area}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#334155] truncate mr-2">{area}</span>
              <span className="text-xs font-bold shrink-0" style={{ color }}>
                {data.pct.toFixed(0)}% ({data.correct}/{data.total})
              </span>
            </div>
            <ScoreBar pct={data.pct} color={color} />
          </div>
        )
      })}
    </div>
  )
}

export default function SimuladoDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<SimuladoDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    simuladosApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-8 h-8 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (!data) return null

  const noData = data.total_simulados === 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/simulados')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FF] transition-colors"
        >
          <svg className="w-4 h-4 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Meu Desempenho</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Análise completa dos seus simulados</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate('/simulados')}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
          >
            + Novo simulado
          </button>
        </div>
      </div>

      {noData ? (
        <div className="rounded-2xl border border-dashed border-[#c5ceff] p-16 text-center">
          <svg className="w-12 h-12 text-[#c5ceff] dark:text-[#3d3470] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-base font-semibold text-[#1E293B] mb-1">Nenhum dado ainda</p>
          <p className="text-sm text-[#64748B]">Realize seu primeiro simulado para ver seu desempenho aqui.</p>
          <button
            onClick={() => navigate('/simulados')}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
          >
            Fazer meu primeiro simulado
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total de simulados"
              value={data.total_simulados}
              sub={`${data.completed_simulados} concluídos`}
            />
            <StatCard
              label="Média geral"
              value={data.average_score != null ? `${data.average_score.toFixed(1)}%` : '—'}
              sub="sobre simulados concluídos"
            />
            <StatCard
              label="Melhor nota"
              value={data.best_score != null ? `${data.best_score.toFixed(1)}%` : '—'}
            />
            <StatCard
              label="Esta semana"
              value={data.simulados_this_week}
              sub="simulados realizados"
            />
          </div>

          {/* By exam type */}
          {Object.keys(data.by_exam_type).length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">Por tipo de vestibular</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(data.by_exam_type).map(([type, stats]) => (
                  <div key={type} className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: EXAM_TYPE_COLOR[type] || 'slate-600' }}
                      >
                        {(EXAM_TYPE_LABEL[type] || type).substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">{EXAM_TYPE_LABEL[type] || type}</p>
                        <p className="text-xs text-[#64748B]">{stats.count} simulado{stats.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {stats.avg_score != null ? (
                      <>
                        <p
                          className={`text-2xl font-bold mb-1 ${stats.avg_score >= 70 ? 'text-green-700 dark:text-green-400' : stats.avg_score >= 50 ? 'text-slate-800 dark:text-slate-400' : 'text-red-700 dark:text-red-400'}`}
                        >
                          {stats.avg_score.toFixed(1)}%
                        </p>
                        <ScoreBar
                          pct={stats.avg_score}
                          color={stats.avg_score >= 70 ? '#10b981' : stats.avg_score >= 50 ? '#f59e0b' : '#ef4444'}
                        />
                        <p className="text-xs text-[#64748B] mt-1">média de acertos</p>
                      </>
                    ) : (
                      <p className="text-xs text-[#64748B]">Nenhum simulado concluído</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By area */}
          {Object.keys(data.by_area).length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">Desempenho por área</h2>
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <AreaTable byArea={data.by_area} />
              </div>
            </div>
          )}

          {/* Recent simulados */}
          {data.recent_simulados.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">Histórico recente</h2>
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EEF2F7]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Nota</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {data.recent_simulados.map(s => {
                      const scoreColorClass =
                        s.total_score == null ? 'text-[#64748B]'
                        : s.total_score >= 70 ? 'text-green-700 dark:text-green-400'
                        : s.total_score >= 50 ? 'text-slate-800 dark:text-slate-400'
                        : 'text-red-700 dark:text-red-400'
                      return (
                        <tr key={s.id} className="hover:bg-[#F4F6F9] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1E293B]">
                            {EXAM_TYPE_LABEL[s.exam_type] || s.exam_type}
                          </td>
                          <td className="px-4 py-3 text-[#334155]">
                            {new Date(s.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                s.status === 'done'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : s.status === 'correcting'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                  : 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {STATUS_LABEL[s.status] || s.status}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-bold ${scoreColorClass}`}>
                            {s.total_score != null ? `${s.total_score.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => navigate(`/simulados/${s.id}`)}
                              className="text-xs font-semibold text-slate-600 hover:underline"
                            >
                              {s.status === 'done' ? 'Ver resultado' : 'Abrir'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
