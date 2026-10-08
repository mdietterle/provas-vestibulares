import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardMonitoring, MonitoringAlert } from '../../api'
import { SectionTitle } from './SectionTitle'
import { TONE_BADGE, TONE_TEXT, TONE_PANEL } from './tones'

const ALERT_CFG: Record<MonitoringAlert['type'], { label: string; icon: string }> = {
  correction_backlog: { label: 'Atraso na Correção', icon: '⏰' },
  low_pass_rate:      { label: 'Baixa Aprovação',     icon: '📉' },
  low_submission_rate:{ label: 'Baixa Entrega',       icon: '📋' },
}

export function MonitoringSection({ monitoring }: { monitoring: DashboardMonitoring }) {
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
                ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white dark:bg-[#464554] text-slate-600 dark:text-slate-400 shadow-sm'
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
                      className="shrink-0 text-xs font-semibold text-slate-500 hover:underline whitespace-nowrap">
                      Ver prova →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

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