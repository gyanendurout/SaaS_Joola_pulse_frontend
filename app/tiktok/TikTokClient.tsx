'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import type { TikTokAccount, TikTokVideo } from './page'

interface Props {
  account: TikTokAccount | null
  videos: TikTokVideo[]
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  topViews: number
  enrichedCount: number
  crisisCount: number
  opportunityCount: number
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

export default function TikTokClient({ account, videos, totalViews, totalLikes, totalComments, totalShares, topViews, enrichedCount, crisisCount, opportunityCount }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterFlag, setFilterFlag] = useState<'all' | 'crisis' | 'opportunity'>('all')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

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
          <div style={{ overflowX: 'auto' }}>
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
                {filtered.map(v => {
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
