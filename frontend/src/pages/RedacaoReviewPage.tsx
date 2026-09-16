import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { redacoesApi, type CriterionScore, type Redacao } from '../api/redacoes'

function ScoreInput({
  cs,
  value,
  onChange,
  note,
  onNoteChange,
}: {
  cs: CriterionScore
  value: string
  onChange: (v: string) => void
  note: string
  onNoteChange: (v: string) => void
}) {
  const num = parseFloat(value)
  const valid = !isNaN(num) && num >= 0 && num <= cs.max_points
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1E293B]">{cs.criterion}</span>
        <span className="text-xs text-[#64748B]">máx {cs.max_points.toFixed(1)} pts</span>
      </div>

      {cs.ai_comment && (
        <p className="text-xs text-[#334155] dark:text-[#94a3b8] bg-[#f5f3ff] dark:bg-[#1e1a3a] border border-[#e9d5ff] dark:border-[#3d3470] rounded px-3 py-2 leading-relaxed">
          <span className="font-semibold text-purple-700 dark:text-purple-400">IA: </span>{cs.ai_comment}
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-[#64748B] mb-1">
            Nota da IA: <span className="font-semibold text-[#334155] dark:text-[#94a3b8]">{cs.ai_score?.toFixed(1) ?? '—'}</span>
          </label>
          <input
            type="number"
            min={0}
            max={cs.max_points}
            step={0.1}
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#818CF8] ${
              !valid && value !== '' ? 'border-red-400' : 'border-[#c5ceff] dark:border-[#2d3f6a]'
            }`}
          />
          {!valid && value !== '' && (
            <p className="text-xs text-red-500 mt-0.5">Entre 0 e {cs.max_points.toFixed(1)}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#64748B] mb-1">Observação (opcional)</label>
        <input
          type="text"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Comentário sobre este critério…"
          className="w-full border border-[#c5ceff] dark:border-[#2d3f6a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#818CF8]"
        />
      </div>
    </div>
  )
}

export default function RedacaoReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<Redacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scores, setScores] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [professorComment, setProfessorComment] = useState('')

  useEffect(() => {
    if (!id) return
    redacoesApi.get(Number(id))
      .then((r: { data: Redacao }) => {
        setData(r.data)
        const initScores: Record<number, string> = {}
        const initNotes: Record<number, string> = {}
        r.data.criteria_scores.forEach((cs: CriterionScore) => {
          initScores[cs.id] = (cs.final_score ?? cs.ai_score ?? 0).toString()
          initNotes[cs.id] = cs.professor_note ?? ''
        })
        setScores(initScores)
        setNotes(initNotes)
        setProfessorComment(r.data.professor_comment ?? '')
      })
      .catch(() => toast.error('Erro ao carregar redação'))
      .finally(() => setLoading(false))
  }, [id])

  const handleRecorrect = async () => {
    if (!id) return
    try {
      await redacoesApi.recorrect(Number(id))
      toast.success('Redirecionado para recorrigir pela IA.')
      navigate('/redacoes/professor')
    } catch {
      toast.error('Erro ao acionar recorreção.')
    }
  }

  const handleSave = async () => {
    if (!data) return
    const criteria = data.criteria_scores.map(cs => {
      const v = parseFloat(scores[cs.id] ?? '0')
      return {
        criterion_score_id: cs.id,
        final_score: isNaN(v) ? (cs.ai_score ?? 0) : Math.min(Math.max(v, 0), cs.max_points),
        professor_note: notes[cs.id] || undefined,
      }
    })
    setSaving(true)
    try {
      await redacoesApi.review(data.id, { criteria, professor_comment: professorComment || undefined })
      toast.success('Revisão salva com sucesso!')
      navigate('/redacoes/professor')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar revisão.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-8 h-8 animate-spin text-[#2563EB]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (!data) return null

  const currentTotal = data.criteria_scores.reduce((sum, cs) => {
    const v = parseFloat(scores[cs.id] ?? '0')
    return sum + (isNaN(v) ? (cs.ai_score ?? 0) : Math.min(Math.max(v, 0), cs.max_points))
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/redacoes/professor')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a] transition-colors"
        >
          <svg className="w-4 h-4 text-[#334155] dark:text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1E293B] line-clamp-1">{data.theme}</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Aluno: <span className="font-semibold">{data.student.name}</span> ·{' '}
            {new Date(data.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#64748B]">Total atual</p>
          <p className="text-xl font-bold text-[#2563EB]">
            {currentTotal.toFixed(1)} <span className="text-sm font-normal text-[#64748B]">/ {data.max_score.toFixed(1)}</span>
          </p>
        </div>
      </div>

      {/* Essay body */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
        <p className="text-xs font-semibold text-[#64748B] mb-2">TEXTO DO ALUNO</p>
        <p className="text-sm text-[#1E293B] dark:text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">{data.body}</p>
      </div>

      {/* AI overall feedback */}
      {data.ai_feedback && (
        <div className="bg-[#f5f3ff] dark:bg-[#1e1a3a] border border-[#e9d5ff] dark:border-[#3d3470] rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Feedback geral da IA</p>
          <p className="text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed">{data.ai_feedback}</p>
        </div>
      )}

      {/* Criteria */}
      <div>
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">Critérios — ajuste as notas se necessário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.criteria_scores.map(cs => (
            <ScoreInput
              key={cs.id}
              cs={cs}
              value={scores[cs.id] ?? '0'}
              onChange={v => setScores(prev => ({ ...prev, [cs.id]: v }))}
              note={notes[cs.id] ?? ''}
              onNoteChange={v => setNotes(prev => ({ ...prev, [cs.id]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Professor comment */}
      <div>
        <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Comentário final (visível ao aluno)</label>
        <textarea
          value={professorComment}
          onChange={e => setProfessorComment(e.target.value)}
          rows={4}
          placeholder="Deixe um comentário geral para o aluno…"
          className="w-full border border-[#c5ceff] dark:border-[#2d3f6a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-[#818CF8] resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleRecorrect}
          className="px-5 py-2.5 rounded-xl border border-[#c5ceff] dark:border-[#2d3f6a] text-sm font-semibold text-[#334155] dark:text-[#94a3b8] hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a] transition-colors"
        >
          Recorrigir com IA
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' }}
        >
          {saving ? 'Salvando…' : 'Salvar revisão'}
        </button>
      </div>
    </div>
  )
}
