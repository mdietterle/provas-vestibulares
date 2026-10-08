import { useEffect, useState } from 'react'
import { questionsApi, subjectsApi, usersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Question, Subject, TeachingAssignment } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportQuestions } from '../utils/pdf'
import Pagination from '../components/Pagination'
import QuestionCard from './questions/QuestionCard'
import QuestionFormModal from './questions/QuestionFormModal'
import AiGenerateModal from './questions/AiGenerateModal'
import AiInsightsPanel from './questions/AiInsightsPanel'

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
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAiModal, setShowAiModal] = useState(false)

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

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (q: Question) => { setEditing(q); setShowModal(true) }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await questionsApi.delete(confirmDelete.id)
      setConfirmDelete(null)
      load(filterSubject || undefined)
    } catch {
      // toast handled by api interceptor or component
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    multiple_choice: 'Múltipla Escolha',
    true_false: 'Verdadeiro/Falso',
    essay: 'Dissertativa',
    summation: 'Somatório',
  }

  const DIFFICULTY_CONFIG: Record<string, { label: string }> = {
    easy: { label: 'Fácil' },
    medium: { label: 'Médio' },
    hard: { label: 'Difícil' },
  }

  const filtered = questions.filter((q) => {
    if (filterSubject && q.subject_id !== filterSubject) return false
    if (filterType && q.question_type !== filterType) return false
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false
    if (search && !q.statement.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
            onClick={() => setShowAiModal(true)}
            className="btn-sm inline-flex items-center gap-1.5 font-medium text-amber-500 dark:text-[#b8a5ff] border border-[#e0d9ff] dark:border-[#332a5c] bg-[#f5f0ff] dark:bg-[#241a3d] hover:bg-[#ede9fe] dark:hover:bg-[#2a2050] rounded-lg transition-colors"
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
          { label: 'Total', value: questions.length, color: 'teal-600', bg: 'teal-50' },
          { label: 'M. Escolha', value: questions.filter(q => q.question_type === 'multiple_choice').length, color: 'teal-600', bg: 'teal-50' },
          { label: 'V/F', value: questions.filter(q => q.question_type === 'true_false').length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Dissertativas', value: questions.filter(q => q.question_type === 'essay').length, color: '#9333ea', bg: '#fdf4ff' },
          { label: 'Somatório', value: questions.filter(q => q.question_type === 'summation').length, color: '#c2410c', bg: '#fff7ed' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 bg-[var(--stat-bg)] border-[var(--stat-bg)] dark:bg-[#464554] dark:border-[#464554]" style={{ ['--stat-bg' as any]: s.bg }}>
            <p className="text-[10px] font-medium text-[#8490b0] dark:text-slate-300 mb-0.5">{s.label}</p>
            <p className="text-xl font-bold font-display dark:brightness-125" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9da5bc] dark:text-slate-300 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

        <div className="flex rounded-lg overflow-hidden border border-[#d0d9f0] dark:border-[#464554]">
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
              className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[#d0d9f0] dark:border-[#464554]' : ''} ${
                filterType === opt.val ? 'bg-teal-600 text-white' : 'bg-white dark:bg-[#464554] text-[#5a6480] dark:text-slate-300 hover:bg-[#f4f6fb] dark:hover:bg-[#243456]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#d0d9f0] dark:border-[#464554]">
          {[
            { val: '', label: 'Dific.' },
            { val: 'easy', label: 'Fácil' },
            { val: 'medium', label: 'Médio' },
            { val: 'hard', label: 'Difícil' },
          ].map((opt, i) => (
            <button
              key={opt.val}
              onClick={() => setFilterDifficulty(opt.val)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[#d0d9f0] dark:border-[#464554]' : ''} ${
                filterDifficulty === opt.val ? 'bg-teal-600 text-white' : 'bg-white dark:bg-[#464554] text-[#5a6480] dark:text-slate-300 hover:bg-[#f4f6fb] dark:hover:bg-[#243456]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#8490b0] dark:text-slate-300 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {paginated.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            isExpanded={expandedId === q.id}
            onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
            onEdit={() => openEdit(q)}
            onDelete={() => setConfirmDelete(q)}
          />
        ))}

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

      <AiInsightsPanel questions={questions} />

      {showModal && (
        <QuestionFormModal
          editing={editing}
          subjects={creatableSubjects}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(filterSubject || undefined) }}
        />
      )}

      {showAiModal && (
        <AiGenerateModal
          subjects={creatableSubjects}
          onClose={() => setShowAiModal(false)}
          onSaved={() => { setShowAiModal(false); load(filterSubject || undefined) }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Excluir esta questão permanentemente?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}