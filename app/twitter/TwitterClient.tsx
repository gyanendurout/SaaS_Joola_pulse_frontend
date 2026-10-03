'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import { usePagedRows } from '@/lib/usePagedRows'
import type { XAccount, XPost, XReply } from './page'
import { Donut, DonutLegend } from '@/components/ui/Donut'
import type { DonutSlice } from '@/components/ui/Donut'

interface Props {
  account: XAccount | null
  posts: XPost[]
  replies: XReply[]
  totalLikes: number
  totalRT: number
  totalReplies: number
  totalImpressions: number
  enrichedCount: number
  crisisCount: number
  opportunityCount: number
}

function sentimentStyle(label: string | null): React.CSSProperties {
  if (!label) return { color: 'var(--fg-4)' }
  const l = label.toLowerCase()
  if (l.includes('positive')) return { color: 'var(--joola)' }
  if (l.includes('negative')) return { color: '#f87171' }
  return { color: 'var(--fg-3)' }
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = s.slice(0, 10).split('-')
  if (d.length < 3) return s.slice(0, 10)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(d[1], 10) - 1]} ${parseInt(d[2], 10)}, ${d[0]}`
}

type SortKey = 'text' | 'type' | 'impressions' | 'likes' | 'rt' | 'replies' | 'sentiment' | 'date'
type ReplySortKey = 'likes' | 'date' | 'replier' | 'post'
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

export default function TwitterClient({ account, posts, replies, totalLikes, totalRT, totalReplies, totalImpressions, enrichedCount, crisisCount, opportunityCount }: Props) {
  const [tab, setTab] = useState<'posts' | 'replies' | 'analysis'>('posts')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('impressions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterType, setFilterType] = useState<'all' | 'rt' | 'original'>('all')

  const [replySearch, setReplySearch] = useState('')
  const [replyPostId, setReplyPostId] = useState<string>('all')
  const [replySortKey, setReplySortKey] = useState<ReplySortKey>('likes')
  const [replySortDir, setReplySortDir] = useState<'asc' | 'desc'>('desc')

  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>('all')
  const [analysisSearch, setAnalysisSearch] = useState('')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const setReplySort = (key: ReplySortKey) => {
    if (replySortKey === key) setReplySortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setReplySortKey(key); setReplySortDir('desc') }
  }

  // reply tab
  const postById = useMemo(() => {
    const m: Record<string, XPost> = {}
    for (const p of posts) m[p.id] = p
    return m
  }, [posts])

  const postsWithReplies = useMemo(() => {
    const ids = new Set(replies.map(r => r.post_id))
    return posts.filter(p => ids.has(p.id))
  }, [posts, replies])

  const filteredReplies = useMemo(() => {
    let list = replies
    if (replyPostId !== 'all') list = list.filter(r => r.post_id === replyPostId)
    if (replySearch.trim()) {
      const q = replySearch.toLowerCase()
      list = list.filter(r =>
        r.reply_text?.toLowerCase().includes(q) ||
        r.replier_username?.toLowerCase().includes(q) ||
        postById[r.post_id]?.text?.toLowerCase().includes(q)
      )
    }
    const m = replySortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (replySortKey) {
        case 'likes': return ((a.reply_likes ?? 0) - (b.reply_likes ?? 0)) * m
        case 'date': return ((a.posted_at ?? a.scraped_at).localeCompare(b.posted_at ?? b.scraped_at)) * m
        case 'replier': return ((a.replier_username ?? '').localeCompare(b.replier_username ?? '')) * m
        case 'post': return ((postById[a.post_id]?.text ?? '').localeCompare(postById[b.post_id]?.text ?? '')) * m
      }
    })
  }, [replies, replyPostId, replySearch, replySortKey, replySortDir, postById])

  const uniqueRepliers = useMemo(() => new Set(replies.map(r => r.replier_username).filter(Boolean)).size, [replies])
  const topReply = replies[0] ?? null
  const avgReplyLikes = replies.length > 0
    ? (replies.reduce((s, r) => s + (r.reply_likes ?? 0), 0) / replies.length)
    : 0

  const posCount = useMemo(() => replies.filter(r => r.sentiment_label?.toLowerCase() === 'positive').length, [replies])
  const negCount = useMemo(() => replies.filter(r => r.sentiment_label?.toLowerCase() === 'negative').length, [replies])
  const analysisCrisisCount = useMemo(() => replies.filter(r => r.is_crisis === true).length, [replies])
  const analysisOpportunityCount = useMemo(() => replies.filter(r => r.is_opportunity === true).length, [replies])
  const neutralCount = replies.length - posCount - negCount
  const positivePct = replies.length > 0 ? (posCount / replies.length) * 100 : 0
  const negativePct = replies.length > 0 ? (negCount / replies.length) * 100 : 0

  const sentimentSlices: DonutSlice[] = useMemo(() => [
    { name: 'Positive', pct: replies.length > 0 ? (posCount / replies.length) * 100 : 0, n: posCount, color: 'var(--joola)' },
    { name: 'Neutral',  pct: replies.length > 0 ? ((replies.length - posCount - negCount) / replies.length) * 100 : 0, n: replies.length - posCount - negCount, color: '#94a3b8' },
    { name: 'Negative', pct: replies.length > 0 ? (negCount / replies.length) * 100 : 0, n: negCount, color: 'var(--red)' },
  ], [replies, posCount, negCount])

  const topicTally = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of replies) {
      for (const t of (r.topics ?? [])) { map[t] = (map[t] ?? 0) + 1 }
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [replies])

  const filteredAnalysis = useMemo(() => {
    let list = [...replies]
    if (analysisFilter === 'positive') list = list.filter(r => r.sentiment_label?.toLowerCase() === 'positive')
    else if (analysisFilter === 'negative') list = list.filter(r => r.sentiment_label?.toLowerCase() === 'negative')
    else if (analysisFilter === 'neutral') list = list.filter(r => !['positive', 'negative'].includes(r.sentiment_label?.toLowerCase() ?? ''))
    else if (analysisFilter === 'crisis') list = list.filter(r => r.is_crisis === true)
    else if (analysisFilter === 'opportunity') list = list.filter(r => r.is_opportunity === true)
    if (analysisSearch.trim()) {
      const q = analysisSearch.toLowerCase()
      list = list.filter(r => r.reply_text?.toLowerCase().includes(q) || r.replier_username?.toLowerCase().includes(q))
    }
    return list
  }, [replies, analysisFilter, analysisSearch])

  const aiPending = enrichedCount === 0
  const rtCount = posts.filter(p => p.text?.startsWith('RT @')).length
  const origCount = posts.length - rtCount
  const avgImpressions = posts.length ? Math.round(totalImpressions / posts.length) : 0

  const filtered = useMemo(() => {
    let list = posts
    if (filterType === 'rt') list = list.filter(p => p.text?.startsWith('RT @'))
    if (filterType === 'original') list = list.filter(p => !p.text?.startsWith('RT @'))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.text?.toLowerCase().includes(q))
    }
    const m = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'text': return ((a.text ?? '').localeCompare(b.text ?? '')) * m
        case 'type': {
          const ta = a.text?.startsWith('RT @') ? 1 : 0
          const tb = b.text?.startsWith('RT @') ? 1 : 0
          return (ta - tb) * m
        }
        case 'impressions': return (num(a.view_count) - num(b.view_count)) * m
        case 'likes': return (num(a.like_count) - num(b.like_count)) * m
        case 'rt': return (num(a.retweet_count) - num(b.retweet_count)) * m
        case 'replies': return (num(a.reply_count) - num(b.reply_count)) * m
        case 'sentiment': return ((a.sentiment_label ?? '').localeCompare(b.sentiment_label ?? '')) * m
        case 'date': return ((a.posted_at ?? '').localeCompare(b.posted_at ?? '')) * m
      }
    })
  }, [posts, sortKey, sortDir, search, filterType])

  const { visibleRows: visiblePosts, containerRef: postsContainerRef, sentinelRef: postsSentinelRef, hasMore: postsHasMore, total: postsTotal, shown: postsShown } = usePagedRows(filtered)
  const { visibleRows: visibleReplies, containerRef: repliesContainerRef, sentinelRef: repliesSentinelRef, hasMore: repliesHasMore, total: repliesTotal, shown: repliesShown } = usePagedRows(filteredReplies)
  const { visibleRows: visibleAnalysis, containerRef: analysisContainerRef, sentinelRef: analysisSentinelRef, hasMore: analysisHasMore, total: analysisTotal, shown: analysisShown } = usePagedRows(filteredAnalysis)

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            X / Twitter
            <Tip text="JOOLA's X (formerly Twitter) activity — every tweet and retweet from @joolausa, with impression and engagement metrics." />
          </h1>
          {account && (
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
              <a href={account.profile_url} target="_blank" rel="noreferrer" className="tlink">@{account.handle}</a>
              {' · '}{posts.length} posts tracked
            </div>
          )}
        </div>
        <div className="live-pulse-dot" />
      </div>

      {aiPending && posts.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--yellow) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>⚡ AI enrichment pending</span>
          <span style={{ color: 'var(--fg-3)' }}>
            Sentiment, topics, and crisis/opportunity flags will appear once the AI pipeline runs on these {posts.length} posts.
          </span>
        </div>
      )}

      {rtCount === posts.length && posts.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--joola) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--joola) 25%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13,
        }}>
          <span style={{ color: 'var(--joola)', fontWeight: 700 }}>ℹ️ Amplifier account:</span>
          <span style={{ color: 'var(--fg-3)', marginLeft: 6 }}>
            All {posts.length} tracked posts are retweets — @{account?.handle ?? 'joolausa'} is primarily used to amplify athlete and partner content rather than post original tweets.
          </span>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Posts
            <Tip text="Total tweets and retweets from @joolausa in our database." />
          </div>
          <div className="value">{posts.length}</div>
          <div className="delta up">tracked</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Impressions
            <Tip text="Total times JOOLA's posts appeared on a user's screen. An impression is counted even if the user just scrolled past." />
          </div>
          <div className="value">{fmt(totalImpressions)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>avg {fmt(avgImpressions)} / post</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Likes
            <Tip text="Combined hearts/likes across all posts, plus total reply count — a measure of audience reaction." />
          </div>
          <div className="value">{fmt(totalLikes)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{fmt(totalReplies)} replies</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Retweets
            <Tip text="Times JOOLA's posts were re-shared by other accounts. Retweets multiply reach beyond JOOLA's own followers." />
          </div>
          <div className="value">{fmt(totalRT)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>amplification</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Post Mix
            <Tip text="RT = retweets (JOOLA amplifying someone else's tweet). Original = JOOLA's own tweets. A high RT-ratio suggests an amplifier account rather than a content creator." />
          </div>
          <div className="value">{rtCount}/{origCount}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>RT / Original</div>
        </div>
      </div>

      {!aiPending && (
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className={'kpi' + (crisisCount > 0 ? ' danger' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Crisis Signals
              <Tip text="Posts the AI flagged as containing complaints, defects, warranty issues, or other content that could damage the brand." />
            </div>
            <div className="value">{crisisCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className={'kpi' + (opportunityCount > 0 ? ' joola' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Opportunities
              <Tip text="Posts the AI flagged as showing strong buying intent or praise — content worth amplifying or responding to." />
            </div>
            <div className="value">{opportunityCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className="kpi">
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              AI Enriched
              <Tip text="Percentage of posts processed by the AI pipeline (sentiment, topics, crisis/opportunity flags)." />
            </div>
            <div className="value">{enrichedCount}/{posts.length}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>{Math.round((enrichedCount / posts.length) * 100)}%</div>
          </div>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20, alignItems: 'center', display: 'flex' }}>
        <button className={'tab' + (tab === 'posts' ? ' on' : '')} onClick={() => setTab('posts')}>
          Posts ({posts.length})
        </button>
        <button className={'tab' + (tab === 'replies' ? ' on' : '')} onClick={() => setTab('replies')}>
          Replies ({replies.length})
        </button>
        <button className={'tab' + (tab === 'analysis' ? ' on' : '')} onClick={() => setTab('analysis')}>
          Comment Analysis
        </button>
      </div>

      {/* ── REPLIES TAB ── */}
      {tab === 'replies' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label">Total Replies</div>
              <div className="value">{replies.length}</div>
              <div className="delta" style={{ color: replies.length > 0 ? 'var(--joola)' : 'var(--fg-4)' }}>
                {replies.length > 0 ? `from ${postsWithReplies.length} posts` : 'not yet scraped'}
              </div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Unique Repliers
                <Tip text="Number of distinct X/Twitter accounts that replied to JOOLA posts." />
              </div>
              <div className="value">{uniqueRepliers}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>distinct accounts</div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Avg Likes / Reply
                <Tip text="Average likes received per reply." />
              </div>
              <div className="value">{avgReplyLikes.toFixed(1)}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>per reply</div>
            </div>
            <div className="kpi warn">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Top Reply Likes
                <Tip text="The most-liked reply on any JOOLA post." />
              </div>
              <div className="value">{topReply ? fmt(topReply.reply_likes) : '—'}</div>
              <div className="delta up">likes</div>
            </div>
          </div>

          {replies.length === 0 ? (
            <div className="card card-pad-lg">
              <div className="empty">
                No replies scraped yet — JOOLA's X posts are primarily retweets which don't collect replies,
                or run <code>scrape_x_replies.py</code> to populate.
              </div>
            </div>
          ) : (
            <div className="card card-pad-lg">
              <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <select
                  className="fld"
                  value={replyPostId}
                  onChange={e => setReplyPostId(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 360 }}
                >
                  <option value="all">All posts ({replies.length})</option>
                  {postsWithReplies.map(p => {
                    const count = replies.filter(r => r.post_id === p.id).length
                    return (
                      <option key={p.id} value={p.id}>
                        {(p.text ?? '(no text)').slice(0, 50)}{(p.text?.length ?? 0) > 50 ? '…' : ''} ({count})
                      </option>
                    )
                  })}
                </select>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>
                  {filteredReplies.length} repl{filteredReplies.length !== 1 ? 'ies' : 'y'} · click column to sort
                </div>
              </div>

              <input
                className="fld"
                placeholder="Search replies, usernames, or post text…"
                value={replySearch}
                onChange={e => setReplySearch(e.target.value)}
                style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
              />

              {filteredReplies.length === 0 ? (
                <div className="empty">No replies match your filters.</div>
              ) : (
                <div ref={repliesContainerRef} className="table-wrap scroll">
                  <table className="data" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <SortableTh active={replySortKey === 'replier'} direction={replySortDir} onClick={() => setReplySort('replier')} style={{ width: 140 }} title="X/Twitter username of the replier">Replier</SortableTh>
                        <th title="The reply text">Reply</th>
                        <SortableTh active={replySortKey === 'post'} direction={replySortDir} onClick={() => setReplySort('post')} style={{ width: 200 }} title="Which JOOLA post this is a reply to">Post</SortableTh>
                        <SortableTh active={replySortKey === 'likes'} direction={replySortDir} onClick={() => setReplySort('likes')} num style={{ width: 72 }} title="Likes received on this reply">Likes</SortableTh>
                        <SortableTh active={replySortKey === 'date'} direction={replySortDir} onClick={() => setReplySort('date')} num style={{ width: 110 }} title="When the reply was posted">Posted</SortableTh>
                        <th style={{ width: 40 }} aria-label="Open"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleReplies.map(r => {
                        const post = postById[r.post_id]
                        return (
                          <tr key={r.id} style={r.is_brand_reply ? { background: 'color-mix(in srgb, var(--joola) 6%, transparent)' } : undefined}>
                            <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                              <div style={{ fontWeight: 600, fontSize: 12 }}>{r.replier_username || '—'}</div>
                              {r.is_brand_reply && (
                                <span className="pill-joola" style={{ fontSize: 9, marginTop: 3, display: 'inline-block' }}>JOOLA REPLY</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 380, verticalAlign: 'top', paddingTop: 10 }}>
                              <div style={{ fontSize: 13, lineHeight: '1.5', color: 'var(--fg-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {r.reply_text || '—'}
                              </div>
                              {r.sentiment_label && (
                                <div style={{ marginTop: 4, ...sentimentStyle(r.sentiment_label), fontSize: 11 }}>
                                  {r.sentiment_label.replace(/_/g, ' ')}
                                  {r.sentiment_score != null && ` · ${(r.sentiment_score * 100).toFixed(0)}%`}
                                </div>
                              )}
                              {r.topics && r.topics.length > 0 && (
                                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {r.topics.map(t => (
                                    <span key={t} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                              {post ? (
                                <a href={post.post_url} target="_blank" rel="noreferrer" className="tlink"
                                  style={{ fontSize: 12, lineHeight: '1.4' }}>
                                  {(post.text ?? '(no text)').slice(0, 55)}{(post.text?.length ?? 0) > 55 ? '…' : ''}
                                </a>
                              ) : <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>—</span>}
                            </td>
                            <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, fontWeight: (r.reply_likes ?? 0) > 0 ? 600 : 400 }}>
                              {fmt(r.reply_likes)}
                            </td>
                            <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, color: 'var(--fg-4)', fontSize: 12 }}>
                              {fmtDate(r.posted_at)}
                            </td>
                            <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                              <ExtLink href={post?.post_url ?? '#'} label="Open post on X" />
                            </td>
                          </tr>
                        )
                      })}
                      {repliesHasMore && (
                        <tr ref={repliesSentinelRef}>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-4)', fontSize: 11 }}>
                            {repliesTotal - repliesShown} more — scroll to load
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── POSTS TAB ── */}
      {tab === 'posts' && (
      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Posts ({filtered.length})
            <Tip text="Every tweet and retweet from @joolausa. Click any column header to sort. Click the ↗ icon on the right to open the post on X." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {origCount > 0 && (
              <>
                <button className={'chip' + (filterType === 'all' ? ' on' : '')} onClick={() => setFilterType('all')} style={{ fontSize: 11 }}>All</button>
                <button className={'chip' + (filterType === 'rt' ? ' on' : '')} onClick={() => setFilterType('rt')} style={{ fontSize: 11 }}>RT</button>
                <button className={'chip' + (filterType === 'original' ? ' on' : '')} onClick={() => setFilterType('original')} style={{ fontSize: 11 }}>Original</button>
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center', marginLeft: 4 }}>
              Click any column to sort
            </span>
          </div>
        </div>
        <input
          className="fld"
          placeholder="Search post text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {filtered.length === 0 ? (
          <div className="empty">No posts match your filters.</div>
        ) : (
          <div ref={postsContainerRef} className="table-wrap scroll">
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableTh active={sortKey === 'text'} direction={sortDir} onClick={() => setSort('text')} title="Post text content">Text</SortableTh>
                  <SortableTh active={sortKey === 'type'} direction={sortDir} onClick={() => setSort('type')} title="RT = Retweet (JOOLA amplifying another account). Original = JOOLA's own tweet.">Type</SortableTh>
                  <SortableTh active={sortKey === 'impressions'} direction={sortDir} onClick={() => setSort('impressions')} num title="Total times the post appeared on a user's screen">Impressions</SortableTh>
                  <SortableTh active={sortKey === 'likes'} direction={sortDir} onClick={() => setSort('likes')} num title="Total likes (hearts) on the post">Likes</SortableTh>
                  <SortableTh active={sortKey === 'rt'} direction={sortDir} onClick={() => setSort('rt')} num title="Retweets — times the post was re-shared by other accounts">RTs</SortableTh>
                  <SortableTh active={sortKey === 'replies'} direction={sortDir} onClick={() => setSort('replies')} num title="Total replies to the post">Replies</SortableTh>
                  <SortableTh active={sortKey === 'sentiment'} direction={sortDir} onClick={() => setSort('sentiment')} title="AI-classified sentiment of the post">Sentiment</SortableTh>
                  <th title="Crisis & opportunity flags from AI enrichment">Flags</th>
                  <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the post was published on X">Posted</SortableTh>
                  <th style={{ width: 40 }} aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map(p => {
                  const isRT = p.text?.startsWith('RT @')
                  return (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 380 }}>
                        <a href={p.post_url} target="_blank" rel="noreferrer" className="tlink"
                          style={{ fontSize: 13, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.text || '(no text)'}
                        </a>
                      </td>
                      <td>
                        {isRT ? (
                          <span className="chip" style={{ fontSize: 10 }}>RT</span>
                        ) : (
                          <span className="pill-joola" style={{ fontSize: 10 }}>Original</span>
                        )}
                      </td>
                      <td className="cell-num" style={{ fontWeight: 600 }}>{fmt(num(p.view_count))}</td>
                      <td className="cell-num">{fmt(num(p.like_count))}</td>
                      <td className="cell-num">{fmt(num(p.retweet_count))}</td>
                      <td className="cell-num">{fmt(num(p.reply_count))}</td>
                      <td>
                        {p.sentiment_label ? (() => {
                          const low = p.sentiment_label.toLowerCase()
                          const color = low.includes('positive') ? 'var(--joola)' : low.includes('negative') ? '#f87171' : 'var(--fg-3)'
                          return <span style={{ fontSize: 11, color }}>{formatEnum(p.sentiment_label)}</span>
                        })() : (
                          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.is_crisis && <span className="pill-danger" style={{ fontSize: 9, marginRight: 4 }}>🚨</span>}
                        {p.is_opportunity && <span className="pill-joola" style={{ fontSize: 9 }}>💡</span>}
                        {!p.is_crisis && !p.is_opportunity && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>}
                      </td>
                      <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(p.posted_at)}</td>
                      <td><ExtLink href={p.post_url} label="Open on X" /></td>
                    </tr>
                  )
                })}
                {postsHasMore && (
                  <tr ref={postsSentinelRef}>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-4)', fontSize: 11 }}>
                      {postsTotal - postsShown} more — scroll to load
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )} {/* end posts tab */}

      {/* ── COMMENT ANALYSIS TAB ── */}
      {tab === 'analysis' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Total Comments<Tip text="Total X/Twitter comments scraped across all JOOLA posts." />
              </div>
              <div className="value">{fmt(replies.length)}</div>
              <div className="delta" style={{ color: replies.length > 0 ? 'var(--joola)' : 'var(--fg-4)' }}>
                {replies.length > 0 ? `from ${postsWithReplies.length} posts` : 'not yet scraped'}
              </div>
            </div>
            <div className="kpi joola">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Positive Sentiment<Tip text="Percentage of comments classified as positive by AI." />
              </div>
              <div className="value">{positivePct.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
              <div className="delta up">{posCount.toLocaleString()} comments</div>
            </div>
            <div className="kpi danger">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Negative Sentiment<Tip text="Percentage of comments classified as negative." />
              </div>
              <div className="value">{negativePct.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
              <div className="delta down">{negCount.toLocaleString()} comments</div>
            </div>
            <div className="kpi warn">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Crisis Signals<Tip text="Comments flagged as crisis — urgent negative feedback needing a response." />
              </div>
              <div className="value">{analysisCrisisCount}</div>
              <div className="delta" style={{ color: analysisCrisisCount > 0 ? 'var(--red)' : 'var(--fg-4)' }}>
                {analysisCrisisCount > 0 ? 'need attention' : 'none detected'}
              </div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Opportunities<Tip text="Comments flagged as opportunities — positive signals or brand advocates." />
              </div>
              <div className="value">{analysisOpportunityCount}</div>
              <div className="delta up">positive signals</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="card card-pad-lg">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', borderBottom: '4px solid var(--joola)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--joola)', lineHeight: 1 }}>{positivePct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>POSITIVE</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {replies.length.toLocaleString()} comments</div>
                </div>
                <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', borderBottom: '4px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg-3)', lineHeight: 1 }}>{neutralCount.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEUTRAL</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {replies.length.toLocaleString()} comments</div>
                </div>
                <div style={{ padding: '20px 24px', borderBottom: '4px solid var(--red)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{negativePct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEGATIVE</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {replies.length.toLocaleString()} comments</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-grid cg-2-1">
            <div className="card card-pad-lg">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <h3>COMMENT INTELLIGENCE<Tip text="X/Twitter comments AI-classified by sentiment, topics, crisis signals, and opportunity flags." /></h3>
                <span className="meta">{filteredAnalysis.length.toLocaleString()} shown · all-time</span>
              </div>
              <div className="tabs" style={{ marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <button className={'tab ' + (analysisFilter === 'all' ? 'on' : '')} onClick={() => setAnalysisFilter('all')}>All ({replies.length})</button>
                <button className={'tab ' + (analysisFilter === 'positive' ? 'on' : '')} onClick={() => setAnalysisFilter('positive')}>Positive ({posCount})</button>
                <button className={'tab ' + (analysisFilter === 'neutral' ? 'on' : '')} onClick={() => setAnalysisFilter('neutral')}>Neutral ({neutralCount})</button>
                <button className={'tab ' + (analysisFilter === 'negative' ? 'on' : '')} onClick={() => setAnalysisFilter('negative')}>Negative ({negCount})</button>
                <button className={'tab ' + (analysisFilter === 'crisis' ? 'on' : '')} onClick={() => setAnalysisFilter('crisis')}>Crisis ({analysisCrisisCount})</button>
                <button className={'tab ' + (analysisFilter === 'opportunity' ? 'on' : '')} onClick={() => setAnalysisFilter('opportunity')}>Opportunity ({analysisOpportunityCount})</button>
              </div>
              <input className="fld" placeholder="Search comments or usernames…" value={analysisSearch} onChange={e => setAnalysisSearch(e.target.value)} style={{ width: '100%', marginBottom: 14, boxSizing: 'border-box' }} />
              {replies.length === 0 ? (
                <div className="empty">No comments scraped yet.</div>
              ) : filteredAnalysis.length === 0 ? (
                <div className="empty">No replies match your filters.</div>
              ) : (
                <div ref={analysisContainerRef} style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {visibleAnalysis.map((r, i) => {
                    const sent = (r.sentiment_label || 'neutral').toLowerCase()
                    const leftBorderColor = sent === 'positive' ? 'var(--joola)' : sent === 'negative' ? 'var(--red)' : 'rgba(255,255,255,0.08)'
                    const post = postById[r.post_id]
                    return (
                      <div key={r.id ?? i} className="comment-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: `4px solid ${leftBorderColor}`, paddingLeft: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--fg-2)' }}>
                          {(r.replier_username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="comment-user">
                            <span className="uname">@{r.replier_username || '—'}</span>
                            {r.posted_at && <span className="meta">{fmtDate(r.posted_at)}</span>}
                            {r.is_brand_reply && <span className="pill-joola" style={{ fontSize: 9 }}>JOOLA REPLY</span>}
                          </div>
                          <div className="comment-body">
                            <div className="quote">&ldquo;{r.reply_text || '—'}&rdquo;</div>
                            {post && (
                              <a href={post.post_url} target="_blank" rel="noreferrer" className="tlink"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, marginTop: 5, color: 'var(--fg-4)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                {(post.text ?? '(no text)').slice(0, 55)}{(post.text?.length ?? 0) > 55 ? '…' : ''}
                              </a>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={'pill ' + (SENT_PILL[sent] ?? 'pill-ghost')}>{sent}</span>
                              {r.sentiment_score != null && (
                                <span className="mono" style={{ fontSize: 10, color: sent === 'positive' ? 'var(--joola)' : sent === 'negative' ? 'var(--red)' : 'var(--fg-4)', border: '1px solid currentColor', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                                  {r.sentiment_score > 0 ? '+' : ''}{r.sentiment_score.toFixed(2)}
                                </span>
                              )}
                              {r.is_crisis && <span className="pill pill-red">⚠ CRISIS</span>}
                              {r.is_opportunity && <span className="pill pill-green">● OPPORTUNITY</span>}
                              {(r.topics ?? []).map(t => <span key={t} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{t}</span>)}
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
                  <h3>SENTIMENT MIX<Tip text="Overall breakdown of positive, neutral, and negative X/Twitter comments." /></h3>
                  <span className="meta">{replies.length.toLocaleString()} comments · all-time</span>
                </div>
                <div className="donut-wrap" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Donut data={sentimentSlices} size={140} thickness={22} />
                  <DonutLegend data={sentimentSlices} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 10, lineHeight: 1.5 }}>
                  {positivePct.toFixed(0)}% of comments are positive —{' '}
                  {positivePct > 60 ? 'excellent community sentiment' : positivePct > 40 ? 'healthy — keep engaging' : 'needs attention'}
                </div>
              </div>
              <div className="card card-pad-lg">
                <div className="card-head">
                  <h3>TOP TOPICS<Tip text="Most discussed topics in X/Twitter comments — engage more around what your audience already cares about." /></h3>
                  <span className="meta">by frequency · all-time</span>
                </div>
                <HBar data={topicTally} colorOf={() => 'var(--yellow)'} tipPrefix="Topic mentioned in comments" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
