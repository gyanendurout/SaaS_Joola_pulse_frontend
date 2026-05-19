'use client'

import { Tip } from '@/components/ui/Tip'
import { TONE_OPTIONS, type Tone } from '@/lib/content/types'

interface Props {
  value: Tone
  onChange: (v: Tone) => void
}

export function ToneSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {TONE_OPTIONS.map(opt => {
        const on = opt.value === value
        return (
          <span key={opt.value} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              className={'chip' + (on ? ' on' : '')}
              onClick={() => onChange(opt.value)}
              style={{ cursor: 'pointer' }}
            >
              {opt.label}
            </button>
            <Tip text={opt.description} size={11} />
          </span>
        )
      })}
    </div>
  )
}
