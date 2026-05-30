'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import type { YtChannel, YtVideo, YtChannelWeekly, YtComment } from './page'

interface Props {
  channel: YtChannel | null
  videos: YtVideo[]
  comments: YtComment[]
  weeklyStats: YtChannelWeekly[]
  latestWeek: YtChannelWeekly | null
  latestSubscribers: number | null
  latestTotalVideos: number | null
  totalViews: number
  totalLikes: number
  topVideoViews: number
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

function fmtDuration(secs: number | null): string {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isShort(v: { duration_seconds?: number | null; is_short?: boolean | null }): boolean {
  if (v.is_short === true) return true
  const secs = v.duration_seconds
  return secs != null && secs > 0 && secs <= 60
}

function sentimentStyle(label: string | null): React.CSSProperties {
  if (!label) return { color: 'var(--fg-4)' }
  const l = label.toLowerCase()
  if (l.includes('positive')) return { color: 'var(--joola)' }
  if (l.includes('negative')) return { color: 'var(--danger)' }
  return { color: 'var(--fg-3)' }
}

type VideoFilter = 'all' | 'short' | 'long'
type VideoSortKey = 'title' | 'type' | 'views' | 'likes' | 'comments' | 'duration' | 'date'
type CommentSortKey = 'likes' | 'date' | 'commenter' | 'video'

export default function YoutubeClient({
  channel, videos, comments, weeklyStats, latestWeek,
  latestSubscribers, latestTotalVideos, totalViews, totalLikes, topVideoViews,
}: Props) {
  const [tab, setTab] = useState<'videos' | 'comments' | 'stats'>('videos')

  // video tab state
  const [videoFilter, setVideoFilter] = useState<VideoFilter>('all')
  const [videoSearch, setVideoSearch] = useState('')
  const [videoSortKey, setVideoSortKey] = useState<VideoSortKey>('views')
  const [videoSortDir, setVideoSortDir] = useState<'asc' | 'desc'>('desc')

  // comment tab state
  const [commentSearch, setCommentSearch] = useState('')
  const [commentVideoId, setCommentVideoId] = useState<string>('all')
  const [commentSortKey, setCommentSortKey] = useState<CommentSortKey>('likes')
  const [commentSortDir, setCommentSortDir] = useState<'asc' | 'desc'>('desc')

  const setVideoSort = (key: VideoSortKey) => {
    if (videoSortKey === key) setVideoSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setVideoSortKey(key); setVideoSortDir('desc') }
  }
  const setCommentSort = (key: CommentSortKey) => {
    if (commentSortKey === key) setCommentSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCommentSortKey(key); setCommentSortDir('desc') }
  }

  // video lookup map for comments tab
  const videoById = useMemo(() => {
    const m: Record<string, YtVideo> = {}
    for (const v of videos) m[v.id] = v
    return m
  }, [videos])

