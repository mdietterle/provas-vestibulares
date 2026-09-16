import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { invitationsApi } from '../api'

type Step = 'loading' | 'form' | 'error' | 'success'

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<{ student_name: string; email: string; institution_name: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('Link inválido.'); return }
    invitationsApi.verify(token)
      .then(r => { setInfo(r.data); setStep('form') })
      .catch(err => {
        setErrorMsg(err.response?.data?.detail || 'Link de convite inválido ou expirado.')
        setStep('error')
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirm) { toast.error('As senhas não coincidem'); return }
    setSaving(true)
    try {
      await invitationsApi.accept(token!, password)
      setStep('success')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao definir senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f4f6fb] to-[#e8edff] dark:from-[#0F172A] dark:to-[#131f37]">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Plataforma de Avaliações</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,35,111,.12)' }}>
          {/* Loading */}
          {step === 'loading' && (
            <div className="p-10 flex flex-col items-center gap-4 text-[#64748B]">
              <svg className="w-8 h-8 animate-spin text-[#6366F1] dark:text-[#818CF8]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p className="text-sm">Verificando seu convite...</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100 dark:bg-red-900/30">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] mb-2">Link inválido</h2>
              <p className="text-sm text-[#64748B] mb-6">{errorMsg}</p>
              <p className="text-xs text-[#9ca3af] dark:text-[#64748b]">Se você já definiu sua senha, faça login normalmente.</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}
              >
                Ir para o login
              </button>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 dark:bg-green-900/30">
                <svg className="w-7 h-7 text-green-700 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] mb-2">Tudo certo!</h2>
              <p className="text-sm text-[#64748B] mb-6">
                Sua senha foi definida com sucesso. Agora você já pode acessar a plataforma.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}
              >
                Fazer login
              </button>
            </div>
          )}

          {/* Form */}
          {step === 'form' && info && (
            <div>
              <div className="px-8 pt-7 pb-5 border-b border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#131f37]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6366F1] dark:text-[#818CF8] mb-1">{info.institution_name}</p>
                <h2 className="text-xl font-bold text-[#1E293B]">Olá, {info.student_name}!</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Defina sua senha para acessar a plataforma com o e-mail <strong>{info.email}</strong>.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 text-sm border border-[#c5c5d3] dark:border-[#1e2d4a] rounded-lg bg-white text-[#1E293B] placeholder-[#9ca3af] dark:placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 text-sm border border-[#c5c5d3] dark:border-[#1e2d4a] rounded-lg bg-white text-[#1E293B] placeholder-[#9ca3af] dark:placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}
                >
                  {saving ? 'Salvando...' : 'Definir senha e acessar'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#9ca3af] dark:text-[#64748b] mt-6">
          Já tem acesso?{' '}
          <button onClick={() => navigate('/login')} className="text-[#6366F1] dark:text-[#818CF8] font-medium hover:underline">
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
