'use client'

import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  seedPlaceholder?: string
  maxLength?: number
  minRows?: number
}

/**
 * Autosize textarea for the composer brief. Uses JetBrains Mono per spec.
 * Height adjusts to content (clamped between minRows and 14 rows).
 */
export function BriefEditor({
  value,
  onChange,
  seedPlaceholder = 'Describe the post you want… or pick signals on the left to auto-seed this.',
  maxLength = 1200,
  minRows = 4,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    const lineH = 18
    const min = minRows * lineH + 16
    const max = 14 * lineH + 16
    el.style.height = Math.max(min, Math.min(max, el.scrollHeight)) + 'px'
  }, [value, minRows])

  const remaining = maxLength - value.length
  const warn = remaining < 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxLength))}
        placeholder={seedPlaceholder}
        rows={minRows}
        className="fld"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          lineHeight: 1.5,
          padding: '10px 12px',
          resize: 'none',
          width: '100%',
          minHeight: minRows * 18 + 16,
        }}
      />
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: warn ? 'var(--warn, #f59e0b)' : 'var(--fg-4)',
          textAlign: 'right',
        }}
      >
        {remaining} chars left
      </div>
    </div>
  )
}
