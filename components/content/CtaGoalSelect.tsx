'use client'

import { CTA_OPTIONS, type CtaGoal } from '@/lib/content/types'

interface Props {
  value: CtaGoal
  onChange: (v: CtaGoal) => void
}

export function CtaGoalSelect({ value, onChange }: Props) {
  return (
    <select
      className="fld"
      value={value}
      onChange={e => onChange(e.target.value as CtaGoal)}
      style={{ fontSize: 12, minWidth: 200 }}
      aria-label="CTA goal"
    >
      {CTA_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
