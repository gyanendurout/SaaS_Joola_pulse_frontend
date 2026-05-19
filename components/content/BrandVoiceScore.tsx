'use client'

import { Tip } from '@/components/ui/Tip'
import type { BrandVoiceMeta, RiskFlag } from '@/lib/content/types'

interface Props {
  meta: BrandVoiceMeta | null | undefined
}

function colorFor(score: number | null): string {
  if (score == null) return 'var(--fg-4)'
  if (score >= 80) return 'var(--joola)'
  if (score >= 55) return 'var(--yellow)'
  return '#f87171'
}

export function BrandVoiceScore({ meta }: Props) {
  const score = meta?.score ?? null
  const flags = meta?.flags ?? []
  const blockCount = flags.filter(f => f.severity === 'block').length
  const warnCount = flags.filter(f => f.severity === 'warn').length
  const c = colorFor(score)

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '10px 12px',
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: `color-mix(in srgb, ${c} 18%, var(--bg-3))`,
            color: c,
            fontWeight: 800,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {score ?? '—'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Brand voice
            <Tip text="Beta — directional only. Score combines the critic LLM rubric and pattern checks." size={11} />
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>
            {blockCount > 0 && <span style={{ color: '#f87171' }}>{blockCount} blocker{blockCount === 1 ? '' : 's'}</span>}
            {blockCount > 0 && warnCount > 0 && <span style={{ color: 'var(--fg-4)' }}> · </span>}
            {warnCount > 0 && <span style={{ color: 'var(--yellow)' }}>{warnCount} warning{warnCount === 1 ? '' : 's'}</span>}
            {blockCount === 0 && warnCount === 0 && <span>No flags</span>}
          </div>
        </div>
      </div>

      {flags.length > 0 && (
        <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {flags.map((f, i) => (
            <FlagRow key={i} flag={f} />
          ))}
        </ul>
      )}
    </div>
  )
}

function FlagRow({ flag }: { flag: RiskFlag }) {
  const isBlock = flag.severity === 'block'
  const c = isBlock ? '#f87171' : 'var(--yellow)'
  return (
    <li style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.4 }}>
      <span style={{ color: c, fontWeight: 700, marginRight: 4 }}>{isBlock ? '🛑' : '⚠'}</span>
      <span>{flag.message}</span>
      {flag.highlight_text && (
        <span className="mono" style={{ marginLeft: 6, color: 'var(--fg-4)' }}>“{flag.highlight_text}”</span>
      )}
    </li>
  )
}
