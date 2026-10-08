import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { classesApi, examsApi } from '../api'
import { submissionsApi } from '../api/submissions'
import { downloadXlsx } from '../api/download'
import type { Exam, User } from '../types'
import type { Submission, SubmissionList } from '../types/submission'
import Modal from '../components/Modal'
import QuotaExceededModal from '../components/QuotaExceededModal'
import { exportSubmissions } from '../utils/pdf'

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(8, Math.max(0.5, s - e.deltaY * 0.001)))
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    setPos({ x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y })
  }
  const onMouseUp = () => { dragging.current = false }

  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }) }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center"
          >−</button>
          <span className="text-white text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(8, s + 0.25))}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center"
          >+</button>
          <button
            onClick={reset}
            className="ml-2 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs"
          >Resetar</button>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center"
        >×</button>
      </div>

      {/* canvas */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          src={src}
          alt="Redação ampliada"
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
            transformOrigin: 'center center',
            maxWidth: 'none',
            userSelect: 'none',
            transition: dragging.current ? 'none' : 'transform 0.1s ease',
          }}
        />
      </div>

      <p className="text-white/40 text-xs text-center py-2 shrink-0">
        Scroll para zoom · Arrastar para mover · Esc para fechar
      </p>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: 'Pendente',    cls: 'badge-neutral' },
  correcting:   { label: 'Corrigindo',  cls: 'badge-warning' },
  done:         { label: 'Concluído',   cls: 'badge-success' },
  released:     { label: 'Liberado',    cls: 'badge-primary' },
  not_submitted:{ label: 'Não entregou', cls: 'badge-danger' },
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
// Correção por IA costuma levar segundos; acima disso, provavelmente travou
// numa questão (erro da IA, cota esgotada) e precisa de "Finalizar" manual.
const STUCK_THRESHOLD_MIN = 5

