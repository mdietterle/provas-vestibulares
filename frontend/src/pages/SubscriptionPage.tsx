import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CreditCard, Check, ExternalLink, Loader2 } from 'lucide-react'
import { billingApi } from '../api'

type PlanKey = 'basic' | 'pro' | 'enterprise'

// Mesmos valores do site /plans (PlansPage). O Stripe cobra a base do plano
// + um assento por professor ativo; ver backend/app/services/billing.py.
const PLANS: { key: PlanKey; label: string; price: string; seat: string; features: string[] }[] = [
  {
    key: 'basic',
    label: 'Basic',
    price: 'R$ 199/mês',
    seat: '+ R$ 9,90 por professor',
    features: ['Sem IA — aplicação e correção manual', 'Banco de questões manual (ilimitado)', 'Alunos ilimitados'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 'R$ 399/mês',
    seat: '+ R$ 24,90 por professor',
    features: ['Geração IA: 20 questões/prof/mês incluso', 'Correção IA: 50 discursivas/prof/mês incluso', 'Créditos extras de IA (pacotes avulsos)'],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'R$ 799/mês por unidade',
    seat: '+ R$ 19,90 por professor (por unidade)',
    features: ['Geração IA: 40 questões/prof/mês incluso', 'Correção IA: 100 discursivas/prof/mês incluso', 'Gestão multi-unidade'],
  },
]

type PackKey = 'questions' | 'corrections' | 'mixed'
const PACKS: { key: PackKey; label: string; price: string }[] = [
  { key: 'questions', label: '100 questões geradas com IA', price: 'R$ 39' },
  { key: 'corrections', label: '200 correções de discursivas com IA', price: 'R$ 59' },
  { key: 'mixed', label: 'Pacote misto (100 questões + 200 correções)', price: 'R$ 89' },
]

interface BillingStatus {
  plan_type: string | null
  stripe_subscription_status: string | null
  credits_balance: number
  has_stripe_customer: boolean
}

export default function SubscriptionPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    load()
    if (searchParams.get('checkout') === 'success') toast.success('Assinatura confirmada!')
    if (searchParams.get('checkout') === 'cancel') toast('Checkout cancelado.', { icon: 'ℹ️' })
    if (searchParams.get('credits') === 'success') toast.success('Créditos adicionados!')
    if (searchParams.get('credits') === 'cancel') toast('Compra de créditos cancelada.', { icon: 'ℹ️' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await billingApi.status()
      setStatus(data)
    } catch {
      toast.error('Não foi possível carregar os dados de assinatura.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(plan: PlanKey) {
    setActionLoading(`plan-${plan}`)
    try {
      const { data } = await billingApi.checkoutSession(plan)
      window.location.href = data.url
    } catch {
      toast.error('Não foi possível iniciar o checkout.')
      setActionLoading(null)
    }
  }

  async function handleBuyCredits(pack: PackKey) {
    setActionLoading(`credits-${pack}`)
    try {
      const { data } = await billingApi.creditsCheckout(pack)
      window.location.href = data.url
    } catch {
      toast.error('Não foi possível iniciar a compra de créditos.')
      setActionLoading(null)
    }
  }

  async function handlePortal() {
    setActionLoading('portal')
    try {
      const { data } = await billingApi.portal()
      window.location.href = data.url
    } catch {
      toast.error('Ainda não há assinatura ativa para gerenciar. Assine um plano primeiro.')
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#64748B] dark:text-slate-300">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  // Sem plan_type a instituição está no Basic (padrão do backend).
  const currentPlan = status ? (status.plan_type?.toLowerCase() || 'basic') : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1E293B] dark:text-[#e1e2ec] flex items-center gap-2">
          <CreditCard className="w-6 h-6" /> Assinatura
        </h1>
        <p className="text-[#64748B] dark:text-slate-300 mt-1">
          Gerencie o plano da sua instituição e compre créditos avulsos de IA.
        </p>
      </div>

      {status && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-[#64748B] dark:text-slate-300">Plano atual</p>
            <p className="text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec] capitalize">{currentPlan || 'Basic'}</p>
            {status.stripe_subscription_status && (
              <p className="text-xs text-[#9ca3af] dark:text-[#908fa0]">Status: {status.stripe_subscription_status}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-[#64748B] dark:text-slate-300">Créditos avulsos disponíveis</p>
            <p className="text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec]">{status.credits_balance}</p>
          </div>
          <button
            onClick={handlePortal}
            disabled={actionLoading === 'portal'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#464554] text-sm font-semibold text-[#1E293B] dark:text-[#e1e2ec] hover:bg-[#f7f8fc] dark:hover:bg-[#1e2d4a] disabled:opacity-50"
          >
            {actionLoading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Gerenciar assinatura
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key
          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-6 flex flex-col gap-4 bg-white dark:bg-[#1d1f27] ${
                isCurrent ? 'border-[#f59e0b] ring-2 ring-[#e9ddff] dark:ring-[#3a2166]' : 'border-[#E2E8F0] dark:border-[#464554]'
              }`}
            >
              <div>
                <p className="font-display text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec]">{plan.label}</p>
                <p className="text-2xl font-bold text-[#1E293B] dark:text-[#e1e2ec] mt-1">{plan.price}</p>
                <p className="text-sm text-[#64748B] dark:text-slate-300">{plan.seat}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#334155] dark:text-[#e1e2ec]">
                    <Check className="w-4 h-4 text-[#27c38a] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => plan.key === 'enterprise' ? undefined : handleSubscribe(plan.key)}
                disabled={isCurrent || actionLoading === `plan-${plan.key}`}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-[#eef1fb] dark:bg-[#464554] text-[#9ca3af] dark:text-[#908fa0] cursor-default'
                    : 'bg-[#f59e0b] text-white hover:bg-[slate-700] disabled:opacity-50'
                }`}
              >
                {actionLoading === `plan-${plan.key}` ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isCurrent ? (
                  'Plano atual'
                ) : plan.key === 'enterprise' ? (
                  'Falar com vendas'
                ) : (
                  'Assinar'
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="card space-y-4">
        <div>
          <p className="font-display text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec]">Pacotes de créditos avulsos de IA</p>
          <p className="text-sm text-[#64748B] dark:text-slate-300 mt-1">
            Usados automaticamente quando a cota mensal do plano é excedida.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {PACKS.map((pack) => (
            <div key={pack.key} className="rounded-xl border border-[#E2E8F0] dark:border-[#464554] p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#1E293B] dark:text-[#e1e2ec] flex-1">{pack.label}</p>
              <button
                onClick={() => handleBuyCredits(pack.key)}
                disabled={actionLoading === `credits-${pack.key}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1E293B] text-white text-sm font-semibold hover:bg-[#182c45] disabled:opacity-50"
              >
                {actionLoading === `credits-${pack.key}` && <Loader2 className="w-4 h-4 animate-spin" />}
                Comprar — {pack.price}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
