import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usageApi, type UsageSummary, type UsageResource } from '../api'

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(used: number, limit: number | null): number {
  if (limit === null) return 0
  if (limit === 0) return used > 0 ? 100 : 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function barColor(used: number, limit: number | null): string {
  if (limit === null) return '#27c38a'
  if (limit === 0) return used > 0 ? '#ef4444' : '#c5c5d3'
  const ratio = used / limit
  if (ratio >= 1) return '#ef4444'
  if (ratio >= 0.8) return '#f59e0b'
  return '#27c38a'
}

function ProgressBar({ resource }: { resource: UsageResource }) {
  const { used, limit, overage } = resource
  const limitLabel = limit === null ? '∞' : limit
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold text-[#1E293B]">
          {used}
          <span className="text-[#9ca3af] font-normal"> / {limitLabel}</span>
        </span>
        {overage > 0 && (
          <span className="text-[11px] font-bold text-red-600">+{overage} excedente</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-[#eef1fb] dark:bg-[#1e2d4a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct(used, limit)}%`, background: barColor(used, limit) }}
        />
      </div>
    </div>
  )
}

// ── summary cards ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'over' | 'normal'
}) {
  return (
    <div
      className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
      style={{ boxShadow: '0 2px 8px rgba(0,35,111,0.04)' }}
    >
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="font-display text-2xl font-bold text-[#4f46e5]">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${accent === 'over' ? 'text-red-600 font-semibold' : 'text-[#64748B]'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [data, setData] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    usageApi
      .summary()
      .then(r => setData(r.data))
      .catch(() => setError('Não foi possível carregar os dados de uso.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-[#64748B]">Carregando uso...</div>
  }

  if (error || !data) {
    return <div className="text-red-600">{error ?? 'Erro ao carregar.'}</div>
  }

  const profLimit = data.professors.limit
  const profLimitLabel = profLimit === null ? '∞' : profLimit
  const genLimit = data.limits_per_professor.ai_generation
  const corLimit = data.limits_per_professor.ai_correction
  const totalOverage = data.totals.ai_generation_overage + data.totals.ai_correction_overage

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Uso & Limites</h1>
          <p className="text-[#64748B] mt-1">
            Consumo de recursos da sua escola no mês corrente, comparado aos limites do plano.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#e9ddff] dark:bg-[#3a2a5c] text-[#712ae2] dark:text-[#b89bff]"
          >
            Plano {data.plan.label}
          </span>
          <Link
            to="/plans"
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
          >
            Fazer upgrade
          </Link>
        </div>
      </div>

      {/* Plano sem IA aviso */}
      {!data.plan.ai_enabled && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#1E293B] dark:text-orange-100">Recursos de IA indisponíveis no plano {data.plan.label}</p>
            <p className="text-xs text-[#64748B] dark:text-orange-200/70 mt-0.5">
              A geração e a correção de questões com IA estão bloqueadas. Faça upgrade para o
              plano Pro ou Enterprise para habilitá-las.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Professores ativos"
          value={`${data.professors.active}${profLimit === null ? '' : ` / ${profLimitLabel}`}`}
          sub={profLimit !== null && data.professors.active >= profLimit ? 'Limite atingido' : 'Dentro do plano'}
          accent={profLimit !== null && data.professors.active >= profLimit ? 'over' : 'normal'}
        />
        <SummaryCard
          label="Questões geradas por IA"
          value={`${data.totals.ai_generation}`}
          sub={
            genLimit === null
              ? 'Ilimitado'
              : `Cota: ${genLimit}/prof · este mês`
          }
        />
        <SummaryCard
          label="Discursivas corrigidas por IA"
          value={`${data.totals.ai_correction}`}
          sub={
            corLimit === null
              ? 'Ilimitado'
              : `Cota: ${corLimit}/prof · este mês`
          }
        />
        <SummaryCard
          label="Excedente total (IA)"
          value={`${totalOverage}`}
          sub={totalOverage > 0 ? 'Sujeito a créditos avulsos' : 'Sem excedente'}
          accent={totalOverage > 0 ? 'over' : 'normal'}
        />
      </div>

      {/* Per-professor table */}
      <div
        className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden"
        style={{ boxShadow: '0 2px 8px rgba(0,35,111,0.04)' }}
      >
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="font-display text-base font-semibold text-[#1E293B]">Consumo por professor</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Cota individual por professor neste mês</p>
        </div>

        {data.per_professor.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#64748B]">
            Nenhum professor cadastrado.
          </div>
        ) : (
          <div className="divide-y divide-[#EEF2F7]">
            {/* header row */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-[#F4F6F9]">
              <div className="col-span-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Professor</div>
              <div className="col-span-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Geração IA</div>
              <div className="col-span-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Correção IA</div>
            </div>

            {data.per_professor.map(p => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 items-center">
                <div className="md:col-span-4 min-w-0">
                  <p className="text-sm font-semibold text-[#1E293B] truncate">
                    {p.name}
                    {!p.is_active && (
                      <span className="ml-2 text-[10px] font-bold text-[#9ca3af] uppercase">inativo</span>
                    )}
                  </p>
                  <p className="text-xs text-[#9ca3af] truncate">{p.email}</p>
                </div>
                <div className="md:col-span-4">
                  <ProgressBar resource={p.ai_generation} />
                </div>
                <div className="md:col-span-4">
                  <ProgressBar resource={p.ai_correction} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#9ca3af] leading-relaxed">
        As cotas de IA são contabilizadas por professor e renovadas mensalmente. O consumo
        acima do limite (excedente) não bloqueia o uso — é registrado para faturamento de
        créditos avulsos conforme o plano contratado.
      </p>
    </div>
  )
}
