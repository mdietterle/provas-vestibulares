import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { subjectsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Subject } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportSubjects } from '../utils/pdf'
import Pagination from '../components/Pagination'

const PALETTES = [
  { color: '#0d9488', bg: 'teal-50', icon: '#4059aa' },
  { color: '#f59e0b', bg: '#e9ddff', icon: '#8455ef' },
  { color: '#065f46', bg: '#d1fae5', icon: '#27c38a' },
  { color: '#78350f', bg: '#fef3c7', icon: '#d97706' },
  { color: '#7f1d1d', bg: '#fee2e2', icon: '#dc2626' },
  { color: '#0c4a6e', bg: '#dbeafe', icon: '#0284c7' },
  { color: '#4a1d96', bg: '#ede9fe', icon: '#7c3aed' },
  { color: '#134e4a', bg: '#ccfbf1', icon: '#0d9488' },
]

function subjectIcon(name: string) {
  const lower = name.toLowerCase()
  if (/mat[eé]|álgebra|cálc|geometr/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  if (/portugu|redaç|liter|escrit/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z"/></svg>
  if (/ciên|biol|quím|fís|natur/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
  if (/hist[oó]|geogr|humanas|social/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  if (/ingl[eê]|espanh|franc|idiom|lingu/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>
  if (/inform|comput|program|tecnol/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
  if (/arte|mús|desen|pintur/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
  if (/ed.fís|esport/.test(lower))
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
  // default
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
}

export default function SubjectsPage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => subjectsApi.list().then(r => setSubjects(r.data))
  useEffect(() => { load() }, [])

  useEffect(() => { setPage(1) }, [search])

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const PAGE_SIZE = 16
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => { setEditing(null); setName(''); setShowModal(true) }
  const openEdit = (s: Subject) => { setEditing(s); setName(s.name); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await subjectsApi.update(editing.id, { name })
        toast.success('Matéria atualizada')
      } else {
        await subjectsApi.create({ name })
        toast.success('Matéria cadastrada')
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await subjectsApi.delete(confirmDelete.id)
      toast.success('Matéria removida')
      setConfirmDelete(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir')
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Matérias</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {subjects.length} {subjects.length === 1 ? 'matéria cadastrada' : 'matérias cadastradas'} na instituição
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportSubjects(subjects)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E2E8F0] bg-white text-[#0d9488] hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar PDF
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova Matéria
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar matéria..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-[#c5c5d3] rounded-lg bg-white text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
            <svg className="w-7 h-7 text-[#b6c4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[#334155]">
            {search ? 'Nenhuma matéria encontrada' : 'Nenhuma matéria cadastrada'}
          </p>
          {!search && isAdmin && (
            <button onClick={openCreate} className="text-sm font-semibold text-[#f59e0b] hover:underline">
              Cadastrar primeira matéria →
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginated.map((s, i) => {
            const palette = PALETTES[i % PALETTES.length]
            return (
              <div
                key={s.id}
                className="group bg-white rounded-xl border border-[#E2E8F0] p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5"
                style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,35,111,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,35,111,0.06)')}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: palette.bg, color: palette.icon }}
                >
                  {subjectIcon(s.name)}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="font-display font-semibold text-[#1E293B] leading-snug">{s.name}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Matéria</p>
                </div>

                {/* Actions — admin only */}
                {isAdmin && (
                  <div className="flex gap-2 pt-1 border-t border-[#EEF2F7]">
                    <button
                      onClick={() => openEdit(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: '#EFF6FF', color: '#0d9488' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#E2E8F0')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#EFF6FF')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add card — admin only */}
          {isAdmin && (
            <button
              onClick={openCreate}
              className="group bg-white rounded-xl border-2 border-dashed border-[#c5c5d3] dark:border-[#3a4a6e] p-5 flex flex-col items-center justify-center gap-3 transition-all hover:border-[#f59e0b] dark:hover:border-[#4a5f8f] hover:bg-[#F4F6F9] dark:hover:bg-[#1a2947] min-h-[140px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center transition-colors group-hover:bg-[#e9ddff]">
                <svg className="w-5 h-5 text-[#b6c4ff] group-hover:text-[#f59e0b] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#64748B] group-hover:text-[#f59e0b] transition-colors">Nova Matéria</p>
            </button>
          )}
        </div>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* AI Insights */}
      {subjects.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3 border" style={{ background: '#EFF6FF', borderColor: '#b6c4ff' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#0d9488,#f59e0b)', color: '#fff' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0d9488]">Insights da IA</p>
            <p className="text-xs text-[#334155] mt-0.5">
              Você tem <strong>{subjects.length}</strong> {subjects.length === 1 ? 'matéria cadastrada' : 'matérias cadastradas'}.
              {' '}Use o Banco de Questões para criar avaliações segmentadas por disciplina e obter análises de desempenho por matéria.
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? 'Editar Matéria' : 'Nova Matéria'}
          onClose={() => setShowModal(false)}
          size="sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome da Matéria</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Matemática, Português, Ciências..."
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#334155] bg-[#EFF6FF] hover:bg-[#E2E8F0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0d9488,#f59e0b)' }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Excluir a matéria "${confirmDelete.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
