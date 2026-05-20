'use client'

import { useMemo, useState } from 'react'
import { SignalRow } from './SignalRow'
import type {
  SelectedSignals,
  SignalSource,
  SignalsPreview,
  TopPostPlatform,
} from '@/lib/content/types'

interface Props {
  preview: SignalsPreview
  selected: SelectedSignals
  activeTab: SignalSource
  onTabChange: (t: SignalSource) => void
  onToggle: (source: SignalSource, id: string) => void
  freePrompt: string
  onFreePromptChange: (v: string) => void
}

// 4 tabs — Reddit dropped. Order: most-common-entry first.
const TABS: { value: SignalSource; label: string }[] = [
  { value: 'free_prompt', label: 'Free Prompt' },
  { value: 'news', label: 'News' },
  { value: 'top_posts', label: 'Top Posts' },
  { value: 'seo', label: 'SEO' },
]

const PLATFORMS: { value: TopPostPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'youtube', label: 'YouTube' },
]

type TopPostSortKey = 'engagement' | 'likes' | 'views' | 'comments' | 'recent'
const SORT_OPTIONS: { value: TopPostSortKey; label: string }[] = [
  { value: 'engagement', label: 'Engagement' },
  { value: 'likes', label: 'Likes' },
  { value: 'views', label: 'Views' },
  { value: 'comments', label: 'Comments' },
  { value: 'recent', label: 'Most recent' },
]

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative'
const SENT_FILTERS: { value: SentimentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

export function SignalPickerTabs({
  preview,
  selected,
  activeTab,
  onTabChange,
  onToggle,
  freePrompt,
  onFreePromptChange,
}: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  // News-specific filters
  const [newsSent, setNewsSent] = useState<SentimentFilter>('all')
  const [newsJoolaOnly, setNewsJoolaOnly] = useState(false)

  // Top Posts platform filter
  const [platform, setPlatform] = useState<TopPostPlatform>('instagram')
  const [sortKey, setSortKey] = useState<TopPostSortKey>('engagement')

  const filteredSeo = useMemo(() => {
    if (!q) return preview.seo_keywords
    return preview.seo_keywords.filter(r => r.keyword.toLowerCase().includes(q))
  }, [preview.seo_keywords, q])

  const filteredTopPosts = useMemo(() => {
    let rows = preview.top_posts.filter(r => r.platform === platform)
    if (q) {
      rows = rows.filter(r =>
        (r.caption_first_line ?? '').toLowerCase().includes(q) ||
        (r.content_theme ?? '').toLowerCase().includes(q),
      )
    }
    const sortFn: Record<TopPostSortKey, (a: typeof rows[number], b: typeof rows[number]) => number> = {
      engagement: (a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0),
      likes:      (a, b) => (b.likes ?? 0) - (a.likes ?? 0),
      views:      (a, b) => (b.views ?? 0) - (a.views ?? 0),
      comments:   (a, b) => (b.comments ?? 0) - (a.comments ?? 0),
      recent:     (a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''),
    }
    return [...rows].sort(sortFn[sortKey])
  }, [preview.top_posts, platform, sortKey, q])

  const filteredNews = useMemo(() => {
    let rows = preview.news
    if (newsSent !== 'all') {
      rows = rows.filter(r => {
        const s = (r.sentiment ?? '').toLowerCase()
        if (newsSent === 'positive') return s.includes('positive')
        if (newsSent === 'negative') return s.includes('negative')
        return s === 'neutral' || s === ''
      })
    }
    if (newsJoolaOnly) {
      rows = rows.filter(r => r.is_joola_mention)
    }
    if (q) {
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.ai_summary ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [preview.news, newsSent, newsJoolaOnly, q])

  const counts: Record<SignalSource, number> = {
    seo: selected.seo.size,
    top_posts: selected.top_posts.size,
    news: selected.news.size,
    reddit: 0,
    free_prompt: freePrompt.trim().length > 0 ? 1 : 0,
  }

  // Per-platform availability tally so the dropdown can show counts
  const platformCounts = useMemo(() => {
    const c: Record<TopPostPlatform, number> = { instagram: 0, tiktok: 0, twitter: 0, youtube: 0 }
    for (const r of preview.top_posts) c[r.platform]++
    return c
  }, [preview.top_posts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
      {/* Tabs */}
      <div className="tabs" role="tablist" style={{ flexWrap: 'wrap', gap: 4 }}>
        {TABS.map(t => {
          const on = activeTab === t.value
          const c = counts[t.value]
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={on}
              className={'tab' + (on ? ' on' : '')}
              onClick={() => onTabChange(t.value)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11 }}
            >
              {t.label}
              {c > 0 && (
                <span className="pill" style={{ background: 'rgba(245,230,37,0.18)', color: 'var(--yellow)', fontSize: 9.5, padding: '0 5px' }}>
                  {c}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Top Posts platform + sort row */}
      {activeTab === 'top_posts' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="fld"
            value={platform}
            onChange={e => setPlatform(e.target.value as TopPostPlatform)}
            style={{ fontSize: 11, padding: '3px 6px', minWidth: 120 }}
            aria-label="Platform"
          >
            {PLATFORMS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label} ({platformCounts[p.value]})
              </option>
            ))}
          </select>
          <select
            className="fld"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as TopPostSortKey)}
            style={{ fontSize: 11, padding: '3px 6px' }}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* News filter row */}
      {activeTab === 'news' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {SENT_FILTERS.map(s => (
            <button
              key={s.value}
              className={'chip ' + (newsSent === s.value ? 'on' : '')}
              onClick={() => setNewsSent(s.value)}
              style={{ fontSize: 10, padding: '2px 6px' }}
            >
              {s.label}
            </button>
          ))}
          <button
            className={'chip ' + (newsJoolaOnly ? 'on' : '')}
            onClick={() => setNewsJoolaOnly(v => !v)}
            style={{ fontSize: 10, padding: '2px 6px', marginLeft: 4 }}
          >
            JOOLA only
          </button>
        </div>
      )}

      {/* Search (not on free_prompt) */}
      {activeTab !== 'free_prompt' && (
        <input
          className="fld"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          style={{ fontSize: 12 }}
        />
      )}

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
        {activeTab === 'seo' && (
          filteredSeo.length === 0
            ? <div className="empty">No SEO keywords match.</div>
            : filteredSeo.map(r => (
                <SignalRow
                  key={r.keyword}
                  variant={{ kind: 'seo', row: r }}
                  selected={selected.seo.has(r.keyword)}
                  onToggle={() => onToggle('seo', r.keyword)}
                />
              ))
        )}

        {activeTab === 'top_posts' && (
          filteredTopPosts.length === 0
            ? <div className="empty">No {PLATFORMS.find(p => p.value === platform)?.label} posts found.</div>
            : filteredTopPosts.map(r => (
                <SignalRow
                  key={r.post_id}
                  variant={{ kind: 'top_post', row: r }}
                  selected={selected.top_posts.has(r.post_id)}
                  onToggle={() => onToggle('top_posts', r.post_id)}
                />
              ))
        )}

        {activeTab === 'news' && (
          filteredNews.length === 0
            ? <div className="empty">No news articles match.</div>
            : filteredNews.map(r => (
                <SignalRow
                  key={r.id}
                  variant={{ kind: 'news', row: r }}
                  selected={selected.news.has(r.id)}
                  onToggle={() => onToggle('news', r.id)}
                />
              ))
        )}

        {activeTab === 'free_prompt' && (
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Free prompt — extra context for this run
            </div>
            <textarea
              className="fld"
              value={freePrompt}
              onChange={e => onFreePromptChange(e.target.value)}
              placeholder="e.g. We're launching a new Perseus 18mm tomorrow. Mention the swing weight."
              rows={8}
              style={{
                width: '100%',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                lineHeight: 1.5,
                padding: '10px 12px',
                resize: 'vertical',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
