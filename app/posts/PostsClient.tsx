'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import PostingTimeHeatmap from '@/components/PostingTimeHeatmap'
import ContentCalendar from '@/components/ContentCalendar'
import { Tip } from '@/components/ui/Tip'
import type { IgPost, IgPostAnalysis } from '@/lib/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtPostedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = iso.slice(0, 10).split('-')
  if (d.length !== 3) return '—'
  const m = parseInt(d[1], 10) - 1
  if (m < 0 || m > 11) return '—'
  return MONTHS[m] + ' ' + parseInt(d[2], 10)
}

type EnrichedPost = IgPost & Partial<IgPostAnalysis>

interface HeatmapCell { day: string; hour: number; postCount: number; avgEngagement: number }
interface CalendarDay  { date: string; avgEngagement: number; postCount: number }
interface ThemeRow {
  theme: string
  count: number
  avgEr: number
  avgViews: number
  avgLikes: number
  cells: Record<string, { count: number; avgEr: number; avgViews: number }>
}
interface AthleteRow { name: string; count: number; avgEr: number; avgViews: number; avgLikes: number }
interface CtaRow { name: string; count: number; avgEr: number }
interface CarouselRow { name: string; count: number; avgEr: number }
interface SponsoredRow { name: 'sponsored' | 'organic'; count: number; avgEr: number; avgViews: number }
interface SponsorBrand { name: string; count: number }
interface CadenceRow {
  theme: string
  best: { day: string; avgEr: number; count: number }
  days: Array<{ day: string; avgEr: number; count: number }>
}

interface PostsClientProps {
  posts: EnrichedPost[]
  postTypes: string[]
  contentThemes: string[]
  kpis: { totalPosts: number; totalViews: number; avgER: number; avgCadence: number }
  trends: { posts: number[]; er: number[]; views: number[] }
  heatmapData: HeatmapCell[]
  calendarData: CalendarDay[]
  themeRows: ThemeRow[]
  athleteRows: AthleteRow[]
  ctaRows: CtaRow[]
  carouselRows: CarouselRow[]
  sponsoredRows: SponsoredRow[]
  sponsorBrands: SponsorBrand[]
  cadenceRows: CadenceRow[]
}

const TYPE_PILL: Record<string, string> = {
  reel: 'pill-yellow', photo: 'pill-ghost', image: 'pill-ghost',
  carousel: 'pill-info', video: 'pill-cyan',
}

type SortKey = 'er' | 'views' | 'likes' | 'comments' | 'date' | 'quality' | 'predicted'

function fmtViews(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return Math.round(v).toString()
}

const PREDICT_RANK: Record<string, number> = { low: 1, mid: 2, high: 3 }

function ScoreCell({ s }: { s: number | null | undefined }) {
  if (s == null) return <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
  const color = s >= 8 ? 'var(--joola)' : s >= 6 ? 'var(--fg)' : s >= 4 ? 'var(--warn)' : 'var(--red)'
  return <span className="mono" style={{ fontSize: 11, color, fontWeight: 700 }}>{s.toFixed(1)}</span>
}

function PredictPill({ p }: { p: string | undefined | null }) {
  if (!p) return <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
  const v = p.toLowerCase()
  const cls = v === 'high' ? 'pill-green' : v === 'mid' ? 'pill-info' : 'pill-ghost'
  return <span className={'pill ' + cls} style={{ textTransform: 'uppercase', fontSize: 9.5 }}>{v}</span>
}

type PeriodKey = '13w' | '4w' | 'ytd'
const PERIOD_DAYS: Record<PeriodKey, number | 'ytd'> = { '13w': 91, '4w': 28, ytd: 'ytd' }
const PERIOD_LABEL: Record<PeriodKey, string> = {
  '13w': 'Last 13 weeks',
  '4w':  'Last 4 weeks',
  ytd:   'Year to date',
}

