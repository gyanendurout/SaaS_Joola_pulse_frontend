'use client'

import { useMemo, useState } from 'react'
import { SignalRow } from './SignalRow'
import type {
  SelectedSignals,
  SignalSource,
  SignalsPreview,
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

const TABS: { value: SignalSource; label: string }[] = [
  { value: 'seo', label: 'SEO' },
  { value: 'top_posts', label: 'Top Posts' },
  { value: 'news', label: 'News' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'free_prompt', label: 'Free Prompt' },
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

  const filteredSeo = useMemo(() => {
    if (!q) return preview.seo_keywords
    return preview.seo_keywords.filter(r => r.keyword.toLowerCase().includes(q))
  }, [preview.seo_keywords, q])

  const filteredTopPosts = useMemo(() => {
    if (!q) return preview.top_posts
    return preview.top_posts.filter(r =>
      (r.caption_first_line ?? '').toLowerCase().includes(q) ||
      (r.content_theme ?? '').toLowerCase().includes(q),
    )
  }, [preview.top_posts, q])

  const filteredNews = useMemo(() => {
    if (!q) return preview.news
    return preview.news.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.ai_summary ?? '').toLowerCase().includes(q),
    )
  }, [preview.news, q])

  const filteredReddit = useMemo(() => {
    if (!q) return preview.reddit
    return preview.reddit.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.subreddit.toLowerCase().includes(q),
    )
  }, [preview.reddit, q])

  const counts: Record<SignalSource, number> = {
    seo: selected.seo.size,
    top_posts: selected.top_posts.size,
    news: selected.news.size,
    reddit: selected.reddit.size,
    free_prompt: freePrompt.trim().length > 0 ? 1 : 0,
  }

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

      {/* Search (not used on free_prompt tab) */}
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
            ? <div className="empty">No top posts match.</div>
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

        {activeTab === 'reddit' && (
          filteredReddit.length === 0
            ? <div className="empty">No Reddit mentions match.</div>
            : filteredReddit.map(r => (
                <SignalRow
                  key={r.id}
                  variant={{ kind: 'reddit', row: r }}
                  selected={selected.reddit.has(r.id)}
                  onToggle={() => onToggle('reddit', r.id)}
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
