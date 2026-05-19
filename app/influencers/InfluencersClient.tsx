'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import type { Influencer, InfluencerPost } from './page'

interface Props {
  influencers: Influencer[]
  posts: InfluencerPost[]
  totalReach: number
  totalLikes: number
  totalViews: number
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

function sentimentColor(s: string | null | undefined): string {
  if (!s) return 'var(--fg-4)'
  const low = s.toLowerCase()
  if (low.includes('positive')) return 'var(--joola)'
  if (low.includes('negative')) return '#f87171'
  return 'var(--fg-3)'
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

type SortKey = 'athlete' | 'platform' | 'likes' | 'views' | 'comments' | 'sentiment' | 'sponsored' | 'date'

interface PlatformStat {
  count: number
  likes: number
  views: number
}

export default function InfluencersClient({ influencers, posts, totalReach, totalLikes, totalViews }: Props) {
  const [selectedInf, setSelectedInf] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('likes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const infMap = useMemo(() => {
    const m: Record<string, Influencer> = {}
    for (const inf of influencers) m[inf.id] = inf
    return m
  }, [influencers])

  // Aggregate posts per athlete per platform
  const platformStats = useMemo(() => {
    const m: Record<string, Record<string, PlatformStat>> = {}
    for (const p of posts) {
      if (!m[p.influencer_id]) m[p.influencer_id] = {}
      const plat = (p.platform || 'unknown').toLowerCase()
      if (!m[p.influencer_id][plat]) m[p.influencer_id][plat] = { count: 0, likes: 0, views: 0 }
      m[p.influencer_id][plat].count += 1
      m[p.influencer_id][plat].likes += p.like_count ?? 0
      m[p.influencer_id][plat].views += p.view_count ?? 0
    }
    return m
  }, [posts])

  // Cross-platform totals
  const platformTotals = useMemo(() => {
    const m: Record<string, { athletes: number; posts: number; likes: number; views: number; reach: number }> = {
      instagram: { athletes: 0, posts: 0, likes: 0, views: 0, reach: 0 },
      tiktok: { athletes: 0, posts: 0, likes: 0, views: 0, reach: 0 },
      youtube: { athletes: 0, posts: 0, likes: 0, views: 0, reach: 0 },
      x: { athletes: 0, posts: 0, likes: 0, views: 0, reach: 0 },
    }
    for (const inf of influencers) {
      if (inf.instagram_handle) { m.instagram.athletes++; m.instagram.reach += inf.follower_count_ig ?? 0 }
      if (inf.tiktok_handle) m.tiktok.athletes++
      if (inf.youtube_channel_url) { m.youtube.athletes++; m.youtube.reach += inf.follower_count_yt ?? 0 }
    }
    for (const p of posts) {
      const plat = (p.platform || '').toLowerCase()
      if (m[plat]) {
        m[plat].posts++
        m[plat].likes += p.like_count ?? 0
        m[plat].views += p.view_count ?? 0
      }
    }
    return m
  }, [influencers, posts])

  const filteredPosts = useMemo(() => {
    let list = posts
    if (selectedInf !== 'all') list = list.filter(p => p.influencer_id === selectedInf)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.caption?.toLowerCase().includes(q) ||
        infMap[p.influencer_id]?.name?.toLowerCase().includes(q)
      )
    }
    const m = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'athlete': return ((infMap[a.influencer_id]?.name ?? '').localeCompare(infMap[b.influencer_id]?.name ?? '')) * m
        case 'platform': return ((a.platform ?? '').localeCompare(b.platform ?? '')) * m
        case 'likes': return ((a.like_count ?? 0) - (b.like_count ?? 0)) * m
        case 'views': return ((a.view_count ?? 0) - (b.view_count ?? 0)) * m
        case 'comments': return ((a.comment_count ?? 0) - (b.comment_count ?? 0)) * m
        case 'sentiment': return ((a.sentiment ?? '').localeCompare(b.sentiment ?? '')) * m
        case 'sponsored': return ((a.is_sponsored ? 1 : 0) - (b.is_sponsored ? 1 : 0)) * m
        case 'date': return ((a.posted_at ?? '').localeCompare(b.posted_at ?? '')) * m
      }
    })
  }, [posts, selectedInf, search, sortKey, sortDir, infMap])

  const avgLikesPerPost = posts.length ? Math.round(totalLikes / posts.length) : 0
  const selectedInfData = selectedInf !== 'all' ? infMap[selectedInf] : null

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
          Influencers
          <Tip text="JOOLA's sponsored athletes and how their content performs across social platforms (Instagram, TikTok, YouTube, X)." />
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
          JOOLA sponsored athletes &amp; their content performance
        </div>
      </div>

      {/* Top KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Athletes
            <Tip text="JOOLA's sponsored pro athletes — the influencer roster JOOLA pays to represent the brand." />
          </div>
          <div className="value">{influencers.length}</div>
          <div className="delta up">all sponsored</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Reach
            <Tip text="Combined follower count across all sponsored athletes (Instagram + YouTube). This is JOOLA's earned-media potential — every post can reach this many people." />
          </div>
          <div className="value">{fmt(totalReach + platformTotals.youtube.reach)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>
            {fmt(totalReach)} IG · {fmt(platformTotals.youtube.reach)} YT
          </div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Posts Tracked
            <Tip text="Posts from JOOLA athletes that we have in our database. Right now only Instagram posts are being scraped." />
          </div>
          <div className="value">{posts.length}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>across all athletes</div>
        </div>
        <div className="kpi warn">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Views
            <Tip text="Sum of views across all athlete posts. A direct measure of how much eyeball-time JOOLA's sponsored athletes generate for the brand." />
          </div>
          <div className="value">{fmt(totalViews)}</div>
          <div className="delta up">all platforms</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Avg Likes / Post
            <Tip text="Average likes per athlete post. Compare this against JOOLA's own brand-account posts to see how much extra engagement athletes deliver." />
          </div>
          <div className="value">{fmt(avgLikesPerPost)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{fmt(totalLikes)} total likes</div>
        </div>
      </div>

      {/* Cross-platform comparison strip */}
      <div className="card card-pad-lg" style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          Cross-Platform Comparison
          <Tip text="How JOOLA's athlete roster is distributed across each social platform. Empty columns mean either no athletes have an account there yet, or the scraper hasn't started pulling that data." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(['instagram', 'tiktok', 'youtube', 'x'] as const).map(plat => {
            const stats = platformTotals[plat]
            const isLive = stats.posts > 0 || stats.athletes > 0
            const label = plat === 'instagram' ? 'Instagram' : plat === 'tiktok' ? 'TikTok' : plat === 'youtube' ? 'YouTube' : 'X / Twitter'
            const color = plat === 'instagram' ? '#e1306c' : plat === 'tiktok' ? '#69C9D0' : plat === 'youtube' ? '#FF0000' : '#FFFFFF'
            return (
              <div
                key={plat}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: isLive ? 'var(--bg-3)' : 'transparent',
                  border: isLive ? '1px solid var(--bg-3)' : '1px dashed var(--bg-3)',
                  opacity: isLive ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                  {stats.athletes}<span style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 500 }}> / {influencers.length}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  athletes connected
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                  <div>{stats.posts} posts</div>
                  <div>{fmt(stats.likes)} likes</div>
                  <div>{fmt(stats.views)} views</div>
                  {stats.reach > 0 && <div>{fmt(stats.reach)} reach</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-athlete cards with 4-platform breakdown */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
        Athletes
        <Tip text="One card per sponsored athlete showing their presence on each platform. Click a card to filter the posts table below." />
      </div>
      {/* Fix BUG-02: alignContent:start + alignItems:stretch prevents the grid from spreading rows
          vertically and leaving a tall blank gap before the next section. */}
      <div className="card-grid cg-3" style={{
        marginBottom: 24,
        alignContent: 'start',
        alignItems: 'stretch',
      }}>
        {influencers.map(inf => {
          const ps = platformStats[inf.id] ?? {}
          const platforms = [
            {
              key: 'instagram',
              label: 'IG',
              handle: inf.instagram_handle,
              url: inf.instagram_handle ? `https://instagram.com/${inf.instagram_handle}` : null,
              followers: inf.follower_count_ig,
              posts: ps.instagram?.count ?? 0,
              color: '#e1306c',
            },
            {
              key: 'tiktok',
              label: 'TT',
              handle: inf.tiktok_handle,
              url: inf.tiktok_handle ? `https://tiktok.com/@${inf.tiktok_handle}` : null,
              followers: null as number | null,
              posts: ps.tiktok?.count ?? 0,
              color: '#69C9D0',
            },
            {
              key: 'youtube',
              label: 'YT',
              handle: inf.youtube_channel_url,
              url: inf.youtube_channel_url,
              followers: inf.follower_count_yt,
              posts: ps.youtube?.count ?? 0,
              color: '#FF0000',
            },
            {
              key: 'x',
              label: 'X',
              handle: null,
              url: null,
              followers: null as number | null,
              posts: ps.x?.count ?? 0,
              color: '#FFFFFF',
            },
          ]
          const totalAthleteLikes = Object.values(ps).reduce((s, x) => s + x.likes, 0)
          const totalAthleteViews = Object.values(ps).reduce((s, x) => s + x.views, 0)
          const totalAthletePosts = Object.values(ps).reduce((s, x) => s + x.count, 0)

          return (
            <div
              key={inf.id}
              className="card card-pad-lg"
              style={{
                cursor: 'pointer',
                outline: selectedInf === inf.id ? '2px solid var(--yellow)' : '2px solid transparent',
                transition: 'outline 0.15s',
                opacity: inf.is_active ? 1 : 0.55,
              }}
              onClick={() => setSelectedInf(selectedInf === inf.id ? 'all' : inf.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--yellow)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', flexShrink: 0,
                }}>
                  {initials(inf.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {inf.name}
                    {!inf.is_active && (
                      <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        inactive
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{inf.type ?? 'Athlete'}</div>
                </div>
              </div>

              {/* 4-platform mini grid — each connected cell is a link to the profile */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 14 }}>
                {platforms.map(p => {
                  const connected = !!p.handle
                  const cellStyle: React.CSSProperties = {
                    padding: '8px 6px',
                    borderRadius: 6,
                    background: connected ? 'var(--bg-3)' : 'transparent',
                    border: connected ? 'none' : '1px dashed var(--bg-3)',
                    textAlign: 'center',
                    opacity: connected ? 1 : 0.4,
                    display: 'block',
                    color: 'inherit',
                    textDecoration: 'none',
                    cursor: connected && p.url ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }
                  const content = (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.color }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '0.05em' }}>{p.label}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: connected ? 'var(--fg-1)' : 'var(--fg-4)' }}>
                        {connected ? (p.followers ? fmt(p.followers) : '·') : '—'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--fg-4)', marginTop: 1 }}>
                        {connected ? `${p.posts}p` : 'n/a'}
                      </div>
                    </>
                  )
                  return connected && p.url ? (
                    <a
                      key={p.key}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      title={`Open ${inf.name} on ${p.label === 'IG' ? 'Instagram' : p.label === 'TT' ? 'TikTok' : p.label === 'YT' ? 'YouTube' : 'X'}`}
                      style={cellStyle}
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={p.key} style={cellStyle}>{content}</div>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid var(--bg-3)' }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--fg-4)', textTransform: 'uppercase' }}>Posts</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{totalAthletePosts}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--fg-4)', textTransform: 'uppercase' }}>Likes</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(totalAthleteLikes)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--fg-4)', textTransform: 'uppercase' }}>Views</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(totalAthleteViews)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Posts table */}
      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Posts
            <Tip text="Every post we have data for from JOOLA's sponsored athletes. Click any column header to sort. Click an athlete name to filter to just their posts." />
            {selectedInfData && (
              <span style={{ marginLeft: 8, color: 'var(--yellow)', fontWeight: 700 }}>
                — {selectedInfData.name}
              </span>
            )}
            <span style={{ marginLeft: 8, color: 'var(--fg-3)', fontWeight: 400 }}>({filteredPosts.length})</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedInf !== 'all' && (
              <button
                className="btn"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setSelectedInf('all')}
              >
                Show all athletes
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>
              Click any column to sort
            </span>
          </div>
        </div>
        <input
          className="fld"
          placeholder="Search posts or athletes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {filteredPosts.length === 0 ? (
          <div className="empty">No posts match your filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableTh active={sortKey === 'athlete'} direction={sortDir} onClick={() => setSort('athlete')} title="JOOLA-sponsored athlete who created the post. Click their name to filter to just their posts.">Athlete</SortableTh>
                  <SortableTh active={sortKey === 'platform'} direction={sortDir} onClick={() => setSort('platform')} title="Social platform the post was made on">Platform</SortableTh>
                  <SortableTh active={sortKey === 'likes'} direction={sortDir} onClick={() => setSort('likes')} num title="Total likes on the post">Likes</SortableTh>
                  <SortableTh active={sortKey === 'views'} direction={sortDir} onClick={() => setSort('views')} num title="Total views (for videos and reels)">Views</SortableTh>
                  <SortableTh active={sortKey === 'comments'} direction={sortDir} onClick={() => setSort('comments')} num title="Total comments on the post">Comments</SortableTh>
                  <SortableTh active={sortKey === 'sentiment'} direction={sortDir} onClick={() => setSort('sentiment')} title="AI-classified sentiment of comments on the post">Sentiment</SortableTh>
                  <SortableTh active={sortKey === 'sponsored'} direction={sortDir} onClick={() => setSort('sponsored')} title="Whether the post is marked as sponsored content">Sponsored</SortableTh>
                  <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the post was published">Posted</SortableTh>
                  <th style={{ width: 40 }} aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(p => {
                  const inf = infMap[p.influencer_id]
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>
                        <button
                          type="button"
                          className="tlink"
                          onClick={() => setSelectedInf(selectedInf === p.influencer_id ? 'all' : p.influencer_id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
                          title="Filter posts to this athlete only"
                        >
                          {inf?.name ?? '—'}
                        </button>
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 10, textTransform: 'capitalize' }}>{p.platform}</span>
                      </td>
                      <td className="cell-num" style={{ fontWeight: 600 }}>{fmt(p.like_count)}</td>
                      <td className="cell-num">{fmt(p.view_count)}</td>
                      <td className="cell-num">{fmt(p.comment_count)}</td>
                      <td>
                        {p.sentiment ? (
                          <span style={{ fontSize: 12, color: sentimentColor(p.sentiment) }}>
                            {formatEnum(p.sentiment)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.is_sponsored ? (
                          <span className="pill-joola" style={{ fontSize: 10 }}>YES</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>—</span>
                        )}
                      </td>
                      <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(p.posted_at)}</td>
                      <td><ExtLink href={p.post_url} label="Open post" /></td>
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
