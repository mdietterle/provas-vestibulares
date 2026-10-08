import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { institutionsApi, usageApi, type UsageSummary } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Institution } from '../types'

export default function SchoolSettingsPage() {
  const { user } = useAuth()
  const [inst, setInst] = useState<Institution | null>(null)
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [aiAutoSuggest, setAiAutoSuggest] = useState(true)

  // Mesma fonte de dados de /usage e /subscription — antes esta página
  // mostrava um badge "Premium AI" com números fixos no código (3.200
  // geradas / 1.800 disponíveis / 64%), nunca ligados a nenhuma API, sempre
  // divergentes do plano e uso reais da conta.
  const aiUsed = usage ? usage.totals.ai_generation + usage.totals.ai_correction : 0
  const genLimit = usage?.limits_per_professor.ai_generation ?? null
  const corLimit = usage?.limits_per_professor.ai_correction ?? null
  const activeProfessors = usage?.professors.active ?? 0
  const aiLimit = usage && genLimit !== null && corLimit !== null
    ? (genLimit + corLimit) * activeProfessors
    : null
  const aiAvailable = aiLimit !== null ? Math.max(0, aiLimit - aiUsed) : null
  const aiPct = aiLimit !== null && aiLimit > 0 ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0

  const load = () =>
    institutionsApi.list().then((r) => {
      const i = r.data[0]
      if (i) { setInst(i); setName(i.name); setCnpj(i.cnpj ?? '') }
    })

  useEffect(() => { load() }, [])
  useEffect(() => { usageApi.summary().then(r => setUsage(r.data)).catch(() => {}) }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inst) return
    setSaving(true)
    try {
      await institutionsApi.update(inst.id, { name, cnpj: cnpj || undefined })
      toast.success('Dados salvos')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !inst) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2 MB.'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await institutionsApi.uploadLogo(inst.id, form)
      toast.success('Logo atualizado')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!inst) return
    try {
      await institutionsApi.removeLogo(inst.id)
      toast.success('Logo removido')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro')
    }
  }

  if (!inst) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <svg className="animate-spin mb-3" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p className="text-sm">Carregando configurações...</p>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-[#0d9488]">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie as informações da sua instituição</p>
      </div>

      {/* Logo card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#eef2ff] dark:bg-slate-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900">Logo da Escola</h2>
        </div>

        <div className="flex items-center gap-6">
          {/* Logo preview */}
          <div
            className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors ${
              inst.logo
                ? 'border-[#c7d2fe] dark:border-[#3730a3] bg-white dark:bg-[#1d1f27]'
                : 'border-[#E2E8F0] bg-[#F4F6F9]'
            }`}
          >
            {inst.logo ? (
              <img src={inst.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs text-center leading-tight">Sem logo</span>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <p className="text-sm text-gray-500 leading-relaxed">
              PNG, JPEG ou WebP — máximo <strong>2 MB</strong>.<br />
              Recomendado: fundo transparente, 200 × 200 px.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Enviando…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                    {inst.logo ? 'Trocar logo' : 'Enviar logo'}
                  </>
                )}
              </button>
              {inst.logo && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] text-gray-700 text-sm font-semibold transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Remover
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>

      {/* Institution data card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#eef2ff] dark:bg-slate-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900">Dados da Instituição</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome da Escola</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Escola Estadual João da Silva"
              required
            />
          </div>
          <div>
            <label className="label">
              CNPJ
              <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              className="input"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Salvando…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Salvar alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* AI Settings card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6" style={{ boxShadow: '0 0 0 2px rgba(107,56,212,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #0d9488)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">Configurações de IA</h2>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg, #f59e0b, #0d9488)', color: '#fff' }}>
            Plano {usage?.plan.label ?? '...'}
          </span>
        </div>

        {/* Consumo atual — mesmos dados de /usage, nunca hardcoded aqui */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-3">Consumo atual do mês</p>
          {!usage ? (
            <p className="text-sm text-[#64748B]">Carregando...</p>
          ) : !usage.plan.ai_enabled ? (
            <p className="text-sm text-[#64748B]">
              O plano {usage.plan.label} não inclui IA. <Link to="/plans" className="text-[#f59e0b] font-semibold hover:underline">Ver planos com IA</Link>.
            </p>
          ) : (
            <>
              <div className="flex justify-between mb-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1E293B]">{aiUsed.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-[#64748B] uppercase tracking-wide">Usadas (geração + correção)</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#f59e0b]">{aiAvailable !== null ? aiAvailable.toLocaleString('pt-BR') : '∞'}</p>
                  <p className="text-[11px] text-[#64748B] uppercase tracking-wide">Disponíveis</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1E293B]">{aiLimit !== null ? `${aiPct}%` : '—'}</p>
                  <p className="text-[11px] text-[#64748B] uppercase tracking-wide">Utilizado</p>
                </div>
              </div>
              {aiLimit !== null && (
                <div className="h-2 rounded-full overflow-hidden bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${aiPct}%`,
                      background: aiPct > 85 ? '#ef4444' : aiPct > 60 ? '#f59e0b' : 'linear-gradient(90deg, #0d9488, #14b8a6)',
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-[#64748B] mt-1.5">
                Limite mensal soma o de cada professor ({activeProfessors} ativo{activeProfessors !== 1 ? 's' : ''}) — ajuste em{' '}
                <Link to="/usage" className="text-[#f59e0b] font-semibold hover:underline">Uso &amp; Limites</Link>.
              </p>
            </>
          )}
        </div>

        {/* Toggle Sugestão Automática */}
        <div className="flex items-center justify-between py-3 border-t border-[#E2E8F0]">
          <div>
            <p className="text-sm font-medium text-gray-800">Sugestão Automática</p>
            <p className="text-xs text-[#64748B]">IA sugere questões ao criar novas provas</p>
          </div>
          <button
            onClick={() => setAiAutoSuggest(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${aiAutoSuggest ? '' : 'bg-[#d1d5db] dark:bg-slate-300'}`}
            style={aiAutoSuggest ? { background: 'linear-gradient(135deg, #475569, #64748b)' } : undefined}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: aiAutoSuggest ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* Info card */}
      <div
        className="rounded-2xl border border-[#e0d9ff] dark:border-[#2e2660] p-5 bg-gradient-to-br from-[#f5f0ff] to-[#eef2ff] dark:from-slate-800 dark:to-slate-800"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #0d9488)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1 text-[#0d9488]">Sobre as configurações</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              O nome e o logo da instituição aparecem nos cabeçalhos das provas geradas em PDF e nos relatórios exportados. Mantenha os dados sempre atualizados para uma apresentação profissional.
            </p>
          </div>
        </div>
      </div>

      {/* Account info (read-only) */}
      {user && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#eef2ff] dark:bg-slate-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">Conta Atual</h2>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)', color: '#fff' }}
            >
              {user.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span
                className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-[#eef2ff] dark:bg-slate-800 text-[#0d9488] dark:text-slate-300"
              >
                {user.role === 'admin' ? 'Administrador' : user.role === 'professor' ? 'Professor' : 'Aluno'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
