import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { redacoesApi, type RedacaoSummary } from '../api/redacoes'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  correcting: 'Corrigindo',
  ai_done: 'Aguardando revisão',
  reviewed: 'Revisada',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400',
  correcting: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  ai_done: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
  reviewed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
}

function ScoreBadge({ score, max }: { score: number | null; max: number }) {
  if (score === null) return <span className="text-sm text-[#64748B]">—</span>
  const pct = max > 0 ? score / max : 0
  const color = pct >= 0.7 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444'
  return (
    <span className="text-sm font-bold" style={{ color }}>
      {score.toFixed(1)} / {max.toFixed(1)}
    </span>
  )
}

// ── Professor list ─────────────────────────────────────────────────────────────

function ProfessorList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RedacaoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    redacoesApi.list(filterStatus ? { status: filterStatus } : undefined)
      .then((r: { data: RedacaoSummary[] }) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  const pending = items.filter(r => r.status === 'ai_done').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Redações</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Correção automática por IA — revisão pelo professor
            {pending > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {pending} aguardando revisão
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'ai_done', 'reviewed', 'correcting'].map(s => (
          <button
            key={s}
            onClick={() => { setLoading(true); setFilterStatus(s) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-[#0d9488] text-white'
                : 'bg-white dark:bg-[#1d1f27] border border-[#c5ceff] dark:border-[#464554] text-[#334155] dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a]'
            }`}
          >
            {s === '' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#c5ceff] dark:border-[#464554] p-12 text-center">
          <svg className="w-10 h-10 text-[#c5ceff] dark:text-[#464554] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-[#64748B]">Nenhuma redação encontrada.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEF2F7] dark:border-[#464554]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tema</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Nota</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7] dark:divide-[#464554]">
              {items.map(r => {
                const sc = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
                return (
                  <tr key={r.id} className="hover:bg-[#F4F6F9] dark:hover:bg-[#131f37] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#1E293B]">{r.student.name}</td>
                    <td className="px-4 py-3 text-[#334155] dark:text-slate-300 max-w-xs truncate">{r.theme}</td>
                    <td className="px-4 py-3 text-[#334155] dark:text-slate-300">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={r.final_score} max={r.max_score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(
                          r.status === 'ai_done' || r.status === 'reviewed'
                            ? `/redacoes/${r.id}/review`
                            : `/redacoes/${r.id}/review`
                        )}
                        className="text-xs font-semibold text-[#0d9488] hover:underline"
                      >
                        {r.status === 'ai_done' ? 'Revisar' : 'Abrir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Student list ───────────────────────────────────────────────────────────────

function StudentList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RedacaoSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    redacoesApi.mine()
      .then((r: { data: RedacaoSummary[] }) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Minhas Redações</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Acompanhe a correção automática das suas redações</p>
        </div>
        <button
          onClick={() => navigate('/redacoes/nova')}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
        >
          + Nova redação
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#c5ceff] dark:border-[#464554] p-16 text-center">
          <svg className="w-12 h-12 text-[#c5ceff] dark:text-[#464554] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-base font-semibold text-[#1E293B] mb-1">Nenhuma redação ainda</p>
          <p className="text-sm text-[#64748B] mb-6">Envie sua primeira redação para correção por IA.</p>
          <button
            onClick={() => navigate('/redacoes/nova')}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
          >
            Enviar redação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(r => {
            const sc = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/redacoes/${r.id}`)}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1E293B] truncate">{r.theme}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    {r.professor && ` · Revisado por ${r.professor.name}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${sc}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                <ScoreBadge score={r.final_score} max={r.max_score} />
                <svg className="w-4 h-4 text-[#64748B] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Router wrapper ────────────────────────────────────────────────────────────

export default function RedacaoListPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === 'student') return <StudentList />
  return <ProfessorList />
}
