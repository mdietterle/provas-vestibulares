import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CreditCard, Check, ExternalLink, Loader2 } from 'lucide-react'
import { billingApi } from '../api'

type PlanKey = 'basic' | 'pro' | 'enterprise'

const PLANS: { key: PlanKey; label: string; price: string; features: string[] }[] = [
  {
    key: 'basic',
    label: 'Basic',
    price: 'R$ 199/mês',
    features: ['Sem IA', 'Até 15 professores', 'Banco de questões manual'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 'R$ 399/mês',
    features: ['20 gerações de IA/prof/mês', '50 correções de IA/prof/mês', 'Até 50 professores'],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'R$ 799/mês',
    features: ['40 gerações de IA/prof/mês', '100 correções de IA/prof/mês', 'Professores ilimitados'],
  },
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

  async function handleBuyCredits() {
    setActionLoading('credits')
    try {
      const { data } = await billingApi.creditsCheckout()
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

  const currentPlan = status?.plan_type?.toLowerCase() || null

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
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#334155] dark:text-[#e1e2ec]">
                    <Check className="w-4 h-4 text-[#27c38a] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.key)}
                disabled={isCurrent || actionLoading === `plan-${plan.key}`}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-[#eef1fb] dark:bg-[#464554] text-[#9ca3af] dark:text-[#908fa0] cursor-default'
                    : 'bg-[#f59e0b] text-white hover:bg-[slate-700 disabled:opacity-50'
                }`}
              >
                {actionLoading === `plan-${plan.key}` ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isCurrent ? (
                  'Plano atual'
                ) : (
                  'Assinar'
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg font-bold text-[#1E293B] dark:text-[#e1e2ec]">Pacote de créditos avulsos</p>
          <p className="text-sm text-[#64748B] dark:text-slate-300 mt-1">
            100 créditos de IA (gerações + correções) por R$ 49 — usados automaticamente quando sua cota mensal do plano é excedida.
          </p>
        </div>
        <button
          onClick={handleBuyCredits}
          disabled={actionLoading === 'credits'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E293B] text-white text-sm font-semibold hover:bg-[#182c45] disabled:opacity-50 shrink-0"
        >
          {actionLoading === 'credits' && <Loader2 className="w-4 h-4 animate-spin" />}
          Comprar 100 créditos — R$ 49
        </button>
      </div>
    </div>
  )
}
