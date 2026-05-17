'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import KpiCard from '@/components/ui/KpiCard'
import { Donut, DonutLegend } from '@/components/ui/Donut'
import type { DonutSlice } from '@/components/ui/Donut'
import { Tip } from '@/components/ui/Tip'
import type { IgComment, IgCommentAnalysis, IgWishlistItem } from '@/lib/types'

type EnrichedComment = IgComment &
  Partial<
    Pick<
      IgCommentAnalysis,
      | 'sentiment'
      | 'sentiment_score'
      | 'primary_topic'
      | 'emotion'
      | 'is_question'
      | 'question_text'
      | 'is_complaint'
      | 'complaint_category'
      | 'is_wishlist'
      | 'wishlist_text'
      | 'mentions_competitor'
      | 'competitor_mentioned'
      | 'competitor_context'
      | 'purchase_intent'
    >
  > & {
    post_url?: string
    post_type?: string
  }

interface CompetitorRow {
  name: string
  count: number
  pos: number
  neg: number
  neu: number
}

interface ViralityRow {
  post_id: string
  post_url?: string
  caption: string
  post_type: string
  posted_at: string
  total_comments: number
  first_hour: number
  first_24h: number
  first_hour_pct: number
}

interface CommentsClientProps {
  comments: EnrichedComment[]
  wishlist: IgWishlistItem[]
  sentimentData: Array<{ name: string; value: number }>
  topicData: Array<{ name: string; value: number }>
  emotionData: Array<{ name: string; value: number }>
  competitorData: CompetitorRow[]
  wishlistCategoryData: Array<{ name: string; value: number }>
  totalComments: number
  uniqueUsers: number
  questionsCount: number
  purchaseIntentCount: number
  competitorMentionsCount: number
  wishlistCount: number
  viralityFast: ViralityRow[]
  viralitySlow: ViralityRow[]
}

const SENT_COLORS: Record<string, string> = {
  positive: 'var(--joola)', neutral: '#94a3b8', negative: 'var(--red)',
  unknown: 'var(--fg-4)',
}
const SENT_PILL: Record<string, string> = {
  positive: 'pill-green', neutral: 'pill-ghost', negative: 'pill-red', unknown: 'pill-ghost',
}

const EMOTION_COLORS: Record<string, string> = {
  joy: 'var(--joola)',
  happy: 'var(--joola)',
  excited: 'var(--yellow)',
  surprise: 'var(--cyan)',
  neutral: 'var(--fg-4)',
  curious: 'var(--info)',
  sadness: 'var(--info)',
  fear: 'var(--warn)',
  disgust: 'var(--pink)',
  anger: 'var(--red)',
  frustrated: 'var(--red)',
}

type TabType = 'all' | 'questions' | 'intent' | 'complaints' | 'competitors' | 'wishlist'
type FilterType = 'all' | 'positive' | 'neutral' | 'negative'

function ScoreTag({ score }: { score: number | undefined | null }) {
  if (score == null) return null
  const color = score > 0.2 ? 'var(--joola)' : score < -0.2 ? 'var(--red)' : 'var(--fg-4)'
  return (
    <span className="mono" style={{ fontSize: 10, color, fontWeight: 700, border: '1px solid', borderColor: color, padding: '1px 5px', borderRadius: 3 }}>
      {score > 0 ? '+' : ''}{score.toFixed(2)}
    </span>
  )
}

function HBar({
  data, colorOf, max, tipPrefix,
}: {
  data: Array<{ name: string; value: number }>
  colorOf?: (name: string) => string
  max?: number
  tipPrefix?: string
}) {
  const cap = max ?? Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d) => {
        const pct = (d.value / cap) * 100
        const sharePct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'
        const c = colorOf ? colorOf(d.name) : 'var(--yellow)'
        const tip = `${tipPrefix ? tipPrefix + ' — ' : ''}${d.name}: ${d.value.toLocaleString()} (${sharePct}% of total).`
        return (
          <div
            key={d.name}
            className="hover-row"
            title={tip}
            style={{ display: 'grid', gridTemplateColumns: '88px 1fr 44px', alignItems: 'center', gap: 8, padding: '2px 4px', borderRadius: 4, cursor: 'help' }}
          >
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{d.name}</span>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `max(${pct}%, ${d.value > 0 ? 4 : 0}px)`, height: '100%', background: c, transition: 'width 200ms ease' }} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'right' }}>{d.value.toLocaleString()}</span>
          </div>
        )
      })}
      {data.length === 0 && <div className="empty" style={{ padding: '10px 0', fontSize: 11 }}>No data.</div>}
    </div>
  )
}

