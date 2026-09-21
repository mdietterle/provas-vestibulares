import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { aiApi, questionsApi, subjectsApi, usersApi } from '../api'
import type { GeneratedQuestion } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Question, Subject, TeachingAssignment } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import QuotaExceededModal from '../components/QuotaExceededModal'
import { exportQuestions } from '../utils/pdf'
import Pagination from '../components/Pagination'

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
  summation: 'Somatório',
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  multiple_choice: { bg: 'bg-[#eef2ff] dark:bg-[#1a2947]', text: 'text-[#4f46e5] dark:text-[#818CF8]' },
  true_false: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  essay: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  summation: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
}
const TYPE_COLORS_DEFAULT = { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' }

const SUMMATION_VALUES = [1, 2, 4, 8, 16, 32]

const DIFFICULTY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  easy:   { label: 'Fácil',  bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  medium: { label: 'Médio',  bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', dot: 'bg-orange-500' },
  hard:   { label: 'Difícil', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
}

interface OptionForm { text: string; is_correct: boolean; order: number }
interface QuestionForm {
  statement: string
  question_type: string
  is_public: boolean
  difficulty: string
  subject_id: number
  options: OptionForm[]
  image_base64?: string
}

const emptyForm = (): QuestionForm => ({
  statement: '',
  question_type: 'multiple_choice',
  is_public: false,
  difficulty: 'medium',
  subject_id: 0,
  options: [
    { text: '', is_correct: false, order: 1 },
    { text: '', is_correct: false, order: 2 },
    { text: '', is_correct: false, order: 3 },
    { text: '', is_correct: false, order: 4 },
  ],
})

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuestionsPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [myAssignments, setMyAssignments] = useState<TeachingAssignment[]>([])
  const [filterSubject, setFilterSubject] = useState(0)
  const [filterType, setFilterType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Question | null>(null)
  const [form, setForm] = useState<QuestionForm>(emptyForm())
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // ── AI generator ──────────────────────────────────────────────────────────
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiForm, setAiForm] = useState({
    subject_id: 0,
    topic: '',
    question_type: 'multiple_choice',
    difficulty: 'medium',
    count: 3,
    context: '',
    image_base64: '',
  })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResults, setAiResults] = useState<GeneratedQuestion[]>([])
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set())
  const [aiSaving, setAiSaving] = useState(false)
  const [quotaModal, setQuotaModal] = useState<{ resource: 'ai_generation' | 'ai_correction'; used: number; limit: number } | null>(null)

  const load = (subjectId?: number) =>
    questionsApi.list(subjectId || undefined).then((r) => setQuestions(r.data))

  useEffect(() => {
    load()
    subjectsApi.list().then((r) => setSubjects(r.data))
    if (user?.role === 'professor') {
      usersApi.assignments(user.id).then(r => setMyAssignments(r.data))
    }
  }, [])

  useEffect(() => { setPage(1) }, [search, filterSubject, filterType, filterDifficulty])

  const creatableSubjects = user?.role === 'professor'
    ? subjects.filter(s => myAssignments.some(a => a.subject_id === s.id))
    : subjects

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true) }
  const openEdit = (q: Question) => {
    setEditing(q)
    const opts = q.options.map((o) => ({ text: o.text, is_correct: o.is_correct, order: o.order }))
    setForm({
      statement: q.statement,
      question_type: q.question_type,
      is_public: q.is_public,
      difficulty: q.difficulty || 'medium',
      subject_id: q.subject_id,
      options: q.question_type === 'summation' ? opts.sort((a, b) => a.order - b.order) : opts,
      image_base64: q.image_base64 || undefined,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.subject_id === 0) { toast.error('Selecione uma matéria'); return }
    const needsOptions = form.question_type !== 'essay'
    if (needsOptions && !form.options.some((o) => o.is_correct)) {
      toast.error('Marque pelo menos uma opção correta'); return
    }
    if (form.question_type === 'summation' && form.options.some((o) => !o.text.trim())) {
      toast.error('Preencha o texto de todas as proposições'); return
    }
    try {
      const payload = {
        ...form,
        options: needsOptions ? form.options.filter((o) => o.text.trim()) : [],
      }
      if (editing) {
        await questionsApi.update(editing.id, payload as any)
        toast.success('Questão atualizada')
      } else {
        await questionsApi.create(payload as any)
        toast.success('Questão criada')
      }
      setShowModal(false)
      load(filterSubject || undefined)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await questionsApi.delete(confirmDelete.id)
      toast.success('Questão excluída')
      setConfirmDelete(null)
      load(filterSubject || undefined)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const updateOption = (idx: number, field: keyof OptionForm, value: string | boolean) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, [field]: value } : o),
    }))
  }

  const setCorrect = (idx: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }))
  }

  const toggleCorrect = (idx: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, is_correct: !o.is_correct } : o),
    }))
  }

  const addOption = () => {
    setForm((f) => ({ ...f, options: [...f.options, { text: '', is_correct: false, order: f.options.length + 1 }] }))
  }

  const removeOption = (idx: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
  }

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiForm.subject_id) { toast.error('Selecione uma matéria'); return }
    if (!aiForm.topic.trim()) { toast.error('Informe o tópico'); return }
    setAiGenerating(true)
    setAiResults([])
    setAiSelected(new Set())
    try {
      const r = await aiApi.generateQuestions(aiForm)
      setAiResults(r.data)
      setAiSelected(new Set(r.data.map((_, i) => i)))
      toast.success(`${r.data.length} questão(ões) gerada(s)!`)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 402 && detail?.code === 'quota_exceeded') {
        setQuotaModal({ resource: 'ai_generation', used: detail.used, limit: detail.limit })
      } else {
        toast.error(detail?.message ?? detail ?? 'Erro ao gerar questões')
      }
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAiSave = async () => {
    if (aiSelected.size === 0) { toast.error('Selecione pelo menos uma questão'); return }
    setAiSaving(true)
    let saved = 0
    try {
      for (const idx of aiSelected) {
        const q = aiResults[idx]
        await questionsApi.create({
          statement: q.statement,
          question_type: q.question_type as any,
          difficulty: q.difficulty,
          is_public: false,
          subject_id: aiForm.subject_id,
          options: q.options,
          criteria: undefined,
          image_base64: aiForm.image_base64 || undefined,
        } as any)
        saved++
      }
      toast.success(`${saved} questão(ões) salva(s) no banco!`)
      setShowAiModal(false)
      setAiResults([])
      load(filterSubject || undefined)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setAiSaving(false)
    }
  }

  const filtered = questions.filter((q) => {
    if (filterSubject && q.subject_id !== filterSubject) return false
    if (filterType && q.question_type !== filterType) return false
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false
    if (search && !q.statement.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    mc: questions.filter(q => q.question_type === 'multiple_choice').length,
    tf: questions.filter(q => q.question_type === 'true_false').length,
    essay: questions.filter(q => q.question_type === 'essay').length,
    summ: questions.filter(q => q.question_type === 'summation').length,
  }

  const PAGE_SIZE = 12
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Banco de Questões</h1>
          <p className="page-subtitle">{questions.length} {questions.length !== 1 ? 'questões' : 'questão'} cadastrada{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const parts = []
              if (filterSubject) parts.push(subjects.find(s => s.id === filterSubject)?.name ?? '')
              if (filterType) parts.push(TYPE_LABELS[filterType] ?? filterType)
              if (filterDifficulty) parts.push(DIFFICULTY_CONFIG[filterDifficulty]?.label ?? filterDifficulty)
              exportQuestions(filtered, parts.length ? parts.join(' · ') : 'Todas as questões')
            }}
            className="btn-secondary btn-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            PDF
          </button>
          <button
            onClick={() => { setShowAiModal(true); setAiResults([]); setAiSelected(new Set()) }}
            className="btn-sm inline-flex items-center gap-1.5 font-medium text-[#712ae2] dark:text-[#b8a5ff] border border-[#e0d9ff] dark:border-[#332a5c] bg-[#f5f0ff] dark:bg-[#241a3d] hover:bg-[#ede9fe] dark:hover:bg-[#2a2050] rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Gerar com IA
          </button>
          <button onClick={openCreate} className="btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Questão
          </button>
        </div>
      </div>

      {/* Stats — compact row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: questions.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'M. Escolha', value: counts.mc, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'V/F', value: counts.tf, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Dissertativas', value: counts.essay, color: '#9333ea', bg: '#fdf4ff' },
          { label: 'Somatório', value: counts.summ, color: '#c2410c', bg: '#fff7ed' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 bg-[var(--stat-bg)] border-[var(--stat-bg)] dark:bg-[#1e2d4a] dark:border-[#2a3a5c]" style={{ ['--stat-bg' as any]: s.bg }}>
            <p className="text-[10px] font-medium text-[#8490b0] dark:text-[#94a3b8] mb-0.5">{s.label}</p>
            <p className="text-xl font-bold font-display dark:brightness-125" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters — single compact row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9da5bc] dark:text-[#94a3b8] w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input pl-8 w-48 text-xs"
            placeholder="Buscar questão…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input text-xs"
          style={{ minWidth: '140px' }}
          value={filterSubject}
          onChange={(e) => { setFilterSubject(+e.target.value); load(+e.target.value || undefined) }}
        >
          <option value={0}>Todas as matérias</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="flex rounded-lg overflow-hidden border border-[#d0d9f0] dark:border-[#2a3a5c]">
          {[
            { val: '', label: 'Tipo' },
            { val: 'multiple_choice', label: 'M.Escolha' },
            { val: 'true_false', label: 'V/F' },
            { val: 'essay', label: 'Dissert.' },
            { val: 'summation', label: 'Somatório' },
          ].map((opt, i) => (
            <button
              key={opt.val}
              onClick={() => setFilterType(opt.val)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[#d0d9f0] dark:border-[#2a3a5c]' : ''} ${
                filterType === opt.val ? 'bg-[#4f46e5] text-white' : 'bg-white dark:bg-[#1e2d4a] text-[#5a6480] dark:text-[#94a3b8] hover:bg-[#f4f6fb] dark:hover:bg-[#243456]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#d0d9f0] dark:border-[#2a3a5c]">
          {[
            { val: '', label: 'Dific.' },
            { val: 'easy', label: 'Fácil' },
            { val: 'medium', label: 'Médio' },
            { val: 'hard', label: 'Difícil' },
          ].map((opt, i) => (
            <button
              key={opt.val}
              onClick={() => setFilterDifficulty(opt.val)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[#d0d9f0] dark:border-[#2a3a5c]' : ''} ${
                filterDifficulty === opt.val ? 'bg-[#4f46e5] text-white' : 'bg-white dark:bg-[#1e2d4a] text-[#5a6480] dark:text-[#94a3b8] hover:bg-[#f4f6fb] dark:hover:bg-[#243456]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#8490b0] dark:text-[#94a3b8] ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {paginated.map((q) => {
          const typeStyle = TYPE_COLORS[q.question_type] || TYPE_COLORS_DEFAULT
          const diffCfg = DIFFICULTY_CONFIG[q.difficulty || 'medium']
          const isExpanded = expandedId === q.id
          const canEdit = q.professor_id === user?.id || user?.role === 'admin'

          return (
            <div
              key={q.id}
              className="rounded-2xl border bg-white dark:bg-[#1e2d4a] border-[#E2E8F0] dark:border-[#2a3a5c] overflow-hidden transition-all"
            >
              {/* Question header row */}
              <div className="flex items-start gap-4 p-4">
                {/* Type icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${typeStyle.bg} ${typeStyle.text}`}
                >
                  {q.question_type === 'multiple_choice' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  {q.question_type === 'true_false' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  )}
                  {q.question_type === 'essay' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  )}
                  {q.question_type === 'summation' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7V4h16v3L12 13l8 6v3H4v-3l8-6L4 7z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef2ff] dark:bg-[#1a2947] text-[#4f46e5] dark:text-[#818CF8]"
                    >
                      {q.subject.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}
                    >
                      {TYPE_LABELS[q.question_type]}
                    </span>
                    {diffCfg && (
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 ${diffCfg.bg} ${diffCfg.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${diffCfg.dot}`} />
                        {diffCfg.label}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${q.is_public
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {q.is_public ? 'Pública' : 'Privada'}
                    </span>
                    {q.professor_id !== user?.id && (
                      <span className="text-xs text-gray-400">por {q.professor.name}</span>
                    )}
                  </div>

                  <p className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {q.statement}
                  </p>

                  {q.image_base64 && isExpanded && (
                    <img
                      src={`data:image/jpeg;base64,${q.image_base64}`}
                      alt="Imagem da questão"
                      className="mt-3 rounded-lg max-h-64 object-contain border border-[#E2E8F0]"
                    />
                  )}

                  {/* Options preview (collapsed) */}
                  {!isExpanded && q.options.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {q.question_type === 'summation' ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg border font-semibold font-mono bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40"
                        >
                          Resposta: {String(q.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)).padStart(2, '0')}
                        </span>
                      ) : (
                        q.options.sort((a, b) => a.order - b.order).map((o, i) => (
                          <span
                            key={o.id}
                            className={`text-xs px-2 py-0.5 rounded-lg border ${o.is_correct
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 font-semibold'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {OPTION_LETTERS[i] || (i + 1)}. {o.text.length > 30 ? o.text.slice(0, 30) + '…' : o.text}
                            {o.is_correct && ' ✓'}
                          </span>
                        ))
                      )}
                    </div>
                  )}

                  {/* Options expanded */}
                  {isExpanded && q.options.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {q.question_type === 'summation' && (
                        <div className="mb-2 px-3 py-2 rounded-lg border text-sm font-semibold font-mono bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300">
                          Resposta: {String(q.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)).padStart(2, '0')}
                        </div>
                      )}
                      {q.options.sort((a, b) => a.order - b.order).map((o, i) => (
                        <div
                          key={o.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm ${o.is_correct
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${o.is_correct
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {q.question_type === 'summation' ? String(o.order).padStart(2, '0') : (OPTION_LETTERS[i] || (i + 1))}
                          </span>
                          <span className={o.is_correct ? 'font-medium' : ''}>{o.text}</span>
                          {o.is_correct && (
                            <svg className="ml-auto text-green-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title={isExpanded ? 'Recolher' : 'Expandir'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isExpanded
                        ? <><polyline points="18 15 12 9 6 15" /></>
                        : <><polyline points="6 9 12 15 18 9" /></>
                      }
                    </svg>
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEdit(q)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(q)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="font-medium">Nenhuma questão encontrada</p>
            <p className="text-sm mt-1">Tente ajustar os filtros ou crie uma nova questão</p>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* AI Insights */}
      <div className="rounded-2xl border p-5 bg-gradient-to-br from-[#f5f0ff] to-[#eef2ff] dark:from-[#1a1530] dark:to-[#1a2947] border-[#e0d9ff] dark:border-[#332a5c]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#712ae2] to-[#4f46e5]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8]">Análise do Banco</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-[#ede9fe] dark:bg-[#2a2050] text-[#712ae2] dark:text-[#b8a5ff]">IA</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-white dark:bg-[#1e2d4a] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
            <p className="text-lg font-bold text-[#4f46e5] dark:text-[#818CF8]">{questions.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
          </div>
          <div className="bg-white dark:bg-[#1e2d4a] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
            <p className="text-lg font-bold text-[#4f46e5] dark:text-[#818CF8]">
              {questions.length > 0 ? Math.round((counts.mc / questions.length) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Múltipla Escolha</p>
          </div>
          <div className="bg-white dark:bg-[#1e2d4a] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
            <p className="text-lg font-bold text-[#27c38a] dark:text-[#4ade80]">
              {questions.filter(q => q.is_public).length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Públicas</p>
          </div>
          <div className="bg-white dark:bg-[#1e2d4a] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
            <p className="text-lg font-bold text-[#ef4444] dark:text-red-400">
              {questions.length > 0 ? Math.round((questions.filter(q => q.difficulty === 'hard').length / questions.length) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Difíceis</p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Editar Questão' : 'Nova Questão'} onClose={() => setShowModal(false)} size="xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Matéria</label>
                <select
                  className="input"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: +e.target.value })}
                  required
                >
                  <option value={0}>Selecionar...</option>
                  {creatableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo de Questão</label>
                <select
                  className="input"
                  value={form.question_type}
                  onChange={(e) => {
                    const newType = e.target.value
                    if (newType === 'summation') {
                      setForm({
                        ...form,
                        question_type: 'summation',
                        options: SUMMATION_VALUES.map(v => ({ text: '', is_correct: false, order: v })),
                      })
                    } else if (form.question_type === 'summation') {
                      setForm({
                        ...form,
                        question_type: newType,
                        options: [
                          { text: '', is_correct: false, order: 1 },
                          { text: '', is_correct: false, order: 2 },
                          { text: '', is_correct: false, order: 3 },
                          { text: '', is_correct: false, order: 4 },
                        ],
                      })
                    } else {
                      setForm({ ...form, question_type: newType })
                    }
                  }}
                >
                  <option value="multiple_choice">Múltipla Escolha</option>
                  <option value="true_false">Verdadeiro/Falso</option>
                  <option value="essay">Dissertativa</option>
                  <option value="summation">Somatório</option>
                </select>
              </div>
              <div>
                <label className="label">Dificuldade</label>
                <select
                  className="input"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Médio</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_public ? 'bg-[#27c38a]' : 'bg-gray-300 dark:bg-gray-600'}`}
                    onClick={() => setForm({ ...form, is_public: !form.is_public })}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ transform: form.is_public ? 'translateX(21px)' : 'translateX(2px)' }}
                    />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Questão pública</span>
                </label>
              </div>
            </div>

            <div>
              <label className="label">Imagem <span className="font-normal text-gray-400">(opcional)</span></label>
              {form.image_base64 ? (
                <div className="relative inline-block">
                  <img
                    src={`data:image/jpeg;base64,${form.image_base64}`}
                    alt="Imagem da questão"
                    className="rounded-xl border max-h-48 object-contain border-[#E2E8F0] dark:border-[#2a3a5c]"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_base64: undefined })}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-[#1e2d4a] border-[#E2E8F0] dark:border-[#2a3a5c] text-[#712ae2] dark:text-[#b8a5ff]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Anexar imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const result = ev.target?.result as string
                        const base64 = result.split(',')[1]
                        setForm(f => ({ ...f, image_base64: base64 }))
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              )}
            </div>

            <div>
              <label className="label">Enunciado</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Digite o enunciado da questão..."
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
                required
              />
            </div>

            {form.question_type !== 'essay' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">
                    {form.question_type === 'summation' ? 'Proposições' : 'Opções de Resposta'}
                  </label>
                  {form.question_type !== 'summation' && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-indigo-50 dark:hover:bg-[#1e2d4a] text-[#712ae2] dark:text-[#b8a5ff] border-[#e0d9ff] dark:border-[#332a5c]"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Adicionar opção
                    </button>
                  )}
                </div>
                {form.question_type === 'summation' && (() => {
                  const answer = form.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)
                  const parts = form.options.filter(o => o.is_correct).map(o => String(o.order).padStart(2, '0'))
                  return (
                    <div className="mb-3 flex items-center gap-4 p-3 rounded-xl border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Resposta</span>
                        <span className="text-2xl font-bold font-mono leading-tight text-orange-700 dark:text-orange-300">
                          {String(answer).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed">
                        {parts.length > 0
                          ? `${parts.join(' + ')} = ${answer}`
                          : 'Marque as proposições corretas. A resposta é a soma dos valores marcados.'}
                      </p>
                    </div>
                  )
                })()}
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => form.question_type === 'summation' ? toggleCorrect(i) : setCorrect(i)}
                        className={`flex-shrink-0 border-2 flex items-center justify-center transition-all ${opt.is_correct ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-300 dark:border-gray-600'}`}
                        style={{
                          width: 22, height: 22,
                          borderRadius: form.question_type === 'summation' ? 4 : '50%',
                        }}
                      >
                        {opt.is_correct && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`flex items-center justify-center text-xs font-bold flex-shrink-0 ${form.question_type === 'summation' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'bg-[#eef2ff] dark:bg-[#1a2947] text-[#4f46e5] dark:text-[#818CF8]'}`}
                        style={{
                          width: 24, height: 24,
                          borderRadius: form.question_type === 'summation' ? 4 : '50%',
                          fontFamily: form.question_type === 'summation' ? 'monospace' : 'inherit',
                        }}
                      >
                        {form.question_type === 'summation' ? String(opt.order).padStart(2, '0') : (OPTION_LETTERS[i] || (i + 1))}
                      </span>
                      <input
                        className="input flex-1"
                        placeholder={form.question_type === 'summation' ? `Texto da proposição ${String(opt.order).padStart(2, '0')}` : `Opção ${OPTION_LETTERS[i] || (i + 1)}`}
                        value={opt.text}
                        onChange={(e) => updateOption(i, 'text', e.target.value)}
                      />
                      {form.question_type !== 'summation' && form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#2a3a5c]">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 bg-gradient-to-br from-[#4f46e5] to-[#712ae2]"
              >
                {editing ? 'Salvar Alterações' : 'Criar Questão'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Generation Modal */}
      {showAiModal && (
        <Modal
          title="Gerar Questões com IA"
          onClose={() => setShowAiModal(false)}
          size="xl"
        >
          <div className="space-y-5">
            {/* Header badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-gradient-to-br from-[#f5f0ff] to-[#eef2ff] dark:from-[#1a1530] dark:to-[#1a2947] border-[#e0d9ff] dark:border-[#332a5c]">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#712ae2] to-[#4f46e5]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#712ae2] dark:text-[#b8a5ff]">Powered by Groq — qwen3-32b</span>
              <span className="ml-auto text-xs text-gray-400">Revise e edite antes de salvar</span>
            </div>

            {/* Generation form */}
            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Matéria *</label>
                  <select
                    className="input"
                    value={aiForm.subject_id}
                    onChange={e => setAiForm(f => ({ ...f, subject_id: +e.target.value }))}
                    required
                  >
                    <option value={0}>Selecionar...</option>
                    {creatableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {user?.role === 'professor' && (
                    <p className="text-xs text-gray-400 mt-1">Só mostra as matérias atribuídas a você</p>
                  )}
                </div>
                <div>
                  <label className="label">Tópico *</label>
                  <input
                    className="input"
                    placeholder="Ex: Fotossíntese, Segunda Guerra Mundial..."
                    value={aiForm.topic}
                    onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Tipo de Questão</label>
                  <select
                    className="input"
                    value={aiForm.question_type}
                    onChange={e => setAiForm(f => ({ ...f, question_type: e.target.value }))}
                  >
                    <option value="multiple_choice">Múltipla Escolha</option>
                    <option value="true_false">Verdadeiro/Falso</option>
                    <option value="essay">Dissertativa</option>
                    <option value="summation">Somatório</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dificuldade</label>
                  <select
                    className="input"
                    value={aiForm.difficulty}
                    onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))}
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Quantidade de questões</label>
                <div className="flex gap-2">
                  {[1, 3, 5, 8, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAiForm(f => ({ ...f, count: n }))}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all border ${aiForm.count === n
                        ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                        : 'bg-[#F4F6F9] dark:bg-[#1e2d4a] text-[#334155] dark:text-gray-300 border-[#E2E8F0] dark:border-[#2a3a5c]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Contexto <span className="font-normal text-gray-400">(opcional — trecho de livro, poema, artigo, instruções...)</span></label>
                <textarea
                  className="input"
                  rows={6}
                  placeholder="Cole aqui um trecho de livro, poema, artigo científico, letra de música ou qualquer texto que sirva de base para as questões..."
                  value={aiForm.context}
                  onChange={e => setAiForm(f => ({ ...f, context: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Imagem de referência <span className="font-normal text-gray-400">(opcional — gráfico, mapa, charge, tabela...)</span></label>
                {aiForm.image_base64 ? (
                  <div className="relative inline-block">
                    <img
                      src={`data:image/jpeg;base64,${aiForm.image_base64}`}
                      alt="Imagem de contexto"
                      className="rounded-xl border max-h-48 object-contain border-[#e0d9ff] dark:border-[#332a5c]"
                    />
                    <button
                      type="button"
                      onClick={() => setAiForm(f => ({ ...f, image_base64: '' }))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-indigo-50 dark:hover:bg-[#1e2d4a] border-[#e0d9ff] dark:border-[#332a5c] text-[#712ae2] dark:text-[#b8a5ff]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Anexar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const result = ev.target?.result as string
                          setAiForm(f => ({ ...f, image_base64: result.split(',')[1] }))
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                )}
                {aiForm.image_base64 && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1.5">A IA analisará a imagem para gerar questões sobre ela. A imagem será anexada às questões salvas.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={aiGenerating}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 bg-gradient-to-br from-[#712ae2] to-[#4f46e5]"
              >
                {aiGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Gerar {aiForm.count} {aiForm.count !== 1 ? 'Questões' : 'Questão'}
                  </>
                )}
              </button>
            </form>

            {/* Results */}
            {aiResults.length > 0 && (
              <div className="space-y-3 border-t pt-4 border-[#E2E8F0] dark:border-[#2a3a5c]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {aiResults.length} {aiResults.length !== 1 ? 'questões' : 'questão'} gerada{aiResults.length !== 1 ? 's' : ''}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({aiSelected.size} selecionada{aiSelected.size !== 1 ? 's' : ''})
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))}
                      className="text-xs font-semibold text-[#712ae2] dark:text-[#b8a5ff] hover:underline"
                    >
                      Todas
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => setAiSelected(new Set())}
                      className="text-xs font-semibold text-gray-400 hover:underline"
                    >
                      Nenhuma
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {aiResults.map((q, idx) => {
                    const selected = aiSelected.has(idx)
                    const diffCfg = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium
                    const typeStyle = TYPE_COLORS[q.question_type] || TYPE_COLORS_DEFAULT
                    return (
                      <div
                        key={idx}
                        onClick={() => setAiSelected(s => {
                          const next = new Set(s)
                          next.has(idx) ? next.delete(idx) : next.add(idx)
                          return next
                        })}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${selected
                          ? 'border-[#712ae2] bg-[#faf5ff] dark:bg-[#241a3d]'
                          : 'border-[#E2E8F0] dark:border-[#2a3a5c] bg-white dark:bg-[#1e2d4a]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected
                              ? 'bg-[#712ae2] border-[#712ae2]'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {selected && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                                {TYPE_LABELS[q.question_type]}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${diffCfg.bg} ${diffCfg.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${diffCfg.dot}`} />
                                {diffCfg.label}
                              </span>
                            </div>

                            {/* Statement */}
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{q.statement}</p>

                            {/* Options */}
                            {q.options.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {q.options.map((o, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs px-2 py-0.5 rounded-lg border ${o.is_correct
                                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 font-semibold'
                                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    {OPTION_LETTERS[i]}. {o.text}{o.is_correct ? ' ✓' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={handleAiSave}
                  disabled={aiSaving || aiSelected.size === 0}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-br from-[#4f46e5] to-[#712ae2]"
                >
                  {aiSaving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Salvar {aiSelected.size} {aiSelected.size !== 1 ? 'questões' : 'questão'} no banco
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Excluir esta questão permanentemente?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
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
    </div>
  )
}
