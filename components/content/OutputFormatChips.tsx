'use client'

import { FORMAT_OPTIONS, type ContentType } from '@/lib/content/types'

interface Props {
  value: ContentType
  onChange: (v: ContentType) => void
}

export function OutputFormatChips({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {FORMAT_OPTIONS.map(opt => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            className={'chip' + (on ? ' on' : '')}
            onClick={() => onChange(opt.value)}
            title={opt.description}
            style={{ cursor: 'pointer' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