function CompetitorTable({ rows }: { rows: CompetitorRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => {
        const total = r.count || 1
        const posPct = (r.pos / total) * 100
        const negPct = (r.neg / total) * 100
        const neuPct = (r.neu / total) * 100
        const barPct = (r.count / max) * 100
        return (
          <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 56px', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-2)', fontWeight: 600, textTransform: 'capitalize' }}>{r.name}</span>
            <div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div title={`${r.pos} positive`} style={{ width: (posPct * barPct / 100) + '%', background: 'var(--joola)' }} />
                <div title={`${r.neu} neutral`}  style={{ width: (neuPct * barPct / 100) + '%', background: '#94a3b8' }} />
                <div title={`${r.neg} negative`} style={{ width: (negPct * barPct / 100) + '%', background: 'var(--red)' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, fontSize: 9.5, color: 'var(--fg-4)' }} className="mono">
                <span style={{ color: 'var(--joola)' }}>+{r.pos}</span>
                <span>·{r.neu}</span>
                <span style={{ color: 'var(--red)' }}>−{r.neg}</span>
              </div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', textAlign: 'right', fontWeight: 700 }}>{r.count}</span>
          </div>
        )
      })}
      {rows.length === 0 && <div className="empty" style={{ padding: '12px 0', fontSize: 11 }}>No competitor mentions detected yet.</div>}
    </div>
  )
}

