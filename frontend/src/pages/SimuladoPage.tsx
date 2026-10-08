import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { simuladosApi, SIMULADO_MAX_QUESTIONS, type SimuladoSummary, type SimuladoTodayResponse } from '../api/simulados'

import { EXAM_TYPES, EXAM_TYPE_LABEL, type ExamMetadata as ExamType } from '../utils/exams'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Em andamento',
  correcting: 'Corrigindo...',
  done: 'Concluído',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  correcting: '#3b82f6',
  done: '#10b981',
}

function StartSimuladoModal({
  type,
  onClose,
  onStart,
  starting,
}: {
  type: ExamType
  onClose: () => void
  onStart: (area: string | null, numQuestions: number) => void
  starting: boolean
}) {
  const [areas, setAreas] = useState<string[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)
  const [area, setArea] = useState('')
  const [numQuestions, setNumQuestions] = useState(20)

  useEffect(() => {
    simuladosApi.areas(type.id)
      .then(r => setAreas(r.data))
      .catch(() => setAreas([]))
      .finally(() => setLoadingAreas(false))
  }, [type.id])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[#1E293B] mb-1">Simulado {type.label}</h2>
        <p className="text-sm text-gray-500 mb-5">Escolha a matéria e a quantidade de questões.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matéria</label>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              disabled={loadingAreas}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-60"
            >
              <option value="">{loadingAreas ? 'Carregando...' : 'Todas as áreas'}</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de questões: <span className="font-bold text-teal-600">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={5}
              max={SIMULADO_MAX_QUESTIONS}
              step={5}
              value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span>
              <span>{SIMULADO_MAX_QUESTIONS} (máximo)</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
          <button
            onClick={() => onStart(area || null, numQuestions)}
            disabled={starting}
            className="flex-1 py-2 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-50"
            style={{ background: type.gradient }}
          >
            {starting ? 'Gerando...' : 'Iniciar simulado'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-[#64748B]">—</span>
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <span className="text-sm font-bold" style={{ color }}>
      {score.toFixed(1)}%
    </span>
  )
}

export default function SimuladoPage() {
  const navigate = useNavigate()
  const [today, setToday] = useState<SimuladoTodayResponse | null>(null)
  const [history, setHistory] = useState<SimuladoSummary[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState<ExamType | null>(null)
  const [loadingToday, setLoadingToday] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    simuladosApi.today()
      .then(r => setToday(r.data))
      .catch(() => {})
      .finally(() => setLoadingToday(false))

    simuladosApi.list()
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  const filteredExams = EXAM_TYPES.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))

  const handleStart = async (area: string | null, numQuestions: number) => {
    if (!selectedType) return
    if (today?.has_simulado) {
      toast.error('Você já realizou um simulado hoje. Volte amanhã!')
      return
    }
    setCreating(true)
    try {
      const r = await simuladosApi.create({
        exam_type: selectedType.id,
        area: area || undefined,
        num_questions: numQuestions,
      })
      navigate(`/simulados/${r.data.id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao criar simulado.'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const canCreate = !loadingToday && !today?.has_simulado

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Simulados</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Pratique com questões reais dos principais vestibulares. Um simulado por dia, corrigido por IA.
        </p>
      </div>

      {/* Today's simulado banner */}
      {!loadingToday && today?.has_simulado && (
        <div className="rounded-xl p-4 flex items-center gap-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-600">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1e40af] dark:text-blue-300">
              {today.status === 'done' ? 'Simulado de hoje concluído' : today.status === 'correcting' ? 'Simulado em correção' : 'Simulado de hoje em andamento'}
            </p>
            <p className="text-xs text-[#3b82f6] dark:text-blue-400 mt-0.5">
              Tipo: {EXAM_TYPE_LABEL[today.exam_type || ''] || today.exam_type}
            </p>
          </div>
          <button
            onClick={() => navigate(`/simulados/${today.simulado_id}`)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600"
          >
            {today.status === 'done' ? 'Ver resultado' : today.status === 'correcting' ? 'Aguardar correção' : 'Continuar'}
          </button>
        </div>
      )}

      {/* Create new simulado */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-[#1E293B]">
            {canCreate ? 'Escolha o tipo de simulado' : 'Simulado de hoje já realizado'}
          </h2>
          {canCreate && (
            <input
              type="search"
              placeholder="Buscar por vestibular..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 w-full sm:w-64"
            />
          )}
        </div>

        <div className="space-y-6">
          {['Nacional', 'Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte'].map(region => {
            const examsInRegion = filteredExams.filter(e => e.region === region)
            if (examsInRegion.length === 0) return null

            return (
              <div key={region}>
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-3 border-b border-[#EEF2F7] pb-1">
                  {region}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {examsInRegion.map(type => (
                    <button
                      key={type.id}
                      onClick={() => canCreate && setSelectedType(type)}
                      disabled={!canCreate}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        canCreate
                          ? 'border-[#E2E8F0] hover:border-[#2563eb] hover:bg-[#f0f5ff] hover:shadow-sm bg-white'
                          : 'border-[#E2E8F0] opacity-60 cursor-not-allowed bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: type.gradient }}
                      />
                      <span className="text-sm font-semibold text-[#1E293B] truncate" title={type.label}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {filteredExams.length === 0 && (
            <div className="py-8 text-center text-sm text-[#64748B]">
              Nenhum vestibular encontrado para "{search}".
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1E293B]">Histórico de simulados</h2>
          <button
            onClick={() => navigate('/simulados/dashboard')}
            className="text-sm text-teal-600 font-semibold hover:underline"
          >
            Ver dashboard completo →
          </button>
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c5ceff] p-10 text-center">
            <svg className="w-10 h-10 text-[#c5ceff] dark:text-[#3d3470] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-[#64748B]">Nenhum simulado realizado ainda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EEF2F7]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Questões</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Nota</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {history.map(s => (
                  <tr key={s.id} className="hover:bg-[#F4F6F9] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#1E293B]">
                      {EXAM_TYPE_LABEL[s.exam_type] || s.exam_type}
                    </td>
                    <td className="px-4 py-3 text-[#334155]">
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-[#334155]">{s.question_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                        style={{ background: STATUS_COLOR[s.status] }}
                      >
                        {s.status === 'correcting' && (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        )}
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={s.total_score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/simulados/${s.id}`)}
                        className="text-xs font-semibold text-teal-600 hover:underline"
                      >
                        {s.status === 'done' ? 'Ver resultado' : s.status === 'pending' ? 'Continuar' : 'Aguardar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedType && (
        <StartSimuladoModal
          type={selectedType}
          starting={creating}
          onClose={() => !creating && setSelectedType(null)}
          onStart={handleStart}
        />
      )}
    </div>
  )
}
