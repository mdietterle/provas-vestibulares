import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

type Step = 'loading' | 'form' | 'error' | 'success'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isStudent = searchParams.get('from') === 'aluno'
  const loginPath = isStudent ? '/aluno' : '/login'

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<{ name: string; email: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('Link inválido.'); return }
    authApi.verifyResetToken(token)
      .then(r => { setInfo(r.data); setStep('form') })
      .catch(err => {
        setErrorMsg(err.response?.data?.detail || 'Link de redefinição inválido ou expirado.')
        setStep('error')
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirm) { toast.error('As senhas não coincidem'); return }
    setSaving(true)
    try {
      await authApi.resetPassword(token!, password)
      setStep('success')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao redefinir senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center p-4 bg-[linear-gradient(135deg,#f4f6fb_0%,#e8edff_100%)] dark:bg-none dark:bg-[#0F172A]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#f8fafc]">Plataforma de Avaliações</h1>
        </div>

        <div className="bg-white dark:bg-[#131f37] rounded-2xl shadow-lg overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,35,111,.12)' }}>
          {step === 'loading' && (
            <div className="p-10 flex flex-col items-center gap-4 text-[#64748B] dark:text-[#94a3b8]">
              <svg className="w-8 h-8 animate-spin text-[#712ae2]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm">Verificando o link...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100 dark:bg-red-900/30">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#f8fafc] mb-2">Link inválido</h2>
              <p className="text-sm text-[#64748B] dark:text-[#94a3b8] mb-6">{errorMsg}</p>
              <p className="text-xs text-[#9ca3af] dark:text-[#64748b] mb-4">Você pode solicitar um novo link de redefinição.</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate(isStudent ? '/esqueci-senha?from=aluno' : '/esqueci-senha')}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}
                >
                  Solicitar novo link
                </button>
                <button onClick={() => navigate(loginPath)} className="text-sm text-[#712ae2] font-medium hover:underline">
                  Ir para o login
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 dark:bg-green-900/30">
                <svg className="w-7 h-7 text-green-700 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#f8fafc] mb-2">Tudo certo!</h2>
              <p className="text-sm text-[#64748B] dark:text-[#94a3b8] mb-6">
                Sua senha foi redefinida com sucesso. Agora você já pode acessar a plataforma.
              </p>
              <button
                onClick={() => navigate(loginPath)}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}
              >
                Fazer login
              </button>
            </div>
          )}

          {step === 'form' && info && (
            <div>
              <div className="px-8 pt-7 pb-5 border-b border-[#E2E8F0] dark:border-[#1e2d4a] bg-[#F4F6F9] dark:bg-[#131f37]">
                <h2 className="text-xl font-bold text-[#1E293B] dark:text-[#f8fafc]">Olá, {info.name}!</h2>
                <p className="text-sm text-[#64748B] dark:text-[#94a3b8] mt-1">
                  Escolha uma nova senha para a conta <strong>{info.email}</strong>.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] dark:text-[#f8fafc] mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 text-sm border border-[#c5c5d3] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#f8fafc] placeholder-[#9ca3af] dark:placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#712ae2] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] dark:text-[#f8fafc] mb-1.5">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 text-sm border border-[#c5c5d3] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#f8fafc] placeholder-[#9ca3af] dark:placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#712ae2] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#712ae2)' }}
                >
                  {saving ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#9ca3af] dark:text-[#64748b] mt-6">
          Lembrou a senha?{' '}
          <button onClick={() => navigate(loginPath)} className="text-[#712ae2] dark:text-[#818CF8] font-medium hover:underline">
            Fazer login
          </button>
        </p>
      </div>
      </div>
      <PublicFooter />
    </div>
  )
}
