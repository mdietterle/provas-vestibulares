import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { classesApi, examsApi, questionsApi, subjectsApi, usersApi } from '../api'
import { downloadPdf } from '../api/download'
import { useAuth } from '../contexts/AuthContext'
import type { Class, Exam, Question, Subject, TeachingAssignment } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportExams } from '../utils/pdf'
import Pagination from '../components/Pagination'

interface ExamQuestionDraft { question_id: number; order: number; points: number }
interface ExamForm {
  title: string
  instructions: string
  subject_id: number
  class_id: number
  questions: ExamQuestionDraft[]
}
interface RedacaoForm {
  title: string
  subject_id: number
  class_id: number
  enunciado: string
  points: number
  criteria: string
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Múltipla escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
  summation: 'Somatória',
}

const EXAM_PALETTES = [
  { bg: '#eef2ff', icon: 'teal-600', border: '#c7d2fe', bgClass: 'bg-[#eef2ff] dark:bg-[#1f2547]', textClass: 'text-teal-600 dark:text-teal-400' },
  { bg: '#fffbeb', icon: '#f59e0b', border: '#fde68a', bgClass: 'bg-[#fffbeb] dark:bg-slate-800', textClass: 'text-amber-500 dark:text-amber-400' },
  { bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0', bgClass: 'bg-[#f0fdf4] dark:bg-[#132a1c]', textClass: 'text-[#16a34a] dark:text-[#4ade80]' },
  { bg: '#fff7ed', icon: '#ea580c', border: '#fed7aa', bgClass: 'bg-[#fff7ed] dark:bg-[#2c1c0e]', textClass: 'text-[#ea580c] dark:text-[#fb923c]' },
  { bg: '#f0f9ff', icon: '#0284c7', border: '#bae6fd', bgClass: 'bg-[#f0f9ff] dark:bg-[#0f2333]', textClass: 'text-[#0284c7] dark:text-[#38bdf8]' },
  { bg: '#fdf4ff', icon: '#9333ea', border: '#e9d5ff', bgClass: 'bg-[#fdf4ff] dark:bg-[#2a1a33]', textClass: 'text-[#9333ea] dark:text-[#d8b4fe]' },
]

function ExamIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

export default function ExamsPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [myAssignments, setMyAssignments] = useState<TeachingAssignment[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Exam | null>(null)
  const [applyExam, setApplyExam] = useState<Exam | null>(null)
  const [applyClassId, setApplyClassId] = useState(0)
  const [form, setForm] = useState<ExamForm>({ title: '', instructions: '', subject_id: 0, class_id: 0, questions: [] })
  const [extraClassIds, setExtraClassIds] = useState<number[]>([])
  const [questionSearch, setQuestionSearch] = useState('')
  const [examMode, setExamMode] = useState<'regular' | 'redacao'>('regular')
  const [redacaoForm, setRedacaoForm] = useState<RedacaoForm>({ title: '', subject_id: 0, class_id: 0, enunciado: '', points: 10, criteria: '' })
  const [redacaoExtraClassIds, setRedacaoExtraClassIds] = useState<number[]>([])
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState(0)
  const [page, setPage] = useState(1)

  const load = () => examsApi.list().then((r) => setExams(r.data))

  useEffect(() => {
    load()
    subjectsApi.list().then((r) => setSubjects(r.data))
    classesApi.list().then((r) => setClasses(r.data))
    if (user?.role === 'professor') {
      usersApi.assignments(user.id).then(r => setMyAssignments(r.data))
    }
  }, [])

  useEffect(() => { setPage(1) }, [search, filterSubject])

  const selectableSubjects = user?.role === 'professor'
    ? subjects.filter(s => myAssignments.some(a => a.subject_id === s.id))
    : subjects

  const selectableClasses = user?.role === 'professor' && form.subject_id
    ? classes.filter(c => myAssignments.some(a => a.subject_id === form.subject_id && a.class_id === c.id))
    : classes

  const onSubjectChange = async (subjectId: number) => {
    setForm((f) => ({ ...f, subject_id: subjectId, class_id: 0, questions: [] }))
    if (subjectId) {
      const r = await questionsApi.list(subjectId)
      setAvailableQuestions(r.data)
    } else {
      setAvailableQuestions([])
    }
  }

  const addQuestion = (questionId: number) => {
    if (form.questions.some((q) => q.question_id === questionId)) {
      toast.error('Questão já adicionada'); return
    }
    setForm((f) => ({
      ...f,
      questions: [...f.questions, { question_id: questionId, order: f.questions.length + 1, points: 1 }],
    }))
  }

  const removeQuestion = (questionId: number) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((q) => q.question_id !== questionId)
        .map((q, i) => ({ ...q, order: i + 1 })),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    if (examMode === 'redacao') {
      if (!redacaoForm.enunciado.trim()) { toast.error('Digite o enunciado da redação'); setCreating(false); return }
      try {
        const r = await examsApi.createRedacao({
          title: redacaoForm.title,
          subject_id: redacaoForm.subject_id,
          class_id: redacaoForm.class_id,
          enunciado: redacaoForm.enunciado,
          points: redacaoForm.points,
          criteria: redacaoForm.criteria || undefined,
        })
        const failedClasses = await applyToExtraClasses(r.data.id, redacaoExtraClassIds)
        reportCreationResult('Avaliação de redação', 1 + redacaoExtraClassIds.length - failedClasses.length, failedClasses.length)
        setShowModal(false)
        load()
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Erro ao criar avaliação')
      } finally {
        setCreating(false)
      }
      return
    }
    if (form.questions.length === 0) { toast.error('Adicione pelo menos uma questão'); setCreating(false); return }
    try {
      const r = await examsApi.create(form)
      const failedClasses = await applyToExtraClasses(r.data.id, extraClassIds)
      reportCreationResult('Prova', 1 + extraClassIds.length - failedClasses.length, failedClasses.length)
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar prova')
    } finally {
      setCreating(false)
    }
  }

  /** Cria uma cópia da prova recém-criada em cada turma extra selecionada. Retorna os ids que falharam. */
  const applyToExtraClasses = async (examId: number, classIds: number[]): Promise<number[]> => {
    const failed: number[] = []
    for (const classId of classIds) {
      try {
        await examsApi.apply(examId, classId)
      } catch {
        failed.push(classId)
      }
    }
    return failed
  }

  const reportCreationResult = (label: string, successCount: number, failedCount: number) => {
    if (failedCount === 0) {
      toast.success(successCount > 1 ? `${label} criada e atribuída a ${successCount} turmas` : `${label} criada com sucesso`)
    } else {
      toast.error(`${label} criada, mas falhou ao atribuir a ${failedCount} turma${failedCount > 1 ? 's' : ''}`)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await examsApi.delete(confirmDelete.id)
      toast.success('Prova excluída')
      setConfirmDelete(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const openApplyModal = (exam: Exam) => {
    setApplyExam(exam)
    setApplyClassId(0)
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyExam || !applyClassId) return
    try {
      await examsApi.apply(applyExam.id, applyClassId)
      toast.success('Prova aplicada com sucesso')
      setApplyExam(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao aplicar prova')
    }
  }

  const openPdf = async (exam: Exam) => {
    try {
      await downloadPdf(exam.id, `prova-${exam.title.replace(/\s+/g, '-')}.pdf`)
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  const draftQuestionDetails = form.questions.map((dq) => ({
    ...dq,
    question: availableQuestions.find((q) => q.id === dq.question_id),
  }))

  const totalPoints = form.questions.reduce((s, q) => s + q.points, 0)

  const filtered = exams.filter((e) => {
    if (filterSubject && e.subject_id !== filterSubject) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const PAGE_SIZE = 12
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-teal-600 dark:text-teal-400">Provas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{exams.length} prova{exams.length !== 1 ? 's' : ''} cadastrada{exams.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => exportExams(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] bg-white text-teal-600 hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar PDF
          </button>
          {user?.role !== 'student' && (
            <button
              onClick={() => { setForm({ title: '', instructions: '', subject_id: 0, class_id: 0, questions: [] }); setExtraClassIds([]); setQuestionSearch(''); setRedacaoForm({ title: '', subject_id: 0, class_id: 0, enunciado: '', points: 10, criteria: '' }); setRedacaoExtraClassIds([]); setExamMode('regular'); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Prova
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Provas', value: exams.length, textClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-[#eef2ff] dark:bg-slate-800 border-[#eef2ff] dark:border-[#464554]' },
          { label: user?.role === 'student' ? 'Disponíveis' : 'Matérias Cobertas', value: user?.role === 'student' ? exams.length : new Set(exams.map(e => e.subject_id)).size, textClass: 'text-amber-500 dark:text-[#c4a4ff]', bgClass: 'bg-[#f5f0ff] dark:bg-[#241b3f] border-[#f5f0ff] dark:border-[#3a2a5c]' },
          { label: user?.role === 'student' ? 'Para Responder' : 'Turmas', value: user?.role === 'student' ? exams.length : new Set(exams.map(e => e.class_id)).size, textClass: 'text-[#27c38a] dark:text-[#4ade80]', bgClass: 'bg-[#f0fdf8] dark:bg-[#132a1f] border-[#f0fdf8] dark:border-[#1f4535]' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bgClass}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-display ${s.textClass}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="pl-9 pr-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#464554] text-sm focus:outline-none focus:ring-2 w-56"
            style={{ '--tw-ring-color': 'teal-60033' } as React.CSSProperties}
            placeholder="Buscar prova..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input py-2 rounded-xl text-sm border-[#E2E8F0] dark:border-[#464554]"
          style={{ minWidth: '160px' }}
          value={filterSubject}
          onChange={(e) => setFilterSubject(+e.target.value)}
        >
          <option value={0}>Todas as matérias</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Exam list */}
      <div className="space-y-3">
        {paginated.map((exam, idx) => {
          const palette = EXAM_PALETTES[idx % EXAM_PALETTES.length]
          const questionCount = exam.question_count ?? exam.exam_questions?.length ?? 0
          const canManage = user?.role === 'admin' || exam.professor_id === user?.id

          return (
            <div
              key={exam.id}
              className="rounded-2xl border border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#182543] overflow-hidden transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${palette.bgClass}`}
                >
                  <ExamIcon className={palette.textClass} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{exam.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {exam.subject?.name && (
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${palette.bgClass} ${palette.textClass}`}
                      >
                        {exam.subject.name}
                      </span>
                    )}
                    {exam.class_?.name && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-[#0f1c37] dark:text-slate-300 border border-gray-200 dark:border-[#464554]">
                        {exam.class_.name} — {exam.class_.year}
                      </span>
                    )}
                    {exam.professor?.name && user?.role !== 'professor' && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        Prof. {exam.professor.name}
                      </span>
                    )}
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      {questionCount} {questionCount !== 1 ? 'questões' : 'questão'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/exams/${exam.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#464554] text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-[#0f1c37] text-teal-600 dark:text-teal-400"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver
                  </Link>

                  {user?.role === 'student' ? (
                    <>
                      <Link
                        to={`/exams/${exam.id}/submit`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Responder
                      </Link>
                      <Link
                        to={`/exams/${exam.id}/scan`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#464554] text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-[#0f1c37] text-amber-500 dark:text-[#c4a4ff]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                        </svg>
                        Scan
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to={`/exams/${exam.id}/submissions`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#464554] text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-[#0f1c37] text-gray-700 dark:text-slate-300"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Submissões
                      </Link>
                      <button
                        onClick={() => openPdf(exam)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#464554] text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-[#0f1c37] text-gray-700 dark:text-slate-300"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        PDF
                      </button>
                      {canManage && (
                        <button
                          onClick={() => openApplyModal(exam)}
                          title="Cria uma cópia desta prova para outra turma"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #27c38a 0%, #059669 100%)' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          Atribuir a outra turma
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => setConfirmDelete(exam)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Excluir prova"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="font-medium">Nenhuma prova encontrada</p>
            <p className="text-sm mt-1">
              {user?.role !== 'student' ? 'Crie sua primeira prova clicando em "Nova Prova"' : 'Nenhuma prova disponível no momento'}
            </p>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* AI Insights */}
      <div className="rounded-2xl border border-[#ddd6fe] dark:border-[#464554] p-5 bg-[#eef2ff] dark:bg-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #0d9488 100%)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">Insights das Provas</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-[#ede9fe] dark:bg-[#241b3f] text-amber-500 dark:text-[#c4a4ff]">IA</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{exams.length}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Provas</p>
          </div>
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-amber-500 dark:text-[#c4a4ff]">
              {exams.reduce((s, e) => s + (e.question_count ?? e.exam_questions?.length ?? 0), 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Total de Questões</p>
          </div>
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-[#27c38a] dark:text-[#4ade80]">
              {new Set(exams.map(e => e.subject_id)).size}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Matérias</p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <Modal title="Nova Prova" onClose={() => setShowModal(false)} size="xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Toggle Prova Regular / Avaliação de Redação (só para quem tem CAR) */}
            {(user?.car_enabled && (user?.role !== 'professor' || user?.car_access)) && (
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setExamMode('regular')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${examMode === 'regular' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📝 Prova Regular
                </button>
                <button
                  type="button"
                  onClick={() => setExamMode('redacao')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${examMode === 'redacao' ? 'bg-white shadow text-[#7c3aed]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  ✍️ Avaliação de Redação
                </button>
              </div>
            )}

            {examMode === 'redacao' ? (
              /* ── Formulário de Avaliação de Redação ── */
              <>
                <div className="rounded-xl border border-[#ddd6fe] dark:border-[#464554] p-3 text-sm text-teal-900 dark:text-[#c4a4ff] bg-[#faf5ff] dark:bg-[#241b3f]">
                  O sistema cria automaticamente uma questão dissertativa com o enunciado abaixo. O aluno poderá <strong>digitar</strong> ou <strong>enviar foto</strong> da redação, e a IA corrigirá automaticamente.
                </div>
                <div>
                  <label className="label">Título da Avaliação</label>
                  <input
                    className="input"
                    placeholder="Ex: Redação — 1º Bimestre"
                    value={redacaoForm.title}
                    onChange={(e) => setRedacaoForm({ ...redacaoForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Matéria</label>
                    <select
                      className="input"
                      value={redacaoForm.subject_id}
                      onChange={(e) => setRedacaoForm({ ...redacaoForm, subject_id: +e.target.value, class_id: 0 })}
                      required
                    >
                      <option value={0}>Selecionar...</option>
                      {selectableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Turma principal</label>
                    <select
                      className="input"
                      value={redacaoForm.class_id}
                      onChange={(e) => { setRedacaoForm({ ...redacaoForm, class_id: +e.target.value }); setRedacaoExtraClassIds([]) }}
                      required
                      disabled={user?.role === 'professor' && !redacaoForm.subject_id}
                    >
                      <option value={0}>Selecionar...</option>
                      {(user?.role === 'professor' && redacaoForm.subject_id
                        ? classes.filter(c => myAssignments.some(a => a.subject_id === redacaoForm.subject_id && a.class_id === c.id))
                        : classes
                      ).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.year}</option>)}
                    </select>
                  </div>
                </div>
                {redacaoForm.class_id > 0 && (() => {
                  const otherClasses = (user?.role === 'professor'
                    ? classes.filter(c => myAssignments.some(a => a.subject_id === redacaoForm.subject_id && a.class_id === c.id))
                    : classes
                  ).filter(c => c.id !== redacaoForm.class_id)
                  if (otherClasses.length === 0) return null
                  return (
                    <div>
                      <label className="label">Também atribuir a <span className="text-gray-400 font-normal">(opcional — cria uma cópia para cada turma marcada)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {otherClasses.map(c => {
                          const checked = redacaoExtraClassIds.includes(c.id)
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${checked ? 'bg-[#f5f0ff] dark:bg-[#241b3f] border-[#ddd6fe] dark:border-[#3a2a5c] text-[#7c3aed] dark:text-[#c4a4ff]' : 'bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#0f1c37]'}`}
                            >
                              <input
                                type="checkbox"
                                className="accent-[#7c3aed]"
                                checked={checked}
                                onChange={() => setRedacaoExtraClassIds(ids => checked ? ids.filter(id => id !== c.id) : [...ids, c.id])}
                              />
                              {c.name} — {c.year}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                <div>
                  <label className="label">Enunciado / Proposta da Redação</label>
                  <textarea
                    className="input min-h-32 resize-y"
                    placeholder="Descreva o tema, o gênero textual esperado e as instruções para a redação..."
                    value={redacaoForm.enunciado}
                    onChange={(e) => setRedacaoForm({ ...redacaoForm, enunciado: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Critérios de Correção <span className="text-gray-400 font-normal">(opcional — orienta a IA)</span></label>
                  <textarea
                    className="input resize-y"
                    rows={2}
                    placeholder="Ex: Avaliar coesão, coerência, norma culta, argumentação e proposta de intervenção..."
                    value={redacaoForm.criteria}
                    onChange={(e) => setRedacaoForm({ ...redacaoForm, criteria: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="label mb-0 whitespace-nowrap">Pontuação total</label>
                  <input
                    type="number"
                    className="input w-24 text-center"
                    min={1} max={100} step={0.5}
                    value={redacaoForm.points}
                    onChange={(e) => setRedacaoForm({ ...redacaoForm, points: +e.target.value })}
                    required
                  />
                  <span className="text-sm text-gray-400">pts</span>
                </div>
              </>
            ) : (
              /* ── Formulário Prova Regular ── */
              <>
                <div>
                  <label className="label">Título da Prova</label>
                  <input
                    className="input"
                    placeholder="Ex: Avaliação Bimestral — Matemática"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Instruções <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Ex: Leia com atenção antes de responder..."
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Matéria</label>
                    <select
                      className="input"
                      value={form.subject_id}
                      onChange={(e) => onSubjectChange(+e.target.value)}
                      required
                    >
                      <option value={0}>Selecionar...</option>
                      {selectableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Turma principal</label>
                    <select
                      className="input"
                      value={form.class_id}
                      onChange={(e) => { setForm({ ...form, class_id: +e.target.value }); setExtraClassIds([]) }}
                      required
                      disabled={user?.role === 'professor' && !form.subject_id}
                    >
                      <option value={0}>Selecionar...</option>
                      {selectableClasses.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.year}</option>)}
                    </select>
                  </div>
                </div>
                {form.class_id > 0 && (() => {
                  const otherClasses = selectableClasses.filter(c => c.id !== form.class_id)
                  if (otherClasses.length === 0) return null
                  return (
                    <div>
                      <label className="label">Também atribuir a <span className="text-gray-400 font-normal">(opcional — cria uma cópia para cada turma marcada)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {otherClasses.map(c => {
                          const checked = extraClassIds.includes(c.id)
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${checked ? 'bg-[#eef2ff] dark:bg-[#1f2547] border-[#c7d2fe] dark:border-[#464554] text-teal-600 dark:text-teal-400' : 'bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#0f1c37]'}`}
                            >
                              <input
                                type="checkbox"
                                className="accent-teal-600"
                                checked={checked}
                                onChange={() => setExtraClassIds(ids => checked ? ids.filter(id => id !== c.id) : [...ids, c.id])}
                              />
                              {c.name} — {c.year}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                {form.subject_id > 0 && (
                  <div className="rounded-xl border p-4 space-y-3 bg-[#F4F6F9] dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554]">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Adicionar Questão ao Banco</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        className="input pl-9"
                        placeholder="Buscar questão pelo enunciado..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {availableQuestions
                        .filter((q) => !form.questions.some((dq) => dq.question_id === q.id))
                        .filter((q) => q.statement.toLowerCase().includes(questionSearch.toLowerCase()))
                        .slice(0, 30)
                        .map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => addQuestion(q.id)}
                            className="w-full flex items-start gap-2 text-left p-2.5 rounded-lg border bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554] hover:border-[#c7d2fe] dark:hover:border-[#3f5a94] hover:bg-[#eef2ff] dark:hover:bg-[#1a2947] transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#eef2ff] dark:bg-[#1f2547] text-teal-600 dark:text-teal-400">
                                  {QUESTION_TYPE_LABEL[q.question_type] ?? q.question_type}
                                </span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${q.is_public ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                  {q.is_public ? 'Pública' : 'Privada'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2">{q.statement}</p>
                            </div>
                            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:bg-teal-600 group-hover:text-white transition-colors mt-0.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </span>
                          </button>
                        ))}
                      {availableQuestions.filter((q) => !form.questions.some((dq) => dq.question_id === q.id)).filter((q) => q.statement.toLowerCase().includes(questionSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Nenhuma questão encontrada nesta matéria.</p>
                      )}
                    </div>
                  </div>
                )}
                {form.questions.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="label mb-0">Questões selecionadas ({form.questions.length})</label>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${totalPoints === 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}
                        title={totalPoints === 10 ? 'Soma 10 pontos' : 'A soma dos pontos não é 10 — confira se é intencional'}
                      >
                        Total: {totalPoints} pts {totalPoints !== 10 && '⚠'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {draftQuestionDetails.map((dq, i) => (
                        <div key={dq.question_id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-[#F4F6F9] dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554]">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#eef2ff] dark:bg-[#1f2547] text-teal-600 dark:text-teal-400">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-gray-700 dark:text-slate-300 truncate">{dq.question?.statement}</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              className="input w-16 text-center text-sm py-1"
                              value={dq.points}
                              min={0.5}
                              step={0.5}
                              onChange={(e) => setForm((f) => ({
                                ...f,
                                questions: f.questions.map((q) =>
                                  q.question_id === dq.question_id ? { ...q, points: +e.target.value } : q
                                ),
                              }))}
                            />
                            <span className="text-xs text-gray-400">pts</span>
                          </div>
                          <button type="button" onClick={() => removeQuestion(dq.question_id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#464554]">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: examMode === 'redacao' ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
              >
                {creating
                  ? 'Criando...'
                  : (() => {
                      const extraCount = examMode === 'redacao' ? redacaoExtraClassIds.length : extraClassIds.length
                      const base = examMode === 'redacao' ? 'Criar Avaliação de Redação' : 'Criar Prova'
                      return extraCount > 0 ? `${base} (${1 + extraCount} turmas)` : base
                    })()}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Apply modal */}
      {applyExam && (() => {
        const applyableClasses = user?.role === 'professor'
          ? classes.filter(c => myAssignments.some(a => a.subject_id === applyExam.subject_id && a.class_id === c.id))
          : classes
        return (
          <Modal title="Aplicar Prova para Turma" onClose={() => setApplyExam(null)}>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-green-700 dark:text-green-400">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-green-800 dark:text-green-400">
                  Uma cópia da prova <strong>{applyExam.title}</strong> será criada para a turma selecionada.
                </p>
              </div>
              <div>
                <label className="label">Turma de destino</label>
                <select
                  className="input"
                  value={applyClassId}
                  onChange={(e) => setApplyClassId(+e.target.value)}
                  required
                >
                  <option value={0}>Selecionar turma...</option>
                  {applyableClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.year}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#464554]">
                <button type="button" onClick={() => setApplyExam(null)} className="btn-secondary">Cancelar</button>
                <button
                  type="submit"
                  disabled={!applyClassId}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #27c38a 0%, #059669 100%)' }}
                >
                  Aplicar Prova
                </button>
              </div>
            </form>
          </Modal>
        )
      })()}

      {confirmDelete && (
        <ConfirmDialog
          message={`Excluir a prova "${confirmDelete.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
