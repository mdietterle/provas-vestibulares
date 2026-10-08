import { useState, useEffect } from 'react'
import { ownerApi } from '../api'
import type {
  OwnerMetrics, OwnerInstitution, GrowthPoint,

} from '../api'
const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  basic:      { label: 'Basic',      color: 'text-blue-700',   bg: 'bg-blue-50' },
  pro:        { label: 'Pro',        color: 'text-teal-700', bg: 'bg-teal-50' },
  enterprise: { label: 'Enterprise', color: 'text-emerald-700', bg: 'bg-emerald-50' },
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtBrl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Badge({ plan }: { plan: string }) {
  const cfg = PLAN_LABELS[plan] ?? { label: plan, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return status === 'ativo'
    ? <span title="Aplicou provas nos últimos 30 dias" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Recente</span>
    : <span title="Sem provas aplicadas nos últimos 30 dias" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Sem uso recente</span>
}

function MetricCard({
  title, value, sub, trend, trendUp,
}: {
  title: string; value: string; sub?: string; trend?: string; trendUp?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col gap-1 shadow-sm">
      <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{title}</span>
      <span className="text-2xl font-bold text-[#1E293B]">{value}</span>
      {trend && (
        <span className={`text-xs font-semibold flex items-center gap-1 ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {trendUp ? '▲' : '▼'} {trend}
        </span>
      )}
      {sub && <span className="text-xs text-[#64748B]">{sub}</span>}
    </div>
  )
}

export function MiniBar({ value, max, color = 'bg-teal-600' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#64748B] w-6 text-right">{pct}%</span>
    </div>
  )
}

function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (!data.length) return null
  const maxInst = Math.max(...data.map(d => d.new_institutions), 1)
  const maxUsers = Math.max(...data.map(d => d.new_users), 1)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Crescimento (últimos 6 meses)</h3>
      <div className="flex gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span className="w-3 h-3 rounded bg-teal-600 inline-block" /> Novas instituições
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Novos usuários
        </span>
      </div>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.month} className="grid grid-cols-[64px_1fr_1fr] gap-3 items-center">
            <span className="text-xs font-medium text-[#64748B]">{d.month}</span>
            <div>
              <MiniBar value={d.new_institutions} max={maxInst} color="bg-teal-600" />
            </div>
            <div>
              <MiniBar value={d.new_users} max={maxUsers} color="bg-amber-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanSelector({ current, onSave }: { current: string; onSave: (p: string) => void }) {
  const [value, setValue] = useState(current)
  const plans = ['basic', 'pro', 'enterprise']
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        className="text-xs border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-2 py-1 bg-white dark:bg-[#1d1f27] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-teal-600"
      >
        {plans.map(p => (
          <option key={p} value={p}>{PLAN_LABELS[p]?.label ?? p}</option>
        ))}
      </select>
      {value !== current && (
        <button
          onClick={() => onSave(value)}
          className="text-xs px-2 py-1 rounded-lg bg-teal-600 text-white hover:bg-[#1D4ED8] transition-colors"
        >
          Salvar
        </button>
      )}
    </div>
  )
}

export default function OwnerPage() {
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null)
  const [institutions, setInstitutions] = useState<OwnerInstitution[]>([])
  const [growth, setGrowth] = useState<GrowthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    Promise.all([ownerApi.metrics(), ownerApi.institutions(), ownerApi.growth()])
      .then(([m, i, g]) => {
        setMetrics(m.data)
        setInstitutions(i.data)
        setGrowth(g.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUpdatePlan = (id: number, plan: string) => {
    ownerApi.updatePlan(id, plan).then((res) => {
      const mrr = (res.data as { mrr?: number }).mrr
      setInstitutions(prev =>
        prev.map(inst => inst.id === id ? { ...inst, plan_type: plan, ...(mrr !== undefined ? { mrr } : {}) } : inst)
      )
    })
  }

  const handleToggleCar = (id: number, current: boolean) => {
    ownerApi.updateModules(id, !current).then(() => {
      setInstitutions(prev =>
        prev.map(inst => inst.id === id ? { ...inst, car_enabled: !current } : inst)
      )
    })
  }

  const filtered = institutions.filter(inst => {
    const matchSearch = inst.name.toLowerCase().includes(search.toLowerCase()) ||
      (inst.cnpj ?? '').includes(search)
    const matchPlan = planFilter === 'todos' || inst.plan_type === planFilter
    const matchStatus = statusFilter === 'todos' || inst.status === statusFilter
    return matchSearch && matchPlan && matchStatus
  })

  const totalMrr = filtered.reduce((s, i) => s + i.mrr, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Gestão de Faturamento</h1>
          <p className="text-sm text-[#64748B]">Visão geral do sistema — acesso proprietário</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const rows = [['Nome','Plano','Status','Professores','Alunos','Provas','MRR/mês','Última atividade']]
              institutions.forEach(i => rows.push([i.name, i.plan_type, i.status, String(i.professors), String(i.students), String(i.exams_total), String(i.mrr), i.last_exam_at ? new Date(i.last_exam_at).toLocaleDateString('pt-BR') : '—']))
              const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'faturamento.csv'; a.click()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5c5d3] dark:border-[#464554] bg-white text-xs font-semibold text-[#334155] dark:text-slate-300 hover:bg-[#F4F6F9] dark:hover:bg-[#131f37] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar CSV
          </button>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-600 text-white">
            OWNER
          </span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Métricas principais */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="MRR"
              value={fmtBrl(metrics.mrr)}
              trend={`${metrics.mrr_growth > 0 ? '+' : ''}${metrics.mrr_growth}% vs mês anterior`}
              trendUp={metrics.mrr_growth >= 0}
            />
            <MetricCard
              title="Taxa de Churn"
              value={`${fmt(metrics.churn_rate, 1)}%`}
              trend={metrics.churn_rate <= 3 ? 'Dentro do limite' : 'Acima do limite'}
              trendUp={metrics.churn_rate <= 3}
            />
            <MetricCard
              title="Retenção"
              value={`${fmt(metrics.retention_rate, 1)}%`}
              sub={`${metrics.institutions_active} inst. ativas`}
              trendUp={metrics.retention_rate >= 90}
            />
            <MetricCard
              title="Instituições"
              value={fmt(metrics.institutions_total)}
              trend={`+${metrics.institutions_new_month} este mês`}
              trendUp={metrics.institutions_new_month > 0}
            />
          </div>
        )}

        {/* LTV + Tendência de crescimento */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LTV card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">LTV Médio</p>
                <p className="text-2xl font-bold text-[#1E293B]">
                  {fmtBrl(metrics.mrr > 0 ? Math.round(metrics.mrr / Math.max(metrics.institutions_total, 1) * Math.max(metrics.avg_tenure_months, 1)) : 0)}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Instituições ativas têm em média <strong>{fmt(metrics.avg_tenure_months, 1)} {metrics.avg_tenure_months === 1 ? 'mês' : 'meses'}</strong> de cadastro
                </p>
              </div>
            </div>

            {/* Tendência de crescimento (real, não é previsão) */}
            <div className="rounded-2xl border border-[#E2E8F0] p-5 shadow-sm relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #f59e0b 100%)' }}>
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-10 bg-white" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Tendência (3 meses)</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {metrics.mrr_growth_trend_3m >= 0 ? '+' : ''}{fmt(metrics.mrr_growth_trend_3m, 1)}% <span className="text-sm font-normal text-white/70">ao mês</span>
                </p>
                <p className="text-sm text-white/80">
                  Crescimento médio mensal do MRR nos últimos 3 meses (este mês: {metrics.mrr_growth >= 0 ? '+' : ''}{fmt(metrics.mrr_growth, 1)}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Segunda linha de métricas */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Usuários totais"
              value={fmt(metrics.users_total)}
              trend={`+${metrics.users_new_month} este mês`}
              trendUp={metrics.users_new_month > 0}
            />
            <MetricCard
              title="Professores"
              value={fmt(metrics.professors_total)}
              sub="ativos na plataforma"
            />
            <MetricCard
              title="Provas este mês"
              value={fmt(metrics.exams_month)}
            />
            <MetricCard
              title="Submissões este mês"
              value={fmt(metrics.submissions_month)}
            />
          </div>
        )}

        {/* Uso de IA este mês (monitoramento de custo) */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Gerações de IA"
              value={fmt(metrics.ai_generation_month)}
              sub="este mês (enunciados, questões)"
            />
            <MetricCard
              title="Correções de IA"
              value={fmt(metrics.ai_correction_month)}
              sub="este mês (redações, discursivas)"
            />
            <MetricCard
              title="Uso além do plano"
              value={fmt(metrics.ai_overage_month)}
              sub="eventos de overage este mês"
            />
          </div>
        )}

        {/* Gráfico + distribuição de planos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GrowthChart data={growth} />

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Distribuição por plano</h3>
            {(['basic', 'pro', 'enterprise'] as const).map(plan => {
              const count = institutions.filter(i => i.plan_type === plan).length
              const revenue = institutions.filter(i => i.plan_type === plan).reduce((s, i) => s + i.mrr, 0)
              return (
                <div key={plan} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge plan={plan} />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#64748B]">{count} instituições</span>
                      <span className="text-xs font-semibold text-[#1E293B]">{fmtBrl(revenue)}/mês</span>
                    </div>
                  </div>
                  <MiniBar
                    value={count}
                    max={Math.max(institutions.length, 1)}
                    color={plan === 'basic' ? 'bg-blue-500' : plan === 'pro' ? 'bg-teal-500' : 'bg-emerald-500'}
                  />
                </div>
              )
            })}

            <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-sm font-medium text-[#64748B]">MRR Total</span>
              <span className="text-lg font-bold text-teal-600">{fmtBrl(institutions.reduce((s, i) => s + i.mrr, 0))}/mês</span>
            </div>
          </div>
        </div>

        {/* Tabela de instituições */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1E293B]">Instituições cadastradas</h3>
              <p className="text-xs text-[#64748B]">{filtered.length} de {institutions.length} • MRR filtrado: {fmtBrl(totalMrr)}/mês</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Buscar instituição..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-1.5 bg-white dark:bg-[#1d1f27] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-teal-600 w-48"
              />
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-1.5 bg-white dark:bg-[#1d1f27] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-teal-600"
              >
                <option value="todos">Todos os planos</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-1.5 bg-white dark:bg-[#1d1f27] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-teal-600"
              >
                <option value="todos">Toda atividade</option>
                <option value="ativo">Ativa recentemente</option>
                <option value="inativo">Sem atividade recente</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F4F6F9] dark:bg-[#1d1f27]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Instituição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Plano</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide" title="Baseado em ter aplicado provas nos últimos 30 dias">Atividade</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Profs.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Alunos</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Provas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">MRR</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Última atividade</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Alterar plano</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide" title="Correção Automática de Redações">CAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-[#64748B] text-sm">
                      Nenhuma instituição encontrada
                    </td>
                  </tr>
                ) : filtered.map(inst => (
                  <tr key={inst.id} className="hover:bg-[#F4F6F9] dark:hover:bg-[#131f37] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#1E293B]">{inst.name}</div>
                      {inst.cnpj && <div className="text-xs text-[#64748B]">{inst.cnpj}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge plan={inst.plan_type} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={inst.status} />
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#334155] dark:text-slate-300">{inst.professors}</td>
                    <td className="px-4 py-3.5 text-center text-[#334155] dark:text-slate-300">{inst.students}</td>
                    <td className="px-4 py-3.5 text-center text-[#334155] dark:text-slate-300">{inst.exams_total}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-teal-600">
                      {fmtBrl(inst.mrr)}<span className="text-xs font-normal text-[#64748B]">/mês</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#64748B]">
                      {inst.last_exam_at
                        ? new Date(inst.last_exam_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <PlanSelector
                        current={inst.plan_type}
                        onSave={(plan) => handleUpdatePlan(inst.id, plan)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleCar(inst.id, inst.car_enabled)}
                        title={inst.car_enabled ? 'Desativar CAR (Correção Automática de Redações)' : 'Ativar CAR (Correção Automática de Redações)'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          inst.car_enabled ? 'bg-amber-500' : 'bg-[#d1d5db] dark:bg-[#464554]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            inst.car_enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
