import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { classesApi, subjectsApi, usersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Class, Subject, TeachingAssignment, User } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportClasses } from '../utils/pdf'
import Pagination from '../components/Pagination'

const CLASS_PALETTES = [
  { bg: '#eef2ff', icon: '#0d9488', border: '#c7d2fe', darkBg: '#1a2947', darkIcon: 'teal-300', darkBorder: '#2d3f6a' },
  { bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0', darkBg: '#0f2e22', darkIcon: '#6ee7b7', darkBorder: '#1c4632' },
  { bg: '#fdf4ff', icon: '#9333ea', border: '#e9d5ff', darkBg: '#2b1a3f', darkIcon: '#d8b4fe', darkBorder: '#432a5c' },
  { bg: '#fff7ed', icon: '#ea580c', border: '#fed7aa', darkBg: '#3a2313', darkIcon: '#fdba74', darkBorder: '#5a3620' },
  { bg: '#f0f9ff', icon: '#0284c7', border: '#bae6fd', darkBg: '#122c3d', darkIcon: '#7dd3fc', darkBorder: '#1d4360' },
  { bg: '#fef9c3', icon: '#ca8a04', border: '#fde68a', darkBg: '#332a0d', darkIcon: '#fde047', darkBorder: '#4d3f14' },
  { bg: '#fdf2f8', icon: '#db2777', border: '#f9a8d4', darkBg: '#3a1a2e', darkIcon: '#f9a8d4', darkBorder: '#582744' },
  { bg: '#f0fdfa', icon: '#0d9488', border: '#99f6e4', darkBg: '#0e2e2a', darkIcon: '#5eead4', darkBorder: '#164a41' },
]

function ClassIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function StudentAvatar({ name, index }: { name: string; index: number }) {
  const colors = [
    { bg: '#dbeafe', text: '#1d4ed8' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#ede9fe', text: '#6d28d9' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#fef9c3', text: '#92400e' },
  ]
  const c = colors[index % colors.length]
  const darkColors = [
    { bg: '#1e2d4a', text: 'teal-300' },
    { bg: '#0f2e22', text: '#6ee7b7' },
    { bg: '#241a42', text: '#A5B4FC' },
    { bg: '#3a1a2e', text: '#f9a8d4' },
    { bg: '#2e2712', text: '#fcd34d' },
  ]
  const dc = darkColors[index % darkColors.length]
  return (
    <div
      style={{ '--sa-bg': c.bg, '--sa-text': c.text, '--sa-dark-bg': dc.bg, '--sa-dark-text': dc.text } as React.CSSProperties}
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--sa-bg)] text-[var(--sa-text)] dark:bg-[var(--sa-dark-bg)] dark:text-[var(--sa-dark-text)]"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function ClassesPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [professors, setProfessors] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Class | null>(null)
  const [classStudents, setClassStudents] = useState<User[]>([])
  const [classAssignments, setClassAssignments] = useState<TeachingAssignment[]>([])
  const [allStudents, setAllStudents] = useState<User[]>([])
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<Class | null>(null)
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear() })
  const [assignForm, setAssignForm] = useState({ professor_id: 0, subject_id: 0 })
  const [search, setSearch] = useState('')
  const [detailTab, setDetailTab] = useState<'professors' | 'students'>('professors')
  const [page, setPage] = useState(1)

  const load = () => classesApi.list().then((r) => setClasses(r.data))

  // Soma real de matrículas: cada turma tem sua própria lista de alunos, então
  // "matriculados" = união dos alunos que aparecem em pelo menos uma turma —
  // não o total de alunos da instituição (que inclui os sem nenhuma turma).
  const refreshEnrollmentTotals = async (classList: Class[]) => {
    const lists = await Promise.all(classList.map(c => classesApi.listStudents(c.id).then(r => r.data).catch(() => [])))
    setEnrolledStudentIds(new Set(lists.flat().map(s => s.id)))
  }

  useEffect(() => {
    classesApi.list().then((r) => {
      setClasses(r.data)
      refreshEnrollmentTotals(r.data)
    })
    usersApi.list('professor').then((r) => setProfessors(r.data))
    subjectsApi.list().then((r) => setSubjects(r.data))
    usersApi.list('student').then((r) => setAllStudents(r.data))
  }, [])

  const openDetail = async (c: Class) => {
    setShowDetail(c)
    setDetailTab('professors')
    const [studs, assigns] = await Promise.all([
      classesApi.listStudents(c.id),
      classesApi.listAssignments(c.id),
    ])
    setClassStudents(studs.data)
    setClassAssignments(assigns.data)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await classesApi.create(form)
      toast.success('Turma criada')
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await classesApi.delete(confirmDelete.id)
      toast.success('Turma removida')
      setConfirmDelete(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir')
    }
  }

  const addStudent = async (studentId: number) => {
    if (!showDetail) return
    try {
      await classesApi.addStudent(showDetail.id, studentId)
      toast.success('Aluno adicionado')
      const r = await classesApi.listStudents(showDetail.id)
      setClassStudents(r.data)
      setEnrolledStudentIds(prev => new Set(prev).add(studentId))
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const removeStudent = async (studentId: number) => {
    if (!showDetail) return
    try {
      await classesApi.removeStudent(showDetail.id, studentId)
      toast.success('Aluno removido')
      const r = await classesApi.listStudents(showDetail.id)
      setClassStudents(r.data)
      // O aluno pode continuar matriculado em outras turmas — recalcula certo
      await refreshEnrollmentTotals(classes)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showDetail || !assignForm.professor_id || !assignForm.subject_id) return
    try {
      await classesApi.createAssignment({ ...assignForm, class_id: showDetail.id })
      toast.success('Professor atribuído')
      const r = await classesApi.listAssignments(showDetail.id)
      setClassAssignments(r.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const removeAssignment = async (id: number) => {
    try {
      await classesApi.deleteAssignment(id)
      toast.success('Atribuição removida')
      if (showDetail) {
        const r = await classesApi.listAssignments(showDetail.id)
        setClassAssignments(r.data)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const enrolledIds = new Set(classStudents.map((s) => s.id))
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id))

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    String(c.year).includes(search)
  )

  useEffect(() => { setPage(1) }, [search])

  const PAGE_SIZE = 16
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalStudentsEnrolled = enrolledStudentIds.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0d9488] dark:text-teal-400">Turmas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} turma{classes.length !== 1 ? 's' : ''} cadastrada{classes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportClasses(classes)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] bg-white text-[#0d9488] hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar PDF
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95 bg-gradient-to-br from-[#0d9488] to-amber-500 dark:from-slate-800 dark:to-[#4c2f8c]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Turma
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Turmas', value: classes.length, bg: 'bg-[#eef2ff] dark:bg-slate-800', fg: 'text-[#0d9488] dark:text-teal-400' },
          { label: 'Ano Corrente', value: classes.filter(c => c.year === new Date().getFullYear()).length, bg: 'bg-[#f5f0ff] dark:bg-[#251a42]', fg: 'text-amber-500 dark:text-[#b79bff]' },
          { label: 'Alunos Matriculados', value: totalStudentsEnrolled, bg: 'bg-[#f0fdf8] dark:bg-[#0f2e22]', fg: 'text-[#27c38a] dark:text-[#4ade80]' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-4 border border-transparent ${stat.bg}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-display ${stat.fg}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#1d1f27] text-gray-900 dark:text-gray-100 focus:ring-[#0d9488]/20 dark:focus:ring-teal-400/20"
          placeholder="Buscar turma ou ano..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 && !user?.role?.includes('admin') ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="font-medium">Nenhuma turma encontrada</p>
          <p className="text-sm mt-1">Tente outro termo de busca</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginated.map((c, idx) => {
            const palette = CLASS_PALETTES[idx % CLASS_PALETTES.length]
            return (
              <div
                key={c.id}
                className="rounded-2xl border bg-white dark:bg-[#1d1f27] flex flex-col overflow-hidden transition-all hover:shadow-md border-[var(--pal-border)] dark:border-[var(--pal-dark-border)]"
                style={{
                  '--pal-border': palette.border,
                  '--pal-dark-border': palette.darkBorder,
                  '--pal-bg': palette.bg,
                  '--pal-dark-bg': palette.darkBg,
                  '--pal-icon': palette.icon,
                  '--pal-dark-icon': palette.darkIcon,
                } as React.CSSProperties}
              >
                {/* Card header */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--pal-bg)] dark:bg-[var(--pal-dark-bg)]">
                    <ClassIcon color={palette.icon} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{c.name}</h3>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--pal-bg)] dark:bg-[var(--pal-dark-bg)] text-[var(--pal-icon)] dark:text-[var(--pal-dark-icon)]">
                      {c.year}
                    </span>
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => openDetail(c)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80 border-[var(--pal-border)] dark:border-[var(--pal-dark-border)] text-[var(--pal-icon)] dark:text-[var(--pal-dark-icon)] bg-[var(--pal-bg)] dark:bg-[var(--pal-dark-bg)]"
                  >
                    Detalhes
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Excluir turma"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add card */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-2xl border-2 border-dashed border-[#c7d2fe] dark:border-[#464554] flex flex-col items-center justify-center gap-2 p-6 text-gray-400 dark:text-gray-500 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-amber-500 dark:stroke-[#b79bff]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-xs font-semibold">Nova Turma</span>
            </button>
          )}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <p className="font-medium">Nenhuma turma encontrada</p>
            </div>
          )}
        </div>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* AI Insights */}
      <div className="rounded-2xl border p-5 bg-[#eef2ff] dark:bg-slate-800 border-[#e0d9ff] dark:border-[#464554]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-[#0d9488] dark:from-[#4c2f8c] dark:to-slate-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#0d9488] dark:text-teal-400">Insights de Turmas</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-[#ede9fe] dark:bg-[#2b1a3f] text-amber-500 dark:text-[#b79bff]">IA</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-amber-500 dark:text-[#b79bff]">{classes.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Turmas Ativas</p>
          </div>
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-[#27c38a] dark:text-[#4ade80]">{professors.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Professores</p>
          </div>
          <div className="bg-white dark:bg-[#1d1f27] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#464554]">
            <p className="text-lg font-bold text-[#0d9488] dark:text-teal-400">{subjects.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Matérias</p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <Modal title="Nova Turma" onClose={() => setShowModal(false)} size="sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Nome da Turma</label>
              <input
                className="input"
                placeholder="Ex: 9º Ano A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Ano</label>
              <input
                type="number"
                className="input"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: +e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 bg-gradient-to-br from-[#0d9488] to-amber-500 dark:from-slate-800 dark:to-[#4c2f8c]"
              >
                Criar Turma
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal title={`${showDetail.name} — ${showDetail.year}`} onClose={() => setShowDetail(null)} size="xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
            {(['professors', 'students'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all " +
                  (detailTab === tab
                    ? "bg-white dark:bg-[#1d1f27] text-[#0d9488] dark:text-teal-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400")
                }
              >
                {tab === 'professors' ? `Professores (${classAssignments.length})` : `Alunos (${classStudents.length})`}
              </button>
            ))}
          </div>

          {detailTab === 'professors' && (
            <div className="space-y-4">
              {user?.role === 'admin' && (
                <form onSubmit={addAssignment} className="flex gap-2 p-4 rounded-xl border bg-[#F4F6F9] dark:bg-slate-800 border-[#E2E8F0] dark:border-[#464554]">
                  <select
                    className="input flex-1"
                    value={assignForm.professor_id}
                    onChange={(e) => setAssignForm({ ...assignForm, professor_id: +e.target.value })}
                  >
                    <option value={0}>Selecionar professor...</option>
                    {professors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select
                    className="input flex-1"
                    value={assignForm.subject_id}
                    onChange={(e) => setAssignForm({ ...assignForm, subject_id: +e.target.value })}
                  >
                    <option value={0}>Selecionar matéria...</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold whitespace-nowrap bg-gradient-to-br from-[#0d9488] to-amber-500 dark:from-slate-800 dark:to-[#4c2f8c]"
                  >
                    Atribuir
                  </button>
                </form>
              )}
              <div className="space-y-2">
                {classAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-[#eef2ff] dark:bg-slate-800 text-[#0d9488] dark:text-teal-400">
                        {a.professor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{a.professor.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.subject.name}</p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => removeAssignment(a.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remover atribuição"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {classAssignments.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">Nenhum professor atribuído a esta turma</p>
                )}
              </div>
            </div>
          )}

          {detailTab === 'students' && (
            <div className="space-y-4">
              {user?.role === 'admin' && availableStudents.length > 0 && (
                <div className="p-4 rounded-xl border bg-[#F4F6F9] dark:bg-slate-800 border-[#E2E8F0] dark:border-[#464554]">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Adicionar Aluno</label>
                  <select
                    className="input"
                    onChange={(e) => { if (e.target.value) addStudent(+e.target.value) }}
                    defaultValue=""
                  >
                    <option value="">Selecionar aluno...</option>
                    {availableStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                {classStudents.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554]">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={s.name} index={idx} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => removeStudent(s.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remover aluno"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {classStudents.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">Nenhum aluno matriculado nesta turma</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Excluir turma "${confirmDelete.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
