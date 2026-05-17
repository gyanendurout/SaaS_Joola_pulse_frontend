'use client'

import { useRef, useEffect, useState } from 'react'

function fmtShort(v: number): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  if (abs < 10 && v !== Math.floor(v)) return v.toFixed(2)
  return Math.round(v).toString()
}

export interface ChartSeries {
  name: string
  color: string
  data: number[]
  area?: boolean
}

interface PulseLineChartProps {
  series: ChartSeries[]
  weeks?: number
  height?: number
  padding?: { t: number; r: number; b: number; l: number }
}

export default function PulseLineChart({
  series,
  weeks = 13,
  height = 220,
  padding = { t: 18, r: 24, b: 28, l: 44 },
}: PulseLineChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(() => {
      if (ref.current) setW(ref.current.clientWidth)
    })
    ro.observe(ref.current)
    setW(ref.current.clientWidth)
    return () => ro.disconnect()
  }, [])

  const W = w, H = height
  const innerW = W - padding.l - padding.r
  const innerH = H - padding.t - padding.b

  const all = series.flatMap((s) => s.data)
  const max = Math.max(...all)
  const min = 0
  const range = max - min || 1

  const xAt = (i: number) => padding.l + (i / Math.max(1, weeks - 1)) * innerW
  const yAt = (v: number) => padding.t + innerH - ((v - min) / range) * innerH

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i / ticks))

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const i = Math.round(((x - padding.l) / innerW) * (weeks - 1))
    setHover(i >= 0 && i < weeks ? i : null)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={W} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padding.l} x2={W - padding.r} y1={yAt(v)} y2={yAt(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={padding.l - 8} y={yAt(v) + 3} fontSize="10" fontFamily="JetBrains Mono"
              fill="#9aa2b0" textAnchor="end">
              {fmtShort(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: weeks }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => (
          <text key={i} x={xAt(i)} y={H - padding.b + 16} fontSize="10" fontFamily="JetBrains Mono"
            fill="#9aa2b0" textAnchor="middle">
            W{i + 1}
          </text>
        ))}
        {hover != null && (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={padding.t} y2={H - padding.b}
            stroke="var(--yellow-edge)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {series.map((s, si) => {
          const d = s.data.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ',' + yAt(v)).join(' ')
          return (
            <g key={si}>
              {s.area && (
                <path d={d + ` L ${xAt(weeks - 1)},${yAt(0)} L ${xAt(0)},${yAt(0)} Z`}
                  fill={s.color} opacity="0.08" />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${s.color}30)` }} />
              {hover != null && (
                <circle cx={xAt(hover)} cy={yAt(s.data[hover])} r="4"
                  fill={s.color} stroke="#0a0d12" strokeWidth="2" />
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: xAt(hover) + 'px', top: padding.t + 4 + 'px' }}>
          <div className="t-name">Week {hover + 1}</div>
          {series.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: s.color }}>● {s.name}</span>
              <span>{fmtShort(s.data[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
