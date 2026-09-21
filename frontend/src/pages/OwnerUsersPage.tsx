import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ownerApi } from '../api'
import type { OwnerUser } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  student: 'Aluno',
}

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<OwnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OwnerUser | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    ownerApi.users().then(({ data }) => setUsers(data)).finally(() => setLoading(false))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false
      if (!q) return true
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.institution_name.toLowerCase().includes(q)
    })
  }, [users, search, roleFilter])

  const handleToggleActive = async (u: OwnerUser) => {
    setBusyId(u.id)
    try {
      await ownerApi.toggleUserActive(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      toast.success(!u.is_active ? 'Usuário reativado.' : 'Usuário inativado — não conseguirá mais logar.')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível alterar o status.')
    } finally {
      setBusyId(null)
    }
  }

  const handleChangeRole = async (u: OwnerUser, role: string) => {
    if (role === u.role) return
    setBusyId(u.id)
    try {
      await ownerApi.changeUserRole(u.id, role)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x))
      toast.success('Papel do usuário atualizado.')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível alterar o papel.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await ownerApi.deleteUser(deleteTarget.id)
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      toast.success('Usuário excluído.')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível excluir o usuário.')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a]">
      <div className="bg-white dark:bg-[#1d1f27] border-b border-[#E2E8F0] dark:border-[#464554] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B] dark:text-[#e1e2ec]">Gestão de Usuários</h1>
          <p className="text-sm text-[#64748B] dark:text-[#c7c4d7]">Todos os usuários de todas as escolas da plataforma</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou escola..."
            className="w-64 text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-[#4f46e5]"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-[#4f46e5]"
          >
            <option value="">Todos os papéis</option>
            <option value="admin">Administrador</option>
            <option value="professor">Professor</option>
            <option value="student">Aluno</option>
          </select>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] dark:border-[#464554] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#464554] bg-[#F4F6F9] dark:bg-[#10131a]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Escola</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Papel</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Situação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Criado em</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-[#c7c4d7] uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#464554]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[#64748B] dark:text-[#c7c4d7] text-sm">
                      {users.length === 0 ? 'Nenhum usuário cadastrado ainda' : 'Nenhum usuário encontrado com esse filtro'}
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#1E293B] dark:text-[#e1e2ec]">{u.name}</div>
                      <div className="text-xs text-[#64748B] dark:text-[#c7c4d7]">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#334155] dark:text-[#c7c4d7]">{u.institution_name}</td>
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={e => handleChangeRole(u, e.target.value)}
                        className="text-xs font-semibold border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-2 py-1 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-[#4f46e5] disabled:opacity-50"
                      >
                        <option value="admin">{ROLE_LABEL.admin}</option>
                        <option value="professor">{ROLE_LABEL.professor}</option>
                        <option value="student">{ROLE_LABEL.student}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#64748B] dark:text-[#c7c4d7]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={busyId === u.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            u.is_active
                              ? 'border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              : 'border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                        >
                          {u.is_active ? 'Inativar' : 'Reativar'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">{filtered.length} de {users.length} usuário(s)</p>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir "${deleteTarget.name}" (${deleteTarget.email})? Essa ação bloqueia o login e remove o usuário de todas as listagens da escola "${deleteTarget.institution_name}".`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
