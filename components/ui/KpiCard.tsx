'use client'

import Sparkline from './Sparkline'
import { Tip } from './Tip'

function fmtShort(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toString()
}

interface KpiCardProps {
  label: string
  src?: string
  tooltip?: string
  value: number | string
  unit?: string
  trend?: number[]
  delta?: string
  dir?: 'up' | 'down'
  variant?: '' | 'joola' | 'warn' | 'danger'
  hideVs?: boolean
  children?: React.ReactNode
}

export default function KpiCard({
  label,
  src,
  tooltip,
  value,
  unit,
  trend,
  delta,
  dir = 'up',
  variant = '',
  hideVs = false,
  children,
}: KpiCardProps) {
  const formatted =
    typeof value === 'number'
      ? value >= 1000 ? fmtShort(value) : value.toString()
      : value

  const color =
    variant === 'danger' ? 'var(--red)' :
    variant === 'warn'   ? 'var(--warn)' :
    variant === 'joola'  ? 'var(--joola)' :
    'var(--yellow)'

  return (
    <div className={'kpi ' + variant}>
      <div className="label">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {label}
          {tooltip && <Tip text={tooltip} />}
        </span>
        {src && <span className="src">{src}</span>}
      </div>
      <div className="row">
        <div className="value">
          {formatted}
          {unit && <span className="unit">{unit}</span>}
        </div>
        {trend && <Sparkline data={trend} color={color} />}
        {children}
      </div>
      {delta && (
        <div className={'delta ' + dir} style={hideVs ? { whiteSpace: 'normal', overflow: 'visible' } : undefined}>
          {delta}
          {!hideVs && <span className="vs">vs prev period</span>}
        </div>
      )}
    </div>
  )
}
