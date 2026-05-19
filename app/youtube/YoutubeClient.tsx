'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import type { YtChannel, YtVideo, YtChannelWeekly } from './page'

interface Props {
  channel: YtChannel | null
  videos: YtVideo[]
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

type VideoFilter = 'all' | 'short' | 'long'
type SortKey = 'title' | 'type' | 'views' | 'likes' | 'comments' | 'duration' | 'date'

export default function YoutubeClient({ channel, videos, weeklyStats, latestWeek, latestSubscribers, latestTotalVideos, totalViews, totalLikes, topVideoViews }: Props) {
  const [tab, setTab] = useState<'videos' | 'stats'>('videos')
  const [filter, setFilter] = useState<VideoFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = videos
    if (filter === 'short') list = list.filter(v => v.is_short)
    if (filter === 'long') list = list.filter(v => !v.is_short)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v => v.title?.toLowerCase().includes(q))
    }
    const m = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'title': return ((a.title ?? '').localeCompare(b.title ?? '')) * m
        case 'type': return ((a.is_short ? 1 : 0) - (b.is_short ? 1 : 0)) * m
        case 'views': return ((a.view_count ?? 0) - (b.view_count ?? 0)) * m
        case 'likes': return ((a.like_count ?? 0) - (b.like_count ?? 0)) * m
        case 'comments': return ((a.comment_count ?? 0) - (b.comment_count ?? 0)) * m
        case 'duration': return ((a.duration_seconds ?? 0) - (b.duration_seconds ?? 0)) * m
        case 'date': return ((a.published_at ?? '').localeCompare(b.published_at ?? '')) * m
      }
    })
  }, [videos, filter, search, sortKey, sortDir])

  const shorts = videos.filter(v => v.is_short).length
  const longform = videos.length - shorts

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            YouTube
            <Tip text="JOOLA's YouTube channel performance — every video we have data for, plus weekly subscriber and view-count snapshots." />
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
            <Tip text="People who follow JOOLA's YouTube channel. Subscribers see new uploads in their feed and are the long-term audience." />
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
            <Tip text="Number of JOOLA videos we have detailed data for. The total is what YouTube reports as the channel's lifetime upload count." />
          </div>
          <div className="value">{videos.length}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>
            {latestTotalVideos != null ? `of ${latestTotalVideos.toLocaleString()} total` : 'channel total unknown'}
          </div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Views
            <Tip text="Combined view count across every scraped video. A direct measure of how much time people have spent watching JOOLA content." />
          </div>
          <div className="value">{fmt(totalViews)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>scraped videos</div>
        </div>
        <div className="kpi warn">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Top Video
            <Tip text="The single most-watched JOOLA video. Worth studying — its format, hook, and topic show what resonates with the audience." />
          </div>
          <div className="value">{fmt(topVideoViews)}</div>
          <div className="delta up">views</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Likes
            <Tip text="Combined likes across all videos. Shorts are vertical videos under 60 seconds; Long-form are regular landscape videos." />
          </div>
          <div className="value">{fmt(totalLikes)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{shorts} Shorts · {longform} Long-form</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20, alignItems: 'center', display: 'flex' }}>
        <button className={'tab' + (tab === 'videos' ? ' on' : '')} onClick={() => setTab('videos')}>Videos ({videos.length})</button>
        <button className={'tab' + (tab === 'stats' ? ' on' : '')} onClick={() => setTab('stats')}>Channel Stats ({weeklyStats.length} weeks)</button>
        <Tip text={tab === 'videos' ? "Every JOOLA video we have data for. Filter by Shorts vs Long-form and sort by any column." : "Weekly snapshots of channel-wide metrics. Use these to see subscriber growth and upload cadence over time."} />
      </div>

      {tab === 'videos' && (
        <div className="card card-pad-lg">
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'short', 'long'] as VideoFilter[]).map(f => (
                <button
                  key={f}
                  className={'chip' + (filter === f ? ' on' : '')}
                  onClick={() => setFilter(f)}
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
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
          />

          {filtered.length === 0 ? (
            <div className="empty">No videos match your filters.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }} title="Video thumbnail">Thumb</th>
                    <SortableTh active={sortKey === 'title'} direction={sortDir} onClick={() => setSort('title')} title="Video title">Title</SortableTh>
                    <SortableTh active={sortKey === 'type'} direction={sortDir} onClick={() => setSort('type')} style={{ width: 72 }} title="Shorts are vertical videos under 60 seconds; Long-form are regular landscape videos.">Type</SortableTh>
                    <SortableTh active={sortKey === 'views'} direction={sortDir} onClick={() => setSort('views')} num title="Total views on the video">Views</SortableTh>
                    <SortableTh active={sortKey === 'likes'} direction={sortDir} onClick={() => setSort('likes')} num title="Total likes on the video">Likes</SortableTh>
                    <SortableTh active={sortKey === 'comments'} direction={sortDir} onClick={() => setSort('comments')} num title="Total comments on the video">Comments</SortableTh>
                    <SortableTh active={sortKey === 'duration'} direction={sortDir} onClick={() => setSort('duration')} num title="Video length in minutes:seconds">Duration</SortableTh>
                    <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the video was published on YouTube">Published</SortableTh>
                    <th style={{ width: 40 }} aria-label="Open"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
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
                        {v.is_short ? (
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
