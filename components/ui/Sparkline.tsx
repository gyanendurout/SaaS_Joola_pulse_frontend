'use client'

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  fill?: boolean
}

let idCounter = 0

export default function Sparkline({
  data,
  color = 'var(--yellow)',
  width = 92,
  height = 32,
  fill = true,
}: SparklineProps) {
  if (!data || !data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1
    const y = height - ((d - min) / range) * (height - 4) - 2
    return [x, y] as [number, number]
  })
  const dLine = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const dArea = dLine + ` L ${width - 1},${height} L 1,${height} Z`
  const gid = 'spg-' + (++idCounter)
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={dArea} fill={`url(#${gid})`} />}
      <path d={dLine} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