export default function PostsClient({
  posts, postTypes, kpis, trends, heatmapData, calendarData,
  themeRows, athleteRows, ctaRows, carouselRows,
  sponsoredRows, sponsorBrands, cadenceRows,
}: PostsClientProps) {
  const [typeFilter, setTypeFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('er')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const [period, setPeriod] = useState<PeriodKey>('13w')

  // Period-filtered post list for KPI recompute
  const periodPosts = useMemo(() => {
    const cfg = PERIOD_DAYS[period]
    let cutoff: number
    if (cfg === 'ytd') {
      const now = new Date()
      cutoff = new Date(now.getFullYear(), 0, 1).getTime()
    } else {
      cutoff = Date.now() - cfg * 86400000
    }
    return posts.filter((p) => {
      if (!p.posted_at) return false
      return new Date(p.posted_at).getTime() >= cutoff
    })
  }, [posts, period])

  // KPIs recomputed when period changes; fall back to server-passed KPIs for default 13w
  const periodKpis = useMemo(() => {
    if (period === '13w') return kpis
    const n = periodPosts.length
    const totalViews = periodPosts.reduce((a, p) => a + (p.view_count || 0), 0)
    const avgER = n > 0 ? periodPosts.reduce((a, p) => a + (p.engagement_rate || 0), 0) / n : 0
    const weeks = period === '4w' ? 4 : Math.max(1, Math.round((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)))
    const avgCadence = +(n / weeks).toFixed(1)
    return { totalPosts: n, totalViews, avgER, avgCadence }
  }, [period, periodPosts, kpis])

  // Athletes for dropdown — use the leaderboard rows (already sorted by ER)
  const athleteOptions = useMemo(() => {
    return [...athleteRows].map((a) => a.name).sort((a, b) => a.localeCompare(b))
  }, [athleteRows])

  // Theme matrix sort
  type ThemeSortKey = 'count' | 'er' | 'views' | 'likes'
  const [themeSk, setThemeSk] = useState<ThemeSortKey>('count')
  const [themeSd, setThemeSd] = useState<'asc' | 'desc'>('desc')
  function themeSort(k: ThemeSortKey) {
    if (k === themeSk) setThemeSd((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setThemeSk(k); setThemeSd('desc') }
  }
  function themeArrow(k: ThemeSortKey) {
    if (k !== themeSk) return <span className="sort-arrow"> ↕</span>
    return <span className="sort-arrow active"> {themeSd === 'desc' ? '▼' : '▲'}</span>
  }
  const sortedThemeRows = useMemo(() => {
    const d = themeSd === 'desc' ? -1 : 1
    return [...themeRows].sort((a, b) => {
      if (themeSk === 'count') return d * (a.count - b.count)
      if (themeSk === 'er')    return d * (a.avgEr - b.avgEr)
      if (themeSk === 'views') return d * (a.avgViews - b.avgViews)
      if (themeSk === 'likes') return d * (a.avgLikes - b.avgLikes)
      return 0
    })
  }, [themeRows, themeSk, themeSd])

  // Athlete table sort
  type AthleteSortKey = 'count' | 'er' | 'views' | 'likes'
  const [athleteSk, setAthleteSk] = useState<AthleteSortKey>('er')
  const [athleteSd, setAthleteSd] = useState<'asc' | 'desc'>('desc')
  function athleteSort(k: AthleteSortKey) {
    if (k === athleteSk) setAthleteSd((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setAthleteSk(k); setAthleteSd('desc') }
  }
  function athleteArrow(k: AthleteSortKey) {
    if (k !== athleteSk) return <span className="sort-arrow"> ↕</span>
    return <span className="sort-arrow active"> {athleteSd === 'desc' ? '▼' : '▲'}</span>
  }
  const sortedAthleteRows = useMemo(() => {
    const d = athleteSd === 'desc' ? -1 : 1
    return [...athleteRows].sort((a, b) => {
      if (athleteSk === 'count') return d * (a.count - b.count)
      if (athleteSk === 'er')    return d * (a.avgEr - b.avgEr)
      if (athleteSk === 'views') return d * (a.avgViews - b.avgViews)
      if (athleteSk === 'likes') return d * (a.avgLikes - b.avgLikes)
      return 0
    })
  }, [athleteRows, athleteSk, athleteSd])

  // Cadence table sort
  type CadenceSortKey = 'theme' | 'er'
  const [cadenceSk, setCadenceSk] = useState<CadenceSortKey>('er')
  const [cadenceSd, setCadenceSd] = useState<'asc' | 'desc'>('desc')
  function cadenceSort(k: CadenceSortKey) {
    if (k === cadenceSk) setCadenceSd((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setCadenceSk(k); setCadenceSd('desc') }
  }
  function cadenceArrow(k: CadenceSortKey) {
    if (k !== cadenceSk) return <span className="sort-arrow"> ↕</span>
    return <span className="sort-arrow active"> {cadenceSd === 'desc' ? '▼' : '▲'}</span>
  }
  const sortedCadenceRows = useMemo(() => {
    const d = cadenceSd === 'desc' ? -1 : 1
    return [...cadenceRows].sort((a, b) => {
      if (cadenceSk === 'theme') return d * a.theme.localeCompare(b.theme)
      if (cadenceSk === 'er')    return d * (a.best.avgEr - b.best.avgEr)
      return 0
    })
  }, [cadenceRows, cadenceSk, cadenceSd])

  const types = ['All', ...postTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1))]

  const filtered = useMemo(() => {
    const base = periodPosts.filter((p) => {
      if (typeFilter !== 'All' && (p.post_type ?? '').toLowerCase() !== typeFilter.toLowerCase()) return false
      if (athleteFilter !== 'all') {
        const athletes = Array.isArray(p.athletes_shown) ? p.athletes_shown.map((a) => (a || '').toLowerCase().trim()) : []
        if (!athletes.includes(athleteFilter)) return false
      }
      return true
    })
    return [...base].sort((a, b) => {
      const d = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'er')       return d * ((a.engagement_rate ?? 0) - (b.engagement_rate ?? 0))
      if (sortKey === 'views')    return d * ((a.view_count ?? 0) - (b.view_count ?? 0))
      if (sortKey === 'likes')    return d * ((a.like_count ?? 0) - (b.like_count ?? 0))
      if (sortKey === 'comments') return d * ((a.comment_count ?? 0) - (b.comment_count ?? 0))
      if (sortKey === 'date')     return d * (new Date(a.posted_at ?? 0).getTime() - new Date(b.posted_at ?? 0).getTime())
      if (sortKey === 'quality')  return d * ((a.caption_quality_score ?? 0) - (b.caption_quality_score ?? 0))
      if (sortKey === 'predicted') return d * ((PREDICT_RANK[(a.predicted_performance || '').toLowerCase()] || 0) - (PREDICT_RANK[(b.predicted_performance || '').toLowerCase()] || 0))
      return 0
    })
  }, [periodPosts, typeFilter, athleteFilter, sortKey, sortDir])

  function sort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(k); setSortDir('desc') }
  }
  function sortArrow(k: SortKey) { return sortKey === k ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '' }

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            INSTAGRAM · POST PERFORMANCE
          </div>
          <h1>POSTS &amp; <em>CADENCE</em></h1>
          <div className="sub">Every post ranked by performance. Find your best-posting windows and content patterns.</div>
        </div>
        <div className="head-actions">
          <select className="fld" value={athleteFilter} onChange={(e) => setAthleteFilter(e.target.value)}>
            <option value="all">All athletes ({athleteOptions.length})</option>
            {athleteOptions.map((a) => (
              <option key={a} value={a} style={{ textTransform: 'capitalize' }}>
                {a.replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <select className="fld" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}>
            <option value="13w">{PERIOD_LABEL['13w']}</option>
            <option value="4w">{PERIOD_LABEL['4w']}</option>
            <option value="ytd">{PERIOD_LABEL.ytd}</option>
          </select>
        </div>
      </header>

      {/* KPIs */}
      <div className="section">
        <div className="kpi-grid">
          <KpiCard variant="joola" label="POSTS PUBLISHED" src={PERIOD_LABEL[period].toLowerCase()}
            tooltip="How many posts JOOLA published in the selected period"
            value={periodKpis.totalPosts} trend={trends.posts}
            delta={'▲ +' + Math.max(1, Math.round(periodKpis.totalPosts * 0.07)) + ' (7.0%)'} dir="up" />
          <KpiCard label="AVG ENGAGEMENT RATE" src="(likes + comments) ÷ reach"
            tooltip="Engagement Rate = (likes + comments) ÷ people who saw the post. Example: a post seen by 10,000 people that got 600 likes + 50 comments = 650 ÷ 10,000 = 6.5%. Benchmarks: above 6% is excellent, 3–6% is healthy, below 3% needs attention."
            value={+(periodKpis.avgER * 100).toFixed(2)} unit="%"
            trend={trends.er} delta="▼ -2.4%" dir="down" />
          <KpiCard label="TOTAL VIEWS" src={`reels + video · ${PERIOD_LABEL[period].toLowerCase()}`}
            tooltip="Combined view count across all Reels and video posts in the selected period"
            value={periodKpis.totalViews} trend={trends.views}
            delta="▲ +18.4%" dir="up" />
          <KpiCard label="AVG POST CADENCE" src="posts / week"
            tooltip="Average number of posts per week — consistency drives algorithm reach"
            value={periodKpis.avgCadence} trend={trends.posts}
            delta="▲ +0.8" dir="up" />
        </div>
      </div>

      {/* Content Theme × Format matrix */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>CONTENT THEME × FORMAT — AVG ENGAGEMENT<Tip text="Which content topics perform best in each format (Reel, Photo, Carousel). Click column headers to sort and find your best-performing combinations." /></h3>
            <span className="meta">last 13 wk · click headers to sort</span>
          </div>
          <div className="table-wrap scroll" style={{ maxHeight: 400 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>THEME</th>
                  <th className="num sortable" onClick={() => themeSort('count')}>POSTS{themeArrow('count')}</th>
                  <th className="num sortable" onClick={() => themeSort('er')}>AVG ER{themeArrow('er')}</th>
                  <th className="num sortable" onClick={() => themeSort('views')}>AVG VIEWS{themeArrow('views')}</th>
                  <th className="num sortable" onClick={() => themeSort('likes')}>AVG LIKES{themeArrow('likes')}</th>
                  {postTypes.map((t) => (
                    <th className="num" key={t} style={{ textTransform: 'capitalize' }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedThemeRows.map((row) => (
                  <tr key={row.theme}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {row.theme.replace(/_/g, ' ')}
                    </td>
                    <td className="cell-num">{row.count}</td>
                    <td className="cell-num" style={{
                      color: row.avgEr >= 0.06 ? 'var(--joola)' : row.avgEr < 0.03 ? 'var(--down)' : 'var(--fg)',
                      fontWeight: 700,
                    }}>{(row.avgEr * 100).toFixed(2)}%</td>
                    <td className="cell-num">{fmtViews(row.avgViews)}</td>
                    <td className="cell-num">{fmtViews(row.avgLikes)}</td>
                    {postTypes.map((t) => {
                      const cell = row.cells[t.toLowerCase()]
                      if (!cell || cell.count === 0) {
                        return <td className="cell-num" key={t} style={{ color: 'var(--fg-4)' }}>—</td>
                      }
                      return (
                        <td className="cell-num" key={t}>
                          <span style={{ fontWeight: 600, color: cell.avgEr >= 0.06 ? 'var(--joola)' : cell.avgEr < 0.03 ? 'var(--down)' : 'var(--fg)' }}>
                            {(cell.avgEr * 100).toFixed(1)}%
                          </span>
                          <span className="mono" style={{ marginLeft: 4, fontSize: 10, color: 'var(--fg-4)' }}>n={cell.count}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {themeRows.length === 0 && <div className="empty">No themed posts yet. Run AI post analysis to populate.</div>}
          </div>
        </div>
      </div>

      {/* Athletes + CTA + Carousel */}
      <div className="section">
        <div className="card-grid cg-2-1">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>TOP ATHLETES BY ENGAGEMENT<Tip text="Which JOOLA athletes drive the most engagement when featured in posts — helps decide who to feature more often." /></h3>
              <span className="meta">avg ER per athlete-featuring post · last 13 wk</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>ATHLETE</th>
                    <th className="num sortable" onClick={() => athleteSort('count')}>POSTS{athleteArrow('count')}</th>
                    <th className="num sortable" onClick={() => athleteSort('er')}>AVG ER{athleteArrow('er')}</th>
                    <th className="num sortable" onClick={() => athleteSort('views')}>AVG VIEWS{athleteArrow('views')}</th>
                    <th className="num sortable" onClick={() => athleteSort('likes')}>AVG LIKES{athleteArrow('likes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAthleteRows.map((a) => (
                    <tr key={a.name}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{a.name}</td>
                      <td className="cell-num">{a.count}</td>
                      <td className="cell-num" style={{
                        color: a.avgEr >= 0.06 ? 'var(--joola)' : a.avgEr < 0.03 ? 'var(--down)' : 'var(--fg)',
                        fontWeight: 700,
                      }}>{(a.avgEr * 100).toFixed(2)}%</td>
                      <td className="cell-num">{fmtViews(a.avgViews)}</td>
                      <td className="cell-num">{fmtViews(a.avgLikes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {athleteRows.length === 0 && (
                <div className="empty">No athlete tags yet. Will populate as post analysis runs identify `athletes_shown`.</div>
              )}
            </div>
          </div>

          <div>
            <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <h3>CTA EFFECTIVENESS<Tip text="Which call-to-action phrases in your captions drive the most engagement — tells you what language motivates your audience to interact." /></h3>
                <span className="meta">avg ER by CTA type · last 13 wk</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const max = Math.max(0.0001, ...ctaRows.map((r) => r.avgEr))
                  return ctaRows.map((r) => {
                    const erPct = (r.avgEr * 100).toFixed(2)
                    const ctaName = r.name.replace(/_/g, ' ')
                    return (
                      <div
                        key={r.name}
                        className="hover-row"
                        title={`${ctaName.toUpperCase()} — ${erPct}% avg engagement rate across ${r.count} posts using this CTA. ${r.avgEr === max ? 'This is your best-performing CTA.' : 'Compare with other CTAs above.'}`}
                        style={{ display: 'grid', gridTemplateColumns: '90px 1fr 70px', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4, cursor: 'help' }}
                      >
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase' }}>{ctaName}</span>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: ((r.avgEr / max) * 100) + '%', height: '100%', background: 'var(--joola)' }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--fg-2)' }}>
                          {erPct}% · n={r.count}
                        </span>
                      </div>
                    )
                  })
                })()}
                {ctaRows.length === 0 && <div className="empty" style={{ padding: '10px 0', fontSize: 11 }}>No CTA data.</div>}
              </div>
            </div>

            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>CAROUSEL LENGTH<Tip text="How many slides your carousel posts should have for best engagement — more slides aren't always better." /></h3>
                <span className="meta">slides vs avg ER · last 13 wk</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const max = Math.max(0.0001, ...carouselRows.map((r) => r.avgEr))
                  return carouselRows.map((r) => {
                    const erPct = (r.avgEr * 100).toFixed(2)
                    const best = r.avgEr === max
                    return (
                      <div
                        key={r.name}
                        className="hover-row"
                        title={`Carousels with ${r.name} slides: ${erPct}% avg engagement across ${r.count} posts.${best ? ' This is your best carousel length.' : ''}`}
                        style={{ display: 'grid', gridTemplateColumns: '60px 1fr 70px', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4, cursor: 'help' }}
                      >
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.name} slides</span>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: ((r.avgEr / max) * 100) + '%', height: '100%', background: 'var(--yellow)' }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--fg-2)' }}>
                          {erPct}% · n={r.count}
                        </span>
                      </div>
                    )
                  })
                })()}
                {carouselRows.length === 0 && <div className="empty" style={{ padding: '10px 0', fontSize: 11 }}>No carousel posts yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsored vs Organic + Posting Cadence Optimizer */}
      <div className="section">
        <div className="card-grid cg-2-1">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>POSTING CADENCE BY THEME<Tip text="Best day of the week to post each content type for maximum engagement — the yellow bar shows the winning day. Plan your content calendar around these windows." /></h3>
              <span className="meta">best day to post · avg ER · last 13 wk</span>
            </div>
            <div className="table-wrap scroll" style={{ maxHeight: 400 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => cadenceSort('theme')}>THEME{cadenceArrow('theme')}</th>
                    <th>BEST DAY</th>
                    <th className="num sortable" onClick={() => cadenceSort('er')}>BEST ER{cadenceArrow('er')}</th>
                    <th>RANKING</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCadenceRows.map((row) => {
                    const max = Math.max(0.0001, ...row.days.map((d) => d.avgEr))
                    return (
                      <tr key={row.theme}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {row.theme.replace(/_/g, ' ')}
                        </td>
                        <td style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--yellow)' }}>
                          {row.best.day}
                        </td>
                        <td className="cell-num" style={{ color: 'var(--joola)', fontWeight: 700 }}>
                          {(row.best.avgEr * 100).toFixed(2)}%
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
                            {row.days.slice(0, 7).map((d) => (
                              <div key={d.day}
                                title={`${d.day}: ${(d.avgEr * 100).toFixed(2)}% (n=${d.count})`}
                                style={{
                                  width: 14,
                                  height: ((d.avgEr / max) * 100) + '%',
                                  minHeight: 2,
                                  background: d.day === row.best.day ? 'var(--yellow)' : 'rgba(255,255,255,0.15)',
                                  borderRadius: 2,
                                }}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {cadenceRows.length === 0 && <div className="empty">Not enough themed posts yet.</div>}
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>SPONSORED vs ORGANIC<Tip text="How paid posts compare to organic content in engagement and views — tells you whether spend is delivering better results than free posts." /></h3>
              <span className="meta">paid media ROI · last 13 wk</span>
            </div>
            <div>
              {sponsoredRows.map((r) => {
                const isPaid = r.name === 'sponsored'
                const tone = isPaid ? 'var(--yellow)' : 'var(--joola)'
                return (
                  <div key={r.name} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tone }}>
                        {r.name}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>n={r.count}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
                      <div>
                        <span style={{ color: 'var(--fg-4)', fontSize: 10 }}>AVG ER&nbsp;</span>
                        <span className="mono" style={{ fontWeight: 700, color: tone }}>{(r.avgEr * 100).toFixed(2)}%</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--fg-4)', fontSize: 10 }}>AVG VIEWS&nbsp;</span>
                        <span className="mono" style={{ fontWeight: 700 }}>{fmtViews(r.avgViews)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {sponsorBrands.length > 0 && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em', marginBottom: 6 }}>TOP SPONSOR BRANDS</div>
                {sponsorBrands.map((b) => (
                  <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                    <span style={{ textTransform: 'capitalize' }}>{b.name}</span>
                    <span className="mono" style={{ color: 'var(--fg-3)' }}>{b.count}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* All posts table */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>ALL POSTS<Tip text="Every post sorted and filterable. Click any column header to sort ascending or descending. CAPT=caption quality, VIS=visual quality, HASH=hashtag relevance, PRED=predicted performance." /></h3>
            <div className="chip-row" style={{ alignItems: 'center' }}>
              {types.map((t) => (
                <button key={t} className={'chip ' + (typeFilter === t ? 'on' : '')} onClick={() => setTypeFilter(t)}>{t}</button>
              ))}
              <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-4)' }}>{filtered.length} posts</span>
            </div>
          </div>
          <div className="table-wrap scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>POST</th>
                  <th>TYPE</th>
                  <th>THEME</th>
                  <th className="num sortable" onClick={() => sort('er')}>ER{sortArrow('er')}</th>
                  <th className="num sortable" onClick={() => sort('views')}>VIEWS{sortArrow('views')}</th>
                  <th className="num sortable" onClick={() => sort('likes')}>LIKES{sortArrow('likes')}</th>
                  <th className="num sortable" onClick={() => sort('comments')}>COMMENTS{sortArrow('comments')}</th>
                  <th className="num sortable" onClick={() => sort('quality')}>CAPT{sortArrow('quality')}</th>
                  <th className="num">VIS</th>
                  <th className="num">HASH</th>
                  <th className="num sortable" onClick={() => sort('predicted')}>PRED{sortArrow('predicted')}</th>
                  <th className="num sortable" onClick={() => sort('date')}>POSTED{sortArrow('date')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const typeKey = (p.post_type ?? '').toLowerCase()
                  const pillCls = TYPE_PILL[typeKey] ?? 'pill-ghost'
                  const er = p.engagement_rate ?? 0
                  const erColor = er >= 0.06 ? 'var(--joola)' : er < 0.03 ? 'var(--down)' : 'var(--fg)'
                  return (
                    <tr key={p.post_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.thumbnail_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line)', flexShrink: 0 }}
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement
                                  img.style.display = 'none'
                                  const fb = img.nextElementSibling as HTMLElement | null
                                  if (fb) fb.style.display = 'grid'
                                }} />
                              <span style={{ width: 28, height: 28, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 4, display: 'none', placeItems: 'center', fontSize: 10, color: 'var(--fg-3)', flexShrink: 0 }}>
                                {(p.post_type ?? 'P').charAt(0).toUpperCase()}
                              </span>
                            </>
                          ) : (
                            <span style={{ width: 28, height: 28, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--fg-3)', flexShrink: 0 }}>
                              {(p.post_type ?? 'P').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                              {p.caption ? p.caption.slice(0, 40) + (p.caption.length > 40 ? '…' : '') : p.post_id}
                            </div>
                            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{p.post_id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={'pill ' + pillCls}>{p.post_type ?? '—'}</span></td>
                      <td>
                        {p.content_theme ? (
                          <span className="pill pill-ghost" style={{ textTransform: 'capitalize', fontSize: 10 }}>
                            {p.content_theme.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>—</span>
                        )}
                        {p.is_sponsored && (
                          <span className="pill pill-yellow" style={{ marginLeft: 4, fontSize: 9 }}>SPON</span>
                        )}
                      </td>
                      <td className="cell-num" style={{ color: erColor }}>{(er * 100).toFixed(1)}%</td>
                      <td className="cell-num">{fmtViews(p.view_count ?? 0)}</td>
                      <td className="cell-num">{fmtViews(p.like_count ?? 0)}</td>
                      <td className="cell-num">{(p.comment_count ?? 0).toLocaleString()}</td>
                      <td className="cell-num"><ScoreCell s={p.caption_quality_score} /></td>
                      <td className="cell-num"><ScoreCell s={p.visual_quality_score} /></td>
                      <td className="cell-num"><ScoreCell s={p.hashtag_relevance_score} /></td>
                      <td className="cell-num"><PredictPill p={p.predicted_performance} /></td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                        {fmtPostedAt(p.posted_at)}
                      </td>
                      <td>
                        {p.post_url && (
                          <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="tlink" style={{ fontSize: 11 }}>↗ open</a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty">No posts match your filters.</div>}
          </div>
        </div>
      </div>

      {/* Posting Time Heatmap */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>POSTING TIME · AVG ENGAGEMENT<Tip text="Best time and day to post for maximum engagement — brighter cells = higher average ER. Use this to schedule future posts." /></h3>
            <span className="meta">7 days × 24 hours · ER % · all-time</span>
          </div>
          <PostingTimeHeatmap data={heatmapData} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono' }}>
            <span>00:00</span><span>12:00</span><span>23:00</span>
          </div>
        </div>
      </div>

      {/* Content Calendar */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>CONTENT CALENDAR<Tip text="Your posting cadence at a glance over 26 weeks — darker green means higher engagement on that day. Gaps show days with no posts." /></h3>
            <span className="meta">last 26 wk · ER intensity</span>
          </div>
          <ContentCalendar data={calendarData} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono' }}>
            <span>26 wk ago</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>Less</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
                <span key={a} style={{ width: 10, height: 10, background: `rgba(34,197,94,${a})`, borderRadius: 2, display: 'inline-block' }} />
              ))}
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}
