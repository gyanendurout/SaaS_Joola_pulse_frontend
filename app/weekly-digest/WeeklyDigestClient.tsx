'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Tip } from '@/components/ui/Tip'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { formatEnum } from '@/lib/format'
import type { IgWeeklySnapshot, IgPost, IgWishlistItem, IgComplaintLog, IgLoyalUser } from '@/lib/types'

type SuperFan = Pick<IgLoyalUser, 'username' | 'loyalty_tier' | 'ambassador_score' | 'total_comments' | 'dominant_topic' | 'first_seen_at' | 'last_seen_at' | 'purchase_intent_count'>

interface Delta { abs: number; pct: number }

interface Props {
  current: IgWeeklySnapshot | null
  previous: IgWeeklySnapshot | null
  deltas: {
    posts: Delta
    comments: Delta
    views: Delta
    er: Delta
    complaints: Delta
    purchase: Delta
    competitor: Delta
    wishlist: Delta
    sentiment: Delta
  } | null
  topPost: IgPost | null
  topComplaint: IgComplaintLog | null
  wishlist: IgWishlistItem[]
  superFans: SuperFan[]
  competitorBreakdown: Array<{ name: string; count: number }>
  history: IgWeeklySnapshot[]
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toLocaleString()
}

function DeltaPill({ d, inverted = false }: { d: Delta; inverted?: boolean }) {
  const positive = d.abs > 0
  const goodDirection = inverted ? !positive : positive
  const color = d.abs === 0 ? 'var(--fg-4)' : goodDirection ? 'var(--joola)' : 'var(--red)'
  const arrow = d.abs === 0 ? '—' : positive ? '▲' : '▼'
  // UX-10: when the prior period was tiny, the percentage delta is misleading
  // (e.g. 1 post → 9 posts = +800%). Above 200% switch to absolute change.
  const useAbs = Math.abs(d.pct) > 200
  const display = useAbs
    ? (d.abs > 0 ? '+' : '') + d.abs.toLocaleString()
    : Math.abs(d.pct).toFixed(1) + '%'
  return (
    <span
      className="mono"
      style={{ fontSize: 11, color, fontWeight: 700 }}
      title={useAbs ? `${Math.abs(d.pct).toFixed(0)}% — comparison vs a very small prior period, shown as absolute change for clarity` : undefined}
    >
      {arrow} {display}
    </span>
  )
}