  const filteredVideos = useMemo(() => {
    let list = videos
    if (videoFilter === 'short') list = list.filter(isShort)
    if (videoFilter === 'long') list = list.filter(v => !isShort(v))
    if (videoSearch.trim()) {
      const q = videoSearch.toLowerCase()
      list = list.filter(v => v.title?.toLowerCase().includes(q))
    }
    const m = videoSortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (videoSortKey) {
        case 'title': return ((a.title ?? '').localeCompare(b.title ?? '')) * m
        case 'type': return ((isShort(a) ? 1 : 0) - (isShort(b) ? 1 : 0)) * m
        case 'views': return ((a.view_count ?? 0) - (b.view_count ?? 0)) * m
        case 'likes': return ((a.like_count ?? 0) - (b.like_count ?? 0)) * m
        case 'comments': return ((a.comment_count ?? 0) - (b.comment_count ?? 0)) * m
        case 'duration': return ((a.duration_seconds ?? 0) - (b.duration_seconds ?? 0)) * m
        case 'date': return ((a.published_at ?? '').localeCompare(b.published_at ?? '')) * m
      }
    })
  }, [videos, videoFilter, videoSearch, videoSortKey, videoSortDir])

  const filteredComments = useMemo(() => {
    let list = comments
    if (commentVideoId !== 'all') list = list.filter(c => c.video_id === commentVideoId)
    if (commentSearch.trim()) {
      const q = commentSearch.toLowerCase()
      list = list.filter(c =>
        c.comment_text?.toLowerCase().includes(q) ||
        c.commenter_username?.toLowerCase().includes(q) ||
        videoById[c.video_id]?.title?.toLowerCase().includes(q)
      )
    }
    const m = commentSortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (commentSortKey) {
        case 'likes': return ((a.comment_likes ?? 0) - (b.comment_likes ?? 0)) * m
        case 'date': return ((a.posted_at ?? a.scraped_at).localeCompare(b.posted_at ?? b.scraped_at)) * m
        case 'commenter': return ((a.commenter_username ?? '').localeCompare(b.commenter_username ?? '')) * m
        case 'video': return ((videoById[a.video_id]?.title ?? '').localeCompare(videoById[b.video_id]?.title ?? '')) * m
      }
    })
  }, [comments, commentVideoId, commentSearch, commentSortKey, commentSortDir, videoById])

  // comment KPIs
  const uniqueCommenters = useMemo(() => new Set(comments.map(c => c.commenter_username).filter(Boolean)).size, [comments])
  const topComment = comments[0] ?? null
  const avgLikes = comments.length > 0
    ? (comments.reduce((s, c) => s + (c.comment_likes ?? 0), 0) / comments.length)
    : 0

  // videos that have comments (for dropdown)
  const videosWithComments = useMemo(() => {
    const ids = new Set(comments.map(c => c.video_id))
    return videos.filter(v => ids.has(v.id))
  }, [videos, comments])

  const shorts = videos.filter(isShort).length
  const longform = videos.length - shorts

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            YouTube
            <Tip text="JOOLA's YouTube channel — videos, viewer comments, and weekly subscriber snapshots." />
          </h1>
          {channel && (
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
              <a href={channel.channel_url} target="_blank" rel="noreferrer" className="tlink">
                {channel.channel_name}
              </a>
              {' · '}
              {channel.region || 'Global'}
            </div>
          )}
        </div>
        <div className="live-pulse-dot" style={{ marginRight: 8 }} />
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Subscribers
            <Tip text="People who follow JOOLA's YouTube channel." />
          </div>
          <div className="value">{latestSubscribers != null ? fmt(latestSubscribers) : '—'}</div>
          <div className="delta" style={{ color: latestSubscribers != null ? 'var(--joola)' : 'var(--fg-4)' }}>
            {latestSubscribers != null
              ? (latestWeek ? `Week ${latestWeek.week_number}/${latestWeek.year}` : 'Latest')
              : 'Not yet scraped'}
          </div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Videos Scraped
            <Tip text="Number of JOOLA videos we have detailed data for." />
          </div>
          <div className="value">{videos.length}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>
            {latestTotalVideos != null ? `of ${latestTotalVideos.toLocaleString()} total` : 'channel total unknown'}
          </div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Views
            <Tip text="Combined view count across every scraped video." />
          </div>
          <div className="value">{fmt(totalViews)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>scraped videos</div>
        </div>
        <div className="kpi warn">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Top Video
            <Tip text="The single most-watched JOOLA video." />
          </div>
          <div className="value">{fmt(topVideoViews)}</div>
          <div className="delta up">views</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Likes
            <Tip text="Combined likes across all videos." />
          </div>
          <div className="value">{fmt(totalLikes)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{shorts} Shorts · {longform} Long-form</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20, alignItems: 'center', display: 'flex' }}>
        <button className={'tab' + (tab === 'videos' ? ' on' : '')} onClick={() => setTab('videos')}>
          Videos ({videos.length})
        </button>
        <button className={'tab' + (tab === 'comments' ? ' on' : '')} onClick={() => setTab('comments')}>
          Comments ({comments.length})
        </button>
        <button className={'tab' + (tab === 'stats' ? ' on' : '')} onClick={() => setTab('stats')}>
          Channel Stats ({weeklyStats.length} weeks)
        </button>
      </div>

      {/* ── VIDEOS TAB ── */}
      {tab === 'videos' && (
        <div className="card card-pad-lg">
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'short', 'long'] as VideoFilter[]).map(f => (
                <button
                  key={f}
                  className={'chip' + (videoFilter === f ? ' on' : '')}
                  onClick={() => setVideoFilter(f)}
                >
                  {f === 'all' ? `All (${videos.length})` : f === 'short' ? `Shorts (${shorts})` : `Long-form (${longform})`}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>
              Click any column to sort
            </div>
          </div>

          <input
            className="fld"
            placeholder="Search videos…"
            value={videoSearch}
            onChange={e => setVideoSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
          />

          {filteredVideos.length === 0 ? (
            <div className="empty">No videos match your filters.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }} title="Video thumbnail">Thumb</th>
                    <SortableTh active={videoSortKey === 'title'} direction={videoSortDir} onClick={() => setVideoSort('title')} title="Video title">Title</SortableTh>
                    <SortableTh active={videoSortKey === 'type'} direction={videoSortDir} onClick={() => setVideoSort('type')} style={{ width: 72 }} title="Shorts ≤60s, Long-form otherwise">Type</SortableTh>
                    <SortableTh active={videoSortKey === 'views'} direction={videoSortDir} onClick={() => setVideoSort('views')} num title="Total views">Views</SortableTh>
                    <SortableTh active={videoSortKey === 'likes'} direction={videoSortDir} onClick={() => setVideoSort('likes')} num title="Total likes">Likes</SortableTh>
                    <SortableTh active={videoSortKey === 'comments'} direction={videoSortDir} onClick={() => setVideoSort('comments')} num title="Total comments">Comments</SortableTh>
                    <SortableTh active={videoSortKey === 'duration'} direction={videoSortDir} onClick={() => setVideoSort('duration')} num title="Video length">Duration</SortableTh>
                    <SortableTh active={videoSortKey === 'date'} direction={videoSortDir} onClick={() => setVideoSort('date')} num title="Published date">Published</SortableTh>
                    <th style={{ width: 40 }} aria-label="Open"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map(v => (
                    <tr key={v.id}>
                      <td>
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt="" width={52} height={30}
                            style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                        ) : (
                          <div style={{ width: 52, height: 30, background: 'var(--bg-3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>▶</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <a href={v.video_url} target="_blank" rel="noreferrer" className="tlink"
                          style={{ fontSize: 13, lineHeight: '1.4' }}>
                          {v.title}
                        </a>
                      </td>
                      <td>
                        {isShort(v) ? (
                          <span className="pill-warn" style={{ fontSize: 10 }}>SHORT</span>
                        ) : (
                          <span className="pill-info" style={{ fontSize: 10 }}>LONG</span>
                        )}
                        {v.is_sponsored && (
                          <span className="pill-joola" style={{ fontSize: 10, marginLeft: 4 }}>AD</span>
                        )}
                      </td>
                      <td className="cell-num" style={{ fontWeight: 600 }}>{fmt(v.view_count)}</td>
                      <td className="cell-num">{fmt(v.like_count)}</td>
                      <td className="cell-num">{fmt(v.comment_count)}</td>
                      <td className="cell-num" style={{ color: 'var(--fg-4)', fontSize: 12 }}>{fmtDuration(v.duration_seconds)}</td>
                      <td className="cell-num" style={{ color: 'var(--fg-4)', fontSize: 12 }}>{fmtDate(v.published_at)}</td>
                      <td><ExtLink href={v.video_url} label="Open on YouTube" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── COMMENTS TAB ── */}
      {tab === 'comments' && (
        <div>
          {/* Comment KPIs */}
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi joola">
              <div className="label">Total Comments</div>
              <div className="value">{comments.length}</div>
              <div className="delta" style={{ color: 'var(--joola)' }}>scraped from {videosWithComments.length} videos</div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Unique Commenters
                <Tip text="Number of distinct YouTube accounts that left a comment on JOOLA videos." />
              </div>
              <div className="value">{uniqueCommenters}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>distinct accounts</div>
            </div>
            <div className="kpi">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Avg Likes / Comment
                <Tip text="Average number of likes each comment received. Higher = more resonance with other viewers." />
              </div>
              <div className="value">{avgLikes.toFixed(1)}</div>
              <div className="delta" style={{ color: 'var(--fg-3)' }}>per comment</div>
            </div>
            <div className="kpi warn">
              <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
                Top Comment Likes
                <Tip text="The single most-liked comment on any JOOLA video — a signal of what viewers agree with most." />
              </div>
              <div className="value">{topComment ? fmt(topComment.comment_likes) : '—'}</div>
              <div className="delta up">likes</div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Video filter dropdown */}
              <select
                className="fld"
                value={commentVideoId}
                onChange={e => setCommentVideoId(e.target.value)}
                style={{ minWidth: 220, maxWidth: 340 }}
              >
                <option value="all">All videos ({comments.length})</option>
                {videosWithComments.map(v => {
                  const count = comments.filter(c => c.video_id === v.id).length
                  return (
                    <option key={v.id} value={v.id}>
                      {v.title?.slice(0, 50)}{(v.title?.length ?? 0) > 50 ? '…' : ''} ({count})
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
              placeholder="Search comments, usernames, or video titles…"
              value={commentSearch}
              onChange={e => setCommentSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
            />

            {filteredComments.length === 0 ? (
              <div className="empty">No comments match your filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <SortableTh active={commentSortKey === 'commenter'} direction={commentSortDir} onClick={() => setCommentSort('commenter')} style={{ width: 140 }} title="YouTube username of the commenter">Commenter</SortableTh>
                      <th title="The comment text">Comment</th>
                      <SortableTh active={commentSortKey === 'video'} direction={commentSortDir} onClick={() => setCommentSort('video')} style={{ width: 200 }} title="Which JOOLA video this comment was left on">Video</SortableTh>
                      <SortableTh active={commentSortKey === 'likes'} direction={commentSortDir} onClick={() => setCommentSort('likes')} num style={{ width: 72 }} title="Likes received on this comment">Likes</SortableTh>
                      <SortableTh active={commentSortKey === 'date'} direction={commentSortDir} onClick={() => setCommentSort('date')} num style={{ width: 110 }} title="When the comment was posted">Posted</SortableTh>
                      <th style={{ width: 40 }} aria-label="Open"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComments.map(c => {
                      const vid = videoById[c.video_id]
                      return (
                        <tr key={c.id} style={c.is_brand_reply ? { background: 'color-mix(in srgb, var(--joola) 6%, transparent)' } : undefined}>
                          <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>
                              {c.commenter_username || '—'}
                            </div>
                            {c.is_brand_reply && (
                              <span className="pill-joola" style={{ fontSize: 9, marginTop: 3, display: 'inline-block' }}>JOOLA REPLY</span>
                            )}
                          </td>
                          <td style={{ maxWidth: 420, verticalAlign: 'top', paddingTop: 10 }}>
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
                                {vid.title?.slice(0, 55)}{(vid.title?.length ?? 0) > 55 ? '…' : ''}
                              </a>
                            ) : <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>—</span>}
                          </td>
                          <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, fontWeight: (c.comment_likes ?? 0) > 0 ? 600 : 400 }}>
                            {fmt(c.comment_likes)}
                          </td>
                          <td className="cell-num" style={{ verticalAlign: 'top', paddingTop: 10, fontSize: 12, color: 'var(--fg-4)' }}>
                            {fmtDate(c.posted_at)}
                          </td>
                          <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                            {vid && <ExtLink href={vid.video_url} label="Open video on YouTube" />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHANNEL STATS TAB ── */}
      {tab === 'stats' && (
        <div className="card card-pad-lg">
          <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 14 }}>Weekly Channel Snapshots</div>
          {weeklyStats.length === 0 ? (
            <div className="empty">No weekly stats available yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th className="num">Subscribers</th>
                    <th className="num">Total Videos</th>
                    <th className="num">Uploaded This Week</th>
                    <th className="num">Avg Views (last 10)</th>
                    <th className="num">Scraped At</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats.map(w => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>W{w.week_number}/{w.year}</td>
                      <td className="cell-num">{fmt(w.subscribers)}</td>
                      <td className="cell-num">{w.total_videos ?? '—'}</td>
                      <td className="cell-num">{w.videos_uploaded_this_week ?? 0}</td>
                      <td className="cell-num">{fmt(w.avg_views_last_10_videos)}</td>
                      <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(w.scraped_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
