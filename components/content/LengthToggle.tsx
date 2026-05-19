'use client'

import { LENGTH_OPTIONS, type ContentType, type Length } from '@/lib/content/types'

interface Props {
  value: Length
  onChange: (v: Length) => void
  format: ContentType
}

export function LengthToggle({ value, onChange, format }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Length" style={{ width: 'fit-content' }}>
      {LENGTH_OPTIONS.map(opt => {
        const on = opt.value === value
        const sub =
          format === 'blog' ? opt.blog :
          format === 'twitter_response' ? opt.tweet :
          opt.ig
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={'tab' + (on ? ' on' : '')}
            onClick={() => onChange(opt.value)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '6px 14px' }}
          >
            <span style={{ fontWeight: 600, fontSize: 12 }}>{opt.label}</span>
            <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace' }}>{sub}</span>
          </button>
        )
      })}
    </div>
  )
}
