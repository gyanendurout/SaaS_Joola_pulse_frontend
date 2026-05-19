'use client'

import Link from 'next/link'
import { Tip } from '@/components/ui/Tip'

// =============================================================================
// NewsArticleGenerateCTA
//
// A small "Draft post" / "Draft response" CTA used by:
//   - /seo-news article cards   → opens Content Studio with the news article
//   - /reddit mentions table    → opens Content Studio with the Reddit thread
//
// The component is intentionally generic via `source` + `id`:
//   - News     → label "✎ Draft post"      · secondary `.btn`
//   - Reddit   → label "✎ Draft response"  · secondary `.btn` (callers may pass
//                emphasis to highlight crisis-flagged rows)
//
// All clicks navigate to:
//   /content-generation/text?source=<source>&id=<id>
// which the Text composer (`TextComposerClient`) already pre-loads via the
// `source` / `id` query params.
// =============================================================================

interface Props {
  source: 'news' | 'reddit'
  id: string
  /**
   * When true, render a tighter icon + word "Draft" version suitable for
   * cramped action cells. Defaults to the full label.
   */
  compact?: boolean
  /**
   * When true, render with `.btn-yellow` rather than `.btn` to emphasise the
   * action (used for crisis-flagged Reddit rows).
   */
  emphasised?: boolean
  /**
   * Optional override for the visible label. Defaults to the source-aware
   * label ("Draft post" for news, "Draft response" for reddit).
   */
  label?: string
}

export function NewsArticleGenerateCTA({
  source,
  id,
  compact = false,
  emphasised = false,
  label,
}: Props) {
  const href = `/content-generation/text?source=${source}&id=${encodeURIComponent(id)}`
  const fullLabel =
    label ?? (source === 'reddit' ? '✎ Draft response' : '✎ Draft post')
  const displayLabel = compact ? '✎ Draft' : fullLabel
  const tipText =
    source === 'reddit'
      ? 'Open in Content Studio with this Reddit thread pre-loaded'
      : 'Open in Content Studio with this article pre-loaded'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      onClick={e => e.stopPropagation()}
    >
      <Link
        href={href}
        className={emphasised ? 'btn btn-yellow' : 'btn'}
        style={{
          fontSize: compact ? 10 : 11,
          padding: compact ? '3px 8px' : '4px 10px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 1.2,
        }}
        aria-label={fullLabel}
      >
        {displayLabel}
      </Link>
      <Tip text={tipText} placement="top" />
    </span>
  )
}
