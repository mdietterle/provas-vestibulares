import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

// ── helpers ──────────────────────────────────────────────────────────────────

function CheckIcon({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#c5c5d3" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#27c38a" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <CheckIcon muted={!included} />
      <span className={`text-sm ${included ? 'text-[#1E293B] dark:text-[#e1e2ec]' : 'text-[#9ca3af] dark:text-[#908fa0]'}`}>{label}</span>
    </div>
  )
}

// ── price calculator ──────────────────────────────────────────────────────────

function PriceBreakdown({
  seats,
  basePrice,
  perSeat,
  note,
}: {
  seats: number[]
  basePrice: number
  perSeat: number
  note?: string
}) {
  return (
    <div className="mt-4 rounded-xl border border-[#E2E8F0] dark:border-[#464554] overflow-hidden">
      <div className="grid grid-cols-3">
        {seats.map((s) => {
          const total = basePrice + s * perSeat
          return (
            <div
              key={s}
              className="p-3 text-center border-r border-[#E2E8F0] dark:border-[#464554] last:border-r-0 bg-[#F4F6F9] dark:bg-[#10131a]"
            >
              <p className="text-xs text-[#64748B] dark:text-slate-300 mb-0.5">{s} professores</p>
              <p className="font-display text-base font-bold text-slate-600 dark:text-slate-400">
                R$ {total.toLocaleString('pt-BR')}
              </p>
            </div>
          )
        })}
      </div>
      {note && (
        <div className="px-3 py-2 border-t border-[#E2E8F0] dark:border-[#464554]">
          <p className="text-[10px] text-[#9ca3af] dark:text-[#908fa0] leading-relaxed">{note}</p>
        </div>
      )}
    </div>
  )
}

// ── plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string
  tagline: string
  description?: string
  badge?: string
  badgeGradient?: boolean
  basePrice: number
  perSeat: number
  seatLabel?: string
  features: { label: string; included: boolean }[]
  seats?: number[]
  seatsNote?: string
  example?: string
  ctaLabel?: string
  ctaStyle?: 'primary' | 'secondary' | 'gradient'
  highlight?: boolean
}

