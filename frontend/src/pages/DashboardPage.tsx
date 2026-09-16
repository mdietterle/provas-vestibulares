import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  dashboardApi, examsApi, simuladosApi,
} from '../api'
import type { DashboardStats, DashboardMonitoring, MonitoringAlert, ProfessorDashboardData, StudentDashboardData } from '../api'
import type { SimuladoSummary } from '../api/simulados'
import type { Exam } from '../types'
import { exportDashboardReport } from '../utils/pdf'

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

// Semantic badge/text color pairs with explicit dark-mode equivalents.
// Used to replace inline style={{ background, color }} combos that the
// global CSS overrides in index.css don't cover.
type Tone = 'red' | 'amber' | 'green' | 'blue' | 'gray' | 'navy' | 'purple' | 'orange'

const TONE_BADGE: Record<Tone, string> = {
  red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  amber:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  gray:   'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  navy:   'bg-[#dce1ff] text-[#2563EB] dark:bg-[#1a2947] dark:text-[#818CF8]',
  purple: 'bg-[#e9ddff] text-[#6366F1] dark:bg-[#271a48] dark:text-[#b794f6]',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const TONE_TEXT: Record<Tone, string> = {
  red:    'text-red-600 dark:text-red-400',
  amber:  'text-amber-600 dark:text-amber-400',
  green:  'text-green-600 dark:text-green-500',
  blue:   'text-blue-600 dark:text-blue-400',
  gray:   'text-gray-500 dark:text-gray-400',
  navy:   'text-[#2563EB] dark:text-[#818CF8]',
  purple: 'text-[#6366F1] dark:text-[#b794f6]',
  orange: 'text-orange-600 dark:text-orange-400',
}

const TONE_DOT: Record<Tone, string> = {
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  gray:   'bg-gray-400',
  navy:   'bg-[#2563EB] dark:bg-[#818CF8]',
  purple: 'bg-[#6366F1]',
  orange: 'bg-orange-500',
}

// Light card/panel background used for alert callouts, with a dark pair.
const TONE_PANEL: Record<'red' | 'amber', string> = {
  red:   'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
  amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
}

// Light-tinted background only (no text color), for cards whose text uses its own tone class.
const TONE_BG: Record<Tone, string> = {
  red:    'bg-red-50 dark:bg-red-950/20',
  amber:  'bg-amber-50 dark:bg-amber-950/20',
  green:  'bg-green-50 dark:bg-green-950/20',
  blue:   'bg-blue-50 dark:bg-blue-950/20',
  gray:   'bg-gray-50 dark:bg-slate-800/60',
  navy:   'bg-[#dce1ff] dark:bg-[#1a2947]',
  purple: 'bg-[#e9ddff] dark:bg-[#271a48]',
  orange: 'bg-orange-50 dark:bg-orange-950/20',
}

function MetricCard({
  label, value, icon, tone, sub,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  tone: Tone
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_BADGE[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-[#1E293B]">{value}</p>
      <p className="text-sm text-[#334155] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#64748B] mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-[#1E293B] mb-3">{children}</h2>
}

function CircleProgress({ pct, size = 80, stroke = 7, color = '#6366F1', label }: {
  pct: number; size?: number; stroke?: number; color?: string; label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-[#1E293B]" style={{ fontSize: size * 0.22 }}>{pct}%</span>
        {label && <span className="text-[#64748B]" style={{ fontSize: size * 0.12 }}>{label}</span>}
      </div>
    </div>
  )
}

function ActionTile({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 bg-white rounded-2xl border border-[#E2E8F0] p-4 hover:border-[#b6c4ff] hover:bg-[#F4F6F9] transition-all group" style={{ boxShadow: '0 2px 12px rgba(0,35,111,0.04)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1E293B]">{label}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>
      </div>
      <svg className="w-4 h-4 text-[#c5c5d3] group-hover:text-[#6366F1] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
    </Link>
  )
}

function QuickAction({ to, icon, label, gradient }: { to: string; icon: React.ReactNode; label: string; gradient?: boolean }) {
  const base = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all'
  return (
    <Link
      to={to}
      className={gradient ? `${base} text-white` : `${base} bg-[#EFF6FF] text-[#2563EB]`}
      style={gradient ? { background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)' } : undefined}
    >
      {icon}
      {label}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
// Documentation Banner
// ─────────────────────────────────────────────────────────────

function DocBanner({
  docUrl,
  title,
  description,
  extraLinks,
}: {
  docUrl: string
  title: string
  description: string
  extraLinks?: { label: string; url: string }[]
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)', boxShadow: '0 8px 32px rgba(107,56,212,0.25)' }}
    >
      {/* Decorative circle */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: '#fff' }} />
      <div className="absolute -right-2 bottom-[-30px] w-24 h-24 rounded-full opacity-10" style={{ background: '#fff' }} />

      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">Documentação</span>
        </div>
        <p className="font-display text-base font-bold text-white">{title}</p>
        <p className="text-sm text-white/75 mt-0.5 leading-relaxed">{description}</p>
        {extraLinks && extraLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {extraLinks.map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/80 hover:text-white underline underline-offset-2 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <a
        href={docUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white hover:bg-white/90 z-10 text-[#2563EB]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Abrir Manual
      </a>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Admin / Escola Dashboard
// ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; tone: Tone }> = {
  pending:    { label: 'Aguardando',    tone: 'gray' },
  correcting: { label: 'Corrigindo',    tone: 'amber' },
  done:       { label: 'Corrigido',     tone: 'blue' },
  released:   { label: 'Liberado',      tone: 'green' },
}

// ── SVG Area Chart ────────────────────────────────────────────
function AreaChart({
  data,
  valueKey,
  color = '#6366F1',
  height = 80,
}: {
  data: Record<string, number>[]
  valueKey: string
  color?: string
  height?: number
}) {
  const W = 400
  const H = height
  const PAD = { top: 8, right: 4, bottom: 20, left: 28 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (data.length < 2) {
    return <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>Sem dados suficientes</div>
  }

  const values = data.map(d => Number(d[valueKey]) || 0)
  const maxVal = Math.max(...values, 1)
  const minVal = 0

  const xStep = innerW / (data.length - 1)
  const yScale = (v: number) => innerH - ((v - minVal) / (maxVal - minVal)) * innerH

  const pts = data.map((d, i) => ({ x: PAD.left + i * xStep, y: PAD.top + yScale(Number(d[valueKey]) || 0) }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`

  const gradId = `grad-${color.replace('#', '')}`

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map(t => {
        const y = PAD.top + yScale(t)
        return <line key={t} x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
      })}
      {/* Y labels */}
      {yTicks.map(t => (
        <text key={t} x={PAD.left - 4} y={PAD.top + yScale(t) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{t}</text>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {/* X labels */}
      {data.map((d, i) => {
        const label = String(d.month || '').slice(5) // "YYYY-MM" → "MM"
        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        const name = monthNames[parseInt(label, 10) - 1] || label
        return (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{name}</text>
        )
      })}
    </svg>
  )
}

function SubjectBar({ subject, count, max }: { subject: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#334155] w-28 truncate shrink-0">{subject}</span>
      <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#6366F1)' }}
        />
      </div>
      <span className="text-xs font-semibold text-[#2563EB] w-6 text-right shrink-0">{count}</span>
    </div>
  )
}

const ALERT_CFG: Record<MonitoringAlert['type'], { label: string; icon: string }> = {
  correction_backlog: { label: 'Atraso na Correção', icon: '⏰' },
  low_pass_rate:      { label: 'Baixa Aprovação',     icon: '📉' },
  low_submission_rate:{ label: 'Baixa Entrega',       icon: '📋' },
}

function MonitoringSection({ monitoring }: { monitoring: DashboardMonitoring }) {
  const [tab, setTab] = useState<'alerts' | 'professors' | 'classes'>('alerts')
  const alerts = Array.isArray(monitoring.alerts) ? monitoring.alerts : []
  const professorStats = Array.isArray(monitoring.professor_stats) ? monitoring.professor_stats : []
  const classStats = Array.isArray(monitoring.class_stats) ? monitoring.class_stats : []
  const highAlerts = alerts.filter(a => a.severity === 'high').length

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <SectionTitle>Acompanhamento</SectionTitle>
          {highAlerts > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TONE_BADGE.red}`}>
              {highAlerts} alerta{highAlerts !== 1 ? 's' : ''} crítico{highAlerts !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          {([['alerts', 'Alertas'], ['professors', 'Professores'], ['classes', 'Turmas']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={tab === v
                ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white dark:bg-[#1e2d4a] text-[#2563EB] dark:text-[#818CF8] shadow-sm'
                : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-500 dark:text-slate-400'
              }
            >
              {l}
              {v === 'alerts' && alerts.length > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${highAlerts > 0 ? TONE_BADGE.red : TONE_BADGE.navy}`}>
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts tab */}
      {tab === 'alerts' && (
        alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c5c5d3] p-6 text-center text-sm text-[#64748B]">
            Nenhum alerta no momento. Tudo dentro do esperado!
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const cfg = ALERT_CFG[alert.type]
              const isHigh = alert.severity === 'high'
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${isHigh ? TONE_PANEL.red : TONE_PANEL.amber}`}>
                  <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isHigh ? TONE_BADGE.red : TONE_BADGE.amber}`}>
                        {isHigh ? 'Crítico' : 'Atenção'}
                      </span>
                      <span className="text-xs font-semibold text-[#1E293B]">{cfg.label}</span>
                      {alert.professor_name && (
                        <span className="text-xs text-[#64748B]">Prof. {alert.professor_name}</span>
                      )}
                      {alert.class_name && (
                        <span className="text-xs text-[#64748B]">{alert.class_name}</span>
                      )}
                    </div>
                    {alert.exam_title && (
                      <p className="text-xs font-medium text-[#334155] truncate">{alert.exam_title}</p>
                    )}
                    <p className="text-xs text-[#64748B] mt-0.5">{alert.detail}</p>
                  </div>
                  {alert.exam_id && (
                    <Link to={`/exams/${alert.exam_id}`}
                      className="shrink-0 text-xs font-semibold text-[#6366F1] hover:underline whitespace-nowrap">
                      Ver prova →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Professors tab */}
      {tab === 'professors' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#64748B] border-b border-[#E2E8F0]">
                <th className="text-left pb-2 font-medium">Professor</th>
                <th className="text-center pb-2 font-medium w-16">Provas</th>
                <th className="text-center pb-2 font-medium w-24">Pendentes</th>
                <th className="text-center pb-2 font-medium w-28">Mais antigo</th>
                <th className="text-center pb-2 font-medium w-28">Taxa aprovação</th>
                <th className="text-center pb-2 font-medium w-24">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {professorStats.map(ps => {
                const hasBacklog = ps.oldest_pending_days >= 7 && ps.pending_correction_count > 0
                const hasLowPass = ps.low_pass_rate_exams.length > 0
                return (
                  <tr key={ps.id} className="border-b border-[#f5f5f5] hover:bg-[#F4F6F9]">
                    <td className="py-2.5 pr-3 font-medium text-[#1E293B]">{ps.name}</td>
                    <td className="py-2.5 text-center text-[#334155]">{ps.exam_count}</td>
                    <td className="py-2.5 text-center">
                      {ps.pending_correction_count > 0 ? (
                        <span className={`font-semibold ${hasBacklog ? TONE_TEXT.red : TONE_TEXT.amber}`}>
                          {ps.pending_correction_count}
                        </span>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-xs">
                      {ps.oldest_pending_days > 0 ? (
                        <span className={ps.oldest_pending_days >= 14 ? TONE_TEXT.red : ps.oldest_pending_days >= 7 ? TONE_TEXT.amber : 'text-[#334155]'}>
                          {Math.round(ps.oldest_pending_days)}d
                        </span>
                      ) : <span className="text-[#9ca3af]">—</span>}
                    </td>
                    <td className="py-2.5 text-center text-xs">
                      {ps.avg_pass_rate != null ? (
                        <span className={`font-semibold ${ps.avg_pass_rate < 60 ? TONE_TEXT.red : ps.avg_pass_rate < 75 ? TONE_TEXT.amber : TONE_TEXT.green}`}>
                          {ps.avg_pass_rate}%
                        </span>
                      ) : <span className="text-[#9ca3af]">sem dados</span>}
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {hasBacklog && <span title="Atraso na correção" className="text-base">⏰</span>}
                        {hasLowPass && <span title={`${ps.low_pass_rate_exams.length} prova(s) com baixa aprovação`} className="text-base">📉</span>}
                        {!hasBacklog && !hasLowPass && <span className="text-[#9ca3af] text-xs">ok</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {professorStats.length === 0 && (
            <p className="text-xs text-[#9ca3af] text-center py-4">Nenhum professor cadastrado</p>
          )}
        </div>
      )}

      {/* Classes tab */}
      {tab === 'classes' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#64748B] border-b border-[#E2E8F0]">
                <th className="text-left pb-2 font-medium">Turma</th>
                <th className="text-center pb-2 font-medium w-16">Alunos</th>
                <th className="text-center pb-2 font-medium w-16">Provas</th>
                <th className="text-center pb-2 font-medium w-28">Nota média</th>
                <th className="text-center pb-2 font-medium w-28">Taxa aprovação</th>
                <th className="text-center pb-2 font-medium w-24">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map(cs => (
                <tr key={cs.id} className="border-b border-[#f5f5f5] hover:bg-[#F4F6F9]">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-[#1E293B]">{cs.name}</span>
                    {cs.year && <span className="ml-1.5 text-xs text-[#64748B]">{cs.year}</span>}
                  </td>
                  <td className="py-2.5 text-center text-[#334155]">{cs.student_count}</td>
                  <td className="py-2.5 text-center text-[#334155]">{cs.exam_count}</td>
                  <td className="py-2.5 text-center text-xs">
                    {cs.avg_score != null ? (
                      <span className="font-semibold text-[#334155]">{cs.avg_score}</span>
                    ) : <span className="text-[#9ca3af]">sem dados</span>}
                  </td>
                  <td className="py-2.5 text-center text-xs">
                    {cs.avg_pass_rate != null ? (
                      <span className={`font-semibold ${cs.avg_pass_rate < 60 ? TONE_TEXT.red : cs.avg_pass_rate < 75 ? TONE_TEXT.amber : TONE_TEXT.green}`}>
                        {cs.avg_pass_rate}%
                      </span>
                    ) : <span className="text-[#9ca3af]">sem dados</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    {cs.exam_count > 0 ? (
                      <span className={`text-xs font-semibold ${cs.submission_rate < 50 ? TONE_TEXT.red : cs.submission_rate < 75 ? TONE_TEXT.amber : TONE_TEXT.green}`}>
                        {cs.submission_rate}%
                      </span>
                    ) : <span className="text-xs text-[#9ca3af]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classStats.length === 0 && (
            <p className="text-xs text-[#9ca3af] text-center py-4">Nenhuma turma cadastrada</p>
          )}
        </div>
      )}
    </div>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monitoring, setMonitoring] = useState<DashboardMonitoring | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardApi.stats(), dashboardApi.monitoring()])
      .then(([s, m]) => { setStats(s.data); setMonitoring(m.data) })
      .finally(() => setLoading(false))
  }, [])

  const [chartMode, setChartMode] = useState<'users' | 'exams'>('users')
  const [chartRange, setChartRange] = useState<6 | 12>(6)

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const c = stats?.counts ?? { professors: 0, students: 0, subjects: 0, classes: 0, questions: 0, exams: 0 }
  const subs = stats?.submissions ?? { total: 0, pending: 0, correcting: 0, done: 0, released: 0 }
  const growth = stats?.growth ?? { new_users_this_month: 0, new_users_last_month: 0, new_exams_this_month: 0 }
  const maxSubjectCount = Math.max(...(stats?.exams_by_subject ?? []).map(s => s.count), 1)

  const rawUserGrowth = stats?.monthly_user_growth ?? []
  const rawExamGrowth = stats?.monthly_exam_growth ?? []
  const chartData = ((chartMode === 'users' ? rawUserGrowth : rawExamGrowth) as unknown as Record<string, number>[]).slice(-chartRange)
  const chartValueKey = chartMode === 'users' ? 'new_users' : 'new_exams'
  const chartColor = chartMode === 'users' ? '#6366F1' : '#27c38a'
  const chartTotal = chartData.reduce((s, d) => s + (Number((d as any)[chartValueKey]) || 0), 0)
  const userGrowthPct = growth.new_users_last_month > 0
    ? Math.round(((growth.new_users_this_month - growth.new_users_last_month) / growth.new_users_last_month) * 100)
    : growth.new_users_this_month > 0 ? 100 : 0

  const diffTotal = Object.values(stats?.questions_by_difficulty ?? {}).reduce((a, b) => a + b, 0)
  const diffPct = (key: string) =>
    diffTotal > 0 ? Math.round(((stats?.questions_by_difficulty?.[key] ?? 0) / diffTotal) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Olá, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-[#64748B] mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => stats && exportDashboardReport(stats)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E2E8F0] bg-white text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Relatório Gerencial PDF
          </button>
          <QuickAction to="/professors" label="Novo Professor" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>} />
          <QuickAction to="/school" label="Configurações" gradient icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
        </div>
      </div>

      {/* Documentation banner */}
      <DocBanner
        docUrl="/docs/manual-administrador.html"
        title="Manual do Administrador"
        description="Consulte o guia completo de configuração da instituição, gestão de usuários, controle de acesso e monitoramento da plataforma."
        extraLinks={[
          { label: 'Manual do Professor', url: '/docs/manual-professor.html' },
          { label: 'Manual do Aluno', url: '/docs/manual-aluno.html' },
        ]}
      />

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Professores', value: c.professors, tone: 'purple' as Tone, sub: growth.new_users_this_month > 0 ? `+${growth.new_users_this_month} este mês` : undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
          { label: 'Alunos',      value: c.students,   tone: 'green' as Tone, sub: undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
          { label: 'Matérias',    value: c.subjects,   tone: 'amber' as Tone, sub: undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z"/></svg> },
          { label: 'Turmas',      value: c.classes,    tone: 'navy' as Tone, sub: undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> },
          { label: 'Questões',    value: c.questions,  tone: 'orange' as Tone, sub: undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
          { label: 'Provas',      value: c.exams,      tone: 'red' as Tone, sub: growth.new_exams_this_month > 0 ? `+${growth.new_exams_this_month} este mês` : undefined, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
        ].map(k => (
          <MetricCard key={k.label} label={k.label} value={k.value} tone={k.tone} sub={k.sub} icon={k.icon} />
        ))}
      </div>

      {/* 3 insight cards */}
      {(() => {
        const correctionRate = subs.total > 0 ? Math.round((subs.done + subs.released) / subs.total * 100) : 0
        const classStats = monitoring?.class_stats ?? []
        const classesWithData = classStats.filter(cs => cs.avg_pass_rate != null && cs.submission_rate != null)
        const healthScore = classesWithData.length > 0
          ? Math.round(classesWithData.reduce((sum, cs) => sum + (cs.avg_pass_rate! * 0.5 + cs.submission_rate * 0.5), 0) / classesWithData.length)
          : null
        const highAlerts = (Array.isArray(monitoring?.alerts) ? monitoring!.alerts : []).filter(a => a.severity === 'high').length

        const healthTone: Tone  = healthScore == null ? 'gray' : healthScore >= 70 ? 'green' : healthScore >= 50 ? 'amber' : 'red'
        const healthLabel = healthScore == null ? 'sem dados' : healthScore >= 70 ? 'Saudável' : healthScore >= 50 ? 'Atenção' : 'Crítico'

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Taxa de correção */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
              <CircleProgress pct={correctionRate} size={72} stroke={7} color="#6366F1" />
              <div>
                <p className="text-xs text-[#64748B] font-medium mb-0.5">Taxa de Correção</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {subs.done + subs.released} de {subs.total} corrigidas
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">{subs.pending} aguardando</p>
              </div>
            </div>

            {/* Saúde da escola */}
            <div
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-5"
              style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}
              title="Média entre taxa de aprovação e taxa de entrega de cada turma (peso igual para as duas), depois calculada a média entre as turmas com dados."
            >
              <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 font-bold text-xl ${TONE_BADGE[healthTone]}`}>
                {healthScore != null ? `${healthScore}` : '—'}
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-medium mb-0.5">Saúde da Escola</p>
                <p className={`text-sm font-semibold ${TONE_TEXT[healthTone]}`}>{healthLabel}</p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {classesWithData.length > 0 ? `${classesWithData.length} turmas com dados` : 'sem turmas com dados'}
                </p>
              </div>
            </div>

            {/* Pendências críticas */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
              <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 font-bold text-2xl ${highAlerts > 0 ? TONE_BADGE.red : TONE_BADGE.green}`}>
                {highAlerts > 0 ? highAlerts : '✓'}
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-medium mb-0.5">Pendências Críticas</p>
                <p className={`text-sm font-semibold ${highAlerts > 0 ? TONE_TEXT.red : TONE_TEXT.green}`}>
                  {highAlerts > 0 ? `${highAlerts} alerta${highAlerts !== 1 ? 's' : ''} crítico${highAlerts !== 1 ? 's' : ''}` : 'Tudo em dia'}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {((Array.isArray(monitoring?.alerts) ? monitoring!.alerts.length : 0)) > 0 ? `${monitoring!.alerts.length} alertas no total` : 'nenhum alerta'}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Growth chart */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <SectionTitle>Crescimento</SectionTitle>
              {userGrowthPct !== 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${userGrowthPct > 0 ? TONE_BADGE.green : TONE_BADGE.red}`}>
                  {userGrowthPct > 0 ? '+' : ''}{userGrowthPct}% vs mês anterior
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-display text-[#1E293B] -mt-2">
              {chartTotal}
              <span className="text-sm font-normal text-[#64748B] ml-2">
                {chartMode === 'users' ? 'novos usuários' : 'novas provas'} nos últimos {chartRange} meses
              </span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
              {([['users', 'Usuários'], ['exams', 'Provas']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setChartMode(val)}
                  className={chartMode === val
                    ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white dark:bg-[#1e2d4a] text-[#2563EB] dark:text-[#818CF8] shadow-sm'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-500 dark:text-slate-400'
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>
            {/* Range toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
              {([6, 12] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={chartRange === r
                    ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white dark:bg-[#1e2d4a] text-[#2563EB] dark:text-[#818CF8] shadow-sm'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-500 dark:text-slate-400'
                  }
                >
                  {r === 6 ? 'Semestral' : 'Anual'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AreaChart data={chartData} valueKey={chartValueKey} color={chartColor} height={100} />
      </div>

      {/* Submission pipeline + Subject chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission pipeline */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Pipeline de Correções</SectionTitle>
            <Link to="/corrections" className="text-xs font-semibold text-[#6366F1] hover:underline">Ver todas →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['pending','correcting','done','released'] as const).map(key => {
              const cfg = STATUS_CFG[key]
              const val = subs[key]
              return (
                <div key={key} className={`rounded-xl p-3 border border-transparent ${TONE_BG[cfg.tone]}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${TONE_DOT[cfg.tone]}`} />
                    <span className={`text-xs font-medium ${TONE_TEXT[cfg.tone]}`}>{cfg.label}</span>
                  </div>
                  <p className={`text-xl font-bold font-display ${TONE_TEXT[cfg.tone]}`}>{val}</p>
                </div>
              )
            })}
          </div>
          {subs.total > 0 && (
            <div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                {subs.pending > 0    && <div style={{ width: `${(subs.pending / subs.total) * 100}%`, background: '#9ca3af' }} />}
                {subs.correcting > 0 && <div style={{ width: `${(subs.correcting / subs.total) * 100}%`, background: '#f59e0b' }} />}
                {subs.done > 0       && <div style={{ width: `${(subs.done / subs.total) * 100}%`, background: '#3b82f6' }} />}
                {subs.released > 0   && <div style={{ width: `${(subs.released / subs.total) * 100}%`, background: '#22c55e' }} />}
              </div>
              <p className="text-xs text-[#64748B] mt-1.5">{subs.total} {subs.total !== 1 ? 'submissões' : 'submissão'} no total</p>
            </div>
          )}
          {subs.total === 0 && (
            <p className="text-xs text-[#9ca3af] text-center py-2">Nenhuma submissão ainda</p>
          )}
        </div>

        {/* Exams per subject chart */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Provas por Matéria</SectionTitle>
            <Link to="/exams" className="text-xs font-semibold text-[#6366F1] hover:underline">Ver provas →</Link>
          </div>
          {(stats?.exams_by_subject ?? []).length === 0 ? (
            <p className="text-xs text-[#9ca3af] text-center py-6">Nenhuma prova cadastrada</p>
          ) : (
            <div className="space-y-2.5">
              {(stats?.exams_by_subject ?? []).map(row => (
                <SubjectBar key={row.subject} subject={row.subject} count={row.count} max={maxSubjectCount} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monitoring */}
      {monitoring && <MonitoringSection monitoring={monitoring} />}

      {/* Activity feed + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Atividade Recente</SectionTitle>
            <Link to="/corrections" className="text-xs font-semibold text-[#6366F1] hover:underline">Ver correções →</Link>
          </div>
          {(stats?.recent_activity ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#c5c5d3] p-6 text-center text-sm text-[#64748B]">
              Nenhuma submissão recente.
            </div>
          ) : (
            <div className="space-y-2">
              {(stats?.recent_activity ?? []).map(act => {
                const cfg = STATUS_CFG[act.status] ?? STATUS_CFG.pending
                const date = act.submitted_at
                  ? new Date(act.submitted_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '—'
                return (
                  <div key={act.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F4F6F9] transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[#eef2ff] text-[#4f46e5] dark:bg-[#1e2547] dark:text-[#a5b4fc]">
                      {act.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E293B] truncate">{act.student_name}</p>
                      <p className="text-xs text-[#64748B] truncate">{act.exam_title} · {act.subject_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${TONE_BADGE[cfg.tone]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[cfg.tone]}`} />
                        {cfg.label}
                      </span>
                      <p className="text-xs text-[#9ca3af] mt-0.5">{date}</p>
                    </div>
                    {act.total_score != null && (
                      <div className="text-right shrink-0 w-12">
                        <span className="text-sm font-bold text-[#2563EB]">{act.total_score}</span>
                        <span className="text-xs text-[#9ca3af]"> pts</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: difficulty + quick access */}
        <div className="space-y-6">
          {/* Difficulty breakdown */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
            <SectionTitle>Questões por Dificuldade</SectionTitle>
            <div className="space-y-2">
              {[
                { key: 'easy',   label: 'Fácil',   tone: 'green' as Tone, fill: 'bg-green-500' },
                { key: 'medium', label: 'Médio',   tone: 'amber' as Tone, fill: 'bg-amber-500' },
                { key: 'hard',   label: 'Difícil', tone: 'red' as Tone,   fill: 'bg-red-500' },
              ].map(d => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className={`text-xs font-medium w-14 shrink-0 ${TONE_TEXT[d.tone]}`}>{d.label}</span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${TONE_BG[d.tone]}`}>
                    <div className={`h-full rounded-full ${d.fill}`} style={{ width: `${diffPct(d.key)}%` }} />
                  </div>
                  <span className="text-xs text-[#64748B] w-8 text-right shrink-0">
                    {stats?.questions_by_difficulty?.[d.key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick access */}
          <div>
            <SectionTitle>Acesso Rápido</SectionTitle>
            <div className="space-y-2">
              {[
                { to: '/professors', label: 'Gerenciar Professores' },
                { to: '/students',   label: 'Gerenciar Alunos' },
                { to: '/classes',    label: 'Gerenciar Turmas' },
                { to: '/exams',      label: 'Ver todas as Provas' },
                { to: '/corrections', label: 'Painel de Correções' },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#1E293B] hover:bg-[#EFF6FF] hover:border-[#b6c4ff] transition-colors">
                  {item.label}
                  <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Professor Dashboard
// ─────────────────────────────────────────────────────────────

function ProfessorDashboard() {
  const { user } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [data, setData] = useState<ProfessorDashboardData | null>(null)

  useEffect(() => {
    Promise.all([examsApi.list(), dashboardApi.professor()]).then(([e, d]) => {
      setExams(e.data.slice(0, 4))
      setData(d.data)
    })
  }, [])

  const aiProgress = data?.ai_progress ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Olá, Prof. {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-sm mt-0.5 flex items-center gap-1.5 text-[#6366F1] dark:text-[#b794f6]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {aiProgress > 0
              ? `Sua IA assistente já corrigiu ${aiProgress}% das provas desta semana`
              : 'Nenhuma submissão esta semana ainda'}
          </p>
        </div>
        <div className="flex gap-3">
          <QuickAction to="/exams" label="Nova Prova" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>} />
          <QuickAction to="/questions" label="✦ Criar com IA" gradient icon={null} />
        </div>
      </div>

      {/* Documentation banner */}
      <DocBanner
        docUrl="/docs/manual-professor.html"
        title="Manual do Professor"
        description="Aprenda a criar questões com IA, montar provas, corrigir automaticamente e acompanhar o desempenho das suas turmas."
      />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Questões Criadas" value={data?.question_count ?? '—'} tone="navy" sub="no banco"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <MetricCard label="Provas Criadas" value={data?.exam_count ?? '—'} tone="purple" sub="no total"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
        />
        <MetricCard label="Tempo Economizado (estimado)" value={data?.time_saved ?? '—'} tone="green" sub="~2min por correção automática de IA"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <MetricCard
          label="Média da Turma"
          value={data?.avg_score != null ? data.avg_score.toFixed(1).replace('.', ',') : '—'}
          tone="amber" sub="nas provas liberadas"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
        />
      </div>

      {/* IA progress + provas */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Correções IA — arco + barras por turma */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              <span className="text-sm font-semibold text-[#1E293B]">Correções IA — Esta Semana</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TONE_BADGE.green}`}>Ao vivo</span>
          </div>

          <div className="flex items-center gap-6 mb-5">
            <CircleProgress pct={aiProgress} size={88} stroke={8} color="#6366F1" label="corrigido" />
            <div className="flex-1 space-y-1 text-sm">
              <p className="text-[#334155]">
                <span className="font-bold text-[#1E293B]">{aiProgress}%</span> das submissões desta semana já foram processadas pela IA.
              </p>
              {data?.correction_by_class && data.correction_by_class.length > 0 && (
                <p className="text-xs text-[#64748B]">
                  {data.correction_by_class.reduce((s, t) => s + t.corrigidos, 0)} de {data.correction_by_class.reduce((s, t) => s + t.total, 0)} alunos corrigidos em {data.correction_by_class.length} turma{data.correction_by_class.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </div>

          {/* Barras por turma */}
          {(data?.correction_by_class ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] p-4 text-center text-xs text-[#9ca3af]">
              Nenhuma submissão registrada esta semana.
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.correction_by_class ?? []).map(t => (
                <div key={t.turma}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#334155]">{t.turma}</span>
                    <span className="text-[#64748B]">{t.corrigidos}/{t.total} alunos · <strong className={t.pct >= 80 ? TONE_TEXT.green : t.pct >= 50 ? TONE_TEXT.purple : TONE_TEXT.amber}>{t.pct}%</strong></span>
                  </div>
                  <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, background: t.pct >= 80 ? '#22c55e' : t.pct >= 50 ? '#6366F1' : '#f59e0b' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Provas recentes */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Provas Recentes</SectionTitle>
            <Link to="/exams" className="text-xs font-semibold text-[#6366F1] hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {exams.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c5c5d3] p-5 text-center text-sm text-[#64748B]">
                Nenhuma prova criada ainda.{' '}
                <Link to="/exams" className="text-[#6366F1] font-medium hover:underline">Criar →</Link>
              </div>
            )}
            {exams.map(exam => (
              <Link key={exam.id} to={`/exams/${exam.id}`} className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] px-3 py-2.5 hover:border-[#b6c4ff] hover:bg-[#F4F6F9] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#dce1ff] flex items-center justify-center shrink-0 text-[#2563EB]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1E293B] truncate">{exam.title}</p>
                  <p className="text-xs text-[#64748B] truncate">{exam.subject?.name} · {exam.class_?.name}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${TONE_BADGE.purple}`}>
                  {exam.exam_questions?.length ?? exam.question_count ?? 0}q
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Ações rápidas — grid 2×2 */}
      <div>
        <SectionTitle>Ações Rápidas</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionTile to="/questions" label="Banco de Questões" sub="Criar e gerenciar questões com IA"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <ActionTile to="/exams" label="Criar Nova Prova" sub="Monte e publique sua próxima avaliação"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>} />
          <ActionTile to="/corrections" label="Painel de Correções" sub="Revisar respostas e liberar resultados"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <ActionTile to="/classes" label="Minhas Turmas" sub="Ver alunos, atribuições e desempenho"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Student Dashboard
// ─────────────────────────────────────────────────────────────

function StudentDashboard() {
  const { user } = useAuth()
  const [allExams, setAllExams] = useState<Exam[]>([])
  const [simulados, setSimulados] = useState<SimuladoSummary[]>([])
  const [data, setData] = useState<StudentDashboardData | null>(null)

  useEffect(() => {
    Promise.all([examsApi.list(), simuladosApi.list(), dashboardApi.student()]).then(([e, s, d]) => {
      setAllExams(Array.isArray(e.data) ? e.data : [])
      setSimulados(Array.isArray(s.data) ? s.data : [])
      setData(d.data)
    }).catch(() => {})
  }, [])

  const exams = allExams.slice(0, 4)
  const pendingSimulados = simulados.filter(s => s.status !== 'done')
  const totalAssessments = allExams.length + pendingSimulados.length

  const examsBySubject = allExams.reduce<Record<string, number>>((acc, e) => {
    const name = e.subject?.name ?? 'Sem matéria'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
  const subjectBreakdown = Object.entries(examsBySubject).sort((a, b) => b[1] - a[1])

  const avgGradeStr = data?.avg_grade != null
    ? data.avg_grade.toFixed(1).replace('.', ',')
    : '—'
  const rankStr = data?.ranking_position != null ? `${data.ranking_position}º` : '—'
  const rankSub = data?.total_ranked ? `de ${data.total_ranked} alunos` : 'sem dados'
  const completionStr = data?.completion_rate != null ? `${data.completion_rate}%` : '—'
  const gradeEvolution = data?.grade_evolution ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E293B]">Olá, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Você tem <span className="font-semibold text-[#2563EB]">{totalAssessments} avaliações</span> disponíveis
            ({allExams.length} {allExams.length === 1 ? 'prova' : 'provas'}, {pendingSimulados.length} {pendingSimulados.length === 1 ? 'simulado' : 'simulados'}).
          </p>
        </div>
        <QuickAction to="/exams" label="Ver minhas Provas" gradient icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>} />
      </div>

      {/* Documentation banner */}
      <DocBanner
        docUrl="/docs/manual-aluno.html"
        title="Manual do Aluno"
        description="Veja como realizar provas, consultar seus resultados e aproveitar ao máximo as sugestões personalizadas da IA."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Média geral */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_BADGE.green}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-[#1E293B]">{avgGradeStr}</p>
          <p className="text-sm text-[#334155] mt-0.5">Média Geral</p>
          {data?.avg_grade != null && (
            <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${data.avg_grade >= 7 ? 'bg-green-500' : data.avg_grade >= 5 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(data.avg_grade / 10) * 100}%` }} />
            </div>
          )}
          {data?.growth_pct != null && (
            <p className={`text-xs mt-1 ${data.growth_pct >= 0 ? TONE_TEXT.green : TONE_TEXT.red}`}>
              {data.growth_pct >= 0 ? '↑' : '↓'} {Math.abs(data.growth_pct)}% vs período anterior
            </p>
          )}
          {data?.avg_grade != null && data?.institution_avg_grade != null && (
            <p className={`text-xs mt-0.5 ${data.avg_grade >= data.institution_avg_grade ? TONE_TEXT.green : TONE_TEXT.amber}`}>
              {data.avg_grade >= data.institution_avg_grade ? '↑' : '↓'} média da instituição: {data.institution_avg_grade.toFixed(1).replace('.', ',')}
            </p>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_BADGE.purple}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-[#1E293B]">{rankStr}</p>
          <p className="text-sm text-[#334155] mt-0.5">Ranking</p>
          <p className="text-xs text-[#64748B] mt-1">{rankSub}</p>
        </div>

        {/* Taxa de conclusão */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <CircleProgress
            pct={data?.completion_rate ?? 0}
            size={60}
            stroke={6}
            color={data?.completion_rate == null ? '#9ca3af' : data.completion_rate >= 75 ? '#22c55e' : data.completion_rate >= 50 ? '#f59e0b' : '#ef4444'}
          />
          <div>
            <p className="font-display text-lg font-bold text-[#1E293B]">{completionStr}</p>
            <p className="text-sm text-[#334155]">Conclusão</p>
            <p className="text-xs text-[#64748B]">das avaliações</p>
          </div>
        </div>
      </div>

      {/* Avaliações disponíveis — provas tradicionais (por matéria) + simulados */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TONE_BADGE.navy}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#1E293B]">{totalAssessments}</p>
              <p className="text-sm text-[#334155]">Avaliações Disponíveis</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-2 sm:pl-5 sm:border-l border-[#E2E8F0]">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TONE_BADGE.blue}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {allExams.length} {allExams.length === 1 ? 'prova tradicional' : 'provas tradicionais'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TONE_BADGE.purple}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {pendingSimulados.length} {pendingSimulados.length === 1 ? 'simulado' : 'simulados'}
            </span>
          </div>
        </div>

        {subjectBreakdown.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Provas tradicionais por matéria</p>
            <div className="flex flex-wrap gap-2">
              {subjectBreakdown.map(([subject, count]) => (
                <span key={subject} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#F4F6F9] dark:bg-[#0F172A] text-[#334155] dark:text-[#94a3b8] border border-[#E2E8F0] dark:border-[#1e2d4a]">
                  {subject}
                  <span className="font-bold text-[#1E293B] dark:text-[#e2e8f0]">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de notas por mês */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Evolução das Notas</SectionTitle>
          <div className="flex items-center gap-3">
            {data?.growth_pct != null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${data.growth_pct >= 0 ? TONE_BADGE.green : TONE_BADGE.red}`}>
                {data.growth_pct >= 0 ? '+' : ''}{data.growth_pct}% vs início
              </span>
            )}
            <div className="flex items-center gap-3 text-xs text-[#64748B]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2563EB] inline-block"/>Prova formal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2563EB] opacity-55 inline-block" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 2px, transparent 2px, transparent 4px)' }}/>Simulado</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#27c38a] inline-block"/>Meta 7,0</span>
            </div>
          </div>
        </div>

        {gradeEvolution.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E2E8F0]">
            <svg className="w-8 h-8 text-[#c5c5d3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <p className="text-sm text-[#64748B]">Suas notas aparecerão aqui após a correção das provas.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {/* Eixo Y — escala de 0 a 10 para dar contexto absoluto à altura das barras */}
              <div className="flex flex-col justify-between h-32 text-[10px] text-[#9ca3af] text-right shrink-0">
                {[10, 7.5, 5, 2.5, 0].map(v => <span key={v}>{v.toFixed(1).replace('.0', '')}</span>)}
              </div>

              <div className="flex-1">
                {/* Área do gráfico: altura fixa (h-32) para que as barras, posicionadas em
                    absoluto dentro dela, tenham uma base de cálculo de altura real (%
                    dentro de um flex sem altura explícita colapsa para 0 — por isso as
                    barras não apareciam antes). */}
                <div className="relative h-32">
                  {[0, 25, 50, 75, 100].map(pct => (
                    <div key={pct} className="absolute inset-x-0 border-t border-[#f0f2fa] dark:border-[#1e2d4a]" style={{ bottom: `${pct}%` }} />
                  ))}
                  <div className="absolute inset-x-0 pointer-events-none z-20" style={{ bottom: `${(7 / 10) * 100}%` }}>
                    <div className="border-t border-dashed border-[#27c38a] opacity-70" />
                  </div>

                  <div className="absolute inset-0 flex gap-2">
                    {gradeEvolution.map(({ mes, nota, fonte }, idx) => {
                      const h = Math.min(100, Math.round((nota / 10) * 100))
                      const tone = nota >= 7 ? 'acima da meta (7,0)' : nota >= 5 ? 'abaixo da meta, mas aprovado' : 'abaixo da média mínima'
                      const fonteLabel = fonte === 'prova' ? 'prova formal' : fonte === 'simulado' ? 'simulado' : 'prova + simulado'
                      return (
                        <div
                          key={`${mes}-${idx}`}
                          className="relative flex-1 h-full group"
                          title={`${mes}: nota ${nota.toFixed(1).replace('.', ',')} (${fonteLabel}) — ${tone}`}
                        >
                          <span
                            className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap ${nota >= 7 ? TONE_TEXT.green : nota >= 5 ? TONE_TEXT.amber : TONE_TEXT.red}`}
                            style={{ bottom: `calc(${h}% + 4px)` }}
                          >
                            {nota.toFixed(1)}
                          </span>
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-t-xl transition-all group-hover:opacity-80"
                            style={{
                              height: `${h}%`,
                              minHeight: h > 0 ? 3 : 0,
                              background: nota >= 7 ? 'linear-gradient(180deg,#2563EB,#6366F1)' : nota >= 5 ? '#f59e0b' : '#ef4444',
                              opacity: fonte === 'simulado' ? 0.55 : 1,
                              backgroundImage: fonte === 'simulado'
                                ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 3px, transparent 3px, transparent 6px)'
                                : undefined,
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rótulos dos meses, alinhados com cada coluna acima */}
                <div className="flex gap-2 mt-1.5">
                  {gradeEvolution.map(({ mes, fonte }, idx) => (
                    <span key={`${mes}-${idx}`} className="flex-1 text-center text-[10px] text-[#9ca3af]" title={fonte === 'simulado' ? 'Baseado em simulado' : fonte === 'misto' ? 'Prova + simulado' : 'Baseado em prova formal'}>
                      {mes}{fonte === 'simulado' && <sup>•</sup>}{fonte === 'misto' && <sup>~</sup>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-[#64748B]">
              <span>Média: <strong className="text-[#1E293B]">{avgGradeStr}</strong></span>
              <span className="ml-auto">Taxa de conclusão: <strong className="text-[#1E293B]">{completionStr}</strong></span>
            </div>
          </>
        )}
      </div>

      {/* Provas + painel de desempenho */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Provas Disponíveis</SectionTitle>
            <Link to="/exams" className="text-xs font-semibold text-[#6366F1] hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {exams.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c5c5d3] p-6 text-center text-sm text-[#64748B]">
                Nenhuma prova disponível no momento.
              </div>
            )}
            {exams.map(exam => (
              <Link key={exam.id} to={`/exams/${exam.id}/submit`} className="flex items-center gap-4 bg-white rounded-xl border border-[#E2E8F0] px-4 py-3 hover:border-[#b6c4ff] hover:bg-[#F4F6F9] transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-[#dce1ff] flex items-center justify-center shrink-0 text-[#2563EB]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1E293B] truncate">{exam.title}</p>
                  <p className="text-xs text-[#64748B]">{exam.subject?.name} · {exam.class_?.name}</p>
                </div>
                <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'linear-gradient(135deg,#2563EB,#6366F1)' }}>
                  Realizar →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Painel de desempenho */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5" style={{ boxShadow: '0 4px 20px rgba(0,35,111,0.06)' }}>
          <SectionTitle>Seu Desempenho</SectionTitle>
          <div className="flex flex-col items-center mb-5">
            <CircleProgress
              pct={data?.avg_grade != null ? Math.round(data.avg_grade * 10) : 0}
              size={96}
              stroke={9}
              color={data?.avg_grade == null ? '#9ca3af' : data.avg_grade >= 7 ? '#22c55e' : data.avg_grade >= 5 ? '#f59e0b' : '#ef4444'}
              label="nota"
            />
            <p className="text-xs text-[#64748B] mt-2 text-center">
              {data?.avg_grade == null
                ? 'Complete algumas provas para ver seu desempenho.'
                : data.avg_grade >= 8
                ? 'Excelente desempenho! Continue assim.'
                : data.avg_grade >= 6
                ? 'Bom progresso. Continue se dedicando.'
                : 'Hora de revisar o conteúdo. Você consegue!'}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
              <span className="text-[#64748B]">Média geral</span>
              <span className="font-bold text-[#1E293B]">{avgGradeStr}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
              <span className="text-[#64748B]">Posição no ranking</span>
              <span className="font-bold text-[#1E293B]">{rankStr}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
              <span className="text-[#64748B]">Total de alunos</span>
              <span className="font-bold text-[#1E293B]">{data?.total_ranked ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#64748B]">Provas concluídas</span>
              <span className="font-bold text-[#1E293B]">{completionStr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Root — role switch
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'professor') return <ProfessorDashboard />
  return <StudentDashboard />
}