export default function CommentsClient({
  comments, wishlist, sentimentData, topicData, emotionData, competitorData, wishlistCategoryData,
  totalComments, uniqueUsers, questionsCount, purchaseIntentCount, competitorMentionsCount, wishlistCount,
  viralityFast, viralitySlow,
}: CommentsClientProps) {
  const [tab, setTab] = useState<TabType>('all')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [competitorFilter, setCompetitorFilter] = useState<string>('')

  const positiveCount = comments.filter((c) => (c.sentiment || '').toLowerCase() === 'positive').length
  const negativeCount = comments.filter((c) => (c.sentiment || '').toLowerCase() === 'negative').length
  const positivePct = totalComments > 0 ? (positiveCount / totalComments * 100) : 0
  const negativePct = totalComments > 0 ? (negativeCount / totalComments * 100) : 0

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (tab === 'questions' && !c.is_question) return false
      if (tab === 'intent' && !c.purchase_intent) return false
      if (tab === 'complaints' && !c.is_complaint) return false
      if (tab === 'competitors') {
        if (!c.mentions_competitor) return false
        if (competitorFilter && (c.competitor_mentioned || '').toLowerCase() !== competitorFilter) return false
      }
      if (filter !== 'all' && (c.sentiment || '').toLowerCase() !== filter) return false
      if (search && !c.comment_text?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [comments, tab, filter, search, competitorFilter])

  const filteredWishlist = useMemo(() => {
    if (tab !== 'wishlist') return wishlist
    const q = search.toLowerCase()
    return wishlist.filter((w) =>
      !q ||
      w.wishlist_text?.toLowerCase().includes(q) ||
      (w.category || '').toLowerCase().includes(q) ||
      (w.username || '').toLowerCase().includes(q)
    )
  }, [wishlist, search, tab])

  const matchVirality = (v: ViralityRow, q: string) =>
    !q ||
    (v.caption || '').toLowerCase().includes(q) ||
    (v.post_id || '').toLowerCase().includes(q) ||
    (v.post_type || '').toLowerCase().includes(q)

  const filteredFast = useMemo(() => {
    const q = search.toLowerCase().trim()
    return viralityFast.filter((v) => matchVirality(v, q))
  }, [viralityFast, search])

  const filteredSlow = useMemo(() => {
    const q = search.toLowerCase().trim()
    return viralitySlow.filter((v) => matchVirality(v, q))
  }, [viralitySlow, search])

  const totalSentiment = sentimentData.reduce((s, d) => s + d.value, 0) || 1
  const sentimentSlices: DonutSlice[] = sentimentData.map((d) => ({
    name: d.name,
    pct: (d.value / totalSentiment) * 100,
    n: d.value,
    color: SENT_COLORS[d.name.toLowerCase()] ?? 'var(--fg-4)',
  }))

  const totalTopics = topicData.reduce((s, d) => s + d.value, 0) || 1
  const topicSlices: DonutSlice[] = topicData.map((d, i) => ({
    name: d.name,
    pct: (d.value / totalTopics) * 100,
    n: d.value,
    color: ['var(--yellow)', 'var(--joola)', 'var(--info)', 'var(--cyan)', 'var(--warn)', 'var(--pink)'][i % 6],
  }))

  const emotionColorOf = (n: string) => EMOTION_COLORS[n.toLowerCase()] ?? 'var(--info)'

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            INSTAGRAM · COMMENT INTELLIGENCE
          </div>
          <h1>COMMENT <em>INTEL</em></h1>
          <div className="sub">
            Every comment, AI-classified by sentiment, topic, and intent. Catch complaints early, surface buyers, spot competitor mentions, and find your champions.
          </div>
        </div>
        <div className="head-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              className="fld"
              placeholder={tab === 'wishlist' ? 'Search wishlist…' : 'Search comments…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 0, background: 'transparent', padding: '6px 4px' }}
            />
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="section">
        <div className="kpi-grid">
          <KpiCard label="ALL COMMENTS" src="Instagram · all-time"
            tooltip="Total number of audience comments received across all JOOLA Instagram posts"
            value={totalComments} delta="▲ +18.2%" dir="up" />
          <KpiCard variant="joola" label="POSITIVE SENTIMENT" src="score > 0.2"
            tooltip="Percentage of comments with a positive emotional tone — above 60% means your audience loves what you post"
            value={+positivePct.toFixed(1)} unit="%" delta="▲ +1.8pp" dir="up" />
          <KpiCard variant="danger" label="NEGATIVE SENTIMENT" src="score < −0.2"
            tooltip="Percentage of comments with a negative tone — keep an eye on spikes as they signal a problem post or product issue"
            value={+negativePct.toFixed(1)} unit="%" delta="▲ +0.6pp" dir="down" />
          <KpiCard variant="warn" label="PURCHASE INTENT" src="AI-detected buy signals"
            tooltip="Comments where fans mention buying, ordering, or wanting a product — these are your warmest leads"
            value={purchaseIntentCount} delta="▲ +14.4%" dir="up" />
        </div>
      </div>

      {/* Virality indicator */}
      <div className="section">
        <div className="card-grid cg-2">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>⚡ FAST STARTS<Tip text="Posts that got a big burst of comments in the first hour after publishing — a strong viral signal that means the algorithm gave them a boost." /></h3>
              <span className="meta">most comments in first hour · all-time</span>
            </div>
            {filteredFast.length === 0 ? (
              <div className="empty" style={{ fontSize: 11 }}>
                {search ? 'No fast-start posts match your search.' : 'No fast-start posts yet (need ≥3 comments in first hour).'}
              </div>
            ) : (
              filteredFast.map((v) => {
                const firstHourPct = Math.round(v.first_hour_pct * 100)
                const tip = `${v.post_type?.toUpperCase() || 'POST'} from ${format(new Date(v.posted_at), 'MMM d, yyyy')}. ${v.first_hour} comments in the first hour (${firstHourPct}% of total). ${v.first_24h} comments within 24 hours. ${v.total_comments} comments total. The algorithm typically boosts posts that spike early — replicate the format, hook, or timing of these.`
                return (
                  <div
                    key={v.post_id}
                    className="hover-row"
                    title={tip}
                    style={{ padding: '8px 6px', borderBottom: '1px solid var(--line-2)', borderRadius: 4, cursor: 'help' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {v.caption || v.post_id}
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>
                        {firstHourPct}% in 1h
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10.5, color: 'var(--fg-4)' }}>
                      <span className="mono">{v.first_hour}/1h</span>
                      <span className="mono">{v.first_24h}/24h</span>
                      <span className="mono">{v.total_comments} total</span>
                      <span className="pill pill-ghost" style={{ fontSize: 9, textTransform: 'uppercase' }}>{v.post_type}</span>
                      {v.post_url && <a href={v.post_url} target="_blank" rel="noopener noreferrer" className="tlink" style={{ fontSize: 10 }} onClick={(e) => e.stopPropagation()}>↗</a>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>🐢 SLOW BURNS<Tip text="Posts that kept accumulating comments over days rather than spiking early — content with lasting appeal that keeps surfacing in feeds." /></h3>
              <span className="meta">sustained engagement · all-time</span>
            </div>
            {filteredSlow.length === 0 ? (
              <div className="empty" style={{ fontSize: 11 }}>
                {search ? 'No slow-burn posts match your search.' : 'No slow-burn posts yet (need ≥15 comments and <15% in first hour).'}
              </div>
            ) : (
              filteredSlow.map((v) => {
                const firstHourPct = Math.round(v.first_hour_pct * 100)
                const tip = `${v.post_type?.toUpperCase() || 'POST'} from ${format(new Date(v.posted_at), 'MMM d, yyyy')}. Slow-burn pattern: only ${v.first_hour} comments in the first hour (${firstHourPct}%) but ${v.total_comments} total over time. The Instagram algorithm kept resurfacing this post — its appeal compounds rather than spikes. Evergreen content like this is gold.`
                return (
                  <div
                    key={v.post_id}
                    className="hover-row"
                    title={tip}
                    style={{ padding: '8px 6px', borderBottom: '1px solid var(--line-2)', borderRadius: 4, cursor: 'help' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {v.caption || v.post_id}
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--joola)', fontWeight: 700 }}>
                        {v.total_comments} comments
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10.5, color: 'var(--fg-4)' }}>
                      <span className="mono">{v.first_hour}/1h ({firstHourPct}%)</span>
                      <span className="mono">{v.first_24h}/24h</span>
                      <span className="pill pill-ghost" style={{ fontSize: 9, textTransform: 'uppercase' }}>{v.post_type}</span>
                      {v.post_url && <a href={v.post_url} target="_blank" rel="noopener noreferrer" className="tlink" style={{ fontSize: 10 }} onClick={(e) => e.stopPropagation()}>↗</a>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Main layout: comments list + sidebar */}
      <div className="section">
        <div className="card-grid cg-2-1">
          {/* Main pane */}
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>
                {tab === 'wishlist' ? <>WHAT FANS WANT<Tip text="Product and feature requests fans have left in comments — your crowdsourced product roadmap. Filter by category in the sidebar." /></> :
                 tab === 'competitors' ? <>COMPETITOR INTEL<Tip text="Comments where fans mention other brands — spot comparison shopping, defection risk, and how JOOLA stacks up in the market." /></> :
                 tab === 'questions' ? <>QUESTION QUEUE<Tip text="Comments where fans are asking something — answer them in replies and use the common questions to build FAQ content." /></> :
                 tab === 'intent' ? <>PURCHASE SIGNALS<Tip text="Comments from fans who mention buying, ordering, or wanting a product. These are warm leads — consider responding or DM-ing them." /></> :
                 tab === 'complaints' ? <>COMPLAINTS<Tip text="Negative comments that need a follow-up. Use the filters on the left to prioritize by severity or status." /></> :
                 <>SENTIMENT BREAKDOWN<Tip text="Every comment with AI-classified sentiment, emotion, topic, and intent. Use the filter chips to drill into positive or negative comments." /></>}
              </h3>
              <span className="meta">
                {tab === 'wishlist'
                  ? `${filteredWishlist.length.toLocaleString()} requests · all-time`
                  : `${filtered.length.toLocaleString()} shown · all-time`}
              </span>
            </div>

            {/* Unified filter strip — type tabs + sentiment + competitor (when relevant) in one row */}
            <div className="tabs" style={{ marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {/* Type tabs */}
              <button className={'tab ' + (tab === 'all' ? 'on' : '')} onClick={() => setTab('all')}>
                All ({totalComments.toLocaleString()})
              </button>
              <button className={'tab ' + (tab === 'questions' ? 'on' : '')} onClick={() => setTab('questions')}>
                Questions ({questionsCount})
              </button>
              <button className={'tab ' + (tab === 'intent' ? 'on' : '')} onClick={() => setTab('intent')}>
                Purchase Intent ({purchaseIntentCount})
              </button>
              <button className={'tab ' + (tab === 'complaints' ? 'on' : '')} onClick={() => setTab('complaints')}>
                Complaints ({comments.filter((c) => c.is_complaint).length})
              </button>
              <button className={'tab ' + (tab === 'competitors' ? 'on' : '')} onClick={() => setTab('competitors')}>
                Competitors ({competitorMentionsCount})
              </button>
              <button className={'tab ' + (tab === 'wishlist' ? 'on' : '')} onClick={() => setTab('wishlist')}>
                Wishlist ({wishlistCount})
              </button>

              {/* Sentiment filter — appended to same row, with subtle divider (hidden on wishlist) */}
              {tab !== 'wishlist' && (
                <>
                  <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 4px' }} aria-hidden="true" />
                  <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', alignSelf: 'center' }}>
                    Sentiment
                  </span>
                  {(['all', 'positive', 'neutral', 'negative'] as FilterType[]).map((f) => (
                    <button key={f} className={'chip ' + (filter === f ? 'on' : '')} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'Any' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </>
              )}

              {/* Competitor brand chips — only on competitors tab */}
              {tab === 'competitors' && competitorData.length > 0 && (
                <>
                  <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 4px' }} aria-hidden="true" />
                  <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', alignSelf: 'center' }}>
                    Brand
                  </span>
                  <button
                    className={'chip ' + (competitorFilter === '' ? 'on' : '')}
                    onClick={() => setCompetitorFilter('')}
                  >
                    Any ({competitorMentionsCount})
                  </button>
                  {competitorData.slice(0, 8).map((c) => (
                    <button
                      key={c.name}
                      className={'chip ' + (competitorFilter === c.name ? 'on' : '')}
                      onClick={() => setCompetitorFilter(c.name)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {c.name} ({c.count})
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Wishlist rows */}
            {tab === 'wishlist' ? (
              <div>
                {filteredWishlist.slice(0, 80).map((w) => (
                  <div className="comment-row" key={w.comment_id}>
                    <div className="comment-user">
                      <span className="uname">@{w.username}</span>
                      {w.requested_at && (
                        <span className="meta">{format(new Date(w.requested_at), 'MMM d')}</span>
                      )}
                      {w.category && <span className="pill pill-info" style={{ textTransform: 'capitalize' }}>{w.category}</span>}
                      {w.product_reference && <span className="pill pill-ghost">{w.product_reference}</span>}
                      {w.times_similar_requested != null && w.times_similar_requested > 1 && (
                        <span className="pill pill-yellow">×{w.times_similar_requested} requested</span>
                      )}
                    </div>
                    <div className="comment-body">
                      <div className="quote">&ldquo;{w.wishlist_text}&rdquo;</div>
                      {w.request_summary && (
                        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6 }}>
                          → {w.request_summary}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredWishlist.length === 0 && <div className="empty">No wishlist items match your search.</div>}
                {filteredWishlist.length > 80 && (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: 'var(--fg-4)' }}>
                    Showing 80 of {filteredWishlist.length} requests
                  </div>
                )}
              </div>
            ) : (
              /* Comment rows */
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {filtered.slice(0, 50).map((c, i) => {
                  const sent = (c.sentiment || 'neutral').toLowerCase()
                  return (
                    <div className="comment-row" key={c.comment_id ?? i}>
                      <div className="comment-user">
                        <span className="uname">@{c.username}</span>
                        {c.commented_at && (
                          <span className="meta">{format(new Date(c.commented_at), 'MMM d')}</span>
                        )}
                        {c.post_url && (
                          <a href={c.post_url} target="_blank" rel="noopener noreferrer"
                            className="meta tlink">↗ post</a>
                        )}
                        {tab === 'competitors' && c.competitor_mentioned && (
                          <span className="pill pill-yellow" style={{ textTransform: 'capitalize' }}>vs. {c.competitor_mentioned}</span>
                        )}
                      </div>
                      <div className="comment-body">
                        <div className="quote">&ldquo;{c.comment_text}&rdquo;</div>
                        {tab === 'competitors' && c.competitor_context && (
                          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6 }}>
                            context: {c.competitor_context}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {c.is_question && <span className="pill pill-info">? QUESTION</span>}
                          {c.purchase_intent && <span className="pill pill-green">● INTENT</span>}
                          {c.is_complaint && <span className="pill pill-red">⚠ COMPLAINT</span>}
                          {c.is_wishlist && <span className="pill pill-yellow">★ WISHLIST</span>}
                          {c.mentions_competitor && tab !== 'competitors' && (
                            <span className="pill pill-amber">⚐ COMPETITOR</span>
                          )}
                          {c.emotion && <span className="pill pill-ghost">{c.emotion}</span>}
                          {c.primary_topic && <span className="pill pill-ghost">{c.primary_topic}</span>}
                          <ScoreTag score={c.sentiment_score} />
                          <span className={'pill ' + (SENT_PILL[sent] ?? 'pill-ghost')}>{sent}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && <div className="empty">No comments match your filters.</div>}
                {filtered.length > 50 && (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: 'var(--fg-4)' }}>
                    Showing 50 of {filtered.length} comments
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — context-aware */}
          <div>
            {tab === 'competitors' ? (
              <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
                <div className="card-head">
                  <h3>COMPETITOR MENTIONS<Tip text="How many times each competitor was mentioned, split by positive/neutral/negative context. Green = fans prefer JOOLA, red = fans may be switching." /></h3>
                  <span className="meta">+pos · neutral · −neg · all-time</span>
                </div>
                <CompetitorTable rows={competitorData} />
              </div>
            ) : tab === 'wishlist' ? (
              <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
                <div className="card-head">
                  <h3>BY CATEGORY<Tip text="Which product or feature categories fans request most — use this to prioritize your roadmap and product development." /></h3>
                  <span className="meta">{wishlistCount} requests · all-time</span>
                </div>
                <HBar data={wishlistCategoryData} colorOf={() => 'var(--yellow)'} tipPrefix="Wishlist requests" />
              </div>
            ) : (
              <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
                <div className="card-head">
                  <h3>SENTIMENT MIX<Tip text="Overall breakdown of positive, neutral, and negative comments — a quick pulse on how your audience feels about JOOLA." /></h3>
                  <span className="meta">{totalComments.toLocaleString()} comments · all-time</span>
                </div>
                <div className="donut-wrap">
                  <Donut data={sentimentSlices} size={140} thickness={22} />
                  <DonutLegend data={sentimentSlices} />
                </div>
              </div>
            )}

            <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <h3>EMOTION BREAKDOWN<Tip text="The specific emotions your audience expresses most — Joy and Excited = great content, Anger and Disgust = something needs fixing." /></h3>
                <span className="meta">top {emotionData.length} · all-time</span>
              </div>
              <HBar data={emotionData} colorOf={emotionColorOf} tipPrefix="Emotion in comments" />
            </div>

            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>TOP TOPICS<Tip text="What fans talk about most in their comments — use this to create more content around the topics that already resonate." /></h3>
                <span className="meta">by volume · all-time</span>
              </div>
              <div className="donut-wrap">
                <Donut data={topicSlices} size={140} thickness={22} />
                <DonutLegend data={topicSlices} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