function StatCard({ label, value, sub, delta, invertedDelta = false, tooltip }: {
  label: string; value: string; sub?: string; delta?: Delta; invertedDelta?: boolean; tooltip?: string
}) {
  return (
    <div className="card card-pad-lg">
      <div style={{ fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>
        {label}{tooltip && <Tip text={tooltip} />}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{sub || ''}</span>
        {delta && <DeltaPill d={delta} inverted={invertedDelta} />}
      </div>
    </div>
  )
}

type HistSortKey = 'week' | 'posts' | 'comments' | 'views' | 'er' | 'sent' | 'complaints' | 'intent'

export default function WeeklyDigestClient({
  current, previous, deltas, topPost, topComplaint, wishlist, superFans, competitorBreakdown, history,
}: Props) {
  const [histSk, setHistSk] = useState<HistSortKey>('week')
  const [histSd, setHistSd] = useState<'asc' | 'desc'>('desc')

  function histSort(k: HistSortKey) {
    if (k === histSk) setHistSd((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setHistSk(k); setHistSd('desc') }
  }
  const sortedHistory = useMemo(() => {
    const dir = histSd === 'desc' ? -1 : 1
    return [...history].sort((a, b) => {
      if (histSk === 'week') return dir * (new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
      if (histSk === 'posts') return dir * ((a.posts_published ?? 0) - (b.posts_published ?? 0))
      if (histSk === 'comments') return dir * ((a.total_comments ?? 0) - (b.total_comments ?? 0))
      if (histSk === 'views') return dir * ((a.total_views ?? 0) - (b.total_views ?? 0))
      if (histSk === 'er') return dir * ((a.avg_engagement_rate ?? 0) - (b.avg_engagement_rate ?? 0))
      if (histSk === 'sent') return dir * ((a.avg_sentiment_score ?? 0) - (b.avg_sentiment_score ?? 0))
      if (histSk === 'complaints') return dir * ((a.complaint_count ?? 0) - (b.complaint_count ?? 0))
      if (histSk === 'intent') return dir * ((a.purchase_intent_count ?? 0) - (b.purchase_intent_count ?? 0))
      return 0
    })
  }, [history, histSk, histSd])

  if (!current) {
    return (
      <div>
        <header className="page-head">
          <div>
            <div className="eyebrow"><span className="live-pulse-dot" />JOOLA PULSE · WEEKLY REPORT</div>
            <h1>WEEKLY <em>DIGEST</em></h1>
            <div className="sub">No weekly data yet — run the IG scraper to populate snapshots.</div>
          </div>
        </header>
        <div className="empty">No snapshots available.</div>
      </div>
    )
  }

  const weekLabel = `${format(new Date(current.week_start), 'MMM d')} – ${format(new Date(current.week_end), 'MMM d, yyyy')}`
  const generatedLabel = format(new Date(), 'MMM d, yyyy')

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            JOOLA PULSE · WEEKLY REPORT
          </div>
          <h1>WEEKLY <em>DIGEST</em></h1>
          <div className="sub">
            Auto-generated marketing report card for the week of <strong style={{ color: 'var(--fg)' }}>{weekLabel}</strong>.
            All metrics compared to the prior week. Designed for export to PDF or email.
          </div>
          <div
            className="print-only mono"
            aria-hidden
            style={{ display: 'none', fontSize: 10, color: '#555', marginTop: 4 }}
          >
            Generated {generatedLabel}
          </div>
        </div>
        <div className="head-actions" data-print="hide">
          <button className="btn btn-yellow" data-print="hide" onClick={() => window.print()}>
            🖨 Print / PDF
          </button>
        </div>
      </header>

      {/* Top-line stats */}
      <div className="section">
        <div className="kpi-grid">
          <StatCard label="Posts Published" value={fmtNum(current.posts_published)}
            sub="this week vs last week" delta={deltas?.posts}
            tooltip="How many posts JOOLA published this week compared to last week" />
          <StatCard label="Total Comments" value={fmtNum(current.total_comments)}
            sub={`${fmtNum(current.total_likes)} likes`} delta={deltas?.comments}
            tooltip="Total audience comments received this week — a measure of how much your content sparked conversation" />
          <StatCard label="Total Views" value={fmtNum(current.total_views)}
            sub="reels + video" delta={deltas?.views}
            tooltip="Combined view count across all Reels and video content published this week" />
          <StatCard label="Avg Engagement Rate" value={(current.avg_engagement_rate * 100).toFixed(2) + '%'}
            sub="(likes + comments) ÷ reach" delta={deltas?.er}
            tooltip="Engagement Rate = (likes + comments) ÷ people who saw the post. Example: post seen by 10,000 with 600 likes + 50 comments = 6.5%. Benchmarks: 6%+ excellent, 3–6% healthy, under 3% needs attention." />
        </div>
      </div>

      <div className="section">
        <div className="kpi-grid">
          <StatCard label="Purchase Signals" value={fmtNum(current.purchase_intent_count)}
            sub="AI-detected buy intent" delta={deltas?.purchase}
            tooltip="Comments this week where fans indicated they want to buy a product — warm leads for the sales team" />
          <StatCard label="Complaints" value={fmtNum(current.complaint_count)}
            sub="negative + flagged" delta={deltas?.complaints} invertedDelta
            tooltip="Negative comments flagged this week — lower is better. Spikes signal a product or service issue to investigate." />
          <StatCard label="Competitor Mentions" value={fmtNum(current.competitor_mention_count)}
            sub="in your own post comments" delta={deltas?.competitor} invertedDelta
            tooltip="How many times competing brands were mentioned in your own comment sections this week" />
          <StatCard label="Wishlist Items" value={fmtNum(current.wishlist_count ?? 0)}
            sub="product requests" delta={deltas?.wishlist}
            tooltip="Product and feature requests from fans this week — feed these into your product roadmap" />
        </div>
      </div>

      {/* Sentiment + Theme + New audience */}
      <div className="section">
        <div className="card-grid cg-3">
          <div className="card card-pad-lg">
            <div className="card-head"><h3>SENTIMENT MIX<Tip text="Overall tone of your audience's comments this week — more positive % means your content resonated well." /></h3><span className="meta">this week</span></div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--joola)' }}>
                  {(current.positive_comment_pct ?? 0).toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>positive</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#94a3b8' }}>
                  {(current.neutral_comment_pct ?? 0).toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>neutral</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>
                  {(current.negative_comment_pct ?? 0).toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>negative</div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-3)' }}>
              <span>Avg sentiment score</span>
              <span className="mono" style={{ fontWeight: 700, color: (current.avg_sentiment_score ?? 0) >= 0 ? 'var(--joola)' : 'var(--red)' }}>
                {(current.avg_sentiment_score ?? 0).toFixed(3)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
              <span>Top emotion</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--yellow)' }}>
                {formatEnum(current.top_emotion)}
              </span>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head"><h3>DOMINANT THEME<Tip text="The content theme you posted most this week. Consistent theming helps your audience know what to expect and builds brand identity." /></h3><span className="meta">what we posted this week</span></div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)', marginBottom: 8 }}>
              {formatEnum(current.dominant_content_theme)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              Out of {current.posts_published} posts this week, this was the most-used content theme.
            </div>
            {current.top_post_engagement != null && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.08em' }}>BEST POST</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--joola)', marginTop: 2 }}>
                  {(current.top_post_engagement || 0).toLocaleString()} interactions
                </div>
              </>
            )}
          </div>

          <div className="card card-pad-lg">
            <div className="card-head"><h3>AUDIENCE<Tip text="New vs returning commenters shows whether you're growing your community or retaining an existing one. New super fans are your emerging advocates." /></h3><span className="meta">commenter growth · this week</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>New commenters</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--joola)' }}>+{current.new_commenters ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Returning</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)' }}>{current.returning_commenters ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>New super fans</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--pink)' }}>{current.new_super_fans ?? 0}</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-3)' }}>
              <span>JOOLA replies</span>
              <span className="mono" style={{ fontWeight: 700 }}>{current.joola_reply_count ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
              <span>Avg response time</span>
              <span className="mono" style={{ fontWeight: 700 }}>{current.avg_joola_response_time_mins != null ? current.avg_joola_response_time_mins + ' min' : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Post + Top Complaint */}
      <div className="section">
        <div className="card-grid cg-2">
          <div className="card card-pad-lg">
            <div className="card-head"><h3>★ TOP POST<Tip text="The single post that drove the most engagement this week. Study it to understand what content formula is working right now." /></h3><span className="meta">by ER this week</span></div>
            {topPost ? (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {topPost.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={topPost.thumbnail_url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 6, lineHeight: 1.4 }}>
                    &ldquo;{(topPost.caption || '').slice(0, 160)}{(topPost.caption?.length ?? 0) > 160 ? '…' : ''}&rdquo;
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--fg-4)', flexWrap: 'wrap' }} className="mono">
                    <span><span style={{ color: 'var(--joola)', fontWeight: 700 }}>{((topPost.engagement_rate || 0) * 100).toFixed(2)}%</span> ER</span>
                    <span>{fmtNum(topPost.like_count)} likes</span>
                    <span>{fmtNum(topPost.comment_count)} comments</span>
                    <span>{fmtNum(topPost.view_count)} views</span>
                  </div>
                  {topPost.post_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <a href={topPost.post_url} target="_blank" rel="noopener noreferrer" className="tlink" style={{ fontSize: 11 }}>
                        view on Instagram
                      </a>
                      <ExtLink href={topPost.post_url} label="Open on Instagram" />
                    </div>
                  )}
                </div>
              </div>
            ) : <div className="empty">No posts this week.</div>}
          </div>

          <div className="card card-pad-lg">
            <div className="card-head"><h3>⚠ TOP COMPLAINT<Tip text="The most severe complaint this week. If it hasn't been responded to, do it now — unresolved high-severity complaints spread." /></h3><span className="meta">most severe this week</span></div>
            {topComplaint ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 8, lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{topComplaint.complaint_text}&rdquo;
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>@{topComplaint.username}</span>
                  <span className={'pill ' + ((topComplaint.severity || 'low').toLowerCase() === 'high' ? 'pill-red' : (topComplaint.severity || '').toLowerCase() === 'medium' ? 'pill-amber' : 'pill-ghost')}>
                    {formatEnum(topComplaint.severity || 'low')}
                  </span>
                  {topComplaint.complaint_category && (
                    <span className="pill pill-ghost">{formatEnum(topComplaint.complaint_category)}</span>
                  )}
                  <span className="mono" style={{ fontSize: 11, color: topComplaint.joola_responded ? 'var(--joola)' : 'var(--warn)' }}>
                    {topComplaint.joola_responded ? '✓ resolved' : 'pending'}
                  </span>
                </div>
              </div>
            ) : <div className="empty">No complaints this week. 🎉</div>}
          </div>
        </div>
      </div>

      {/* Top wishlist + Competitors + Super fans */}
      <div className="section">
        <div className="card-grid cg-3">
          <div className="card card-pad-lg">
            <div className="card-head"><h3>★ TOP WISHLIST<Tip text="Most-requested products and features from fans across all time — your crowdsourced R&D backlog." /></h3><span className="meta">all-time, ranked</span></div>
            <div style={{ maxHeight: 280, overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {wishlist.length === 0 ? <div className="empty">No requests.</div> :
                wishlist.map((w, i) => (
                  <div key={w.comment_id ?? i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.4 }}>
                      &ldquo;{(w.wishlist_text || '').slice(0, 90)}{(w.wishlist_text?.length ?? 0) > 90 ? '…' : ''}&rdquo;
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', fontSize: 10 }}>
                      {w.category && <span className="pill pill-ghost" style={{ fontSize: 9 }}>{formatEnum(w.category)}</span>}
                      {w.times_similar_requested != null && w.times_similar_requested > 1 && (
                        <span className="pill pill-yellow" style={{ fontSize: 9 }}>×{w.times_similar_requested}</span>
                      )}
                      <span className="mono" style={{ color: 'var(--fg-4)' }}>@{w.username}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head"><h3>⚐ COMPETITOR MENTIONS<Tip text="How many times each competitor was mentioned in your comment sections this week — monitor for rising trends." /></h3><span className="meta">this week</span></div>
            {competitorBreakdown.length === 0 ? <div className="empty">No competitor mentions this week.</div> :
              competitorBreakdown.map((c) => {
                const max = competitorBreakdown[0].count || 1
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 40px', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{formatEnum(c.name)}</span>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: ((c.count / max) * 100) + '%', height: '100%', background: 'var(--warn)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, textAlign: 'right', fontWeight: 700 }}>{c.count}</span>
                  </div>
                )
              })
            }
          </div>

          <div className="card card-pad-lg">
            <div className="card-head"><h3>★ SUPER FANS<Tip text="Your most loyal and active fans ranked by ambassador score — consider engaging them directly for UGC or ambassador partnerships." /></h3><span className="meta">top loyalty · all-time</span></div>
            {superFans.length === 0 ? <div className="empty">No super fans yet.</div> :
              superFans.slice(0, 6).map((u, i) => (
                <div key={u.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div>
                    <a href={`https://instagram.com/${u.username}`} target="_blank" rel="noopener noreferrer" className="tlink" style={{ fontWeight: 700, fontSize: 12 }}>
                      @{u.username}
                    </a>
                    {u.dominant_topic && (
                      <span className="pill pill-ghost" style={{ marginLeft: 6, fontSize: 9 }}>{formatEnum(u.dominant_topic)}</span>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>
                    {(u.ambassador_score || 0).toFixed(1)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* History strip */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>8-WEEK HISTORY<Tip text="Your key metrics week by week so you can spot trends, seasonal patterns, and the impact of specific content pushes. Click any column to sort." /></h3>
            <span className="meta">posts · comments · ER · sentiment · last 8 wk</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <SortableTh active={histSk === 'week'} direction={histSd} onClick={() => histSort('week')} title="Week starting date">WEEK</SortableTh>
                  <SortableTh active={histSk === 'posts'} direction={histSd} onClick={() => histSort('posts')} num title="Posts published this week">POSTS</SortableTh>
                  <SortableTh active={histSk === 'comments'} direction={histSd} onClick={() => histSort('comments')} num title="Total comments received this week">COMMENTS</SortableTh>
                  <SortableTh active={histSk === 'views'} direction={histSd} onClick={() => histSort('views')} num title="Total post views this week">VIEWS</SortableTh>
                  <SortableTh active={histSk === 'er'} direction={histSd} onClick={() => histSort('er')} num title="Average engagement rate this week — (likes + comments) ÷ reach">ER</SortableTh>
                  <SortableTh active={histSk === 'sent'} direction={histSd} onClick={() => histSort('sent')} num title="Average sentiment score this week (-1 to +1). Higher is better.">SENT</SortableTh>
                  <SortableTh active={histSk === 'complaints'} direction={histSd} onClick={() => histSort('complaints')} num title="Complaint count this week — spikes indicate product or service issues">COMPLAINTS</SortableTh>
                  <SortableTh active={histSk === 'intent'} direction={histSd} onClick={() => histSort('intent')} num title="Purchase intent signals detected in comments this week">INTENT</SortableTh>
                  <th title="Dominant content theme posted this week">TOP THEME</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((w, i) => (
                  <tr key={w.week_start} className={w.week_start === current.week_start ? 'highlight' : ''}>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {format(new Date(w.week_start), 'MMM d')}
                      {w.week_start === current.week_start && <span className="you-badge">CURRENT</span>}
                    </td>
                    <td className="cell-num">{w.posts_published}</td>
                    <td className="cell-num">{fmtNum(w.total_comments)}</td>
                    <td className="cell-num">{fmtNum(w.total_views)}</td>
                    <td className="cell-num" style={{ color: w.avg_engagement_rate >= 0.06 ? 'var(--joola)' : 'var(--fg)' }}>
                      {(w.avg_engagement_rate * 100).toFixed(2)}%
                    </td>
                    <td className="cell-num" style={{ color: (w.avg_sentiment_score ?? 0) >= 0 ? 'var(--joola)' : 'var(--red)' }}>
                      {(w.avg_sentiment_score ?? 0).toFixed(2)}
                    </td>
                    <td className="cell-num" style={{ color: (w.complaint_count ?? 0) > 0 ? 'var(--red)' : 'var(--fg-3)' }}>
                      {w.complaint_count ?? 0}
                    </td>
                    <td className="cell-num" style={{ color: 'var(--joola)', fontWeight: 600 }}>
                      {w.purchase_intent_count ?? 0}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      {w.dominant_content_theme ? formatEnum(w.dominant_content_theme) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
