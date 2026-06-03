'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { usePagedRows } from '@/lib/usePagedRows'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { NewsArticleGenerateCTA } from '@/components/content/NewsArticleGenerateCTA'
import { formatEnum } from '@/lib/format'
import type { RedditMention, PaddleRedditStat } from './page'
import { Donut, DonutLegend } from '@/components/ui/Donut'
import type { DonutSlice } from '@/components/ui/Donut'

const BANNER_DISMISS_KEY = 'joola.reddit.banner-dismissed'

interface Props {
  mentions: RedditMention[]
  totalUpvotes: number
  crisisCount: number
  oppCount: number
  switchCount: number
  subredditBreakdown: { name: string; count: number }[]
  paddleStats: PaddleRedditStat[]
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
type PageTab = 'mentions' | 'analysis'
type AnalysisFilter = 'all' | 'positive' | 'neutral' | 'negative' | 'crisis' | 'opportunity'

const SENT_PILL: Record<string, string> = {
  positive: 'pill-green', neutral: 'pill-ghost', negative: 'pill-red',
}

function HBar({ data, colorOf, tipPrefix }: {
  data: Array<{ name: string; value: number }>
  colorOf?: (name: string) => string
  tipPrefix?: string
}) {
  const cap = Math.max(1, ...data.map(d => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map(d => {
        const pct = (d.value / cap) * 100
        const sharePct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'
        const c = colorOf ? colorOf(d.name) : 'var(--yellow)'
        const tip = `${tipPrefix ? tipPrefix + ' — ' : ''}${d.name}: ${d.value.toLocaleString()} (${sharePct}% of total)`
        return (
          <div key={d.name} title={tip} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', alignItems: 'center', gap: 8, padding: '2px 4px', borderRadius: 4, cursor: 'help' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `max(${pct}%, ${d.value > 0 ? 4 : 0}px)`, height: '100%', background: c, transition: 'width 200ms ease' }} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'right' }}>{d.value.toLocaleString()}</span>
          </div>
        )
      })}
      {data.length === 0 && <div className="empty" style={{ fontSize: 11, padding: '10px 0' }}>No topic data yet.</div>}
    </div>
  )
}

export default function RedditClient({ mentions, totalUpvotes, crisisCount, oppCount, switchCount, subredditBreakdown, paddleStats }: Props) {
  const [subredditFilter, setSubredditFilter] = useState<string>('all')
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('upvotes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [paddleFilter, setPaddleFilter] = useState<string>('all')
  const [pageTab, setPageTab] = useState<PageTab>('mentions')
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>('all')
  const [analysisSearch, setAnalysisSearch] = useState('')

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
    if (paddleFilter !== 'all') list = list.filter(m => m.products_mentioned?.includes(paddleFilter))
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
  }, [mentions, subredditFilter, flagFilter, paddleFilter, search, sortKey, sortDir])

  const maxCount = subredditBreakdown[0]?.count ?? 1