function PlanCard({
  name,
  tagline,
  description,
  badge,
  badgeGradient,
  basePrice,
  perSeat,
  seatLabel = '/professor',
  features,
  seats,
  seatsNote,
  example,
  ctaLabel = 'Começar agora',
  ctaStyle = 'secondary',
  highlight,
}: PlanCardProps) {
  const ctaClass =
    ctaStyle === 'gradient'
      ? 'w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90'
      : ctaStyle === 'primary'
      ? 'w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90'
      : 'w-full py-3 rounded-xl text-sm font-bold transition-all border-[1.5px] border-slate-50 dark:border-[#464554] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-[#EFF6FF] dark:hover:bg-[#1e2d4a]'

  const ctaInlineStyle =
    ctaStyle === 'gradient'
      ? { background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }
      : ctaStyle === 'primary'
      ? { background: 'slate-600' }
      : undefined

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        highlight
          ? 'border-slate-500 dark:border-[#8b5cf6] shadow-lg bg-[#faf8ff] dark:bg-[#1b1642]'
          : 'border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#1d1f27]'
      }`}
      style={{
        boxShadow: highlight
          ? '0 8px 40px rgba(107,56,212,0.15)'
          : '0 4px 20px rgba(0,35,111,0.06)',
      }}
    >
      {/* Highlight bar */}
      {highlight && (
        <div
          className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #475569, #64748b)' }}
        />
      )}

      {/* Badge */}
      {badge && (
        <div className="flex justify-end mb-3">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={
              badgeGradient
                ? {
                    background: 'linear-gradient(135deg, #475569, #64748b)',
                    color: '#fff',
                  }
                : { background: '#e9ddff', color: 'slate-500' }
            }
          >
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h3 className="font-display text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec]">{name}</h3>
        <p className="text-sm text-[#64748B] dark:text-slate-300 mt-0.5">{tagline}</p>
        {description && (
          <p className="text-xs text-[#9ca3af] dark:text-[#908fa0] leading-relaxed mt-2">{description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-end gap-1.5 flex-wrap">
          <span className="font-display text-3xl font-extrabold text-[#1E293B] dark:text-[#e1e2ec]">
            R$ {basePrice.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm text-[#64748B] dark:text-slate-300 mb-1">/mês base</span>
          {perSeat > 0 && (
            <span className="text-sm text-[#334155] dark:text-[#e1e2ec] mb-1 ml-1">
              + R$ {perSeat.toFixed(2).replace('.', ',')}{seatLabel}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button className={ctaClass} style={ctaInlineStyle}>
        {ctaLabel}
      </button>

      {/* Divider */}
      <div className="my-5 border-t border-[#E2E8F0] dark:border-[#464554]" />

      {/* Features */}
      <div className="flex-1 space-y-0.5">
        {features.map((f) => (
          <FeatureRow key={f.label} label={f.label} included={f.included} />
        ))}
      </div>

      {/* Seat breakdown */}
      {seats && (
        <PriceBreakdown
          seats={seats}
          basePrice={basePrice}
          perSeat={perSeat}
          note={seatsNote}
        />
      )}

      {/* Example calc */}
      {example && (
        <div className="mt-4 rounded-xl border border-[#E2E8F0] dark:border-[#464554] bg-[#F4F6F9] dark:bg-[#10131a] p-4">
          <p className="text-[11px] font-semibold text-[#334155] dark:text-[#e1e2ec] uppercase tracking-wide mb-2">Exemplo de cálculo</p>
          {example.split('\n').map((line, i) => (
            <p key={i} className="text-[11px] text-[#64748B] dark:text-slate-300 leading-relaxed">{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── add-on row ────────────────────────────────────────────────────────────────

function AddOnRow({ label, price, sub }: { label: string; price: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f0f0f8] dark:border-[#464554] last:border-b-0">
      <span className="text-sm text-[#1E293B] dark:text-[#e1e2ec]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{price}</span>
        {sub && <p className="text-[11px] text-[#9ca3af] dark:text-[#908fa0]">{sub}</p>}
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

const BASIC_FEATURES = [
  { label: 'Banco de questões manual (ilimitado)', included: true },
  { label: 'Aplicação via portal (timer, embaralhamento)', included: true },
  { label: 'Impressão de provas (PDF com logo)', included: true },
  { label: 'Correção manual + gabarito automático (objetivas)', included: true },
  { label: 'Relatórios por turma/aluno', included: true },
  { label: 'Alunos ilimitados', included: true },
  { label: 'Geração de questões com IA', included: false },
  { label: 'Correção de discursivas com IA', included: false },
]

const PRO_FEATURES = [
  { label: 'Tudo do Basic', included: true },
  { label: 'Geração IA: 20 questões/prof/mês incluso', included: true },
  { label: 'Correção IA: 50 discursivas/prof/mês incluso', included: true },
  { label: 'Análise por competências BNCC', included: true },
  { label: 'Relatórios avançados + dashboard', included: true },
  { label: 'Integração Google Classroom', included: true },
  { label: 'Créditos extras de IA (pacotes avulsos)', included: true },
]

const ENTERPRISE_FEATURES = [
  { label: 'Tudo do Pro', included: true },
  { label: 'Geração IA: 40 questões/prof/mês incluso', included: true },
  { label: 'Correção IA: 100 discursivas/prof/mês incluso', included: true },
  { label: 'Proctoring (detecção de abas + timer)', included: true },
  { label: 'Gestão multi-unidade + papéis customizáveis', included: true },
  { label: 'Análise preditiva + curva de aprendizado', included: true },
  { label: 'API + integração SIS', included: true },
  { label: 'Onboarding + suporte prioritário', included: true },
]

const ADD_ONS = [
  { label: '100 questões geradas com IA', price: 'R$ 39', sub: undefined },
  { label: '200 correções de discursivas com IA', price: 'R$ 59', sub: undefined },
  { label: 'Pacote misto (100 questões + 200 correções)', price: 'R$ 89', sub: undefined },
  { label: 'Crédito avulso por questão gerada', price: 'R$ 0,45', sub: undefined },
  { label: 'Crédito avulso por correção', price: 'R$ 0,35', sub: undefined },
]

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo
        title="Planos e Preços — Prova Online"
        description="Conheça os planos do Prova Online para escolas: correção de provas e redações com IA, simulados de vestibular e gestão de turmas."
        path="/plans"
      />
      <PublicHeader />
      <div className="max-w-5xl mx-auto px-6 py-14 space-y-10">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Preços' }]} />
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-[#e9ddff] dark:bg-[#3a2166] text-slate-500 dark:text-[#A5B4FC]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Planos e Preços
        </div>
        <h1 className="font-display text-3xl font-bold text-[#1E293B] dark:text-[#e1e2ec] mb-3">
          Escolha o plano ideal para sua instituição
        </h1>
        <p className="text-[#64748B] dark:text-slate-300 leading-relaxed">
          Do professor autônomo à rede de escolas — a IA corrige, você ensina.
          Todos os planos incluem alunos ilimitados.
        </p>
        <p className="text-sm text-[#9ca3af] dark:text-[#908fa0] leading-relaxed mt-3">
          Os planos são cobrados por professor ou unidade, nunca por aluno — o preço varia principalmente pela
          quantidade de questões geradas e correções de discursivas feitas com Inteligência Artificial a cada mês.
          Se sua instituição só precisa de aplicação e correção manual, o plano Basic cobre isso sem custo de IA.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Essencial */}
        <PlanCard
          name="Basic"
          tagline="Sem IA — elaboração e aplicação manual"
          description="Ideal para escolas que já têm um banco de questões próprio e querem digitalizar a aplicação e a correção objetiva das provas, sem depender de correção automática por IA."
          badge="Entrada"
          basePrice={199}
          perSeat={9.90}
          features={BASIC_FEATURES}
          seats={[15, 30, 50]}
          seatsNote="Sem cota de IA — só aplicação e correção manual das provas."
          ctaLabel="Começar com Basic"
          ctaStyle="secondary"
        />

        {/* Inteligente */}
        <PlanCard
          name="Pro"
          tagline="Plataforma completa + IA integrada"
          description="Para escolas que querem economizar o tempo dos professores na criação de questões e na correção de discursivas, usando IA para gerar rascunhos e sugerir notas com base nas competências da BNCC."
          badge="Mais popular"
          badgeGradient
          highlight
          basePrice={399}
          perSeat={24.90}
          features={PRO_FEATURES}
          seats={[15, 30, 50]}
          seatsNote="IA inclusa por professor: 20 questões geradas + 50 correções de discursivas por mês."
          ctaLabel="Começar com Pro"
          ctaStyle="gradient"
        />

        {/* Institucional */}
        <PlanCard
          name="Enterprise"
          tagline="Redes, gestão centralizada, análise preditiva"
          description="Pensado para redes com múltiplas unidades que precisam de um painel único para gerenciar professores, papéis de acesso e desempenho acadêmico em todas as escolas, com prevenção de cola durante provas online."
          badge="Redes"
          basePrice={799}
          perSeat={19.90}
          seatLabel="/professor (por unidade)"
          features={ENTERPRISE_FEATURES}
          example={
            'Exemplo: rede com 3 unidades, 90 professores\n' +
            'Base (3 × R$ 799) = R$ 2.397 · Assentos (90 × R$ 19,90) = R$ 1.791\n' +
            'Total: R$ 4.188/mês\n' +
            'Assento mais barato que o Pro pelo volume — fale com vendas para uma proposta sob medida.'
          }
          ctaLabel="Falar com vendas"
          ctaStyle="primary"
        />
      </div>

      {/* Professor solo strip */}
      <div
        className="rounded-2xl border border-[#E2E8F0] dark:border-[#464554] px-6 py-4 flex items-center justify-between flex-wrap gap-4 bg-[#F4F6F9] dark:bg-[#10131a]"
        style={{ boxShadow: '0 2px 8px rgba(0,35,111,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#e9ddff] dark:bg-[#3a2166] text-slate-500 dark:text-[#A5B4FC]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#e1e2ec]">Professor solo</p>
            <p className="text-xs text-[#64748B] dark:text-slate-300">
              Autônomo, tutor, reforço escolar — sem vínculo com uma instituição, com IA para gerar questões
              e corrigir discursivas na sua própria conta.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold text-slate-600 dark:text-slate-400">R$ 59/mês</p>
          <p className="text-xs text-[#64748B] dark:text-slate-300">30 questões IA + 50 correções IA incluso</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
        >
          Assinar agora
        </button>
      </div>

      {/* Add-ons */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl border border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#1d1f27] p-6"
          style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#e9ddff] dark:bg-[#3a2166] text-slate-500 dark:text-[#A5B4FC]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[#1E293B] dark:text-[#e1e2ec]">
                Pacotes de créditos extras de IA
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-300">Quando a cota mensal inclusa não é suficiente</p>
            </div>
          </div>
          {ADD_ONS.map((a) => (
            <AddOnRow key={a.label} label={a.label} price={a.price} sub={a.sub} />
          ))}
          <p className="mt-3 text-[11px] text-[#9ca3af] dark:text-[#908fa0] leading-relaxed">
            Créditos não expiram no ciclo e podem ser usados a qualquer momento como reforço da cota mensal.
          </p>
        </div>

        {/* FAQ / notes */}
        <div
          className="rounded-2xl border border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#1d1f27] p-6"
          style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
        >
          <h2 className="font-display text-base font-semibold text-[#1E293B] dark:text-[#e1e2ec] mb-1">
            Perguntas frequentes
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-300 mb-4">
            Dúvidas sobre o uso da plataforma? Consulte a{' '}
            <Link to="/ajuda" className="text-slate-500 dark:text-[#A5B4FC] font-semibold hover:underline">Central de Ajuda</Link>.
          </p>
          <div className="space-y-4">
            {[
              {
                q: 'Os alunos pagam algo?',
                a: 'Não. A plataforma é cobrada por professores/unidade. Alunos são ilimitados em todos os planos.',
              },
              {
                q: 'Posso mudar de plano?',
                a: 'Sim. O upgrade é instantâneo e o crédito do plano atual é proporcional ao período restante.',
              },
              {
                q: 'O que acontece quando acabo os créditos de IA?',
                a: 'A geração e correção por IA ficam pausadas até o próximo ciclo ou até comprar um pacote avulso. As outras funcionalidades continuam normais.',
              },
              {
                q: 'Há fidelidade?',
                a: 'Não. Todos os planos são mensais, sem multa por cancelamento.',
              },
            ].map((item) => (
              <div key={item.q}>
                <p className="text-sm font-semibold text-[#1E293B] dark:text-[#e1e2ec] mb-1">{item.q}</p>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)', boxShadow: '0 8px 32px rgba(107,56,212,0.25)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="absolute -left-6 bottom-[-20px] w-32 h-32 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative">
          <p className="font-display text-xl font-bold text-white mb-2">
            Ainda tem dúvidas? Fale com a gente
          </p>
          <p className="text-white/75 text-sm mb-5">
            Nossa equipe está pronta para ajudar você a escolher o plano certo para sua escola ou rede.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/contact"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-600 hover:bg-white/90 transition-all"
            >
              Falar com a gente
            </Link>
            <Link
              to="/quote"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white/15 text-white hover:bg-white/25 transition-all border border-white/30"
            >
              Agendar demonstração
            </Link>
          </div>
        </div>
      </div>

      <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
      </div>
      <PublicFooter />
    </div>
  )
}
