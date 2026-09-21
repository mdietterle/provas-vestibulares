import { Link } from 'react-router-dom'
import { EXAM_TYPES } from '../utils/exams'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] p-6 bg-white dark:bg-[#131f37] transition-all duration-300 hover:-translate-y-1 hover:border-[#d6e0ff] dark:hover:border-[#2a3a63] hover:shadow-[0_16px_40px_rgba(0,35,111,0.10)]">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-white shadow-[0_4px_14px_rgba(107,56,212,0.28)] transition-transform duration-300 group-hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
      >
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-[#1E293B] mb-2">{title}</h3>
      <p className="text-sm text-[#6b7a9a] dark:text-[#94a3b8] leading-relaxed">{description}</p>
    </div>
  )
}

function AudienceCard({ icon, audience, description, to, cta }: { icon: React.ReactNode; audience: string; description: string; to: string; cta: string }) {
  return (
    <div className="group relative rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] p-6 bg-white dark:bg-[#131f37] flex flex-col gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#d6e0ff] dark:hover:border-[#2a3a63] hover:shadow-[0_16px_40px_rgba(0,35,111,0.10)]">
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-[0.06] transition-transform duration-500 group-hover:scale-125" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }} />
      <div className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-[#e9ddff] dark:bg-[#241c47] text-[#712ae2] dark:text-[#818CF8]">
        {icon}
      </div>
      <h3 className="relative font-display text-lg font-bold text-[#1E293B]">{audience}</h3>
      <p className="relative text-sm text-[#6b7a9a] dark:text-[#94a3b8] leading-relaxed flex-1">{description}</p>
      <Link to={to} className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] group-hover:gap-2.5 transition-all">
        {cta}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative flex-1">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-white text-base mb-4 shadow-[0_4px_14px_rgba(0,35,111,0.25)]"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
      >
        {number}
      </div>
      <h3 className="font-display text-base font-bold text-[#1E293B] mb-1.5">{title}</h3>
      <p className="text-sm text-[#6b7a9a] dark:text-[#94a3b8] leading-relaxed">{description}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A] font-sans overflow-x-hidden">
      <Seo
        title="Cognition AI — Provas, Redações e Simulados corrigidos por IA"
        description="Plataforma de avaliações para escolas: aplique provas, corrija redações com apoio de Inteligência Artificial e prepare seus alunos para o ENEM, UFPR e ACAFE com simulados de vestibular."
        path="/"
      />
      <PublicHeader />

      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-brand-mesh pointer-events-none" />
        <div
          className="absolute top-10 -left-24 w-72 h-72 rounded-full opacity-[0.12] blur-3xl animate-float pointer-events-none"
          style={{ background: 'radial-gradient(circle, #712ae2, transparent 70%)' }}
        />
        <div
          className="absolute top-24 -right-16 w-80 h-80 rounded-full opacity-[0.10] blur-3xl animate-float pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)', animationDelay: '1.5s' }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center animate-fade-in-up">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 ring-1 ring-inset bg-[#e9ddff] dark:bg-[#241c47] text-[#712ae2] dark:text-[#818CF8]"
            style={{ boxShadow: '0 2px 10px rgba(107,56,212,0.12)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Correção por Inteligência Artificial
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-[#1E293B] mb-6 leading-[1.1] tracking-tight">
            Provas, redações e simulados{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
            >
              corrigidos por IA
            </span>
          </h1>
          <p className="text-lg text-[#6b7a9a] dark:text-[#94a3b8] leading-relaxed max-w-2xl mx-auto mb-9">
            Plataforma de avaliações para escolas: professores aplicam e corrigem provas em uma fração do
            tempo, e alunos treinam com questões reais do ENEM e mais de 45 vestibulares com explicações
            geradas por IA.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/aluno"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(0,35,111,0.3)] hover:shadow-[0_10px_28px_rgba(107,56,212,0.4)]"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
            >
              Sou aluno, quero praticar
            </Link>
            <Link
              to="/quote"
              className="px-6 py-3 rounded-xl text-sm font-bold border border-[#E2E8F0] dark:border-[#1e2d4a] bg-white dark:bg-[#131f37] text-[#4f46e5] dark:text-[#818CF8] hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947] hover:border-[#d6e0ff] dark:hover:border-[#2a3a63] hover:-translate-y-0.5 transition-all"
            >
              Sou professor ou escola
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-wider uppercase text-[#712ae2] dark:text-[#818CF8] mb-2">Recursos</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E293B]">
            O que a plataforma oferece
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Provas objetivas e dissertativas"
            description="Crie provas com múltipla escolha, verdadeiro/falso e questões dissertativas, aplique para a turma e acompanhe a correção em tempo real."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
            title="Redações corrigidas por IA"
            description="Correção automática de redações com nota e comentário em português explicando os pontos fortes e o que pode melhorar."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            title="Simulados de vestibular"
            description="Questões reais do ENEM, FUVEST, UNICAMP e dezenas de outros, com desempenho por área e explicação para cada questão."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3-6.7M6 8a4 4 0 103 6.7" /></svg>}
            title="Gestão completa da escola"
            description="Cadastro de professores, alunos, turmas e matérias, com controle de acesso por perfil e relatórios de desempenho da instituição."
          />
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-3xl border border-[#E2E8F0] dark:border-[#1e2d4a] bg-white dark:bg-[#131f37] p-8 sm:p-10">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-wider uppercase text-[#712ae2] dark:text-[#818CF8] mb-2">Como funciona</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E293B]">
              Da prova pronta à nota, em três passos
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-6">
            <StepCard number="1" title="Monte a avaliação" description="Crie questões próprias ou puxe do banco com milhares de questões reais de vestibular, e monte a prova ou simulado em minutos." />
            <StepCard number="2" title="Aplique para a turma" description="Alunos respondem online, de qualquer dispositivo, com o tempo e as regras que você definir." />
            <StepCard number="3" title="IA corrige e explica" description="Objetivas e dissertativas são corrigidas automaticamente, com nota e explicação para cada resposta." />
          </div>
        </div>
      </div>

      {/* Audience */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-wider uppercase text-[#712ae2] dark:text-[#818CF8] mb-2">Para quem é</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E293B]">
            Feito para cada perfil de usuário
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <AudienceCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>}
            audience="Aluno"
            description="Cadastre-se com o e-mail da sua instituição, realize provas e simulados, e acompanhe seus resultados corrigidos pela IA."
            to="/aluno"
            cta="Criar conta de aluno"
          />
          <AudienceCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            audience="Professor"
            description="Crie questões e provas, corrija com apoio de IA, aplique simulados e analise o desempenho das suas turmas."
            to="/login"
            cta="Acessar plataforma"
          />
          <AudienceCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h4a2 2 0 012 2v12M3 17h6m6 4V9a2 2 0 012-2h4a2 2 0 012 2v12M9 21h12" /></svg>}
            audience="Escola ou rede de ensino"
            description="Configure a instituição, gerencie professores e alunos, e monitore o uso da plataforma em um só lugar."
            to="/quote"
            cta="Falar com a gente"
          />
        </div>
      </div>

      {/* CTA banner */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-center"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)', boxShadow: '0 20px 60px -15px rgba(107,56,212,0.35)' }}
        >
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-10 animate-float" style={{ background: '#fff' }} />
          <div className="absolute -left-10 bottom-[-30px] w-40 h-40 rounded-full opacity-10 animate-float" style={{ background: '#fff', animationDelay: '2s' }} />
          <div className="relative">
            <p className="font-display text-2xl font-bold text-white mb-2">
              Pronto para começar?
            </p>
            <p className="text-white/75 text-sm mb-6 max-w-md mx-auto">
              Veja os planos disponíveis para escolas e redes de ensino, ou fale com nossa equipe.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/plans"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-[#4f46e5] hover:bg-white/90 hover:-translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
              >
                Ver planos e preços
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white/15 text-white hover:bg-white/25 hover:-translate-y-0.5 transition-all border border-white/30"
              >
                Falar com especialista
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Vestibulares List (SEO) */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="font-display text-2xl font-bold text-[#1E293B] text-center mb-8">
          Simulados disponíveis para as principais universidades
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {EXAM_TYPES.map(exam => (
            <li
              key={exam.id}
              className="px-4 py-2 rounded-full text-xs font-bold border transition-transform hover:-translate-y-0.5 dark:brightness-125"
              style={{
                borderColor: `${exam.color}33`,
                backgroundColor: `${exam.color}10`,
                color: exam.color
              }}
            >
              {exam.label}
            </li>
          ))}
        </ul>
      </section>

      {/* ── AD SLOT ── */}
      <section className="py-8 bg-[#F4F6F9] dark:bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-6">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