  const topicCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of mentions) {
      for (const t of (m.topics ?? [])) c[t] = (c[t] ?? 0) + 1
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [mentions])

  // Analysis tab computations (sentiment field on RedditMention is `sentiment`, not `sentiment_label`)
  const posCount = useMemo(() => mentions.filter(m => m.sentiment?.toLowerCase() === 'positive').length, [mentions])
  const negCount = useMemo(() => mentions.filter(m => m.sentiment?.toLowerCase() === 'negative').length, [mentions])
  const analysisCrisisCount = useMemo(() => mentions.filter(m => m.is_crisis === true).length, [mentions])
  const analysisOppCount = useMemo(() => mentions.filter(m => m.is_opportunity === true).length, [mentions])
  const neutralCount = mentions.length - posCount - negCount
  const positivePct = mentions.length > 0 ? (posCount / mentions.length) * 100 : 0
  const negativePct = mentions.length > 0 ? (negCount / mentions.length) * 100 : 0

  const sentimentSlices: DonutSlice[] = useMemo(() => [
    { name: 'Positive', pct: mentions.length > 0 ? (posCount / mentions.length) * 100 : 0, n: posCount, color: 'var(--joola)' },
    { name: 'Neutral',  pct: mentions.length > 0 ? ((mentions.length - posCount - negCount) / mentions.length) * 100 : 0, n: mentions.length - posCount - negCount, color: '#94a3b8' },
    { name: 'Negative', pct: mentions.length > 0 ? (negCount / mentions.length) * 100 : 0, n: negCount, color: 'var(--red)' },
  ], [mentions, posCount, negCount])

  const filteredAnalysis = useMemo(() => {
    let list = [...mentions]
    if (analysisFilter === 'positive') list = list.filter(m => m.sentiment?.toLowerCase() === 'positive')
    else if (analysisFilter === 'negative') list = list.filter(m => m.sentiment?.toLowerCase() === 'negative')
    else if (analysisFilter === 'neutral') list = list.filter(m => !['positive', 'negative'].includes(m.sentiment?.toLowerCase() ?? ''))
    else if (analysisFilter === 'crisis') list = list.filter(m => m.is_crisis === true)
    else if (analysisFilter === 'opportunity') list = list.filter(m => m.is_opportunity === true)
    if (analysisSearch.trim()) {
      const q = analysisSearch.toLowerCase()
      list = list.filter(m =>
        m.post_title?.toLowerCase().includes(q) ||
        m.content_text?.toLowerCase().includes(q) ||
        m.author?.toLowerCase().includes(q) ||
        (m.topics ?? []).some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [mentions, analysisFilter, analysisSearch])

  const { visibleRows, containerRef, sentinelRef, hasMore, total, shown } = usePagedRows(filtered)
  const { visibleRows: visibleAnalysis, containerRef: analysisContainerRef, sentinelRef: analysisSentinelRef, hasMore: analysisHasMore, total: analysisTotal, shown: analysisShown } = usePagedRows(filteredAnalysis)

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

      <div className="tabs" style={{ marginBottom: 24, alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button className={'tab' + (pageTab === 'mentions' ? ' on' : '')} onClick={() => setPageTab('mentions')}>
          Mentions ({mentions.length})
        </button>
        <button className={'tab' + (pageTab === 'analysis' ? ' on' : '')} onClick={() => setPageTab('analysis')}>
          Mention Analysis
        </button>
      </div>

      {pageTab === 'mentions' && (<>

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

      {paddleStats.length > 0 && (
        <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            Paddle Buzz on Reddit
            <Tip text="Which JOOLA paddles appear most in Reddit discussions. Click any paddle to filter the mentions table below to posts mentioning that paddle." />
            {paddleFilter !== 'all' && (
              <button
                className="btn"
                style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 10px' }}
                onClick={() => setPaddleFilter('all')}
              >
                Clear filter
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paddleStats.map((p, i) => {
              const barPct = Math.max((p.mentions / paddleStats[0].mentions) * 100, 4)
              const isActive = paddleFilter === p.name
              const positiveShare = p.mentions ? Math.round((p.positive / p.mentions) * 100) : 0
              return (
                <div
                  key={p.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onClick={() => setPaddleFilter(isActive ? 'all' : p.name)}
                >
                  <div style={{
                    width: 22, fontSize: 11, fontWeight: 700, flexShrink: 0, textAlign: 'right',
                    color: i === 0 ? 'var(--yellow)' : 'var(--fg-4)',
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{
                    width: 148, fontSize: 13, flexShrink: 0,
                    fontWeight: isActive ? 700 : i === 0 ? 600 : 400,
                    color: isActive ? 'var(--yellow)' : 'inherit',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `max(${barPct}%, 4px)`,
                      background: isActive ? 'var(--yellow)' : 'var(--joola)',
                      borderRadius: 3, transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: 'right', flexShrink: 0 }}>
                    {p.mentions}
                  </div>
                  {p.upvotes > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--fg-4)', width: 72, textAlign: 'right', flexShrink: 0 }}>
                      {p.upvotes} upvotes
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: positiveShare >= 50 ? 'var(--joola)' : 'var(--fg-4)', width: 54, textAlign: 'right', flexShrink: 0 }}>
                    {positiveShare}% pos
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{
            marginTop: 12, fontSize: 11, color: 'var(--fg-4)',
            borderTop: '1px solid var(--border)', paddingTop: 10,
          }}>
            Click any paddle to filter the mentions table · {mentions.filter(m => (m.products_mentioned?.length ?? 0) > 0).length} of {mentions.length} posts have paddle tags
          </div>
        </div>
      )}

      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Mentions
            {paddleFilter !== 'all' && ` — ${paddleFilter}`}
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
          <div ref={containerRef} className="table-wrap scroll">
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
                  <th style={{ width: 160 }} aria-label="Actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(m => (
                  <tr key={m.id} style={m.is_crisis ? { background: 'color-mix(in srgb, #f87171 5%, transparent)' } : undefined}>
                    <td>
                      {m.is_crisis && <span style={{ fontSize: 14 }} title="Crisis signal">🚨</span>}
                      {m.is_opportunity && <span style={{ fontSize: 14, marginLeft: m.is_crisis ? 2 : 0 }} title="Opportunity">💡</span>}
                      {!m.is_crisis && !m.is_opportunity && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>}
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      {(() => {
                        const rawTitle = (m.post_title ?? '').trim()
                        const rawBody = (m.content_text ?? '').trim()
                        let titleNode: React.ReactNode
                        let titleStyle: React.CSSProperties = {
                          fontSize: 13,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }
                        let titleAttr: string | undefined
                        if (rawTitle) {
                          titleNode = rawTitle
                        } else if (rawBody) {
                          const firstLine = rawBody.split(/\r?\n/).find(l => l.trim().length > 0) ?? rawBody
                          const snippet = firstLine.length > 80 ? firstLine.slice(0, 80).trimEnd() + ' …' : firstLine
                          titleNode = snippet
                          titleStyle = { ...titleStyle, fontStyle: 'italic' }
                          titleAttr = 'Original Reddit submission had no title — showing first line of the body.'
                        } else {
                          titleNode = '(no title)'
                          titleStyle = { ...titleStyle, fontStyle: 'italic', color: 'var(--fg-4)' }
                          titleAttr = 'Original Reddit submission had no title — open the post to see the body.'
                        }
                        return m.post_url ? (
                          <a href={m.post_url} target="_blank" rel="noreferrer" className="tlink"
                            style={titleStyle} title={titleAttr}>
                            {titleNode}
                          </a>
                        ) : (
                          <span style={titleStyle} title={titleAttr}>{titleNode}</span>
                        )
                      })()}
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
                      {m.author ? `u/${m.author}` : m.reddit_post_id}
                    </td>
                    <td className="cell-num" style={{ fontWeight: 600 }}>
                      {m.upvotes != null ? m.upvotes.toLocaleString() : '—'}
                    </td>
                    <td>{sentimentBadge(m.sentiment)}</td>
                    <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>
                      {fmtDate(m.posted_at || m.scraped_at)}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <NewsArticleGenerateCTA
                          source="reddit"
                          id={m.id}
                          compact
                          emphasised={Boolean(m.is_crisis)}
                          label={m.is_crisis ? '✎ Draft crisis response' : '✎ Draft response'}
                        />
                        <ExtLink href={m.post_url} label="Open on Reddit" />
                      </span>
                    </td>
                  </tr>
                ))}
                {hasMore && (
                  <tr ref={sentinelRef}>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-4)', fontSize: 11 }}>
                      {total - shown} more — scroll to load
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}

      {pageTab === 'analysis' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Total Mentions<Tip text="Total Reddit mentions of JOOLA tracked across all subreddits." />
              </div>
              <div className="value">{mentions.length}</div>
              <div className="delta up">JOOLA on Reddit</div>
            </div>
            <div className="kpi joola">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Positive Sentiment<Tip text="Percentage of mentions classified as positive by AI." />
              </div>
              <div className="value">{positivePct.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
              <div className="delta up">{posCount.toLocaleString()} mentions</div>
            </div>
            <div className="kpi danger">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Negative Sentiment<Tip text="Percentage of mentions classified as negative." />
              </div>
              <div className="value">{negativePct.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
              <div className="delta down">{negCount.toLocaleString()} mentions</div>
            </div>
            <div className={'kpi' + (analysisCrisisCount > 0 ? ' danger' : '')}>
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Crisis Signals<Tip text="Mentions flagged as crisis — complaints, defects, or brand-damaging content." />
              </div>
              <div className="value">{analysisCrisisCount}</div>
              <div className="delta" style={{ color: analysisCrisisCount > 0 ? 'var(--red)' : 'var(--fg-4)' }}>
                {analysisCrisisCount > 0 ? 'need attention' : 'none detected'}
              </div>
            </div>
            <div className={'kpi' + (analysisOppCount > 0 ? ' joola' : '')}>
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Opportunities<Tip text="Mentions flagged as opportunities — buying intent or praise worth amplifying." />
              </div>
              <div className="value">{analysisOppCount}</div>
              <div className="delta up">buy intent / praise</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="card card-pad-lg">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', borderBottom: '4px solid var(--joola)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--joola)', lineHeight: 1 }}>{positivePct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>POSITIVE</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {mentions.length.toLocaleString()} mentions</div>
                </div>
                <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', borderBottom: '4px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg-3)', lineHeight: 1 }}>{neutralCount.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEUTRAL</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {mentions.length.toLocaleString()} mentions</div>
                </div>
                <div style={{ padding: '20px 24px', borderBottom: '4px solid var(--red)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{negativePct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEGATIVE</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {mentions.length.toLocaleString()} mentions</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-grid cg-2-1">
            <div className="card card-pad-lg">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <h3>MENTION INTELLIGENCE<Tip text="Reddit mentions AI-classified by sentiment, topics, crisis signals, and opportunity flags." /></h3>
                <span className="meta">{filteredAnalysis.length.toLocaleString()} shown · all-time</span>
              </div>
              <div className="tabs" style={{ marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <button className={'tab ' + (analysisFilter === 'all' ? 'on' : '')} onClick={() => setAnalysisFilter('all')}>All ({mentions.length})</button>
                <button className={'tab ' + (analysisFilter === 'positive' ? 'on' : '')} onClick={() => setAnalysisFilter('positive')}>Positive ({posCount})</button>
                <button className={'tab ' + (analysisFilter === 'neutral' ? 'on' : '')} onClick={() => setAnalysisFilter('neutral')}>Neutral ({neutralCount})</button>
                <button className={'tab ' + (analysisFilter === 'negative' ? 'on' : '')} onClick={() => setAnalysisFilter('negative')}>Negative ({negCount})</button>
                <button className={'tab ' + (analysisFilter === 'crisis' ? 'on' : '')} onClick={() => setAnalysisFilter('crisis')}>Crisis ({analysisCrisisCount})</button>
                <button className={'tab ' + (analysisFilter === 'opportunity' ? 'on' : '')} onClick={() => setAnalysisFilter('opportunity')}>Opportunity ({analysisOppCount})</button>
              </div>
              <input className="fld" placeholder="Search titles, text, authors, topics…" value={analysisSearch} onChange={e => setAnalysisSearch(e.target.value)} style={{ width: '100%', marginBottom: 14, boxSizing: 'border-box' }} />
              {filteredAnalysis.length === 0 ? (
                <div className="empty">No mentions match your filters.</div>
              ) : (
                <div ref={analysisContainerRef} style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {visibleAnalysis.map((m, i) => {
                    const sent = (m.sentiment || 'neutral').toLowerCase()
                    const leftBorderColor = sent === 'positive' ? 'var(--joola)' : sent === 'negative' ? 'var(--red)' : 'rgba(255,255,255,0.08)'
                    const title = m.post_title?.trim() || m.content_text?.split(/\r?\n/).find(l => l.trim()) || '(no title)'
                    return (
                      <div key={m.id ?? i} className="comment-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: `4px solid ${leftBorderColor}`, paddingLeft: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--fg-2)' }}>
                          {m.author ? m.author.charAt(0).toUpperCase() : '#'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="comment-user">
                            <span className="uname">{m.author ? `u/${m.author}` : m.reddit_post_id}</span>
                            {m.posted_at && <span className="meta">{fmtDate(m.posted_at)}</span>}
                            <span className="chip" style={{ fontSize: 9 }}>{m.subreddit}</span>
                          </div>
                          <div className="comment-body">
                            <div className="quote" style={{ fontStyle: 'normal', fontWeight: 500 }}>
                              {m.post_url ? (
                                <a href={m.post_url} target="_blank" rel="noreferrer" className="tlink" style={{ fontSize: 13 }}>
                                  {title.slice(0, 80)}{title.length > 80 ? '…' : ''}
                                </a>
                              ) : (
                                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{title.slice(0, 80)}{title.length > 80 ? '…' : ''}</span>
                              )}
                            </div>
                            {m.upvotes != null && (
                              <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 3 }}>▲ {m.upvotes.toLocaleString()} upvotes</div>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={'pill ' + (SENT_PILL[sent] ?? 'pill-ghost')}>{sent}</span>
                              {m.is_crisis && <span className="pill pill-red">⚠ CRISIS</span>}
                              {m.is_opportunity && <span className="pill pill-green">● OPPORTUNITY</span>}
                              {(m.topics ?? []).slice(0, 4).map(t => <span key={t} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{t}</span>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {analysisHasMore && (
                    <div ref={analysisSentinelRef} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--fg-4)' }}>
                      {analysisTotal - analysisShown} more — scroll to load
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
                <div className="card-head">
                  <h3>SENTIMENT MIX<Tip text="Overall sentiment breakdown of Reddit mentions — how the community feels about JOOLA." /></h3>
                  <span className="meta">{mentions.length.toLocaleString()} mentions · all-time</span>
                </div>
                <div className="donut-wrap" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Donut data={sentimentSlices} size={140} thickness={22} />
                  <DonutLegend data={sentimentSlices} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 10, lineHeight: 1.5 }}>
                  {positivePct.toFixed(0)}% of mentions are positive —{' '}
                  {positivePct > 60 ? 'excellent community perception' : positivePct > 40 ? 'healthy — keep engaging' : 'needs attention'}
                </div>
              </div>
              <div className="card card-pad-lg">
                <div className="card-head">
                  <h3>TOP TOPICS<Tip text="Most discussed topics in Reddit mentions — focus more content around what buyers already care about." /></h3>
                  <span className="meta">by frequency · all-time</span>
                </div>
                <HBar data={topicCounts.map(([name, value]) => ({ name, value }))} colorOf={() => 'var(--yellow)'} tipPrefix="Topic in Reddit mentions" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
