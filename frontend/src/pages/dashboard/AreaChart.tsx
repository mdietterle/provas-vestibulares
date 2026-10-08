export function AreaChart({
  data,
  valueKey,
  color = '#f59e0b',
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
  const yTicks = [0, Math.round(maxVal / 2), maxVal]
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map(t => {
        const y = PAD.top + yScale(t)
        return <line key={t} x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
      })}
      {yTicks.map(t => (
        <text key={t} x={PAD.left - 4} y={PAD.top + yScale(t) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{t}</text>
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => {
        const label = String(d.month || '').slice(5)
        const name = monthNames[parseInt(label, 10) - 1] || label
        return (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{name}</text>
        )
      })}
    </svg>
  )
}