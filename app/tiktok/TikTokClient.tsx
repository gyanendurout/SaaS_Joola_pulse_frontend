'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import { usePagedRows } from '@/lib/usePagedRows'
import { Donut, DonutLegend } from '@/components/ui/Donut'
import type { DonutSlice } from '@/components/ui/Donut'
import type { TikTokAccount, TikTokVideo, TikTokComment, PaddleBuzz } from './page'

interface Props {
  account: TikTokAccount | null
  videos: TikTokVideo[]
  comments: TikTokComment[]
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  topViews: number
  enrichedCount: number
  crisisCount: number
  opportunityCount: number
  paddleStats: PaddleBuzz[]
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

function fmtDuration(secs: number | string | null): string {
  const n = num(secs)
  if (!n) return '—'
  const m = Math.floor(n / 60)
  const s = Math.floor(n % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type SortKey = 'caption' | 'views' | 'likes' | 'shares' | 'comments' | 'duration' | 'engagement' | 'sentiment' | 'date'
type CommentSortKey = 'likes' | 'date' | 'commenter' | 'video'
type AnalysisFilter = 'all' | 'positive' | 'neutral' | 'negative' | 'crisis' | 'opportunity'

function sentimentStyle(label: string | null): React.CSSProperties {
  if (!label) return { color: 'var(--fg-4)' }
  const l = label.toLowerCase()
  if (l.includes('positive')) return { color: 'var(--joola)' }
  if (l.includes('negative')) return { color: '#f87171' }
  return { color: 'var(--fg-3)' }
}

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

export default function TikTokClient({ account, videos, comments, totalViews, totalLikes, totalComments, totalShares, topViews, enrichedCount, crisisCount, opportunityCount, paddleStats }: Props) {
  const [tab, setTab] = useState<'videos' | 'comments' | 'analysis'>('videos')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterFlag, setFilterFlag] = useState<'all' | 'crisis' | 'opportunity'>('all')

  const [commentSearch, setCommentSearch] = useState('')
  const [commentVideoId, setCommentVideoId] = useState<string>('all')
  const [commentSortKey, setCommentSortKey] = useState<CommentSortKey>('likes')
  const [commentSortDir, setCommentSortDir] = useState<'asc' | 'desc'>('desc')

  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>('all')
  const [analysisSearch, setAnalysisSearch] = useState('')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const setCommentSort = (key: CommentSortKey) => {
    if (commentSortKey === key) setCommentSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCommentSortKey(key); setCommentSortDir('desc') }
  }

  // video lookup for comments tab
  const videoById = useMemo(() => {
    const m: Record<string, TikTokVideo> = {}
    for (const v of videos) m[v.id] = v
    return m
  }, [videos])

  const videosWithComments = useMemo(() => {
    const ids = new Set(comments.map(c => c.video_id))
    return videos.filter(v => ids.has(v.id))
  }, [videos, comments])

  const filteredComments = useMemo(() => {
    let list = comments
    if (commentVideoId !== 'all') list = list.filter(c => c.video_id === commentVideoId)
    if (commentSearch.trim()) {
      const q = commentSearch.toLowerCase()
      list = list.filter(c =>
        c.comment_text?.toLowerCase().includes(q) ||
        c.commenter_username?.toLowerCase().includes(q) ||
        videoById[c.video_id]?.text?.toLowerCase().includes(q)
      )
    }
    const m = commentSortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (commentSortKey) {
        case 'likes': return ((a.comment_likes ?? 0) - (b.comment_likes ?? 0)) * m
        case 'date': return ((a.posted_at ?? a.scraped_at).localeCompare(b.posted_at ?? b.scraped_at)) * m
        case 'commenter': return ((a.commenter_username ?? '').localeCompare(b.commenter_username ?? '')) * m
        case 'video': return ((videoById[a.video_id]?.text ?? '').localeCompare(videoById[b.video_id]?.text ?? '')) * m
      }
    })
  }, [comments, commentVideoId, commentSearch, commentSortKey, commentSortDir, videoById])

  const uniqueCommenters = useMemo(() => new Set(comments.map(c => c.commenter_username).filter(Boolean)).size, [comments])
  const topComment = comments[0] ?? null
  const avgCommentLikes = comments.length > 0
    ? (comments.reduce((s, c) => s + (c.comment_likes ?? 0), 0) / comments.length)
    : 0

  const posCount = useMemo(() => comments.filter(c => c.sentiment_label?.toLowerCase() === 'positive').length, [comments])
  const negCount = useMemo(() => comments.filter(c => c.sentiment_label?.toLowerCase() === 'negative').length, [comments])
  const analysisCrisisCount = useMemo(() => comments.filter(c => c.is_crisis === true).length, [comments])
  const analysisOpportunityCount = useMemo(() => comments.filter(c => c.is_opportunity === true).length, [comments])
  const neutralCount = comments.length - posCount - negCount
  const positivePct = comments.length > 0 ? (posCount / comments.length) * 100 : 0
  const negativePct = comments.length > 0 ? (negCount / comments.length) * 100 : 0

  const sentimentSlices: DonutSlice[] = useMemo(() => [
    { name: 'Positive', pct: comments.length > 0 ? (posCount / comments.length) * 100 : 0, n: posCount, color: 'var(--joola)' },
    { name: 'Neutral',  pct: comments.length > 0 ? ((comments.length - posCount - negCount) / comments.length) * 100 : 0, n: comments.length - posCount - negCount, color: '#94a3b8' },
    { name: 'Negative', pct: comments.length > 0 ? (negCount / comments.length) * 100 : 0, n: negCount, color: 'var(--red)' },
  ], [comments, posCount, negCount])

  const topicTally = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of comments) {
      for (const t of (c.topics ?? [])) { map[t] = (map[t] ?? 0) + 1 }
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [comments])

  const filteredAnalysis = useMemo(() => {
    let list = [...comments]
    if (analysisFilter === 'positive') list = list.filter(c => c.sentiment_label?.toLowerCase() === 'positive')
    else if (analysisFilter === 'negative') list = list.filter(c => c.sentiment_label?.toLowerCase() === 'negative')
    else if (analysisFilter === 'neutral') list = list.filter(c => !['positive', 'negative'].includes(c.sentiment_label?.toLowerCase() ?? ''))
    else if (analysisFilter === 'crisis') list = list.filter(c => c.is_crisis === true)
    else if (analysisFilter === 'opportunity') list = list.filter(c => c.is_opportunity === true)
    if (analysisSearch.trim()) {
      const q = analysisSearch.toLowerCase()
      list = list.filter(c => c.comment_text?.toLowerCase().includes(q) || c.commenter_username?.toLowerCase().includes(q))
    }
    return list
  }, [comments, analysisFilter, analysisSearch])

  const aiPending = enrichedCount === 0
  const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0
  const engagementRate = totalViews ? ((totalLikes + totalShares + totalComments) / totalViews) * 100 : 0

  const filtered = useMemo(() => {
    let list = videos
    if (filterFlag === 'crisis') list = list.filter(v => v.is_crisis)
    if (filterFlag === 'opportunity') list = list.filter(v => v.is_opportunity)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v => v.text?.toLowerCase().includes(q))
    }
    const m = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'caption': return ((a.text ?? '').localeCompare(b.text ?? '')) * m
        case 'views': return (num(a.view_count) - num(b.view_count)) * m
        case 'likes': return (num(a.like_count) - num(b.like_count)) * m
        case 'shares': return (num(a.share_count) - num(b.share_count)) * m
        case 'comments': return (num(a.comment_count) - num(b.comment_count)) * m
        case 'duration': return (num(a.duration_seconds) - num(b.duration_seconds)) * m
        case 'engagement': {
          const ea = num(a.view_count) ? (num(a.like_count) + num(a.share_count) + num(a.comment_count)) / num(a.view_count) : 0
          const eb = num(b.view_count) ? (num(b.like_count) + num(b.share_count) + num(b.comment_count)) / num(b.view_count) : 0
          return (ea - eb) * m
        }
        case 'sentiment': return ((a.sentiment_label ?? '').localeCompare(b.sentiment_label ?? '')) * m
        case 'date': return ((a.posted_at ?? '').localeCompare(b.posted_at ?? '')) * m
      }
    })
  }, [videos, sortKey, sortDir, search, filterFlag])

  const { visibleRows: visibleVideos, containerRef: videoContainerRef, sentinelRef: videoSentinelRef, hasMore: videosHasMore, total: videoTotal, shown: videoShown } = usePagedRows(filtered)
  const { visibleRows: visibleComments, containerRef: commentContainerRef, sentinelRef: commentSentinelRef, hasMore: commentsHasMore, total: commentTotal, shown: commentShown } = usePagedRows(filteredComments)
  const { visibleRows: visibleAnalysis, containerRef: analysisContainerRef, sentinelRef: analysisSentinelRef, hasMore: analysisHasMore, total: analysisTotal, shown: analysisShown } = usePagedRows(filteredAnalysis)

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            TikTok
            <Tip text="JOOLA's TikTok performance — every scraped video, its view/like/share metrics, and AI-flagged crisis or opportunity signals when enrichment has run." />
          </h1>
          {account && (
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
              <a href={account.profile_url} target="_blank" rel="noreferrer" className="tlink">@{account.handle}</a>
              {' · '}{videos.length} videos tracked
            </div>
          )}
        </div>
        <div className="live-pulse-dot" />
      </div>

      {aiPending && videos.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--yellow) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>⚡ AI enrichment pending</span>
          <span style={{ color: 'var(--fg-3)' }}>
            Sentiment, topics, crisis/opportunity flags, and product mentions will appear once the AI pipeline runs on these {videos.length} videos.
          </span>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Videos
            <Tip text="Total TikTok videos in our database from @joolapickleball." />
          </div>
          <div className="value">{videos.length}</div>
          <div className="delta up">tracked</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Views
            <Tip text="Combined view count across every JOOLA TikTok video. Each impression on TikTok counts as a view." />
          </div>
          <div className="value">{fmt(totalViews)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>avg {fmt(avgViews)} / video</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Likes
            <Tip text="Combined hearts across all videos plus total comment count." />
          </div>
          <div className="value">{fmt(totalLikes)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{fmt(totalComments)} comments</div>
        </div>
        <div className="kpi warn">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Top Video
            <Tip text="The single most-viewed TikTok video. Worth analysing — its hook, sound, and topic show what works on TikTok." />
          </div>
          <div className="value">{fmt(topViews)}</div>
          <div className="delta up">views</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Engagement Rate
            <Tip text="(Likes + shares + comments) ÷ views. A measure of how compelling the content is. >5% is strong on TikTok." />
          </div>
          <div className="value">{engagementRate.toFixed(2)}%</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{fmt(totalShares)} shares</div>
        </div>
      </div>

      {!aiPending && (
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className={'kpi' + (crisisCount > 0 ? ' danger' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Crisis Signals
              <Tip text="Videos the AI flagged as containing complaints, defects, warranty issues, or other content that could harm the brand." />
            </div>
            <div className="value">{crisisCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className={'kpi' + (opportunityCount > 0 ? ' joola' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Opportunities
              <Tip text="Videos the AI flagged as showing strong buying intent, praise, or content worth amplifying via paid promotion." />
            </div>
            <div className="value">{opportunityCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className="kpi">
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              AI Enriched
              <Tip text="Percentage of videos that have been processed by the AI pipeline (sentiment, topics, crisis/opportunity flags)." />
            </div>
            <div className="value">{enrichedCount}/{videos.length}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>{Math.round((enrichedCount / videos.length) * 100)}%</div>
          </div>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20, alignItems: 'center', display: 'flex' }}>
        <button className={'tab' + (tab === 'videos' ? ' on' : '')} onClick={() => setTab('videos')}>
          Videos ({videos.length})
        </button>
        <button className={'tab' + (tab === 'comments' ? ' on' : '')} onClick={() => setTab('comments')}>
          Comments ({comments.length})
        </button>
        <button className={'tab' + (tab === 'analysis' ? ' on' : '')} onClick={() => setTab('analysis')}>
          Comment Analysis
        </button>
      </div>

      {/* ── COMMENTS TAB ── */}
      {tab === 'comments' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label">Total Comments</div>
              <div className="value">{comments.length}</div>
              <div className="delta" style={{ color: 'var(--joola)' }}>from {videosWithComments.length} videos</div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Unique Commenters
                <Tip text="Number of distinct TikTok accounts that left a comment on JOOLA videos." />
              </div>
              <div className="value">{uniqueCommenters}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>distinct accounts</div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Avg Likes / Comment
                <Tip text="Average digg (like) count per comment." />
              </div>
              <div className="value">{avgCommentLikes.toFixed(1)}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>per comment</div>
            </div>
            <div className="kpi warn">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Top Comment Likes
                <Tip text="The single most-liked comment on any JOOLA TikTok video." />
              </div>
              <div className="value">{topComment ? fmt(topComment.comment_likes) : '—'}</div>
              <div className="delta up">likes</div>
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="card card-pad-lg">
              <div className="empty">
                No comments scraped yet — run <code>scrape_tiktok_comments.py</code> to populate.
              </div>
            </div>
          ) : (
            <div className="card card-pad-lg">
              <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <select
                  className="fld"
                  value={commentVideoId}
                  onChange={e => setCommentVideoId(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 360 }}
                >
                  <option value="all">All videos ({comments.length})</option>
                  {videosWithComments.map(v => {
                    const count = comments.filter(c => c.video_id === v.id).length
                    return (
                      <option key={v.id} value={v.id}>
                        {(v.text ?? '(no caption)').slice(0, 50)}{(v.text?.length ?? 0) > 50 ? '…' : ''} ({count})
                      </option>
                    )
                  })}
                </select>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>
                  {filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''} · click column to sort
                </div>
              </div>

              <input
                className="fld"
                placeholder="Search comments, usernames, or video captions…"
                value={commentSearch}
                onChange={e => setCommentSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
              />

              {filteredComments.length === 0 ? (
                <div className="empty">No comments match your filters.</div>
              ) : (
                <div ref={commentContainerRef} className="table-wrap scroll">
                  <table className="data" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <SortableTh active={commentSortKey === 'commenter'} direction={commentSortDir} onClick={() => setCommentSort('commenter')} style={{ width: 140 }} title="TikTok username of the commenter">Commenter</SortableTh>
                        <th title="The comment text">Comment</th>
                        <SortableTh active={commentSortKey === 'video'} direction={commentSortDir} onClick={() => setCommentSort('video')} style={{ width: 200 }} title="Which JOOLA TikTok video this comment was left on">Video</SortableTh>
                        <SortableTh active={commentSortKey === 'likes'} direction={commentSortDir} onClick={() => setCommentSort('likes')} num style={{ width: 72 }} title="Likes (diggs) received on this comment">Likes</SortableTh>
                        <SortableTh active={commentSortKey === 'date'} direction={commentSortDir} onClick={() => setCommentSort('date')} num style={{ width: 110 }} title="When the comment was posted">Posted</SortableTh>
                        <th style={{ width: 40 }} aria-label="Open"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleComments.map(c => {
                        const vid = videoById[c.video_id]
                        return (
                          <tr key={c.id} style={c.is_brand_reply ? { background: 'color-mix(in srgb, var(--joola) 6%, transparent)' } : undefined}>
                            <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                              <div style={{ fontWeight: 600, fontSize: 12 }}>{c.commenter_username || '—'}</div>
                              {c.is_brand_reply && (
                                <span className="pill-joola" style={{ fontSize: 9, marginTop: 3, display: 'inline-block' }}>JOOLA REPLY</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 380, verticalAlign: 'top', paddingTop: 10 }}>
                              <div style={{ fontSize: 13, lineHeight: '1.5', color: 'var(--fg-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {c.comment_text || '—'}
                              </div>
                              {c.sentiment_label && (
                                <div style={{ marginTop: 4, ...sentimentStyle(c.sentiment_label), fontSize: 11 }}>
                                  {c.sentiment_label.replace(/_/g, ' ')}
                                  {c.sentiment_score != null && ` · ${(c.sentiment_score * 100).toFixed(0)}%`}
                                </div>
                              )}
                              {c.topics && c.topics.length > 0 && (
                                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {c.topics.map(t => (
                                    <span key={t} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                              {vid ? (
                                <a href={vid.video_url} target="_blank" rel="noreferrer" className="tlink"
                                  style={{ fontSize: 12, lineHeight: '1.4' }}>
                                  {(vid.text ?? '(no caption)').slice(0, 55)}{(vid.text?.length ?? 0) > 55 ? '…' : ''}
                                </a>
                              ) : <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>—</span>}
                            </td>
                            <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, fontWeight: (c.comment_likes ?? 0) > 0 ? 600 : 400 }}>
                              {fmt(c.comment_likes)}
                            </td>
                            <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, color: 'var(--fg-4)', fontSize: 12 }}>
                              {fmtDate(c.posted_at)}
                            </td>
                            <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                              <ExtLink href={vid?.video_url ?? '#'} label="Open video on TikTok" />
                            </td>
                          </tr>
                        )
                      })}
                      {commentsHasMore && (
                        <tr ref={commentSentinelRef}>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-4)', fontSize: 11 }}>
                            {commentTotal - commentShown} more — scroll to load
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

      {/* ── VIDEOS TAB ── */}
      {tab === 'videos' && (
      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Videos ({filtered.length})
            <Tip text="Every JOOLA TikTok video. Click any column header to sort. Click the ↗ icon on the right to open the video on TikTok." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {!aiPending && (crisisCount > 0 || opportunityCount > 0) && (
              <>
                <button className={'chip' + (filterFlag === 'all' ? ' on' : '')} onClick={() => setFilterFlag('all')} style={{ fontSize: 11 }}>All ({videos.length})</button>
                {crisisCount > 0 && (
                  <button className={'chip' + (filterFlag === 'crisis' ? ' on' : '')} onClick={() => setFilterFlag('crisis')} style={{ fontSize: 11 }}>🚨 Crisis ({crisisCount})</button>
                )}
                {opportunityCount > 0 && (
                  <button className={'chip' + (filterFlag === 'opportunity' ? ' on' : '')} onClick={() => setFilterFlag('opportunity')} style={{ fontSize: 11 }}>💡 Opp ({opportunityCount})</button>
                )}
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center', marginLeft: 4 }}>
              Click any column to sort
            </span>
          </div>
        </div>
        <input
          className="fld"
          placeholder="Search captions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {filtered.length === 0 ? (
          <div className="empty">No videos match your filters.</div>
        ) : (
          <div ref={videoContainerRef} className="table-wrap scroll">
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }} title="Video thumbnail">Thumb</th>
                  <SortableTh active={sortKey === 'caption'} direction={sortDir} onClick={() => setSort('caption')} title="Video caption text">Caption</SortableTh>
                  <SortableTh active={sortKey === 'views'} direction={sortDir} onClick={() => setSort('views')} num title="Total views on the video">Views</SortableTh>
                  <SortableTh active={sortKey === 'likes'} direction={sortDir} onClick={() => setSort('likes')} num title="Total likes (hearts) on the video">Likes</SortableTh>
                  <SortableTh active={sortKey === 'shares'} direction={sortDir} onClick={() => setSort('shares')} num title="Times the video was shared on TikTok">Shares</SortableTh>
                  <SortableTh active={sortKey === 'comments'} direction={sortDir} onClick={() => setSort('comments')} num title="Total comments left on the video">Comments</SortableTh>
                  <SortableTh active={sortKey === 'engagement'} direction={sortDir} onClick={() => setSort('engagement')} num title="Engagement Rate — (likes + shares + comments) divided by views. >5% is strong on TikTok.">ER %</SortableTh>
                  <SortableTh active={sortKey === 'duration'} direction={sortDir} onClick={() => setSort('duration')} num title="Video length in minutes:seconds">Duration</SortableTh>
                  <SortableTh active={sortKey === 'sentiment'} direction={sortDir} onClick={() => setSort('sentiment')} title="AI-classified sentiment of the video">Sentiment</SortableTh>
                  <th title="Crisis & opportunity flags from AI enrichment">Flags</th>
                  <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the video was posted to TikTok">Posted</SortableTh>
                  <th style={{ width: 40 }} aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {visibleVideos.map(v => {
                  const views = num(v.view_count)
                  const likes = num(v.like_count)
                  const eng = views ? ((likes + num(v.share_count) + num(v.comment_count)) / views) * 100 : 0
                  return (
                    <tr key={v.id}>
                      <td>
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt="" width={48} height={64}
                            referrerPolicy="no-referrer"
                            style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                        ) : (
                          <div style={{ width: 48, height: 64, background: 'linear-gradient(135deg, #69C9D0, #EE1D52)', borderRadius: 4 }} />
                        )}
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <a href={v.video_url} target="_blank" rel="noreferrer" className="tlink"
                          style={{ fontSize: 13, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {v.text || '(no caption)'}
                        </a>
                      </td>
                      <td className="cell-num" style={{ fontWeight: 600 }}>{fmt(views)}</td>
                      <td className="cell-num">{fmt(likes)}</td>
                      <td className="cell-num">{fmt(num(v.share_count))}</td>
                      <td className="cell-num">{fmt(num(v.comment_count))}</td>
                      <td className="cell-num" style={{ fontSize: 12, color: eng > 5 ? 'var(--joola)' : 'var(--fg-3)', fontWeight: eng > 5 ? 700 : 400 }}>
                        {eng.toFixed(1)}%
                      </td>
                      <td className="cell-num" style={{ color: 'var(--fg-4)', fontSize: 12 }}>{fmtDuration(v.duration_seconds)}</td>
                      <td>
                        {v.sentiment_label ? (() => {
                          const low = v.sentiment_label.toLowerCase()
                          const color = low.includes('positive') ? 'var(--joola)' : low.includes('negative') ? '#f87171' : 'var(--fg-3)'
                          return <span style={{ fontSize: 11, color }}>{formatEnum(v.sentiment_label)}</span>
                        })() : (
                          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {v.is_crisis && <span className="pill-danger" style={{ fontSize: 9, marginRight: 4 }}>🚨</span>}
                        {v.is_opportunity && <span className="pill-joola" style={{ fontSize: 9 }}>💡</span>}
                        {!v.is_crisis && !v.is_opportunity && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>}
                      </td>
                      <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(v.posted_at)}</td>
                      <td><ExtLink href={v.video_url} label="Open on TikTok" /></td>
                    </tr>
                  )
                })}
                {videosHasMore && (
                  <tr ref={videoSentinelRef}>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '10px 0', color: 'var(--fg-4)', fontSize: 11 }}>
                      {videoTotal - videoShown} more — scroll to load
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      )} {/* end videos tab */}

      {/* ── COMMENT ANALYSIS TAB ── */}
      {tab === 'analysis' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Total Comments<Tip text="Total TikTok comments scraped across all JOOLA videos." />
              </div>
              <div className="value">{fmt(comments.length)}</div>
              <div className="delta" style={{ color: 'var(--joola)' }}>from {videosWithComments.length} videos</div>
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
                Negative Sentiment<Tip text="Percentage of comments classified as negative — spikes signal a content or product issue." />
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
                Opportunities<Tip text="Comments flagged as opportunities — positive buying signals or brand advocates." />
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
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {comments.length.toLocaleString()} comments</div>
                </div>
                <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', borderBottom: '4px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg-3)', lineHeight: 1 }}>{neutralCount.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEUTRAL</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {comments.length.toLocaleString()} comments</div>
                </div>
                <div style={{ padding: '20px 24px', borderBottom: '4px solid var(--red)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{negativePct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>NEGATIVE</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>of {comments.length.toLocaleString()} comments</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-grid cg-2-1">
            <div className="card card-pad-lg">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <h3>COMMENT INTELLIGENCE<Tip text="TikTok comments AI-classified by sentiment, topics, crisis signals, and opportunity flags." /></h3>
                <span className="meta">{filteredAnalysis.length.toLocaleString()} shown · all-time</span>
              </div>
              <div className="tabs" style={{ marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <button className={'tab ' + (analysisFilter === 'all' ? 'on' : '')} onClick={() => setAnalysisFilter('all')}>All ({comments.length})</button>
                <button className={'tab ' + (analysisFilter === 'positive' ? 'on' : '')} onClick={() => setAnalysisFilter('positive')}>Positive ({posCount})</button>
                <button className={'tab ' + (analysisFilter === 'neutral' ? 'on' : '')} onClick={() => setAnalysisFilter('neutral')}>Neutral ({neutralCount})</button>
                <button className={'tab ' + (analysisFilter === 'negative' ? 'on' : '')} onClick={() => setAnalysisFilter('negative')}>Negative ({negCount})</button>
                <button className={'tab ' + (analysisFilter === 'crisis' ? 'on' : '')} onClick={() => setAnalysisFilter('crisis')}>Crisis ({analysisCrisisCount})</button>
                <button className={'tab ' + (analysisFilter === 'opportunity' ? 'on' : '')} onClick={() => setAnalysisFilter('opportunity')}>Opportunity ({analysisOpportunityCount})</button>
              </div>
              <input className="fld" placeholder="Search comments or usernames…" value={analysisSearch} onChange={e => setAnalysisSearch(e.target.value)} style={{ width: '100%', marginBottom: 14, boxSizing: 'border-box' }} />
              {filteredAnalysis.length === 0 ? (
                <div className="empty">No comments match your filters.</div>
              ) : (
                <div ref={analysisContainerRef} style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {visibleAnalysis.map((c, i) => {
                    const sent = (c.sentiment_label || 'neutral').toLowerCase()
                    const leftBorderColor = sent === 'positive' ? 'var(--joola)' : sent === 'negative' ? 'var(--red)' : 'rgba(255,255,255,0.08)'
                    const vid = videoById[c.video_id]
                    return (
                      <div key={c.id ?? i} className="comment-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: `4px solid ${leftBorderColor}`, paddingLeft: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--fg-2)' }}>
                          {(c.commenter_username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="comment-user">
                            <span className="uname">@{c.commenter_username || '—'}</span>
                            {c.posted_at && <span className="meta">{fmtDate(c.posted_at)}</span>}
                            {c.is_brand_reply && <span className="pill-joola" style={{ fontSize: 9 }}>JOOLA REPLY</span>}
                          </div>
                          <div className="comment-body">
                            <div className="quote">&ldquo;{c.comment_text || '—'}&rdquo;</div>
                            {vid && (
                              <a href={vid.video_url} target="_blank" rel="noreferrer" className="tlink"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, marginTop: 5, color: 'var(--fg-4)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                {(vid.text ?? '(no caption)').slice(0, 55)}{(vid.text?.length ?? 0) > 55 ? '…' : ''}
                              </a>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={'pill ' + (SENT_PILL[sent] ?? 'pill-ghost')}>{sent}</span>
                              {c.sentiment_score != null && (
                                <span className="mono" style={{ fontSize: 10, color: sent === 'positive' ? 'var(--joola)' : sent === 'negative' ? 'var(--red)' : 'var(--fg-4)', border: '1px solid currentColor', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                                  {c.sentiment_score > 0 ? '+' : ''}{c.sentiment_score.toFixed(2)}
                                </span>
                              )}
                              {c.is_crisis && <span className="pill pill-red">⚠ CRISIS</span>}
                              {c.is_opportunity && <span className="pill pill-green">● OPPORTUNITY</span>}
                              {(c.topics ?? []).map(t => <span key={t} className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{t}</span>)}
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
                  <h3>SENTIMENT MIX<Tip text="Overall breakdown of positive, neutral, and negative TikTok comments." /></h3>
                  <span className="meta">{comments.length.toLocaleString()} comments · all-time</span>
                </div>
                <div className="donut-wrap" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Donut data={sentimentSlices} size={140} thickness={22} />
                  <DonutLegend data={sentimentSlices} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 10, lineHeight: 1.5 }}>
                  {positivePct.toFixed(0)}% of viewers comment positively —{' '}
                  {positivePct > 60 ? 'excellent channel sentiment' : positivePct > 40 ? 'healthy — keep engaging' : 'needs attention'}
                </div>
              </div>
              <div className="card card-pad-lg">
                <div className="card-head">
                  <h3>TOP TOPICS<Tip text="Most discussed topics in TikTok comments — create more content around what viewers already care about." /></h3>
                  <span className="meta">by frequency · all-time</span>
                </div>
                <HBar data={topicTally} colorOf={() => 'var(--yellow)'} tipPrefix="Topic mentioned in comments" />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'videos' && paddleStats.length > 0 && (
        <div className="card card-pad-lg" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            Paddle Buzz
            <Tip text="Which JOOLA paddles appear most in TikTok video captions based on AI-extracted product mentions. Bar = relative mention share. Views = total views of videos that mention each paddle." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paddleStats.map((p, i) => {
              const barPct = Math.max((p.mentions / paddleStats[0].mentions) * 100, 4)
              const positiveShare = p.mentions ? Math.round((p.positive / p.mentions) * 100) : 0
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 22, fontSize: 11, fontWeight: 700, flexShrink: 0, textAlign: 'right',
                    color: i === 0 ? 'var(--yellow)' : 'var(--fg-4)',
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{
                    width: 140, fontSize: 13, flexShrink: 0,
                    fontWeight: i === 0 ? 700 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barPct}%`,
                      background: 'linear-gradient(90deg, #69C9D0, #EE1D52)',
                      borderRadius: 3,
                    }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, width: 28, textAlign: 'right', flexShrink: 0 }}>
                    {p.mentions}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', width: 64, textAlign: 'right', flexShrink: 0 }}>
                    {fmt(p.views)} views
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--joola)', width: 54, textAlign: 'right', flexShrink: 0 }}>
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
            AI-extracted product mentions · {videos.filter(v => (v.products_mentioned?.length ?? 0) > 0).length} of {videos.length} videos have paddle tags
          </div>
        </div>
      )}
    </div>
  )
}
