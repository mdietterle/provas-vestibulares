import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { redacoesApi, type CriterionScore, type Redacao } from '../api/redacoes'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  correcting: 'Corrigindo...',
  ai_done: 'Aguardando revisão',
  reviewed: 'Revisada',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400',
  correcting: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  ai_done: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
  reviewed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
}

function ScorePill({ score, max, color }: { score: number | null; max: number; color?: string }) {
  if (score === null) return <span className="text-sm text-[#64748B]">—</span>
  const pct = max > 0 ? score / max : 0
  const c = color || (pct >= 0.7 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444')
  return (
    <span className="text-sm font-bold" style={{ color: c }}>
      {score.toFixed(1)} / {max.toFixed(1)}
    </span>
  )
}

function CriterionCard({ cs }: { cs: CriterionScore }) {
  const effective = cs.final_score ?? cs.ai_score
  const overridden = cs.final_score !== null && cs.final_score !== cs.ai_score
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1E293B]">{cs.criterion}</span>
        <ScorePill score={effective} max={cs.max_points} />
      </div>
      {cs.ai_comment && (
        <p className="text-xs text-[#334155] dark:text-[#94a3b8] leading-relaxed">{cs.ai_comment}</p>
      )}
      {overridden && (
        <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
          IA sugeriu {cs.ai_score?.toFixed(1)} → professor ajustou para {cs.final_score?.toFixed(1)}
        </p>
      )}
      {cs.professor_note && (
        <p className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded px-2 py-1">{cs.professor_note}</p>
      )}
    </div>
  )
}

// ── Detail view (result page) ─────────────────────────────────────────────────

function RedacaoDetail({ id }: { id: number }) {
  const [data, setData] = useState<Redacao | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()

  const fetchData = () =>
    redacoesApi.get(id).then((r: { data: Redacao }) => {
      setData(r.data)
      if (r.data.status !== 'pending' && r.data.status !== 'correcting') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }).catch(() => {})

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
    intervalRef.current = setInterval(fetchData, 4000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-8 h-8 animate-spin text-[#4f46e5]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (!data) return null

  const sc = STATUS_COLOR[data.status] ?? STATUS_COLOR.pending
  const isCorrecting = data.status === 'pending' || data.status === 'correcting'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/redacoes')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a] transition-colors"
        >
          <svg className="w-4 h-4 text-[#334155] dark:text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1E293B] line-clamp-1">{data.theme}</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Enviada em {new Date(data.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sc}`}>
          {STATUS_LABEL[data.status]}
        </span>
      </div>

      {/* Correcting spinner */}
      {isCorrecting && (
        <div className="rounded-xl p-5 flex items-center gap-4 border border-[#bfdbfe] dark:border-blue-800 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] dark:from-blue-950 dark:to-blue-900">
          <svg className="w-6 h-6 animate-spin text-[#2563eb] dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#1e40af] dark:text-blue-300">IA corrigindo sua redação…</p>
            <p className="text-xs text-[#3b82f6] dark:text-blue-400 mt-0.5">Isso pode levar alguns segundos. A página atualiza automaticamente.</p>
          </div>
        </div>
      )}

      {/* Scores */}
      {!isCorrecting && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-xs text-[#64748B] font-medium">Nota final</p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">
              {data.final_score?.toFixed(1) ?? '—'}
              <span className="text-sm font-normal text-[#64748B]"> / {data.max_score.toFixed(1)}</span>
            </p>
            {data.status === 'reviewed' && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-1 font-medium">Revisada pelo professor</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <p className="text-xs text-[#64748B] font-medium">Nota da IA</p>
            <p className="text-2xl font-bold text-[#334155] dark:text-[#94a3b8] mt-1">
              {data.ai_total_score?.toFixed(1) ?? '—'}
              <span className="text-sm font-normal text-[#64748B]"> / {data.max_score.toFixed(1)}</span>
            </p>
          </div>
          {data.professor && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-xs text-[#64748B] font-medium">Revisado por</p>
              <p className="text-sm font-bold text-[#1E293B] mt-1">{data.professor.name}</p>
              {data.reviewed_at && (
                <p className="text-xs text-[#64748B] mt-0.5">
                  {new Date(data.reviewed_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI overall feedback */}
      {data.ai_feedback && (
        <div className="bg-[#f5f3ff] dark:bg-[#1e1a3a] border border-[#e9d5ff] dark:border-[#3d3470] rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Feedback geral da IA</p>
          <p className="text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed">{data.ai_feedback}</p>
        </div>
      )}

      {/* Professor comment */}
      {data.professor_comment && (
        <div className="bg-[#f0fdf4] dark:bg-[#0f2419] border border-[#bbf7d0] dark:border-green-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Comentário do professor</p>
          <p className="text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed">{data.professor_comment}</p>
        </div>
      )}

      {/* Per-criterion breakdown */}
      {data.criteria_scores.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-3">Detalhamento por critério</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.criteria_scores.map(cs => <CriterionCard key={cs.id} cs={cs} />)}
          </div>
        </div>
      )}

      {/* Essay body */}
      <div>
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">Texto enviado</h2>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <p className="text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{data.body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Submit form ───────────────────────────────────────────────────────────────

function RedacaoSubmitForm() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!theme.trim()) { toast.error('Informe o tema da redação.'); return }
    if (body.trim().length < 50) { toast.error('O texto da redação é muito curto (mínimo 50 caracteres).'); return }
    setSubmitting(true)
    try {
      const r = await redacoesApi.submit({ theme, body })
      toast.success('Redação enviada! A correção por IA começará em instantes.')
      navigate(`/redacoes/${r.data.id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao enviar redação.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Nova Redação</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Escreva sua redação abaixo. A IA irá corrigir em segundos e um professor poderá revisar.
        </p>
      </div>

      <div className="bg-[#eff6ff] dark:bg-blue-950 border border-[#bfdbfe] dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-[#2563eb] dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-[#1e40af] dark:text-blue-300">Como funciona a CAR</p>
          <p className="text-xs text-[#3b82f6] dark:text-blue-400 mt-0.5 leading-relaxed">
            A IA avalia 5 critérios pedagógicos (competência temática, coesão, norma culta, argumentação e proposta de intervenção).
            O professor pode revisar e ajustar as notas antes da publicação.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Tema da redação</label>
          <input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="Ex: Os desafios da educação no Brasil contemporâneo"
            className="w-full border border-[#c5ceff] dark:border-[#2d3f6a] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] dark:focus:ring-[#818CF8]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">
            Texto da redação
            <span className="ml-2 text-xs font-normal text-[#64748B]">{wordCount} palavras</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={18}
            placeholder="Escreva aqui o texto completo da sua redação…"
            className="w-full border border-[#c5ceff] dark:border-[#2d3f6a] rounded-xl px-4 py-3 text-sm text-[#1E293B] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#4f46e5] dark:focus:ring-[#818CF8]"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/redacoes')}
            className="px-5 py-2.5 rounded-xl border border-[#c5ceff] dark:border-[#2d3f6a] text-sm font-semibold text-[#334155] dark:text-[#94a3b8] hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
          >
            {submitting ? 'Enviando…' : 'Enviar para correção'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Router wrapper ────────────────────────────────────────────────────────────

export default function RedacaoPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <RedacaoDetail id={Number(id)} />
  return <RedacaoSubmitForm />
}
