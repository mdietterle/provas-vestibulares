import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { profileApi } from '../api'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  student: 'Aluno',
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  if (!user) return null

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd && newPwd !== confirmPwd) {
      toast.error('As senhas não coincidem')
      return
    }
    setSaving(true)
    try {
      const payload: { name?: string; current_password?: string; new_password?: string } = {}
      if (name.trim() && name.trim() !== user.name) payload.name = name.trim()
      if (newPwd) {
        payload.current_password = currentPwd
        payload.new_password = newPwd
      }
      const r = await profileApi.update(payload)
      setUser(r.data)
      toast.success('Perfil atualizado')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2 MB.')
      return
    }
    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await profileApi.uploadAvatar(form)
      setUser(r.data)
      toast.success('Foto atualizada')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar imagem')
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      const r = await profileApi.removeAvatar()
      setUser(r.data)
      toast.success('Foto removida')
    } catch {
      toast.error('Erro ao remover foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1E293B]">Meu Perfil</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Gerencie suas informações pessoais e senha de acesso</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-5">
          {/* Avatar preview */}
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#E2E8F0]"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold select-none"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
              >
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="space-y-2">
            <p className="text-xs text-[#64748B]">JPG, PNG ou GIF. Máximo 2 MB.</p>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
              >
                {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
              </button>
              {user.avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-all"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <h2 className="text-sm font-semibold text-[#1E293B]">Informações pessoais</h2>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Nome completo</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome completo"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Email</label>
            <input
              className="input opacity-60"
              value={user.email}
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Perfil</label>
            <input
              className="input opacity-60"
              value={ROLE_LABEL[user.role] ?? user.role}
              disabled
            />
          </div>
        </div>

        <div className="border-t border-[#EEF2F7] pt-5 space-y-1">
          <p className="text-sm font-semibold text-[#1E293B] mb-3">Alterar senha</p>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Senha atual</label>
            <input
              type="password"
              className="input"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Nova senha</label>
              <input
                type="password"
                className="input"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Confirmar senha</label>
              <input
                type="password"
                className="input"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* Account info */}
      <div className="rounded-xl p-4 flex items-start gap-3 border bg-[#EFF6FF] dark:bg-slate-800 border-[#b6c4ff] dark:border-[#464554]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)', color: '#fff' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-teal-600 dark:text-[#a8bfff]">Conta #{user.id}</p>
          <p className="text-xs text-[#334155] mt-0.5">
            Para alterar email ou tipo de perfil, entre em contato com o administrador da instituição.
          </p>
        </div>
      </div>
    </div>
  )
}
