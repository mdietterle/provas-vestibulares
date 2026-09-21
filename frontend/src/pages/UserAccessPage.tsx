import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usersApi } from '../api'
import type { User } from '../types'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'

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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        active
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-[#464554] dark:text-[#c7c4d7]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#27c38a]' : 'bg-gray-400 dark:bg-[#908fa0]'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isProfessor = role === 'professor'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        isProfessor
          ? 'bg-[#eef2ff] dark:bg-[#272a32] text-[#4a1d96] dark:text-[#818CF8]'
          : 'bg-[#dce1ff] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]'
      }`}
    >
      {isProfessor ? 'Professor' : 'Aluno'}
    </span>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children, color }: {
  onClick: () => void; title: string; children: React.ReactNode; color?: 'danger' | 'accent'
}) {
  const cls = color === 'danger'
    ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
    : color === 'accent'
      ? 'text-[#712ae2] dark:text-[#818CF8] hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947]'
      : 'text-[#334155] dark:text-[#c7c4d7] hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947]'
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${cls}`}
    >
      {children}
    </button>
  )
}

// ── Key icon ──────────────────────────────────────────────────────────────────

function KeyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'all' | 'professor' | 'student'
type FilterStatus = 'all' | 'active' | 'inactive'

export default function UserAccessPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // password reset modal
  const [pwTarget, setPwTarget] = useState<User | null>(null)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwVisible, setPwVisible] = useState(false)

  const load = () =>
    Promise.all([
      usersApi.list('professor'),
      usersApi.list('student'),
    ]).then(([profs, studs]) => {
      setUsers([...profs.data, ...studs.data])
    })

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const matchesTab =
      tab === 'all' ||
      (tab === 'professor' && u.role === 'professor') ||
      (tab === 'student' && u.role === 'student')
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && u.is_active) ||
      (filterStatus === 'inactive' && !u.is_active)
    return matchesTab && matchesSearch && matchesStatus
  })

  // ── Password reset ─────────────────────────────────────────────────────────

  const openPasswordReset = (u: User) => {
    setPwTarget(u)
    setPwForm({ password: '', confirm: '' })
    setPwVisible(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwTarget) return
    if (pwForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (pwForm.password !== pwForm.confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setPwSaving(true)
    try {
      await usersApi.update(pwTarget.id, { password: pwForm.password })
      toast.success(`Senha de ${pwTarget.name} alterada com sucesso`)
      setPwTarget(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao alterar senha')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const professors = users.filter(u => u.role === 'professor')
  const students = users.filter(u => u.role === 'student')
  const activeCount = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: users.length },
    { key: 'professor', label: 'Professores', count: professors.length },
    { key: 'student', label: 'Alunos', count: students.length },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1E293B]">Controle de Acesso</h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Redefina a senha de professores e alunos. Para ativar/desativar ou editar dados, use as páginas de Professores e Alunos.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Professores', value: professors.length, cls: 'bg-[#eef2ff] dark:bg-[#272a32] text-[#4a1d96] dark:text-[#818CF8]' },
          { label: 'Alunos', value: students.length, cls: 'bg-[#eef2ff] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]' },
          { label: 'Ativos', value: activeCount, cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
          { label: 'Inativos', value: inactiveCount, cls: 'bg-gray-100 text-gray-600 dark:bg-[#464554] dark:text-[#c7c4d7]' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#E2E8F0] px-5 py-4 flex items-center gap-4"
            style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0 ${stat.cls}`}>
              {stat.value}
            </div>
            <p className="text-sm font-medium text-[#334155]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 p-1 rounded-xl border border-[#E2E8F0] bg-white w-fit" style={{ boxShadow: '0 1px 4px rgba(0,35,111,0.06)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'text-white' : 'text-[#334155] dark:text-[#c7c4d7]'
              }`}
              style={tab === t.key
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }
                : undefined}
            >
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold leading-none ${
                  tab === t.key
                    ? 'bg-white/25 text-white'
                    : 'bg-[#E2E8F0] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

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
                    : 'bg-[#EFF6FF] dark:bg-[#272a32] text-[#334155] dark:text-[#e2e8f0]'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#64748B] ml-auto">
            {filtered.length} de {users.length} usuários
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={6} /> : null}
      <div
        className={`bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto ${loading ? 'hidden' : ''}`}
        style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#272a32]">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Usuário</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Email</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Perfil</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide hidden lg:table-cell">Cadastrado em</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#334155] uppercase tracking-wide text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7]">
            {filtered.map(u => (
              <tr
                key={u.id}
                className="transition-colors bg-white dark:bg-[#1d1f27] hover:bg-[#F4F6F9] dark:hover:bg-[#1a2947]"
              >
                {/* Usuário */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <p className="font-semibold text-[#1E293B]">{u.name}</p>
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-4 text-[#334155]">{u.email}</td>

                {/* Perfil */}
                <td className="px-6 py-4">
                  <RoleBadge role={u.role} />
                </td>

                {/* Status — somente leitura; ativar/desativar fica em Professores/Alunos */}
                <td className="px-6 py-4">
                  <StatusBadge active={u.is_active} />
                </td>

                {/* Cadastrado em */}
                <td className="px-6 py-4 text-xs text-[#64748B] hidden lg:table-cell">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '—'}
                </td>

                {/* Ações */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn
                      onClick={() => openPasswordReset(u)}
                      title="Redefinir senha"
                      color="accent"
                    >
                      <KeyIcon />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#b6c4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#334155]">Nenhum usuário encontrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-[#EEF2F7] dark:border-[#464554] flex items-center justify-between bg-[#F4F6F9] dark:bg-[#272a32]">
            <p className="text-xs text-[#64748B]">
              Mostrando <span className="font-semibold text-[#1E293B]">{filtered.length}</span> de{' '}
              <span className="font-semibold text-[#1E293B]">{users.length}</span> usuários
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

      {/* Info banner */}
      <div className="rounded-xl p-4 flex items-start gap-3 border bg-[#EFF6FF] dark:bg-[#272a32] border-[#b6c4ff] dark:border-[#464554]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)', color: '#fff' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8]">Como usar esta página</p>
          <p className="text-xs text-[#334155] mt-0.5">
            Clique no <strong>ícone de chave</strong> para redefinir a senha de um usuário sem envio de email.
            Ativar/desativar acesso e editar nome/email ficam nas páginas de <strong>Professores</strong> e <strong>Alunos</strong>, junto do resto do cadastro dessa pessoa.
          </p>
        </div>
      </div>

      {/* ── Password reset modal ── */}

      {pwTarget && (
        <Modal title="Redefinir Senha" onClose={() => setPwTarget(null)}>
          <div className="space-y-5">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#272a32]">
              <Avatar name={pwTarget.name} />
              <div>
                <p className="font-semibold text-sm text-[#1E293B]">{pwTarget.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-[#64748B]">{pwTarget.email}</p>
                  <RoleBadge role={pwTarget.role} />
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="label">Nova senha</label>
                <div className="relative">
                  <input
                    type={pwVisible ? 'text' : 'password'}
                    className="input pr-10"
                    value={pwForm.password}
                    onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible(v => !v)}
                    aria-label={pwVisible ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#334155]"
                    tabIndex={-1}
                  >
                    {pwVisible ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirmar nova senha</label>
                <input
                  type={pwVisible ? 'text' : 'password'}
                  className="input"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                {pwForm.confirm && pwForm.password !== pwForm.confirm && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              {/* Strength indicator */}
              {pwForm.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => {
                      const strength = pwForm.password.length >= 12 ? 4
                        : pwForm.password.length >= 9 ? 3
                        : pwForm.password.length >= 6 ? 2
                        : 1
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= strength
                              ? strength <= 1 ? 'bg-red-600'
                              : strength === 2 ? 'bg-amber-600'
                              : strength === 3 ? 'bg-blue-500'
                              : 'bg-[#27c38a]'
                              : 'bg-gray-200 dark:bg-[#464554]'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {pwForm.password.length < 6 ? 'Muito curta' :
                     pwForm.password.length < 9 ? 'Fraca' :
                     pwForm.password.length < 12 ? 'Média' : 'Forte'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPwTarget(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#334155] bg-[#EFF6FF] hover:bg-[#E2E8F0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwSaving || pwForm.password !== pwForm.confirm || pwForm.password.length < 6}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}
                >
                  {pwSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <KeyIcon />
                      Redefinir Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  )
}
