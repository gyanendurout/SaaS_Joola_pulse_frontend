'use client'

import { sentimentColor } from '@/lib/format'
import type {
  NewsSignal,
  RedditSignal,
  SeoSignal,
  TopPostSignal,
} from '@/lib/content/types'

type Variant =
  | { kind: 'seo'; row: SeoSignal }
  | { kind: 'top_post'; row: TopPostSignal }
  | { kind: 'news'; row: NewsSignal }
  | { kind: 'reddit'; row: RedditSignal }

interface Props {
  variant: Variant
  selected: boolean
  onToggle: () => void
}

function rowShell(
  children: React.ReactNode,
  selected: boolean,
  tint: string | null,
  onToggle: () => void,
) {
  const border = selected
    ? '1px solid var(--yellow)'
    : tint
      ? `1px solid ${tint}`
      : '1px solid var(--line)'
  const bg = selected
    ? 'color-mix(in srgb, var(--yellow) 10%, var(--surface-2))'
    : 'var(--surface-2)'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 10px',
        border,
        borderRadius: 6,
        background: bg,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          marginTop: 2,
          borderRadius: 3,
          border: '1.5px solid ' + (selected ? 'var(--yellow)' : 'var(--fg-4)'),
          background: selected ? 'var(--yellow)' : 'transparent',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {selected ? '✓' : ''}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function SignalRow({ variant, selected, onToggle }: Props) {
  if (variant.kind === 'seo') {
    const r = variant.row
    return rowShell(
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fg)', fontWeight: 600 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.keyword}</span>
          {r.is_gap && (
            <span className="pill" style={{ background: 'rgba(245,230,37,0.18)', color: 'var(--yellow)', fontSize: 9.5, padding: '1px 6px' }}>★ GAP</span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 3, display: 'flex', gap: 12 }}>
          <span>vol {r.search_volume ?? '—'}</span>
          <span>pos {r.position ?? '—'}</span>
          {r.difficulty != null && <span>KD {r.difficulty}</span>}
        </div>
      </>,
      selected,
      null,
      onToggle,
    )
  }

  if (variant.kind === 'top_post') {
    const r = variant.row
    const erPct = (r.engagement_rate * 100).toFixed(1)
    return rowShell(
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {r.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.thumbnail_url}
            alt=""
            width={44}
            height={44}
            style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--bg-3)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.caption_first_line || '(no caption)'}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 3, display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--joola)' }}>ER {erPct}%</span>
            {r.content_theme && <span>{r.content_theme}</span>}
            {r.post_type && <span>· {r.post_type}</span>}
          </div>
        </div>
      </div>,
      selected,
      null,
      onToggle,
    )
  }

  if (variant.kind === 'news') {
    const r = variant.row
    const sentColor = sentimentColor(r.sentiment)
    return rowShell(
      <>
        <div style={{ fontSize: 12.5, color: 'var(--fg)', fontWeight: 600, lineHeight: 1.35 }}>
          {r.title}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {r.sentiment && (
            <span style={{ color: sentColor, textTransform: 'capitalize' }}>● {r.sentiment}</span>
          )}
          {r.is_joola_mention && <span style={{ color: 'var(--yellow)' }}>JOOLA</span>}
          {r.importance_score != null && <span>imp {r.importance_score}</span>}
          {r.suggested_action && <span style={{ color: 'var(--fg-3)' }}>{r.suggested_action}</span>}
        </div>
      </>,
      selected,
      null,
      onToggle,
    )
  }

  // Reddit
  const r = variant.row
  const tint = r.is_crisis ? 'rgba(239,68,68,0.45)' : null
  return rowShell(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12.5, color: 'var(--fg)', fontWeight: 600, lineHeight: 1.35, flex: 1 }}>
          {r.title}
        </div>
        {r.is_crisis && (
          <span className="pill" style={{ background: 'rgba(239,68,68,0.18)', color: '#ff6464', fontSize: 9.5, padding: '1px 6px' }}>CRISIS</span>
        )}
        {!r.is_crisis && r.is_opportunity && (
          <span className="pill" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--joola)', fontSize: 9.5, padding: '1px 6px' }}>OPP</span>
        )}
      </div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span>r/{r.subreddit}</span>
        {r.topics && r.topics.length > 0 && <span>{r.topics.slice(0, 3).join(', ')}</span>}
      </div>
    </>,
    selected,
    tint,
    onToggle,
  )
}
