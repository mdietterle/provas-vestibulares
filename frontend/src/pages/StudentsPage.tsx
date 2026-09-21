import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { classesApi, invitationsApi, usersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Class, User } from '../types'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonTable } from '../components/Skeleton'
import { exportStudents } from '../utils/pdf'
import Pagination from '../components/Pagination'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const colors = [
    ['#27c38a', '#004a31'],
    ['#712ae2', '#23005c'],
    ['#d97706', '#78350f'],
    ['#dc2626', '#7f1d1d'],
    ['#0284c7', '#0c4a6e'],
  ]
  const [from, to] = colors[name.charCodeAt(0) % colors.length]
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active, invitationStatus }: { active: boolean; invitationStatus?: string | null }) {
  if (invitationStatus === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        Aguardando convite
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        active
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-[#1e2d4a] dark:text-[#94a3b8]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#27c38a]' : 'bg-gray-400 dark:bg-[#5a6b8a]'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// ── Invitation badge ──────────────────────────────────────────────────────────

function InvitationBadge({ status }: { status: 'pending' | 'accepted' | null | undefined }) {
  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        Aceito
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Pendente
      </span>
    )
  }
  return <span className="text-xs text-gray-400 dark:text-[#5a6b8a]">—</span>
}

// ── Icon button ───────────────────────────────────────────────────────────────

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
          : 'text-[#334155] dark:text-[#94a3b8] hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947]'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [setPasswordNow, setSetPasswordNow] = useState(false)
  const [classIds, setClassIds] = useState<number[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [saving, setSaving] = useState(false)

  const load = () => usersApi.list('student').then(r => setStudents(r.data))
  useEffect(() => {
    load().finally(() => setLoading(false))
    classesApi.list().then(r => setClasses(r.data))
  }, [])

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && s.is_active) ||
      (filterStatus === 'inactive' && !s.is_active)
    return matchesSearch && matchesStatus
  })

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', password: '' })
    setSetPasswordNow(false)
    setClassIds([])
    setShowModal(true)
  }

  const openEdit = (s: User) => {
    setEditing(s)
    setForm({ name: s.name, email: s.email, password: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const data: Record<string, string> = { name: form.name, email: form.email }
        if (form.password) data.password = form.password
        await usersApi.update(editing.id, data)
        toast.success('Aluno atualizado')
      } else {
        // Com senha definida na hora: login liberado de imediato, sem e-mail.
        // Sem senha: aluno é criado sem senha e recebe convite por e-mail.
        const r = await usersApi.create({
          name: form.name,
          email: form.email,
          role: 'student',
          institution_id: user!.institution_id,
          ...(setPasswordNow && form.password ? { password: form.password } : {}),
        })
        const viaConvite = !(setPasswordNow && form.password)
        if (classIds.length > 0) {
          const results = await Promise.allSettled(classIds.map(classId => classesApi.addStudent(classId, r.data.id)))
          const failed = results.filter(x => x.status === 'rejected').length
          const enrolled = classIds.length - failed
          toast.success(
            enrolled > 0
              ? `Aluno cadastrado e matriculado em ${enrolled} turma${enrolled > 1 ? 's' : ''}!${viaConvite ? ' Convite enviado por email.' : ''}`
              : `Aluno cadastrado!${viaConvite ? ' Convite enviado por email.' : ''}`
          )
        } else {
          toast.success(`Aluno cadastrado!${viaConvite ? ' Convite enviado por email.' : ''}`)
        }
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvitation = async (s: User) => {
    setResendingId(s.id)
    try {
      await invitationsApi.resend(s.id)
      toast.success(`Convite reenviado para ${s.email}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reenviar convite')
    } finally {
      setResendingId(null)
    }
  }

  const handleToggleActive = async (s: User) => {
    setTogglingId(s.id)
    try {
      const r = await usersApi.toggleActive(s.id)
      setStudents(prev => prev.map(x => x.id === s.id ? r.data : x))
      toast.success(r.data.is_active ? 'Aluno ativado' : 'Aluno desativado')
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
      toast.success('Aluno excluído')
      setConfirmDelete(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir')
    }
  }

  const activeCount = students.filter(s => s.is_active && s.invitation_accepted_at).length
  const pendingInviteCount = students.filter(s => s.invitation_status === 'pending').length
  const inactiveCount = students.filter(s => !s.is_active).length

  const PAGE_SIZE = 20
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Alunos</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Gerencie os alunos cadastrados na instituição</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              const label = filterStatus === 'all' ? 'Todos' : filterStatus === 'active' ? 'Ativos' : 'Inativos'
              exportStudents(filtered, label)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E2E8F0] bg-white text-[#4f46e5] hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar PDF
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Alunos', value: students.length, cls: 'bg-[#eef2ff] dark:bg-[#1a2947] text-[#4f46e5] dark:text-[#818CF8]' },
          { label: 'Ativos', value: activeCount, cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
          { label: 'Convite pendente', value: pendingInviteCount, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Inativos', value: inactiveCount, cls: 'bg-gray-100 text-gray-600 dark:bg-[#1e2d4a] dark:text-[#94a3b8]' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#E2E8F0] px-5 py-4 flex items-center gap-4" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg font-bold ${stat.cls}`}>
              {stat.value}
            </div>
            <p className="text-sm font-medium text-[#334155]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#c5c5d3] rounded-lg bg-white text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === s
                  ? 'bg-[#4f46e5] text-white'
                  : 'bg-[#EFF6FF] dark:bg-[#1a2947] text-[#334155] dark:text-[#e2e8f0]'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#64748B] ml-auto">
          {filtered.length} de {students.length} alunos
        </span>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={5} /> : null}
      <div className={`bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto ${loading ? 'hidden' : ''}`} style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#1a2947]">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Aluno</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Email</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Convite</th>
              <th className="px-6 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7]">
            {paginated.map(s => (
              <tr
                key={s.id}
                className="transition-colors bg-white dark:bg-[#131f37] hover:bg-[#F4F6F9] dark:hover:bg-[#1a2947]"
              >
                {/* Aluno */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div>
                      <p className="font-semibold text-[#1E293B]">{s.name}</p>
                      <p className="text-xs text-[#64748B]">Aluno</p>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-4 text-[#334155]">{s.email}</td>

                {/* Status — clicável para toggle (desabilitado enquanto convite pendente) */}
                <td className="px-6 py-4">
                  <button
                    onClick={() => s.invitation_status !== 'pending' && handleToggleActive(s)}
                    disabled={togglingId === s.id || s.invitation_status === 'pending'}
                    title={s.invitation_status === 'pending' ? 'Aluno ainda não aceitou o convite' : s.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                    className="transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-default"
                  >
                    <StatusBadge active={s.is_active} invitationStatus={s.invitation_status} />
                  </button>
                </td>

                {/* Convite */}
                <td className="px-6 py-4">
                  <InvitationBadge status={s.invitation_status} />
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    {s.invitation_status === 'pending' && (
                      <IconBtn
                        onClick={() => handleResendInvitation(s)}
                        title="Reenviar convite por email"
                      >
                        {resendingId === s.id
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        }
                      </IconBtn>
                    )}
                    <IconBtn onClick={() => openEdit(s)} title="Editar aluno">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </IconBtn>
                    <IconBtn onClick={() => setConfirmDelete(s)} title="Excluir aluno" danger>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#b6c4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#334155]">
                      {search || filterStatus !== 'all' ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                    </p>
                    {!search && filterStatus === 'all' && (
                      <button onClick={openCreate} className="text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] hover:underline">
                        Cadastrar primeiro aluno →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-[#EEF2F7] dark:border-[#1e2d4a] flex items-center justify-between bg-[#F4F6F9] dark:bg-[#1a2947]">
            <p className="text-xs text-[#64748B]">
              Mostrando <span className="font-semibold text-[#1E293B]">{filtered.length}</span> de{' '}
              <span className="font-semibold text-[#1E293B]">{students.length}</span> alunos
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#27c38a]" />
                <span className="text-xs text-[#64748B]">{activeCount} ativos</span>
              </div>
              <span className="text-[#c5c5d3]">·</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c5c5d3]" />
                <span className="text-xs text-[#64748B]">{inactiveCount} inativos</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="rounded-xl p-4 flex items-start gap-3 border bg-[#EFF6FF] dark:bg-[#1a2947] border-[#b6c4ff] dark:border-[#2d3f66]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)', color: '#fff' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8]">Insights da IA</p>
          <p className="text-xs text-[#334155] mt-0.5">
            {students.length === 0
              ? 'Comece cadastrando alunos para sua instituição.'
              : <>
                  <strong>{activeCount}</strong> de <strong>{students.length}</strong> alunos estão ativos
                  {' '}({Math.round(activeCount / students.length * 100)}% de engajamento).
                  {inactiveCount > 0 && <> Considere reativar os <strong>{inactiveCount}</strong> alunos inativos.</>}
                </>
            }
          </p>
        </div>
      </div>

      {/* ── Modals ── */}

      {showModal && (
        <Modal title={editing ? 'Editar Aluno' : 'Novo Aluno'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Lucas Oliveira"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="aluno@escola.com.br"
                required
              />
            </div>
            {editing ? (
              <p className="text-xs text-[#64748B] dark:text-[#94a3b8] bg-[#F4F6F9] dark:bg-[#1a2947] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-lg px-3 py-2">
                Para redefinir a senha deste aluno, use <Link to="/user-access" className="font-semibold text-[#712ae2] dark:text-[#818CF8] hover:underline">Controle de Acesso</Link>.
              </p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-xs font-medium text-[#334155] dark:text-[#94a3b8]">
                  <input
                    type="checkbox"
                    className="accent-[#4f46e5]"
                    checked={setPasswordNow}
                    onChange={e => setSetPasswordNow(e.target.checked)}
                  />
                  Definir a senha agora (sem enviar e-mail)
                </label>

                {setPasswordNow ? (
                  <div>
                    <label className="label">Senha</label>
                    <input
                      type="password"
                      className="input"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required={setPasswordNow}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-[#b6c4ff] dark:border-[#2d3f66] bg-[#EFF6FF] dark:bg-[#1a2947]">
                    <svg className="w-5 h-5 text-[#712ae2] dark:text-[#818CF8] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      O aluno receberá um <strong>e-mail de convite</strong> com um link para definir sua própria senha.
                      O acesso ao plano só é contabilizado após o aceite do convite.
                    </p>
                  </div>
                )}
                {classes.length > 0 && (
                  <div>
                    <label className="label">Matricular em <span className="text-[#64748B] font-normal">(opcional — dá pra fazer depois também)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {classes.map(c => {
                        const checked = classIds.includes(c.id)
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#eef2ff] dark:bg-[#1a2947] border-[#c7d2fe] dark:border-[#2d3f66] text-[#4f46e5] dark:text-[#818CF8]'
                                : 'bg-white dark:bg-[#131f37] border-[#E2E8F0] dark:border-[#1e2d4a] text-gray-600 dark:text-[#94a3b8] hover:bg-gray-50 dark:hover:bg-[#1a2947]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-[#4f46e5]"
                              checked={checked}
                              onChange={() => setClassIds(ids => checked ? ids.filter(id => id !== c.id) : [...ids, c.id])}
                            />
                            {c.name} ({c.year})
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 justify-end pt-2">
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
                style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}
              >
                {saving ? 'Salvando...' : editing ? 'Salvar' : setPasswordNow ? 'Cadastrar' : 'Cadastrar e enviar convite'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Excluir permanentemente o aluno "${confirmDelete.name}"? O registro será ocultado de todas as listagens e o login será bloqueado. Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
