import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { ownerApi } from '../api'
import type { OwnerInstitution } from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function OwnerSchoolsPage() {
  const [institutions, setInstitutions] = useState<OwnerInstitution[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateSchool, setShowCreateSchool] = useState(false)
  const [creatingSchool, setCreatingSchool] = useState(false)
  const [schoolForm, setSchoolForm] = useState({ name: '', cnpj: '', admin_name: '', admin_email: '', admin_password: '' })
  const [deleteTarget, setDeleteTarget] = useState<OwnerInstitution | null>(null)
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    ownerApi.institutions().then(({ data }) => setInstitutions(data)).finally(() => setLoading(false))
  }

  const handleCreateSchool = async () => {
    if (!schoolForm.name.trim() || !schoolForm.admin_name.trim() || !schoolForm.admin_email.trim() || schoolForm.admin_password.length < 6) {
      toast.error('Preencha o nome da escola, os dados do administrador e uma senha com pelo menos 6 caracteres.')
      return
    }
    setCreatingSchool(true)
    try {
      await ownerApi.createSchool({
        name: schoolForm.name.trim(),
        cnpj: schoolForm.cnpj.trim() || undefined,
        admin_name: schoolForm.admin_name.trim(),
        admin_email: schoolForm.admin_email.trim(),
        admin_password: schoolForm.admin_password,
      })
      toast.success('Escola cadastrada com sucesso!')
      setShowCreateSchool(false)
      setSchoolForm({ name: '', cnpj: '', admin_name: '', admin_email: '', admin_password: '' })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível cadastrar a escola.')
    } finally {
      setCreatingSchool(false)
    }
  }

  const handleToggleActive = async (inst: OwnerInstitution) => {
    setTogglingActiveId(inst.id)
    try {
      await ownerApi.setSchoolActive(inst.id, !inst.is_active)
      setInstitutions(prev => prev.map(i => i.id === inst.id ? { ...i, is_active: !inst.is_active } : i))
      toast.success(!inst.is_active ? 'Escola reativada.' : 'Escola inativada — usuários dela não conseguirão mais logar.')
    } catch {
      toast.error('Não foi possível alterar o status da escola.')
    } finally {
      setTogglingActiveId(null)
    }
  }

  const handleDeleteSchool = async () => {
    if (!deleteTarget) return
    try {
      await ownerApi.deleteSchool(deleteTarget.id)
      setInstitutions(prev => prev.filter(i => i.id !== deleteTarget.id))
      toast.success('Escola excluída.')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível excluir a escola.')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a]">
      <div className="bg-white dark:bg-[#1d1f27] border-b border-[#E2E8F0] dark:border-[#464554] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B] dark:text-[#e1e2ec]">Gestão de Escolas</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-300">Cadastre, inative ou exclua instituições da plataforma</p>
        </div>
        <button
          onClick={() => setShowCreateSchool(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Escola
        </button>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] dark:border-[#464554] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#464554] bg-[#F4F6F9] dark:bg-[#10131a]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide">Instituição</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide">Situação</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide">Usuários</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide">Criada em</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#464554]">
                {institutions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#64748B] dark:text-slate-300 text-sm">
                      Nenhuma escola cadastrada ainda
                    </td>
                  </tr>
                ) : institutions.map(inst => (
                  <tr key={inst.id} className="hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#1E293B] dark:text-[#e1e2ec]">{inst.name}</div>
                      {inst.cnpj && <div className="text-xs text-[#64748B] dark:text-slate-300">{inst.cnpj}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {inst.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#334155] dark:text-slate-300">{inst.professors + inst.students}</td>
                    <td className="px-4 py-3.5 text-xs text-[#64748B] dark:text-slate-300">
                      {inst.created_at ? new Date(inst.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(inst)}
                          disabled={togglingActiveId === inst.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            inst.is_active
                              ? 'border-slate-200 dark:border-slate-800/50 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/20'
                              : 'border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                        >
                          {inst.is_active ? 'Inativar' : 'Reativar'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inst)}
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
      </div>

      {showCreateSchool && (
        <Modal title="Nova Escola" onClose={() => setShowCreateSchool(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] dark:text-slate-300 uppercase tracking-wide mb-1">Nome da escola *</label>
              <input
                type="text"
                value={schoolForm.name}
                onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-slate-600"
                placeholder="Ex: Colégio Exemplo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] dark:text-slate-300 uppercase tracking-wide mb-1">CNPJ (opcional)</label>
              <input
                type="text"
                value={schoolForm.cnpj}
                onChange={e => setSchoolForm(f => ({ ...f, cnpj: e.target.value }))}
                className="w-full text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-slate-600"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#464554]">
              <p className="text-xs font-semibold text-[#64748B] dark:text-slate-300 uppercase tracking-wide mb-3">Administrador inicial</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={schoolForm.admin_name}
                    onChange={e => setSchoolForm(f => ({ ...f, admin_name: e.target.value }))}
                    className="w-full text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={schoolForm.admin_email}
                    onChange={e => setSchoolForm(f => ({ ...f, admin_email: e.target.value }))}
                    className="w-full text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">Senha inicial *</label>
                  <input
                    type="password"
                    value={schoolForm.admin_password}
                    onChange={e => setSchoolForm(f => ({ ...f, admin_password: e.target.value }))}
                    className="w-full text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-slate-600"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateSchool(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#334155] dark:text-slate-300 hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSchool}
                disabled={creatingSchool}
                className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {creatingSchool ? 'Criando...' : 'Criar escola'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Só é possível excluir escolas sem nenhum usuário cadastrado — se ela tiver usuários, remova-os primeiro ou apenas inative a escola.`}
          onConfirm={handleDeleteSchool}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
