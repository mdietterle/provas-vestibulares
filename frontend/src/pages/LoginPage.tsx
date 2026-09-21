import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import AdSlot from '../components/AdSlot'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

const ADSENSE_SLOT_LOGIN = (import.meta.env.VITE_ADSENSE_SLOT_LOGIN as string | undefined) || ''

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Correção Automática com IA',
    description: 'Corrija provas dissertativas e testes objetivos em segundos. Análise contextual com feedback construtivo imediato para cada aluno.',
    color: '#712ae2',
    bg: '#e9ddff',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    title: 'Gerador de Questões',
    description: 'Crie bancos de questões inéditas baseadas em qualquer texto ou tópico da BNCC. Diversidade pedagógica com um clique.',
    color: '#4f46e5',
    bg: '#dce1ff',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Insights Preditivos',
    description: 'Identifique lacunas de aprendizado antes da próxima avaliação com análise avançada de dados e visualizações intuitivas.',
    color: '#27c38a',
    bg: '#d1fae5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Dashboard de Desempenho',
    description: 'Visualize o progresso da turma e individual de forma clara. Relatórios prontos para reuniões de pais e conselhos de classe.',
    color: '#d97706',
    bg: '#fef3c7',
  },
]

const stats = [
  { value: 'IA', label: 'Correção automática' },
  { value: 'Vários', label: 'Vestibulares simulados' },
  { value: 'LGPD', label: 'Dados protegidos' },
  { value: '24/7', label: 'Acesso online' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      toast.error('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A] font-sans">

      <PublicHeader />

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6" style={{ background: '#e9ddff', color: '#712ae2' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Powered by Generative AI
          </span>
          <h1 className="font-display text-5xl font-bold text-[#1E293B] leading-tight mb-4">
            Revolucionando a educação com IA
          </h1>
          <p className="text-lg text-[#334155] dark:text-[#94a3b8] leading-relaxed mb-8">
            Transforme o ensino com Inteligência Estratégica. Automatize correções, gere questões personalizadas em segundos e obtenha insights profundos sobre o desempenho dos alunos.
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <a href="#login" className="px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}>
              Começar agora
            </a>
            <Link to="/plans" className="px-6 py-3 rounded-lg text-sm font-semibold text-[#4f46e5] bg-[#EFF6FF] dark:bg-[#1e2d4a] hover:bg-[#E2E8F0] dark:hover:bg-[#243756] transition-colors">
              Ver preços →
            </Link>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label}>
                <p className="font-display text-2xl font-bold text-[#4f46e5]">{s.value}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div id="login">
          <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0px 24px 60px rgba(0, 35, 111, 0.12)' }}>
            <h2 className="font-display text-xl font-semibold text-[#1E293B] mb-1">Bem-vindo de volta</h2>
            <p className="text-sm text-[#64748B] mb-6">À educação do futuro</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-1">Email institucional</label>
                <input
                  type="email"
                  className="w-full border border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-2.5 text-sm bg-white text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@instituicao.edu.br"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide">Senha</label>
                  <Link to="/esqueci-senha" className="text-xs text-[#712ae2] hover:underline">Esqueceu a senha?</Link>
                </div>
                <input
                  type="password"
                  className="w-full border border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-2.5 text-sm bg-white text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: '#dce1ff', color: '#4f46e5' }}>
              Funcionalidades
            </span>
            <h2 className="font-display text-3xl font-bold text-[#1E293B] mb-3">Potencialize sua Produtividade</h2>
            <p className="text-[#334155] dark:text-[#94a3b8] max-w-xl mx-auto">
              Ferramentas desenhadas para devolver ao professor o tempo que importa: o aluno.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div key={f.title} className="rounded-xl p-6 border border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#131f37] hover:border-[#b6c4ff] dark:hover:border-[#334155] transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-[#1E293B] mb-2">{f.title}</h3>
                <p className="text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TRAY ── */}
      <section id="ai-tray" className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}>
              ✦ Novo recurso
            </span>
            <h2 className="font-display text-3xl font-bold text-[#1E293B] mb-4">
              Crie conteúdos em segundos com o <span style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Tray</span>
            </h2>
            <p className="text-[#334155] dark:text-[#94a3b8] leading-relaxed mb-8">
              Interface flutuante para geração de materiais didáticos diretamente nas suas páginas de planejamento. Como ter um assistente pedagógico 24 horas por dia, 7 dias por semana.
            </p>
            <ul className="space-y-3 mb-8">
              {['Planos de aula alinhados com a BNCC', 'Rubricas de avaliação personalizadas', 'Questões geradas por tema ou habilidade', 'Feedback individualizado por aluno'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#334155] dark:text-[#94a3b8]">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#d1fae5', color: '#27c38a' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock AI Tray card */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]" style={{ boxShadow: '0px 24px 60px rgba(0, 35, 111, 0.1)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#1E293B]">AI Tray</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#e9ddff', color: '#712ae2' }}>Novo</span>
              </div>
              <div className="bg-[#F4F6F9] dark:bg-[#1e2d4a] rounded-lg p-3 mb-4 text-sm text-[#334155] dark:text-[#94a3b8] border border-[#E2E8F0] dark:border-[#334155]">
                "Gere 5 questões de múltipla escolha sobre Revolução Industrial para o 8º ano, nível médio, alinhadas à BNCC EF08HI20."
              </div>
              <div className="space-y-2 mb-4">
                {['Questão 1: Qual foi o principal fator...', 'Questão 2: A máquina a vapor representou...', 'Questão 3: As condições de trabalho...'].map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#334155] dark:text-[#94a3b8] bg-white rounded-lg p-2 border border-[#E2E8F0]">
                    <span className="w-4 h-4 rounded-full bg-[#dce1ff] text-[#4f46e5] flex items-center justify-center font-bold shrink-0 text-[10px]">{i + 1}</span>
                    {q}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}>
                  Inserir no Plano
                </button>
                <button className="px-3 py-2 rounded-lg text-xs font-medium text-[#4f46e5] bg-[#EFF6FF] dark:bg-[#1e2d4a] hover:bg-[#E2E8F0] dark:hover:bg-[#243756]">
                  Refinar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3525cd 60%, #712ae2 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Pronto para transformar sua escola?
          </h2>
          <p className="text-[#b6c4ff] mb-8">
            Muitas <strong className="text-white">instituições</strong> já utilizam o Cognition AI para potencializar o ensino e os resultados dos alunos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/quote" className="px-6 py-3 rounded-lg text-sm font-semibold text-[#4f46e5] bg-white hover:bg-[#F4F6F9] dark:hover:bg-[#1e2d4a] transition-colors">
              Solicitar Orçamento
            </Link>
            <Link to="/contact" className="px-6 py-3 rounded-lg text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors">
              Falar com Especialista
            </Link>
          </div>
        </div>
      </section>

      {/* ── AD SLOT ── */}
      <section className="py-8 bg-[#F4F6F9] dark:bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-6">
          <AdSlot slot={ADSENSE_SLOT_LOGIN} className="h-24" />
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
