import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { simuladosApi, type SimuladoDetail, type SimuladoQuestionItem } from '../api/simulados'
import AdSlot from '../components/AdSlot'

const ADSENSE_SLOT_SIMULADO = (import.meta.env.VITE_ADSENSE_SLOT_SIMULADO as string | undefined) || ''

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)' }}
        />
      </div>
      <span className="text-xs text-[#64748B] shrink-0">{answered}/{total}</span>
    </div>
  )
}

function ReportQuestionButton({ sqId, reported, onReported }: { sqId: number; reported: boolean; onReported: () => void }) {
  const [open, setOpen] = useState(false)
  const [reasons, setReasons] = useState<{ value: string; label: string }[]>([])
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && reasons.length === 0) {
      simuladosApi.reportReasons().then(r => setReasons(r.data)).catch(() => {})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!reason) { toast.error('Selecione um motivo'); return }
    if (reason === 'other' && !details.trim()) { toast.error('Descreva o problema em "Outro"'); return }
    setSubmitting(true)
    try {
      await simuladosApi.reportQuestion(sqId, reason, details.trim() || undefined)
      toast.success('Obrigado! A questão foi reportada — não precisa mais respondê-la pra entregar o simulado.')
      onReported()
      setOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível reportar agora.')
    } finally {
      setSubmitting(false)
    }
  }

  if (reported) {
    return (
      <span className="text-xs text-[#9ca3af] flex items-center gap-1">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Reportado — obrigado!
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shrink-0 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Reportar problema
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1d1f27] rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-[#1E293B] dark:text-[#e1e2ec]">Reportar problema na questão</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-300 mt-1">
                Ela sai de circulação até um responsável revisar e corrigir.
              </p>
            </div>
            <div className="space-y-2">
              {reasons.length === 0 && <p className="text-xs text-[#64748B]">Carregando motivos...</p>}
              {reasons.map(r => (
                <label key={r.value} className="flex items-start gap-2 text-sm text-[#334155] dark:text-[#e1e2ec] cursor-pointer">
                  <input
                    type="radio"
                    name={`report-reason-${sqId}`}
                    className="mt-1 accent-[#f59e0b]"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {reason === 'other' && (
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Descreva o problema que você encontrou..."
                rows={3}
                className="w-full text-sm border border-[#c5c5d3] dark:border-slate-300 rounded-lg p-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
              />
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#64748B] dark:text-slate-300 hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Enviando...' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function QuestionCard({
  sq,
  index,
  selected,
  onSelect,
  isFormatting,
  ready,
  reported,
  onReported,
}: {
  sq: SimuladoQuestionItem
  index: number
  /** Alternativa única: letra isolada (ex. "B") ou ''. Somatório: várias, separadas por vírgula. */
  selected: string
  onSelect: (letter: string) => void
  isFormatting?: boolean
  /** Só true depois que a formatação por IA terminou — enquanto false, mostra
   * "preparando" em vez do enunciado cru (pedido explícito: nunca mostrar
   * sem formatação, nem por um instante). */
  ready: boolean
  reported: boolean
  onReported: () => void
}) {
  const isSummation = sq.question_type === 'summation'
  const selectedLetters = selected ? selected.split(',') : []
  const sum = isSummation
    ? sq.options.filter(o => selectedLetters.includes(o.letter)).reduce((acc, o) => acc + (o.value || 0), 0)
    : 0

  return (
    <div className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] dark:border-[#464554] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}
          >
            {index}
          </span>
          {sq.area && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] dark:bg-slate-800 text-[#0d9488] dark:text-[#8b93ff]">
              {sq.area}
            </span>
          )}
          {isSummation && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
              Somatório — marque todas as afirmativas corretas
            </span>
          )}
          {isFormatting && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 animate-pulse flex items-center gap-1 border border-purple-200 dark:border-purple-800/50">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Formatando IA...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isSummation && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-[#64748B] dark:text-slate-300">Soma marcada</p>
              <p className="text-lg font-bold text-[#0d9488] dark:text-[#8b93ff]">{sum}</p>
            </div>
          )}
          <ReportQuestionButton sqId={sq.id} reported={reported} onReported={onReported} />
        </div>
      </div>

      {!ready ? (
        <div className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-[#F4F6F9] dark:bg-[#10131a] border border-dashed border-[#c5d0ff] dark:border-[#2e3f66]">
          <svg className="w-6 h-6 animate-spin text-[#f59e0b]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-[#64748B] dark:text-slate-300">Preparando questão...</p>
        </div>
      ) : (
        <>
          <div
            className="text-sm text-[#1E293B] dark:text-[#e2e8f0] leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sq.statement }}
          />

          {sq.images && sq.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Imagem da questão ${i + 1}`}
              className="max-w-full rounded-lg border border-[#E2E8F0] dark:border-[#464554] mt-2"
            />
          ))}

          {sq.options.length === 0 && (
            <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Esta questão não tem alternativas cadastradas (falha na importação). Pule pra próxima —
                ela não será contabilizada na correção.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {sq.options.map(opt => {
              const isSelected = selectedLetters.includes(opt.letter)
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelect(opt.letter)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all text-sm ${
                    isSelected
                      ? 'border-[#0d9488] dark:border-teal-400 bg-[#EFF6FF] dark:bg-slate-800'
                      : 'border-[#E2E8F0] dark:border-[#464554] hover:border-[#b6c4ff] dark:hover:border-[#334670] hover:bg-[#F4F6F9] dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold ${
                      isSummation ? 'w-6 h-6 rounded-md' : 'w-6 h-6 rounded-full'
                    } ${isSelected ? 'bg-[#0d9488] dark:bg-[#f59e0b] text-white' : 'bg-[#EEF2F7] dark:bg-slate-800 text-[#334155] dark:text-[#e1e2ec]'}`}
                  >
                    {isSummation ? (isSelected ? '✓' : opt.letter) : opt.letter}
                  </span>
                  <span className={isSelected ? 'text-[#0d9488] dark:text-teal-400 font-medium' : 'text-[#334155] dark:text-[#e1e2ec]'}>
                    {isSummation && typeof opt.value === 'number' && (
                      <span className="text-xs text-[#9ca3af] dark:text-[#908fa0] mr-1.5">({opt.value})</span>
                    )}
                    {opt.text}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ResultCard({ sq, index }: { sq: SimuladoQuestionItem; index: number }) {
  const correctOpt = sq.options.find(o => o.is_correct)
  const isSummation = sq.question_type === 'summation'
  const selectedLetters = sq.selected_letter ? sq.selected_letter.split(',') : []

  return (
    <div
      className={`bg-white dark:bg-[#1d1f27] rounded-2xl border p-6 space-y-4 ${
        sq.is_correct ? 'border-green-200 dark:border-green-800/40' : 'border-red-200 dark:border-red-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0`}
            style={{ background: sq.is_correct ? '#10b981' : '#ef4444' }}
          >
            {index}
          </span>
          {sq.area && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] dark:bg-slate-800 text-[#0d9488] dark:text-[#8b93ff]">
              {sq.area}
            </span>
          )}
          {isSummation && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
              Somatório
            </span>
          )}
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            sq.is_correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {sq.is_correct ? 'Correto' : 'Errado'}
        </span>
      </div>

      <div
        className="text-sm text-[#1E293B] dark:text-[#e2e8f0] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sq.statement }}
      />

      {sq.images && sq.images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`Imagem da questão ${i + 1}`}
          className="max-w-full rounded-lg border border-[#E2E8F0] dark:border-[#464554] mt-2"
        />
      ))}

      <div className="space-y-2 pt-2">
        {sq.options.map(opt => {
          const isStudentAnswer = selectedLetters.includes(opt.letter)
          const isCorrect = opt.is_correct

          let cls = 'border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#1d1f27] text-[#334155] dark:text-[#e1e2ec]'
          if (isCorrect) cls = 'border-green-300 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
          else if (isStudentAnswer && !isCorrect) cls = 'border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'

          return (
            <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${cls}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  isCorrect
                    ? 'bg-green-600 text-white'
                    : isStudentAnswer
                    ? 'bg-red-500 text-white'
                    : 'bg-[#EEF2F7] dark:bg-slate-800 text-[#334155] dark:text-[#e1e2ec]'
                }`}
              >
                {opt.letter}
              </span>
              <span className="flex-1">{opt.text}</span>
              {isCorrect && (
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isStudentAnswer && !isCorrect && (
                <svg className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {sq.ai_feedback && (
        <div className="mt-3 p-3 rounded-xl bg-[#EFF6FF] dark:bg-slate-800 border border-[#c5d0ff] dark:border-[#2a3a63]">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-[#0d9488] dark:text-[#8b93ff] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-xs text-[#0d9488] dark:text-[#8b93ff] leading-relaxed">{sq.ai_feedback}</p>
          </div>
        </div>
      )}

      {!sq.is_correct && !sq.ai_feedback && correctOpt && (
        <p className="text-xs text-[#64748B] dark:text-slate-300 mt-2">
          Resposta correta: <strong>{correctOpt.letter}) {correctOpt.text}</strong>
        </p>
      )}
    </div>
  )
}

export default function SimuladoExamPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [simulado, setSimulado] = useState<SimuladoDetail | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [formattedStatements, setFormattedStatements] = useState<Record<number, string>>({})
  const [formatting, setFormatting] = useState<Record<number, boolean>>({})
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    if (!id) return
    try {
      const r = await simuladosApi.get(+id)
      setSimulado(r.data)
      
      setCurrentIndex(r.data.current_index || 0)

      // Pre-fill answers from server (in case of reload)
      const preAnswers: Record<number, string> = {}
      r.data.questions.forEach((q: any) => {
        if (q.selected_letter) preAnswers[q.id] = q.selected_letter
      })

      setAnswers(preAnswers)
    } catch {
      toast.error('Simulado não encontrado')
      navigate('/simulados')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  // Poll while correcting
  useEffect(() => {
    if (simulado?.status !== 'correcting') return
    const interval = setInterval(async () => {
      try {
        const r = await simuladosApi.get(+id!)
        setSimulado(r.data)
        if (r.data.status === 'done' || r.data.status === 'error') {
          clearInterval(interval)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [simulado?.status, id])

  // Format question dynamically (enquanto o aluno responde: só a atual)
  useEffect(() => {
    if (!simulado || simulado.status !== 'pending') return
    const currentQ = simulado.questions[currentIndex]
    if (!currentQ) return

    if (formattedStatements[currentQ.id] || formatting[currentQ.id]) return

    setFormatting(prev => ({ ...prev, [currentQ.id]: true }))
    simuladosApi.formatQuestion(currentQ.id)
      .then(res => {
        setFormattedStatements(prev => ({ ...prev, [currentQ.id]: res.formatted_statement }))
      })
      .catch(() => {
        // Sem isto, uma falha na formatação deixava a questão presa pra
        // sempre em "preparando" (nunca cai pro texto cru, por pedido).
        setFormattedStatements(prev => ({ ...prev, [currentQ.id]: currentQ.statement }))
      })
      .finally(() => {
        setFormatting(prev => ({ ...prev, [currentQ.id]: false }))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, simulado])

  // Na tela de resultado, todas as questões aparecem de uma vez (sem
  // navegação por índice) — sem isto, o resultado mostrava o enunciado cru,
  // nunca formatado pela IA. Formata em sequência (não em paralelo, pra não
  // estourar rate limit do Groq de uma vez).
  useEffect(() => {
    if (!simulado || simulado.status !== 'done') return
    let cancelled = false
    ;(async () => {
      for (const q of simulado.questions) {
        if (cancelled) return
        if (formattedStatements[q.id] || formatting[q.id]) continue
        setFormatting(prev => ({ ...prev, [q.id]: true }))
        try {
          const res = await simuladosApi.formatQuestion(q.id)
          if (!cancelled) setFormattedStatements(prev => ({ ...prev, [q.id]: res.formatted_statement }))
        } catch {
          // Sem isto, uma falha deixava a questão presa em "preparando" na
          // tela de resultado — cai pro texto cru só como último recurso.
          if (!cancelled) setFormattedStatements(prev => ({ ...prev, [q.id]: q.statement }))
        } finally {
          if (!cancelled) setFormatting(prev => ({ ...prev, [q.id]: false }))
        }
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulado?.status, simulado?.id])

  const handleSelect = (question: SimuladoQuestionItem, letter: string) => {
    if (simulado?.status !== 'pending' || !id) return
    const isSummation = question.question_type === 'summation'
    const current = answers[question.id] ? answers[question.id].split(',') : []
    // Somatório: clicar alterna a afirmativa marcada (pode ter várias).
    // Alternativa única: clicar sempre troca pra só essa letra.
    const next = isSummation
      ? (current.includes(letter) ? current.filter(l => l !== letter) : [...current, letter]).sort().join(',')
      : letter
    setAnswers(a => ({ ...a, [question.id]: next }))
    // Save answer online silently (só envia se sobrou alguma marcação —
    // desmarcar tudo num somatório não é uma resposta válida pra salvar)
    if (next) {
      simuladosApi.progress(+id, currentIndex, [{ simulado_question_id: question.id, selected_letter: next }]).catch(() => {})
    }
  }

  const handleNext = () => {
    if (!simulado || !id) return
    if (currentIndex === simulado.questions.length - 1) {
      handleSubmit()
      return
    }
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    simuladosApi.progress(+id, newIndex).catch(() => {})
  }

  const handlePrev = () => {
    if (!simulado || !id) return
    if (currentIndex === 0) return
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    simuladosApi.progress(+id, newIndex).catch(() => {})
  }

  const handleJump = (idx: number) => {
    if (!simulado || !id) return
    setCurrentIndex(idx)
    simuladosApi.progress(+id, idx).catch(() => {})
  }

  const handleSubmit = async () => {
    if (!simulado) return
    // Questão sem alternativas (falha de importação) ou já reportada pelo
    // aluno não precisa ser respondida — sem esta exceção, o aluno ficava
    // travado pra sempre nela.
    const unanswered = simulado.questions.filter(q => q.options.length > 0 && !reportedIds.has(q.id) && !answers[q.id])
    if (unanswered.length > 0) {
      toast.error(`Responda todas as questões. Faltam ${unanswered.length}.`)
      return
    }
    setSubmitting(true)
    try {
      await simuladosApi.submit(
        simulado.id,
        simulado.questions
          .filter(q => q.options.length > 0 && !reportedIds.has(q.id))
          .map(q => ({ simulado_question_id: q.id, selected_letter: answers[q.id] }))
      )
      toast.success('Simulado enviado! Corrigindo com IA...')
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erro ao enviar simulado.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-8 h-8 animate-spin text-[#0d9488]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (!simulado) return null

  const total = simulado.questions.length
  const isPending = simulado.status === 'pending'
  const isCorreting = simulado.status === 'correcting'
  const isDone = simulado.status === 'done'
  const isError = simulado.status === 'error'

  const correct = isDone ? simulado.questions.filter(q => q.is_correct).length : 0

  const EXAM_TYPE_LABEL: Record<string, string> = {
    enem: 'ENEM', acafe: 'ACAFE', ufpr: 'UFPR', ufsc: 'UFSC', ufrgs: 'UFRGS', pucpr: 'PUCPR',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/simulados')}
          aria-label="Voltar"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FF] transition-colors"
        >
          <svg className="w-4 h-4 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1E293B]">
            Simulado {EXAM_TYPE_LABEL[simulado.exam_type] || simulado.exam_type}
          </h1>
          <p className="text-xs text-[#64748B]">
            {new Date(simulado.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' · '}{total} questões
          </p>
        </div>
        {isDone && (
          <div className="text-right">
            <p className={`text-2xl font-bold ${simulado.total_score! >= 70 ? 'text-green-700 dark:text-green-400' : simulado.total_score! >= 50 ? 'text-amber-800 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>
              {simulado.total_score?.toFixed(1)}%
            </p>
            <p className="text-xs text-[#64748B]">{correct}/{total} corretas</p>
          </div>
        )}
      </div>

      {/* Status banners */}
      {isCorreting && (
        <div className="rounded-xl p-4 flex items-center gap-4 bg-blue-50 border border-blue-200">
          <svg className="w-6 h-6 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-800">Corrigindo com IA...</p>
            <p className="text-xs text-blue-600 mt-0.5">Aguarde enquanto a IA analisa suas respostas. Esta página atualiza automaticamente.</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-xl p-4 flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
          <svg className="w-6 h-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400">Não conseguimos corrigir este simulado</p>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Instabilidade momentânea na correção por IA. Suas respostas foram salvas — tente corrigir de novo.</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Tentando...' : 'Tentar novamente'}
          </button>
        </div>
      )}

      {isDone && (
        <div
          className={`rounded-xl p-5 text-center border ${
            simulado.total_score! >= 70
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/40'
              : simulado.total_score! >= 50
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/40'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/40'
          }`}
        >
          <p className={`text-3xl font-bold mb-1 ${simulado.total_score! >= 70 ? 'text-green-800 dark:text-green-400' : simulado.total_score! >= 50 ? 'text-amber-900 dark:text-amber-400' : 'text-red-900 dark:text-red-400'}`}>
            {simulado.total_score?.toFixed(1)}%
          </p>
          <p className="text-sm font-semibold text-[#1E293B]">{correct} de {total} questões corretas</p>
          {simulado.total_score! >= 70 && <p className="text-xs text-green-700 mt-1">Excelente desempenho!</p>}
          {simulado.total_score! >= 50 && simulado.total_score! < 70 && <p className="text-xs text-amber-700 mt-1">Bom desempenho. Continue praticando!</p>}
          {simulado.total_score! < 50 && <p className="text-xs text-red-700 mt-1">Continue praticando para melhorar!</p>}
        </div>
      )}

      {isDone && simulado.enem_estimated_score != null && (
        <div className="rounded-xl p-5 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Estimativa no ENEM</p>
              <p className="text-2xl font-bold text-[#0d9488]">{simulado.enem_estimated_score.toFixed(0)} pontos</p>
            </div>
            <span className="text-[10px] text-[#9ca3af] max-w-[45%] text-right leading-tight">
              Estimativa simplificada (não é a nota oficial da TRI do INEP)
            </span>
          </div>
          {simulado.enem_score_breakdown && (
            <div className="space-y-2">
              {Object.entries(simulado.enem_score_breakdown.by_area).map(([area, s]) => (
                <div key={area} className="flex items-center justify-between text-sm">
                  <span className="text-[#334155]">{area}</span>
                  <span className="font-semibold text-[#1E293B]">{s.score.toFixed(0)} <span className="text-xs text-[#9ca3af] font-normal">({s.correct}/{s.total})</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress (only during pending) */}
      {isPending && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#334155]">Progresso</p>
            <p className="text-xs text-[#64748B]">Questão {currentIndex + 1} de {total}</p>
          </div>
          <ProgressBar answered={Object.keys(answers).length} total={total} />
          
          <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
            <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">Navegação</p>
            <div className="flex flex-wrap gap-1.5">
              {simulado.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={() => handleJump(idx)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'border-[#0d9488] bg-[#0d9488] text-white shadow-[0_0_0_3px_rgba(79,70,229,0.15)]'
                        : isAnswered
                        ? 'border-[#0d9488]/30 bg-[#0d9488] text-white'
                        : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-gray-50'
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {isDone
          ? simulado.questions.map((sq, i) => (
              <ResultCard
                key={sq.id}
                sq={{ ...sq, statement: formattedStatements[sq.id] || sq.statement }}
                index={i + 1}
              />
            ))
          : isPending && simulado.questions[currentIndex] && (
              <QuestionCard
                key={simulado.questions[currentIndex].id}
                sq={{...simulado.questions[currentIndex], statement: formattedStatements[simulado.questions[currentIndex].id] || simulado.questions[currentIndex].statement}}
                index={currentIndex + 1}
                selected={answers[simulado.questions[currentIndex].id] || ''}
                onSelect={letter => handleSelect(simulado.questions[currentIndex], letter)}
                isFormatting={formatting[simulado.questions[currentIndex].id]}
                ready={!!formattedStatements[simulado.questions[currentIndex].id]}
                reported={reportedIds.has(simulado.questions[currentIndex].id)}
                onReported={() => setReportedIds(prev => new Set(prev).add(simulado.questions[currentIndex].id))}
              />
            )}
      </div>

      {/* Next / submit button */}
      {isPending && (() => {
        const isLast = currentIndex === total - 1
        return (
          <div className="sticky bottom-6 flex gap-2">
            <button
              onClick={handlePrev}
              disabled={submitting || currentIndex === 0}
              className="px-6 py-4 rounded-xl font-bold text-base transition-all bg-white text-[#334155] border border-[#E2E8F0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Enviando...
                </span>
              ) : isLast ? (
                'Entregar simulado'
              ) : (
                'Próxima'
              )}
            </button>
          </div>
        )
      })()}

      {/* Banner ao final de cada questão, abaixo do botão de envio — key força remontagem e novo pedido de anúncio a cada troca de questão */}
      {isPending && simulado.questions[currentIndex] && (
        <AdSlot key={simulado.questions[currentIndex].id} slot={ADSENSE_SLOT_SIMULADO} className="h-24" />
      )}

      {isDone && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/simulados')}
            className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F4F6F9] transition-colors"
          >
            Voltar aos simulados
          </button>
          <button
            onClick={() => navigate('/simulados/dashboard')}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}
          >
            Ver meu desempenho
          </button>
        </div>
      )}
    </div>
  )
}
