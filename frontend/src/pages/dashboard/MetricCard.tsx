import type { Tone } from './tones'
import { TONE_BADGE } from './tones'

export function MetricCard({
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