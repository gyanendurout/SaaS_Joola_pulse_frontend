'use client'

import { useState } from 'react'

export interface DonutSlice {
  name: string
  pct: number
  n?: number
  color: string
}

interface DonutProps {
  data: DonutSlice[]
  size?: number
  thickness?: number
}

export function Donut({ data, size = 160, thickness = 28 }: DonutProps) {
  const total = data.reduce((s, d) => s + d.pct, 0) || 1
  const r = size / 2 - thickness / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const [active, setActive] = useState<number | null>(null)
  let acc = 0
  const sliceMeta: Array<{ start: number; end: number }> = []
  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.pct / total) * circumference
          const off = -acc
          const start = acc
          acc += len
          sliceMeta.push({ start, end: acc })
          const isActive = active === i
          return (
            <circle
              key={i} cx={c} cy={c} r={r} fill="none"
              stroke={d.color}
              strokeWidth={isActive ? thickness + 4 : thickness}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={off}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{
                transition: 'stroke-width 150ms ease, opacity 150ms ease',
                opacity: active != null && !isActive ? 0.55 : 1,
                cursor: 'pointer',
              }}
            >
              <title>{`${d.name}: ${(d.n ?? 0).toLocaleString()} (${d.pct.toFixed(1)}%)`}</title>
            </circle>
          )
        })}
      </svg>
      {active != null && data[active] && (
        <div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <div style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            {data[active].name}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: data[active].color, lineHeight: 1 }}>
            {data[active].pct.toFixed(1)}%
          </div>
          {data[active].n != null && (
            <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3 }}>
              {data[active].n!.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DonutLegend({ data }: { data: DonutSlice[] }) {
  return (
    <div className="donut-legend">
      {data.map((d, i) => (
        <div className="dl-row" key={i} title={`${d.name}: ${(d.n ?? 0).toLocaleString()} (${d.pct.toFixed(1)}%)`}>
          <span className="sw" style={{ background: d.color }} />
          <span className="nm">{d.name}</span>
          {d.n != null && <span className="vl">{d.n.toLocaleString()}</span>}
          <span className="pc">{d.pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}
