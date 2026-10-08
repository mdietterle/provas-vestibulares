import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { classesApi, subjectsApi, usersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Class, Subject, TeachingAssignment, User } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonTable } from '../components/Skeleton'
import { exportProfessors } from '../utils/pdf'
import Pagination from '../components/Pagination'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
      style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
    >
      {initials}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        active
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-[#464554] dark:text-slate-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#27c38a]' : 'bg-gray-400 dark:bg-[#908fa0]'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// ── Icon buttons ──────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children, danger }: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'text-[#334155] dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947]'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfessorsPage() {
  const { user } = useAuth()
  const [professors, setProfessors] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // create/edit
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', car_access: false })
  const [saving, setSaving] = useState(false)

  // assignments
  const [assignTarget, setAssignTarget] = useState<User | null>(null)
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
  const [assignSubjectId, setAssignSubjectId] = useState(0)
  const [assignClassIds, setAssignClassIds] = useState<number[]>([])
  const [addingAssignment, setAddingAssignment] = useState(false)
  const [justCreated, setJustCreated] = useState(false)

  const loadProfessors = () => usersApi.list('professor').then(r => setProfessors(r.data))

  useEffect(() => {
    Promise.all([
      usersApi.list('professor').then(r => setProfessors(r.data)),
      subjectsApi.list().then(r => setSubjects(r.data)),
      classesApi.list().then(r => setClasses(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = professors.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && p.is_active) ||
      (filterStatus === 'inactive' && !p.is_active)
    return matchesSearch && matchesStatus
  })

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', password: '', car_access: false })
    setShowModal(true)
  }

  const openEdit = (p: User) => {
    setEditing(p)
    setForm({ name: p.name, email: p.email, password: '', car_access: p.car_access ?? false })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const data: Record<string, unknown> = { name: form.name, email: form.email, car_access: form.car_access }
        if (form.password) data.password = form.password
        await usersApi.update(editing.id, data)
        toast.success('Professor atualizado')
        setShowModal(false)
        loadProfessors()
      } else {
        const r = await usersApi.create({ ...form, role: 'professor', institution_id: user!.institution_id! })
        toast.success('Professor cadastrado')
        setShowModal(false)
        loadProfessors()
        // Encadeia direto pro passo de atribuir matérias/turmas — evita o admin
        // ter que voltar depois e procurar o botão "Gerenciar" na lista.
        setJustCreated(true)
        await openAssignments(r.data)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (p: User) => {
    setTogglingId(p.id)
    try {
      const r = await usersApi.toggleActive(p.id)
      setProfessors(prev => prev.map(x => x.id === p.id ? r.data : x))
      toast.success(r.data.is_active ? 'Professor ativado' : 'Professor desativado')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await usersApi.delete(confirmDelete.id)
      toast.success('Professor excluído')
      setConfirmDelete(null)
      loadProfessors()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir')
    }
  }

  // ── Assignments ───────────────────────────────────────────────────────────

  const openAssignments = async (p: User) => {
    setAssignTarget(p)
    setAssignSubjectId(0)
    setAssignClassIds([])
    const r = await usersApi.assignments(p.id)
    setAssignments(r.data)
  }

  const closeAssignments = () => {
    setAssignTarget(null)
    setJustCreated(false)
  }

  const refreshAssignments = async (p: User) => {
    const r = await usersApi.assignments(p.id)
    setAssignments(r.data)
  }

  const handleAddAssignments = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTarget || !assignSubjectId || assignClassIds.length === 0) return
    setAddingAssignment(true)
    try {
      const results = await Promise.allSettled(
        assignClassIds.map(classId =>
          classesApi.createAssignment({ professor_id: assignTarget.id, subject_id: assignSubjectId, class_id: classId })
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed === 0) {
        toast.success(assignClassIds.length > 1 ? `${assignClassIds.length} turmas atribuídas` : 'Atribuição adicionada')
      } else {
        toast.error(`${failed} atribuição(ões) falharam (provavelmente já existiam)`)
      }
      setAssignSubjectId(0)
      setAssignClassIds([])
      await refreshAssignments(assignTarget)
    } finally {
      setAddingAssignment(false)
    }
  }

  const handleRemoveAssignment = async (id: number) => {
    try {
      await classesApi.deleteAssignment(id)
      toast.success('Atribuição removida')
      if (assignTarget) await refreshAssignments(assignTarget)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  const subjectLabel = (id: number) => subjects.find(s => s.id === id)?.name ?? `#${id}`
  const classLabel = (id: number) => {
    const c = classes.find(c => c.id === id)
    return c ? `${c.name} (${c.year})` : `#${id}`
  }

  const PAGE_SIZE = 20
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Professores</h1>
          <p className="page-subtitle">Gerencie matérias, turmas e permissões</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const label = filterStatus === 'all' ? 'Todos' : filterStatus === 'active' ? 'Ativos' : 'Inativos'
              exportProfessors(filtered, assignments, label)
            }}
            className="btn-secondary btn-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            PDF
          </button>
          <button onClick={openCreate} className="btn-primary btn-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo Professor
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9da5bc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#d0d9f0]">
          {(['all', 'active', 'inactive'] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${i > 0 ? 'border-l border-[#d0d9f0]' : ''} ${
                filterStatus === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-[#5a6480] hover:bg-[#f4f6fb]'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#8490b0] ml-auto">
          {filtered.length} de {professors.length}
        </span>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={5} /> : null}
      <div className={`table-wrapper ${loading ? 'hidden' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-head">Professor</th>
              <th className="table-head">Email</th>
              <th className="table-head">Matérias</th>
              <th className="table-head">Status</th>
              <th className="table-head w-20" />
            </tr>
          </thead>
          <tbody>
            {paginated.map(p => (
              <tr key={p.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} />
                    <div>
                      <p className="font-medium text-[#1E293B] text-[13px]">{p.name}</p>
                      {p.car_access && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#eef2ff] dark:bg-slate-800 text-amber-500 dark:text-teal-400">CAR</span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="table-cell text-[#6b7a9a]">{p.email}</td>

                <td className="table-cell">
                  <button
                    onClick={() => openAssignments(p)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-slate-800 text-[#2845b5] dark:text-teal-400 hover:bg-[#e5edff] dark:hover:bg-[#20335a] transition-colors"
                  >
                    Gerenciar
                  </button>
                </td>

                <td className="table-cell">
                  <button
                    onClick={() => handleToggleActive(p)}
                    disabled={togglingId === p.id}
                    title={p.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                    className="transition-opacity hover:opacity-70 disabled:opacity-40"
                  >
                    <StatusBadge active={p.is_active} />
                  </button>
                </td>

                <td className="table-cell">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconBtn onClick={() => openEdit(p)} title="Editar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </IconBtn>
                    <IconBtn onClick={() => setConfirmDelete(p)} title="Excluir" danger>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <svg className="w-10 h-10 text-[#c5d0ea] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm font-medium text-[#374060]">
                      {search || filterStatus !== 'all' ? 'Nenhum professor encontrado' : 'Nenhum professor cadastrado'}
                    </p>
                    {!search && filterStatus === 'all' && (
                      <button onClick={openCreate} className="mt-2 text-sm font-medium text-amber-500 hover:underline">
                        Cadastrar primeiro professor
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* ── Modals ── */}

      {showModal && (
        <Modal title={editing ? 'Editar Professor' : 'Novo Professor'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Ana Paula Martins" required />
            </div>
            <div>
              <label className="label">Email institucional</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="professor@escola.com.br" required />
            </div>
            {editing ? (
              <p className="text-xs text-[#64748B] bg-[#F4F6F9] border border-[#E2E8F0] rounded-lg px-3 py-2">
                Para redefinir a senha deste professor, use <Link to="/user-access" className="font-semibold text-amber-500 hover:underline">Controle de Acesso</Link>.
              </p>
            ) : (
              <div>
                <label className="label">Senha</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required minLength={6} />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-[#E2E8F0] px-4 py-3 hover:bg-[#F4F6F9] transition-colors">
              <input
                type="checkbox"
                checked={form.car_access}
                onChange={e => setForm({ ...form, car_access: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">Acesso ao CAR <span className="font-normal text-[#64748B]">(Correção Automática de Redações)</span></p>
                <p className="text-xs text-[#64748B]">Permite usar o módulo de correção automática de redações por IA</p>
              </div>
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#334155] bg-[#EFF6FF] hover:bg-[#E2E8F0]">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {assignTarget && (
        <Modal
          title={justCreated ? `Professor cadastrado — atribua matérias e turmas para ${assignTarget.name}` : `Matérias — ${assignTarget.name}`}
          onClose={closeAssignments}
          size="lg"
        >
          <div className="space-y-5">
            {justCreated && (
              <div className="flex items-start gap-3 p-3 rounded-xl border text-sm text-emerald-800 dark:text-emerald-300 bg-[#f0fdf8] dark:bg-emerald-900/20 border-[#bbf7d0] dark:border-emerald-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-[#16a34a] dark:text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p>Professor cadastrado. Agora escolha as matérias e turmas que ele vai lecionar — ou pule este passo e faça isso depois pelo botão "Gerenciar".</p>
              </div>
            )}
            <form onSubmit={handleAddAssignments} className="space-y-3">
              <p className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Adicionar atribuição</p>
              <select
                className="input"
                value={assignSubjectId}
                onChange={e => { setAssignSubjectId(+e.target.value); setAssignClassIds([]) }}
              >
                <option value={0}>Selecionar matéria…</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {assignSubjectId > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] mb-1.5">Turmas em que vai lecionar esta matéria</p>
                  <div className="flex flex-wrap gap-2">
                    {classes.map(c => {
                      const checked = assignClassIds.includes(c.id)
                      const already = assignments.some(a => a.subject_id === assignSubjectId && a.class_id === c.id)
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                            already ? 'opacity-40 cursor-not-allowed' :
                            checked
                              ? 'bg-[#eef2ff] dark:bg-slate-800 border-[#c7d2fe] dark:border-[#464554] text-teal-600 dark:text-teal-400'
                              : 'bg-white dark:bg-[#1d1f27] border-[#E2E8F0] dark:border-[#464554] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1a2947]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-teal-600"
                            checked={checked}
                            disabled={already}
                            onChange={() => setAssignClassIds(ids => checked ? ids.filter(id => id !== c.id) : [...ids, c.id])}
                          />
                          {c.name} ({c.year}){already ? ' — já atribuída' : ''}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!assignSubjectId || assignClassIds.length === 0 || addingAssignment}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}
                >
                  {addingAssignment ? 'Adicionando...' : assignClassIds.length > 1 ? `Adicionar (${assignClassIds.length} turmas)` : 'Adicionar'}
                </button>
              </div>
            </form>

            <div>
              <p className="text-xs font-semibold text-[#334155] uppercase tracking-wide mb-2">
                Atribuições atuais ({assignments.length})
              </p>
              {assignments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#c5c5d3] py-8 text-center">
                  <p className="text-sm text-[#64748B]">Nenhuma matéria atribuída</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-[#F4F6F9] dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[#1E293B]">{subjectLabel(a.subject_id)}</span>
                        <span className="text-[#c5c5d3]">·</span>
                        <span className="text-[#334155]">{classLabel(a.class_id)}</span>
                      </div>
                      <button onClick={() => handleRemoveAssignment(a.id)} className="text-xs font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {justCreated && (
              <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
                <button onClick={closeAssignments} className="btn-primary btn-sm">Concluir</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Excluir permanentemente o professor "${confirmDelete.name}"? O registro será ocultado de todas as listagens e o login será bloqueado. Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