function minutesSince(iso?: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

interface MergedStudent {
  student: User
  submission: SubmissionList | null
}

export default function SubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionList[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([])
  const [detail, setDetail] = useState<Submission | null>(null)
  const [overrides, setOverrides] = useState<Record<number, { score: string; feedback: string }>>({})
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [correctingAll, setCorrectingAll] = useState(false)
  const [correctingId, setCorrectingId] = useState<number | null>(null)
  const [finalizingId, setFinalizingId] = useState<number | null>(null)
  const [releasingId, setReleasingId] = useState<number | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [quotaModal, setQuotaModal] = useState<{ resource: 'ai_generation' | 'ai_correction'; used: number; limit: number } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'not_submitted'>('all')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadSubmissions = () =>
    submissionsApi.listByExam(+id!).then(r => setSubmissions(r.data))

  useEffect(() => {
    if (!id) return
    examsApi.get(+id)
      .then(r => {
        setExam(r.data)
        classesApi.listStudents(r.data.class_id).then(s => setEnrolledStudents(s.data))
      })
      .catch(() => navigate('/exams'))
    loadSubmissions()
    submissionsApi.ollamaStatus().then(r => setOllamaOk(r.data.available))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id])

  const openDetail = async (subId: number) => {
    const r = await submissionsApi.get(subId)
    setDetail(r.data)
    const init: Record<number, { score: string; feedback: string }> = {}
    r.data.answers.forEach(a => {
      init[a.id] = { score: a.score?.toString() ?? '', feedback: a.ai_feedback ?? '' }
    })
    setOverrides(init)
  }

  const handleOverride = async (submissionId: number, answerId: number) => {
    const ov = overrides[answerId]
    if (!ov || ov.score === '') { toast.error('Informe a nota'); return }
    try {
      const r = await submissionsApi.overrideScore(submissionId, answerId, +ov.score, ov.feedback)
      setDetail(r.data)
      loadSubmissions()
      toast.success('Nota atualizada')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const handleAiCorrect = async (submissionId: number, answerId: number) => {
    try {
      toast.loading('Corrigindo com IA…', { id: 'ai' })
      const r = await submissionsApi.aiCorrect(submissionId, answerId)
      setDetail(r.data)
      toast.success('Correção concluída', { id: 'ai' })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 402 && detail?.code === 'quota_exceeded') {
        toast.dismiss('ai')
        setQuotaModal({ resource: 'ai_correction', used: detail.used, limit: detail.limit })
      } else {
        toast.error(detail?.message ?? detail ?? 'Erro na correção', { id: 'ai' })
      }
    }
  }

  const handleCorrectAll = async () => {
    if (!exam) return
    setCorrectingAll(true)
    try {
      const r = await submissionsApi.correctAll(exam.id)
      toast.success(`${r.data.queued} correção(ões) iniciada(s)`)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const list = (await submissionsApi.listByExam(exam.id)).data
        setSubmissions(list)
        const stillCorrecting = list.some(s => s.status === 'correcting')
        if (!stillCorrecting) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setCorrectingAll(false)
          toast.success('Todas as correções concluídas')
        }
      }, 4000)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao iniciar correção em massa')
      setCorrectingAll(false)
    }
  }

  const handleCorrectOne = async (sub: SubmissionList) => {
    setCorrectingId(sub.id)
    try {
      await submissionsApi.correct(sub.id)
      toast.success('Correção iniciada')
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const list = (await submissionsApi.listByExam(sub.exam_id)).data
        setSubmissions(list)
        const updated = list.find(s => s.id === sub.id)
        if (updated?.status === 'done' || updated?.status === 'released') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setCorrectingId(null)
          toast.success('Correção concluída')
        }
      }, 3000)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao corrigir')
      setCorrectingId(null)
    }
  }

  const handleFinalize = async (sub: SubmissionList) => {
    setFinalizingId(sub.id)
    try {
      await submissionsApi.finalize(sub.id)
      toast.success('Correção finalizada')
      await loadSubmissions()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao finalizar')
    } finally {
      setFinalizingId(null)
    }
  }

  const handleReleaseOne = async (sub: SubmissionList) => {
    setReleasingId(sub.id)
    try {
      await submissionsApi.release(sub.id)
      toast.success('Nota liberada para o aluno')
      await loadSubmissions()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao liberar nota')
    } finally {
      setReleasingId(null)
    }
  }

  const handleReleaseAll = async () => {
    if (!exam) return
    setReleasing(true)
    try {
      await submissionsApi.releaseAll(exam.id)
      toast.success('Notas liberadas para os alunos')
      await loadSubmissions()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao liberar notas')
    } finally {
      setReleasing(false)
    }
  }

  const handleExport = async () => {
    if (!exam) return
    setExportLoading(true)
    try {
      const safe = exam.title.replace(/\s+/g, '-').slice(0, 40)
      await downloadXlsx(exam.id, `notas-${safe}.xlsx`)
    } catch {
      toast.error('Erro ao exportar planilha')
    } finally {
      setExportLoading(false)
    }
  }

  if (!exam) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalPossible = exam.exam_questions.reduce((s, eq) => s + eq.points, 0)
  const subMap = new Map(submissions.map(s => [s.student_id, s]))
  const allMerged: MergedStudent[] = enrolledStudents
    .map(student => ({ student, submission: subMap.get(student.id) ?? null }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'))

  const merged = allMerged.filter(m => {
    if (filterStatus === 'submitted') return m.submission !== null
    if (filterStatus === 'not_submitted') return m.submission === null
    return true
  })

  const delivered = allMerged.filter(m => m.submission !== null).length
  const total = allMerged.length
  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exams')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8490b0] hover:bg-white hover:text-[#0d9488] border border-[#e8eeff] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="page-title">Submissões</h1>
            <p className="page-subtitle">{exam.title} · {exam.subject.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* IA status */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${ollamaOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ollamaOk ? 'bg-emerald-500' : 'bg-red-400'}`} />
            {ollamaOk ? 'IA Online (Groq)' : 'IA Offline (GROQ_API_KEY)'}
          </div>

          <Link to={`/exams/${id}/analytics`} className="btn-secondary btn-sm">Analytics</Link>

          <button
            onClick={handleCorrectAll}
            disabled={correctingAll || !ollamaOk}
            title={!ollamaOk ? 'IA Offline (GROQ_API_KEY não configurada)' : 'Corrige todas as respostas pendentes: múltipla escolha e somatória automaticamente, dissertativas com IA'}
            className="btn-ai btn-sm"
          >
            {correctingAll ? (
              <>
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                Corrigindo…
              </>
            ) : 'Corrigir turma'}
          </button>

          {submissions.some(s => s.status === 'done') && (
            <button
              onClick={handleReleaseAll}
              disabled={releasing}
              title="Libera a nota para todos os alunos já corrigidos"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #27c38a 0%, #059669 100%)' }}
            >
              {releasing ? 'Liberando…' : `Liberar notas (${submissions.filter(s => s.status === 'done').length})`}
            </button>
          )}

          <button onClick={() => { if (exam) exportSubmissions(exam, submissions, enrolledStudents) }} className="btn-secondary btn-sm">
            PDF
          </button>
          <button onClick={handleExport} disabled={exportLoading} className="btn-secondary btn-sm">
            {exportLoading ? 'Exportando…' : 'XLSX'}
          </button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-white rounded-2xl border border-[#e8eeff] p-4 flex items-center gap-6"
        style={{ boxShadow: '0 1px 3px rgba(0,35,111,0.04)' }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[#1E293B]">
              Turma {exam.class_.name} · {exam.class_.year}
            </p>
            <p className="text-sm font-bold text-[#0d9488]">{deliveredPct}%</p>
          </div>
          <div className="h-2 bg-[#edf0fb] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${deliveredPct}%`,
                background: deliveredPct === 100 ? '#27c38a' : 'linear-gradient(90deg, #0d9488, #f59e0b)',
              }}
            />
          </div>
          <p className="text-xs text-[#8490b0] mt-1.5">
            {delivered} de {total} aluno{total !== 1 ? 's' : ''} entregou{total !== 1 ? 'ram' : ''}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 shrink-0 text-center">
          {(['pending', 'correcting', 'done', 'released'] as const).map(status => {
            const count = submissions.filter(s => s.status === status).length
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status}>
                <p className="text-lg font-bold text-[#1E293B]">{count}</p>
                <p className="text-[10px] text-[#8490b0] mt-0.5">{cfg.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: `Todos (${allMerged.length})` },
          { key: 'submitted', label: `Entregues (${delivered})` },
          { key: 'not_submitted', label: `Não entregues (${total - delivered})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === tab.key
                ? 'bg-[#0d9488] text-white'
                : 'bg-white dark:bg-[#1d1f27] text-[#5a6480] dark:text-slate-300 border border-[#e8eeff] dark:border-[#464554] hover:bg-[#f4f6fb] dark:hover:bg-[#1a2947]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-head">Aluno</th>
              <th className="table-head">Entregue em</th>
              <th className="table-head">Status</th>
              <th className="table-head">Nota</th>
              <th className="table-head" />
            </tr>
          </thead>
          <tbody>
            {merged.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <svg className="w-10 h-10 text-[#c5d0ea] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-[#374060]">Nenhuma submissão encontrada</p>
                  </div>
                </td>
              </tr>
            ) : (
              merged.map(({ student, submission: sub }) => (
                <tr key={student.id} className={`table-row ${sub === null ? 'opacity-60' : ''}`}>
                  <td className="table-cell font-medium text-[#1E293B]">{student.name}</td>
                  <td className="table-cell text-[#8490b0]">
                    {sub ? new Date(sub.submitted_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={sub ? STATUS_CONFIG[sub.status]?.cls ?? 'badge-neutral' : 'badge-danger'}>
                      {sub ? STATUS_CONFIG[sub.status]?.label : 'Não entregou'}
                    </span>
                    {sub?.status === 'correcting' && (() => {
                      const mins = minutesSince(sub.correcting_since)
                      if (mins == null || mins < STUCK_THRESHOLD_MIN) return null
                      return (
                        <span
                          className="ml-1.5 text-[10px] font-semibold text-amber-700"
                          title="Corrigindo há mais tempo que o normal — pode ter travado numa questão. Use Finalizar para destravar."
                        >
                          há {mins} min ⚠
                        </span>
                      )
                    })()}
                  </td>
                  <td className="table-cell">
                    {sub?.total_score != null ? (
                      <span className="font-semibold text-[#1E293B]">
                        {sub.total_score}
                        <span className="text-[#8490b0] font-normal"> / {totalPossible}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-cell text-right">
                    {sub && (
                      <div className="flex items-center justify-end gap-1.5">
                        {(sub.status === 'pending' || sub.status === 'done') && (
                          <button
                            onClick={() => handleCorrectOne(sub)}
                            disabled={correctingId === sub.id}
                            title="Corrige esta submissão"
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#eef2ff] dark:bg-slate-800 text-[#0d9488] dark:text-teal-400 hover:bg-[#e0e7ff] dark:hover:bg-[#1e2d4a] transition-colors disabled:opacity-60 whitespace-nowrap"
                          >
                            {correctingId === sub.id ? 'Corrigindo…' : 'Corrigir'}
                          </button>
                        )}
                        {sub.status === 'correcting' && (
                          <button
                            onClick={() => handleFinalize(sub)}
                            disabled={finalizingId === sub.id}
                            title="Encerra a correção, pontuando com 0 qualquer resposta ainda sem nota"
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60 whitespace-nowrap"
                          >
                            {finalizingId === sub.id ? 'Finalizando…' : 'Finalizar'}
                          </button>
                        )}
                        {sub.status === 'done' && (
                          <button
                            onClick={() => handleReleaseOne(sub)}
                            disabled={releasingId === sub.id}
                            title="Libera a nota só para este aluno"
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 whitespace-nowrap"
                          >
                            {releasingId === sub.id ? 'Liberando…' : 'Liberar'}
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(sub.id)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-slate-800 text-[#2845b5] dark:text-teal-400 hover:bg-[#e5edff] dark:hover:bg-[#1e2d4a] transition-colors whitespace-nowrap"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal title={`Respostas — ${detail.student.name}`} onClose={() => setDetail(null)} size="xl">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#f7f9ff] rounded-xl p-3.5 border border-[#edf0fb]">
              <span className={`${STATUS_CONFIG[detail.status]?.cls ?? 'badge-neutral'}`}>
                {STATUS_CONFIG[detail.status]?.label}
              </span>
              <span className="font-bold text-[#1E293B]">
                {detail.total_score != null
                  ? <>{detail.total_score} <span className="text-[#8490b0] font-normal">/ {totalPossible} pts</span></>
                  : <span className="text-[#8490b0] font-normal">Em correção</span>}
              </span>
            </div>

            {detail.answers.map((ans, i) => {
              const eq = ans.exam_question
              const q = eq.question
              const ov = overrides[ans.id] ?? { score: '', feedback: '' }

              return (
                <div key={ans.id} className="border border-[#edf0fb] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#1E293B]">
                      Questão {i + 1}
                      <span className="text-[#8490b0] font-normal ml-1.5">· {eq.points} pts</span>
                    </span>
                    {ans.score != null && (
                      <span className="text-sm font-bold text-[#2845b5]">{ans.score} pts</span>
                    )}
                  </div>

                  <div className="text-sm text-[#374060] rich-statement" dangerouslySetInnerHTML={{ __html: q.statement }} />

                  {q.question_type !== 'essay' ? (
                    <div className="space-y-1">
                      {q.options.sort((a, b) => a.order - b.order).map((opt, j) => (
                        <div key={opt.id} className={`text-xs flex gap-2 px-3 py-2 rounded-lg ${
                          opt.is_correct ? 'bg-emerald-50 text-emerald-800 font-medium' :
                          ans.selected_option_id === opt.id ? 'bg-red-50 text-red-700' : 'text-[#6b7a9a] bg-[#f7f9ff]'
                        }`}>
                          <span className="font-medium shrink-0">{LETTERS[j]})</span>
                          <span className="flex-1 rich-statement" dangerouslySetInnerHTML={{ __html: opt.text }} />
                          {opt.is_correct && <span className="shrink-0 font-semibold text-emerald-700">✓</span>}
                          {ans.selected_option_id === opt.id && !opt.is_correct && <span className="shrink-0 text-red-500">← aluno</span>}
                          {ans.selected_option_id === opt.id && opt.is_correct && <span className="shrink-0 text-emerald-600">← aluno ✓</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {ans.essay_image_base64 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-[#8490b0] uppercase tracking-wide mb-1.5">
                            Foto da redação
                            <span className="ml-2 normal-case font-normal text-[#b0bbd8]">— clique para ampliar</span>
                          </p>
                          <img
                            src={ans.essay_image_base64}
                            alt="Foto da redação do aluno"
                            onClick={() => setLightboxSrc(ans.essay_image_base64!)}
                            className="w-full max-h-72 object-contain rounded-xl border border-[#edf0fb] bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      <div className="bg-[#f7f9ff] rounded-xl px-4 py-3 border border-[#edf0fb]">
                        <p className="text-[10px] font-semibold text-[#8490b0] uppercase tracking-wide mb-1.5">
                          {ans.essay_image_base64 ? 'Transcrição da IA' : 'Resposta do aluno'}
                        </p>
                        <p className="text-sm text-[#374060] leading-relaxed whitespace-pre-wrap">
                          {ans.essay_text || <span className="italic text-[#9da5bc]">Sem resposta</span>}
                        </p>
                      </div>

                      {ans.ai_feedback && (
                        <div className="bg-teal-50 rounded-xl px-4 py-3 border border-[#e5edff]">
                          <p className="text-[10px] font-semibold text-[#5a78c0] uppercase tracking-wide mb-1.5">
                            {ans.is_auto_corrected ? 'Feedback da IA' : 'Observação'}
                          </p>
                          <p className="text-sm text-[#374060]">{ans.ai_feedback}</p>
                        </div>
                      )}

                      {/* Botão de correção por IA — destacado para redações com foto */}
                      {ans.essay_image_base64 && (
                        <button
                          onClick={() => handleAiCorrect(detail.id, ans.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                        >
                          <span>✨</span>
                          {ans.is_auto_corrected ? 'Re-corrigir redação com IA' : 'Corrigir redação com IA'}
                        </button>
                      )}

                      <div className="flex gap-2 items-end pt-1">
                        <div className="flex-1">
                          <label className="label">Feedback</label>
                          <input
                            className="input"
                            placeholder="Comentário do professor…"
                            value={ov.feedback}
                            onChange={e => setOverrides(o => ({ ...o, [ans.id]: { ...ov, feedback: e.target.value } }))}
                          />
                        </div>
                        <div className="w-24">
                          <label className="label">Nota</label>
                          <input
                            type="number"
                            className="input text-center"
                            min={0} max={eq.points} step={0.5}
                            placeholder={`0–${eq.points}`}
                            value={ov.score}
                            onChange={e => setOverrides(o => ({ ...o, [ans.id]: { ...ov, score: e.target.value } }))}
                          />
                        </div>
                        <button onClick={() => handleOverride(detail.id, ans.id)} className="btn-primary btn-sm whitespace-nowrap">
                          Salvar
                        </button>
                        {!ans.essay_image_base64 && !ans.is_auto_corrected && (
                          <button
                            onClick={() => handleAiCorrect(detail.id, ans.id)}
                            disabled={!ollamaOk}
                            className="btn-secondary btn-sm whitespace-nowrap"
                          >
                            IA
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {quotaModal && (
        <QuotaExceededModal
          resource={quotaModal.resource}
          used={quotaModal.used}
          limit={quotaModal.limit}
          onClose={() => setQuotaModal(null)}
          onContactSupport={() => {
            setQuotaModal(null)
            window.open('mailto:suporte@savecompany.com.br?subject=Pacote avulso de IA', '_blank')
          }}
        />
      )}

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
