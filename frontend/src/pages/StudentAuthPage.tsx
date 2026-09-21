import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { authApi, institutionsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import AdSlot from '../components/AdSlot'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import { EXAM_TYPES, type Region } from '../utils/exams'

const REGION_ORDER: Region[] = ['Nacional', 'Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte']

const ADSENSE_SLOT_LOGIN = (import.meta.env.VITE_ADSENSE_SLOT_LOGIN as string | undefined) || ''

type Mode = 'login' | 'register'
type InstitutionOption = { id: number; name: string }
// Instituição existente (selecionada) ou nova (nome digitado ainda não cadastrado)
type SelectedInstitution = InstitutionOption | { id: null; name: string }

const inputClass =
  'w-full border border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-2.5 text-sm bg-white text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all'
const labelClass = 'block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-1'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  show,
  onToggleShow,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
  show: boolean
  onToggleShow: () => void
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${inputClass} pr-10 ${invalid ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-0 top-0 h-full px-3 flex items-center text-[#9ca3af] hover:text-[#334155] dark:hover:text-[#cbd5e1] transition-colors"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <span className="font-display font-bold text-[#4f46e5] dark:text-[#818CF8] text-lg tracking-tight">Cognition AI</span>
    </div>
  )
}

function IntroPanel() {
  const features = [
    'Faça simulados ilimitados dos principais vestibulares e veja sua nota estimada por área.',
    'Entenda cada erro com explicações de Inteligência Artificial, em português, questão por questão.',
    'Acompanhe sua evolução com ranking, taxa de conclusão e histórico de notas.',
    'Realize as provas da sua escola e acompanhe os resultados assim que forem corrigidos.',
  ]
  return (
    <div className="max-w-md mx-auto lg:mx-0">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#f8fafc] mb-3 leading-tight">
        Sua preparação para o vestibular começa aqui
      </h1>
      <p className="text-[#64748B] dark:text-[#94a3b8] leading-relaxed mb-6">
        Crie sua conta gratuita com o e-mail da sua instituição de ensino e comece a estudar hoje: simulados
        ilimitados, correção instantânea com Inteligência Artificial e acompanhamento do seu progresso.
      </p>

      <a
        href="#vestibulares"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 bg-[#e9ddff] dark:bg-[#241c47] text-[#712ae2] dark:text-[#818CF8] hover:brightness-95 transition-all"
      >
        {EXAM_TYPES.length} vestibulares disponíveis — veja a lista completa ↓
      </a>

      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[#334155] dark:text-[#94a3b8]">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#27c38a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function StudentAuthPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  // Campos compartilhados
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Cadastro
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionOptions, setInstitutionOptions] = useState<InstitutionOption[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<SelectedInstitution | null>(null)
  const [searching, setSearching] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Busca de instituições (debounce), espelhando o app mobile
  useEffect(() => {
    if (mode !== 'register') return
    if (selectedInstitution || institutionQuery.trim().length < 2) {
      setInstitutionOptions([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      institutionsApi
        .searchPublic(institutionQuery.trim())
        .then((r) => { if (!cancelled) setInstitutionOptions(r.data) })
        .catch(() => { if (!cancelled) setInstitutionOptions([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [institutionQuery, selectedInstitution, mode])

  // Já autenticado → vai direto para o dashboard do aluno
  if (!authLoading && user) return <Navigate to="/" replace />

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        setError('E-mail ou senha inválidos.')
      } else {
        setError('Não foi possível entrar agora. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos.')
      return
    }
    if (!selectedInstitution) {
      setError('Selecione ou cadastre sua escola.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(selectedInstitution.id
          ? { institution_id: selectedInstitution.id }
          : { institution_name: selectedInstitution.name }),
      })
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Não foi possível concluir o cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <PublicHeader />
      <div className="flex-1 flex flex-col items-center px-4 py-12 bg-[linear-gradient(160deg,#EFF6FF_0%,#f6f2ff_100%)] dark:bg-none dark:bg-[#0F172A]">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <IntroPanel />

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
        <div className="bg-white dark:bg-[#131f37] rounded-2xl p-8" style={{ boxShadow: '0px 24px 60px rgba(0, 35, 111, 0.12)' }}>
          <Brand />

          <>
              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-[#EEF2F7] dark:bg-[#1e2d4a] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                    mode === 'login' ? 'bg-white dark:bg-[#131f37] shadow text-[#4f46e5] dark:text-[#818CF8]' : 'text-[#64748B] dark:text-[#94a3b8] hover:text-[#334155] dark:hover:text-[#cbd5e1]'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                    mode === 'register' ? 'bg-white dark:bg-[#131f37] shadow text-[#4f46e5] dark:text-[#818CF8]' : 'text-[#64748B] dark:text-[#94a3b8] hover:text-[#334155] dark:hover:text-[#cbd5e1]'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <h2 className="font-display text-xl font-semibold text-[#1E293B] dark:text-[#f8fafc] mb-1">
                {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta de aluno'}
              </h2>
              <p className="text-sm text-[#64748B] dark:text-[#94a3b8] mb-6">
                {mode === 'login' ? 'Acesse seus simulados e desempenho' : 'É rápido — comece a praticar hoje'}
              </p>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className={labelClass}>Senha</label>
                      <Link to="/esqueci-senha?from=aluno" className="text-xs text-[#712ae2] hover:underline">Esqueceu a senha?</Link>
                    </div>
                    <input
                      type="password"
                      className={inputClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
                  >
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome completo</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Escola */}
                  <div>
                    <label className={labelClass}>Escola</label>
                    {selectedInstitution ? (
                      <div className="flex items-center justify-between gap-3 border border-[#4f46e5] dark:border-[#818CF8] rounded-lg px-3 py-2.5 bg-[#4f46e50d] dark:bg-[#1e2d4a]">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] truncate">{selectedInstitution.name}</p>
                          {!selectedInstitution.id && <p className="text-xs text-[#712ae2] dark:text-[#818CF8] mt-0.5">Nova escola</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedInstitution(null); setInstitutionQuery('') }}
                          className="text-xs font-semibold text-[#712ae2] hover:underline shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className={inputClass}
                          value={institutionQuery}
                          onChange={(e) => setInstitutionQuery(e.target.value)}
                          placeholder="Busque pelo nome da sua escola"
                        />
                        {searching && <p className="text-xs text-[#64748B] dark:text-[#94a3b8] mt-1">Buscando...</p>}
                        {institutionOptions.length > 0 && (
                          <div className="mt-1 border border-[#E2E8F0] dark:border-[#334155] rounded-lg overflow-hidden">
                            {institutionOptions.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => { setSelectedInstitution(opt); setInstitutionOptions([]) }}
                                className="w-full text-left px-3 py-2.5 text-sm text-[#1E293B] dark:text-[#f8fafc] hover:bg-[#F4F6F9] dark:hover:bg-[#1e2d4a] border-b border-[#EEF2F7] dark:border-[#334155] last:border-0"
                              >
                                {opt.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {!searching && institutionQuery.trim().length >= 2 && institutionOptions.length === 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-[#64748B] dark:text-[#94a3b8] mb-1">Nenhuma escola encontrada.</p>
                            <button
                              type="button"
                              onClick={() => setSelectedInstitution({ id: null, name: institutionQuery.trim() })}
                              className="w-full border border-dashed border-[#712ae2] dark:border-[#818CF8] rounded-lg px-3 py-2.5 text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] hover:bg-[#f6f2ff] dark:hover:bg-[#1e2d4a] transition-colors"
                            >
                              Cadastrar "{institutionQuery.trim()}" como nova escola
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Senha</label>
                    <PasswordField
                      id="register-password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      show={showPassword}
                      onToggleShow={() => setShowPassword(s => !s)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Confirmar senha</label>
                    <PasswordField
                      id="register-confirm-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      show={showConfirmPassword}
                      onToggleShow={() => setShowConfirmPassword(s => !s)}
                      invalid={passwordsMismatch}
                    />
                    {passwordsMismatch && (
                      <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                    )}
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
                  >
                    {submitting ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>
              )}
            </>
        </div>

        <p className="text-center text-xs text-[#64748B] dark:text-[#94a3b8] mt-6">
          É professor ou administrador?{' '}
          <Link to="/login" className="text-[#712ae2] dark:text-[#818CF8] font-semibold hover:underline">Acesse por aqui</Link>
        </p>
        <p className="text-center text-xs text-[#64748B] dark:text-[#94a3b8] mt-2">
          Precisa de ajuda?{' '}
          <Link to="/ajuda" className="text-[#712ae2] dark:text-[#818CF8] font-semibold hover:underline">Central de Ajuda</Link>
        </p>

        <div className="mt-6">
          <AdSlot slot={ADSENSE_SLOT_LOGIN} className="h-24" />
        </div>
        </div>
      </div>

      <section id="vestibulares" className="w-full max-w-5xl mt-16 scroll-mt-20">
        <p className="text-center text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-6">
          {EXAM_TYPES.length} vestibulares disponíveis
        </p>
        <div className="space-y-5">
          {REGION_ORDER.filter(region => EXAM_TYPES.some(t => t.region === region)).map(region => (
            <div key={region} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94a3b8] w-24 shrink-0">
                {region}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EXAM_TYPES.filter(t => t.region === region).map(t => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                    style={{ background: t.gradient }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
      <PublicFooter />
    </div>
  )
}
