'use client'

import { useState, useMemo, useEffect } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import type { RedditMention } from './page'

const BANNER_DISMISS_KEY = 'joola.reddit.banner-dismissed'

interface Props {
  mentions: RedditMention[]
  totalUpvotes: number
  crisisCount: number
  oppCount: number
  switchCount: number
  subredditBreakdown: { name: string; count: number }[]
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = s.slice(0, 10).split('-')
  if (d.length < 3) return s.slice(0, 10)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(d[1], 10) - 1]} ${parseInt(d[2], 10)}`
}

function sentimentBadge(s: string | null) {
  if (!s) return <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
  const label = formatEnum(s)
  const low = s.toLowerCase()
  if (low.includes('positive')) return <span className="pill-joola" style={{ fontSize: 10 }}>{label}</span>
  if (low.includes('negative')) return <span className="pill-danger" style={{ fontSize: 10 }}>{label}</span>
  return <span className="pill-info" style={{ fontSize: 10 }}>{label}</span>
}

type FlagFilter = 'all' | 'crisis' | 'opportunity'
type SortKey = 'flag' | 'title' | 'subreddit' | 'author' | 'upvotes' | 'sentiment' | 'date'

export default function RedditClient({ mentions, totalUpvotes, crisisCount, oppCount, switchCount, subredditBreakdown }: Props) {
  const [subredditFilter, setSubredditFilter] = useState<string>('all')
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('upvotes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(BANNER_DISMISS_KEY) === '1') {
        setBannerDismissed(true)
      }
    } catch {}
  }, [])

  const dismissBanner = () => {
    setBannerDismissed(true)
    try { window.localStorage.setItem(BANNER_DISMISS_KEY, '1') } catch {}
  }

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sentimentDone = mentions.some(m => m.sentiment !== null)
  const topicsDone = mentions.some(m => m.topics && m.topics.length > 0)
  const fullyEnriched = sentimentDone && topicsDone

  const filtered = useMemo(() => {
    let list = mentions
    if (subredditFilter !== 'all') list = list.filter(m => m.subreddit === subredditFilter)
    if (flagFilter === 'crisis') list = list.filter(m => m.is_crisis)
    if (flagFilter === 'opportunity') list = list.filter(m => m.is_opportunity)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.post_title?.toLowerCase().includes(q) ||
        m.content_text?.toLowerCase().includes(q) ||
        m.author?.toLowerCase().includes(q) ||
        (m.topics ?? []).some(t => t.toLowerCase().includes(q))
      )
    }
    const dirMul = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'flag': {
          const fa = (a.is_crisis ? 2 : 0) + (a.is_opportunity ? 1 : 0)
          const fb = (b.is_crisis ? 2 : 0) + (b.is_opportunity ? 1 : 0)
          return (fa - fb) * dirMul
        }
        case 'title': return ((a.post_title ?? '').localeCompare(b.post_title ?? '')) * dirMul
        case 'subreddit': return (a.subreddit ?? '').localeCompare(b.subreddit ?? '') * dirMul
        case 'author': return (a.author ?? '').localeCompare(b.author ?? '') * dirMul
        case 'upvotes': return ((a.upvotes ?? 0) - (b.upvotes ?? 0)) * dirMul
        case 'sentiment': return ((a.sentiment ?? '').localeCompare(b.sentiment ?? '')) * dirMul
        case 'date': return ((a.posted_at ?? a.scraped_at ?? '').localeCompare(b.posted_at ?? b.scraped_at ?? '')) * dirMul
      }
    })
  }, [mentions, subredditFilter, flagFilter, search, sortKey, sortDir])

  const maxCount = subredditBreakdown[0]?.count ?? 1

  const topicCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of mentions) {
      for (const t of (m.topics ?? [])) c[t] = (c[t] ?? 0) + 1
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [mentions])

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            Reddit Intel
            <Tip text="Posts on Reddit that mention JOOLA. Reddit is where serious buyers research paddle brands, so this is the highest-signal channel for purchase intent." />
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
            {subredditBreakdown.length} subreddits · {mentions.length} mentions tracked
          </div>
        </div>
        <div className="live-pulse-dot" />
      </div>

      {crisisCount > 0 && (
        <div style={{
          background: 'color-mix(in srgb, #f87171 12%, transparent)',
          border: '1px solid color-mix(in srgb, #f87171 40%, transparent)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#f87171', fontWeight: 800, fontSize: 14 }}>🚨 {crisisCount} CRISIS SIGNALS</span>
          <span style={{ color: 'var(--fg-2)' }}>
            AI flagged {crisisCount} Reddit mention{crisisCount === 1 ? '' : 's'} containing crisis-level content (defects, complaints, warranty issues).
          </span>
          <button
            className="btn btn-yellow"
            style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 12px' }}
            onClick={() => setFlagFilter(flagFilter === 'crisis' ? 'all' : 'crisis')}
          >
            {flagFilter === 'crisis' ? 'Show all' : 'View crisis posts →'}
          </button>
        </div>
      )}

      {!fullyEnriched && !bannerDismissed && (
        <div style={{
          background: 'color-mix(in srgb, var(--yellow) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>⚡ AI enrichment partial</span>
          <span style={{ color: 'var(--fg-3)' }}>
            Topics, crisis &amp; opportunity flags are populated. Sentiment scoring is still in progress.
          </span>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss banner"
            title="Dismiss banner"
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: 'var(--fg-3)', cursor: 'pointer', padding: '2px 8px',
              fontSize: 16, lineHeight: 1, fontWeight: 600,
            }}
          >×</button>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Mentions
            <Tip text="Reddit posts that mention JOOLA across all tracked subreddits. Each row in the table below is one mention." />
          </div>
          <div className="value">{mentions.length}</div>
          <div className="delta up">JOOLA on Reddit</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Subreddits
            <Tip text="Unique Reddit communities (e.g. r/Pickleball, r/PickleballEquip) where JOOLA is being discussed. Each is a separate audience." />
          </div>
          <div className="value">{subredditBreakdown.length}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>communities</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Upvotes
            <Tip text="Combined upvotes across all JOOLA mentions. Upvotes are Reddit's approval signal — high-upvote posts had real community resonance." />
          </div>
          <div className="value">{totalUpvotes.toLocaleString()}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>across all posts</div>
        </div>
        <div className={'kpi' + (crisisCount > 0 ? ' danger' : '')}>
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            🚨 Crisis
            <Tip text="AI-flagged posts containing complaints about JOOLA — defects, broken paddles, warranty disputes, or other content that could damage the brand. Customer service should review these." />
          </div>
          <div className="value">{crisisCount}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
        </div>
        <div className={'kpi' + (oppCount > 0 ? ' joola' : '')}>
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            💡 Opportunity
            <Tip text="AI-flagged posts showing buying intent ('which paddle should I get?'), praise, or content worth marketing to. Sales & marketing should review these." />
          </div>
          <div className="value">{oppCount}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>buy intent / praise</div>
        </div>
      </div>

      <div className="card-grid cg-2" style={{ marginBottom: 24 }}>
        <div className="card card-pad-lg">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18, display: 'flex', alignItems: 'center' }}>
            Subreddit Breakdown
            <Tip text="How JOOLA mentions are distributed across Reddit communities. Click any bar to filter the mentions table below to just that subreddit." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subredditBreakdown.map(({ name, count }) => {
              const pct = Math.round((count / maxCount) * 100)
              const isActive = subredditFilter === name
              return (
                <div
                  key={name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSubredditFilter(isActive ? 'all' : name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: isActive ? 'var(--yellow)' : 'var(--fg-2)', fontWeight: isActive ? 700 : 400 }}>
                      {name}
                    </span>
                    <span style={{ color: 'var(--fg-3)', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `max(${pct}%, 4px)`,
                      background: isActive ? 'var(--yellow)' : 'var(--joola)',
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
          {subredditFilter !== 'all' && (
            <button className="btn" style={{ marginTop: 16, width: '100%', fontSize: 12 }}
              onClick={() => setSubredditFilter('all')}>
              Clear filter
            </button>
          )}
        </div>

        <div className="card card-pad-lg">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              Top Topics (AI-extracted)
              <Tip text="Themes the AI pulled out of the Reddit posts (e.g. 'paddle review', 'tournament', 'beginner'). Click a topic chip to search for it in the mentions table." />
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 400 }}>
              {mentions.filter(m => m.topics?.length).length}/{mentions.length} enriched
            </span>
          </div>
          {topicCounts.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>No topics extracted yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topicCounts.map(([topic, count]) => (
                <span
                  key={topic}
                  className="chip"
                  style={{
                    fontSize: 11,
                    cursor: 'pointer',
                    background: search === topic ? 'var(--yellow)' : undefined,
                    color: search === topic ? '#000' : undefined,
                  }}
                  onClick={() => setSearch(search === topic ? '' : topic)}
                >
                  {topic} <strong style={{ marginLeft: 4, opacity: 0.7 }}>{count}</strong>
                </span>
              ))}
            </div>
          )}
          <div className="divider" style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-4)' }}>
            <span>Competitor switches</span>
            <span style={{ color: switchCount > 0 ? 'var(--yellow)' : 'var(--fg-3)', fontWeight: 600 }}>
              {switchCount} detected
            </span>
          </div>
        </div>
      </div>

      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Mentions
            {subredditFilter !== 'all' && ` — ${subredditFilter}`}
            {flagFilter === 'crisis' && ' — 🚨 Crisis only'}
            {flagFilter === 'opportunity' && ' — 💡 Opportunity only'}
            {' '}({filtered.length})
            <Tip text="Individual Reddit posts that mention JOOLA. Click any column header to sort. Click the ↗ icon to open the post on Reddit. Crisis-flagged rows are tinted red and bubble to the top." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button className={'chip' + (flagFilter === 'all' ? ' on' : '')} onClick={() => setFlagFilter('all')} style={{ fontSize: 11 }}>All</button>
            <button className={'chip' + (flagFilter === 'crisis' ? ' on' : '')} onClick={() => setFlagFilter('crisis')} style={{ fontSize: 11 }}>🚨 Crisis ({crisisCount})</button>
            <button className={'chip' + (flagFilter === 'opportunity' ? ' on' : '')} onClick={() => setFlagFilter('opportunity')} style={{ fontSize: 11 }}>💡 Opp ({oppCount})</button>
            <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center', marginLeft: 4 }}>
              Click any column to sort
            </span>
          </div>
        </div>
        <input
          className="fld"
          placeholder="Search titles, text, authors, topics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {filtered.length === 0 ? (
          <div className="empty">No mentions match your filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableTh active={sortKey === 'flag'} direction={sortDir} onClick={() => setSort('flag')} style={{ width: 48 }} title="Crisis & opportunity flags from the AI">Flag</SortableTh>
                  <SortableTh active={sortKey === 'title'} direction={sortDir} onClick={() => setSort('title')} title="Reddit post title. Topic chips are listed underneath each title.">Title</SortableTh>
                  <SortableTh active={sortKey === 'subreddit'} direction={sortDir} onClick={() => setSort('subreddit')} title="Subreddit the post was made in">Subreddit</SortableTh>
                  <SortableTh active={sortKey === 'author'} direction={sortDir} onClick={() => setSort('author')} title="Reddit username of the post author">Author</SortableTh>
                  <SortableTh active={sortKey === 'upvotes'} direction={sortDir} onClick={() => setSort('upvotes')} num title="Total upvotes on the post — Reddit's community approval signal">Upvotes</SortableTh>
                  <SortableTh active={sortKey === 'sentiment'} direction={sortDir} onClick={() => setSort('sentiment')} title="AI-classified sentiment of the post">Sentiment</SortableTh>
                  <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the post was made on Reddit">Posted</SortableTh>
                  <th style={{ width: 40 }} aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={m.is_crisis ? { background: 'color-mix(in srgb, #f87171 5%, transparent)' } : undefined}>
                    <td>
                      {m.is_crisis && <span style={{ fontSize: 14 }} title="Crisis signal">🚨</span>}
                      {m.is_opportunity && <span style={{ fontSize: 14, marginLeft: m.is_crisis ? 2 : 0 }} title="Opportunity">💡</span>}
                      {!m.is_crisis && !m.is_opportunity && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>}
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      {m.post_url ? (
                        <a href={m.post_url} target="_blank" rel="noreferrer" className="tlink"
                          style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.post_title}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13 }}>{m.post_title}</span>
                      )}
                      {m.topics && m.topics.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {m.topics.slice(0, 4).map(t => (
                            <span key={t} style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 3,
                              background: 'var(--bg-3)', color: 'var(--fg-3)',
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className={'chip' + (subredditFilter === m.subreddit ? ' on' : '')}
                        style={{ fontSize: 10 }}
                        onClick={() => setSubredditFilter(subredditFilter === m.subreddit ? 'all' : m.subreddit)}
                      >
                        {m.subreddit}
                      </button>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                      {m.author ? `u/${m.author}` : '—'}
                    </td>
                    <td className="cell-num" style={{ fontWeight: 600 }}>
                      {m.upvotes != null ? m.upvotes.toLocaleString() : '—'}
                    </td>
                    <td>{sentimentBadge(m.sentiment)}</td>
                    <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>
                      {fmtDate(m.posted_at || m.scraped_at)}
                    </td>
                    <td><ExtLink href={m.post_url} label="Open on Reddit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
