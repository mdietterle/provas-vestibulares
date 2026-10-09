import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const isStudent = searchParams.get('from') === 'aluno'
  const loginPath = isStudent ? '/aluno' : '/login'

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Resposta do backend é sempre genérica — não revela se o e-mail existe.
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch {
      toast.error('Não foi possível enviar agora. Verifique sua conexão e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-[linear-gradient(160deg,#f0fdfa_0%,#fffbeb_100%)] dark:bg-none dark:bg-[#10131a]">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#1d1f27] rounded-2xl p-8" style={{ boxShadow: '0px 24px 60px rgba(0, 35, 111, 0.12)' }}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-display font-bold text-slate-600 dark:text-slate-400 text-lg tracking-tight">Prova Online</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-semibold text-[#1E293B] dark:text-[#e1e2ec] mb-2">Verifique seu e-mail</h2>
              <p className="text-sm text-[#64748B] dark:text-slate-300 mb-6">
                Se <strong className="text-[#1E293B] dark:text-[#e1e2ec]">{email.trim()}</strong> estiver cadastrado, enviamos um link
                para você redefinir a senha. Confira também a caixa de spam.
              </p>
              <Link
                to={loginPath}
                className="inline-block w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold text-[#1E293B] dark:text-[#e1e2ec] mb-1">Esqueceu sua senha?</h2>
              <p className="text-sm text-[#64748B] dark:text-slate-300 mb-6">
                Informe seu e-mail cadastrado e enviaremos um link para você criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-slate-300 uppercase tracking-wide mb-1">E-mail</label>
                  <input
                    type="email"
                    className="w-full border border-[#c5c5d3] dark:border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
                  style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
                >
                  {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#64748B] dark:text-slate-300 mt-6">
          Lembrou a senha?{' '}
          <Link to={loginPath} className="text-slate-500 dark:text-slate-400 font-semibold hover:underline">Voltar para o login</Link>
        </p>
      </div>
      </div>
      <PublicFooter />
    </div>
  )
}
