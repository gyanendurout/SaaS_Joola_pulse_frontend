'use client'

import { ExtLink } from '@/components/ui/SortableTh'

export interface ContentDraft {
  id: string
  title: string | null
  content_type: 'blog' | 'ig_post' | 'twitter_response' | string
  status: 'draft' | 'approved' | 'published' | 'archived' | string
  metadata?: Record<string, unknown> | null
  source_article_id?: string | null
  source_signal_snapshot?: Record<string, unknown> | null
  updated_at: string
  created_at: string
}

const FORMAT_LABEL: Record<string, string> = {
  blog: 'Blog',
  ig_post: 'Instagram',
  twitter_response: 'Twitter',
}

const FORMAT_PILL: Record<string, string> = {
  blog: 'pill pill-info',
  ig_post: 'pill pill-yellow',
  twitter_response: 'pill pill-cyan',
}

const STATUS_PILL: Record<string, string> = {
  draft: 'pill pill-ghost',
  approved: 'pill pill-green',
  published: 'pill pill-green',
  archived: 'pill pill-ghost',
}

function relTime(iso: string): string {
  try {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return '—'
    const diffMs = Date.now() - t
    const min = Math.floor(diffMs / 60_000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const d = Math.floor(hr / 24)
    if (d < 30) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function sourceLabel(d: ContentDraft): string {
  if (d.source_article_id) return 'News'
  const snap = d.source_signal_snapshot as Record<string, unknown> | null | undefined
  if (snap && typeof snap === 'object') {
    if ('reddit' in snap && Array.isArray((snap as { reddit?: unknown[] }).reddit) && ((snap as { reddit: unknown[] }).reddit.length > 0)) return 'Reddit'
    if ('seo_keywords' in snap && Array.isArray((snap as { seo_keywords?: unknown[] }).seo_keywords) && ((snap as { seo_keywords: unknown[] }).seo_keywords.length > 0)) return 'SEO'
    if ('top_posts' in snap && Array.isArray((snap as { top_posts?: unknown[] }).top_posts) && ((snap as { top_posts: unknown[] }).top_posts.length > 0)) return 'IG Posts'
  }
  return 'Free prompt'
}

interface Props {
  draft: ContentDraft
}

export function DraftCard({ draft }: Props) {
  const format = FORMAT_LABEL[draft.content_type] ?? draft.content_type
  const formatCls = FORMAT_PILL[draft.content_type] ?? 'pill pill-ghost'
  const statusCls = STATUS_PILL[draft.status] ?? 'pill pill-ghost'
  const metadata = (draft.metadata ?? {}) as Record<string, unknown>
  const tone = typeof metadata.tone === 'string' ? metadata.tone : '—'
  const title = draft.title || (draft.content_type === 'twitter_response' ? 'Untitled reply' : 'Untitled draft')
  const editHref = `/content-generation/text/${draft.id}`

  return (
    <tr>
      <td>
        <a href={editHref} className="tlink" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
          {title}
        </a>
      </td>
      <td>
        <span className={formatCls}>{format}</span>
      </td>
      <td>{sourceLabel(draft)}</td>
      <td style={{ textTransform: 'capitalize' }}>{tone}</td>
      <td>{relTime(draft.updated_at)}</td>
      <td>
        <span className={statusCls}>{String(draft.status)}</span>
      </td>
      <td style={{ width: 40, textAlign: 'right' }}>
        <ExtLink href={editHref} label="Open draft" />
      </td>
    </tr>
  )
}
