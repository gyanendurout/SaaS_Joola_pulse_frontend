'use client'

import { useState, useMemo } from 'react'
import { Tip } from '@/components/ui/Tip'
import type { WeekRow } from './page'
import AnalyticsInsights from './AnalyticsInsights'

// ── Metric definitions ────────────────────────────────────────────────────────

type MetricKey =
  | 'igViews' | 'igEngRate' | 'igPurchaseIntent'
  | 'ytViews' | 'ytVideosUploaded'
  | 'ttVideos' | 'ttViews'
  | 'rdMentions' | 'rdUpvotes'

interface MetricDef {
  key: MetricKey
  label: string
  short: string
  color: string
  platform: string
  tip: string
  fmtVal?: (v: number) => string  // custom formatter for display
}

const METRICS: MetricDef[] = [
  { key: 'igViews',          label: 'Instagram Views',       short: 'IG Views',    color: '#E1306C', platform: 'Instagram', tip: 'Total video views on JOOLA Instagram posts published that week.' },
  { key: 'igEngRate',        label: 'IG Engagement Rate',    short: 'IG ER',       color: '#F77737', platform: 'Instagram', tip: 'Average engagement rate across IG posts. Stored as a fraction — 0.05 means 5%.', fmtVal: v => (v * 100).toFixed(2) + '%' },
  { key: 'igPurchaseIntent', label: 'IG Purchase Intent',    short: 'IG Buy',      color: '#FCAF45', platform: 'Instagram', tip: 'AI-counted purchase-intent signals in Instagram comments that week.' },
  { key: 'ytViews',          label: 'YouTube Views',         short: 'YT Views',    color: '#FF4444', platform: 'YouTube',   tip: 'Total YouTube channel views recorded that week (from weekly snapshot).' },
  { key: 'ytVideosUploaded', label: 'YouTube Videos Posted', short: 'YT Videos',   color: '#FF9900', platform: 'YouTube',   tip: 'Number of YouTube videos uploaded that week.' },
  { key: 'ttVideos',         label: 'TikTok Videos Posted',  short: 'TT Videos',   color: '#00f2ea', platform: 'TikTok',   tip: 'Number of TikTok videos posted in that week.' },
  { key: 'ttViews',          label: 'TikTok Views',          short: 'TT Views',    color: '#69C9D0', platform: 'TikTok',   tip: 'Combined view count of TikTok videos posted that week.' },
  { key: 'rdMentions',       label: 'Reddit Mentions',       short: 'RD Mentions', color: '#FF6314', platform: 'Reddit',   tip: 'Reddit posts mentioning JOOLA published that week.' },
  { key: 'rdUpvotes',        label: 'Reddit Upvotes',        short: 'RD Upvotes',  color: '#FF4500', platform: 'Reddit',   tip: 'Total upvotes on Reddit mentions published that week.' },
]

// Default active metrics — one from each platform for an instant overview
const DEFAULT_ACTIVE: MetricKey[] = ['igViews', 'ttViews', 'rdMentions', 'rdUpvotes']

// ── Math helpers ──────────────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 4) return null
  const xm = xs.reduce((a, b) => a + b, 0) / n
  const ym = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const xd = xs[i] - xm, yd = ys[i] - ym
    num += xd * yd; dx2 += xd * xd; dy2 += yd * yd
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom ? num / denom : null
}

function corrColor(r: number): string {
  if (r >= 0.7)  return '#22c55e'
  if (r >= 0.4)  return '#84cc16'
  if (r <= -0.7) return '#ef4444'
  if (r <= -0.4) return '#f97316'
  return 'var(--fg-4)'
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtWeekLabel(w: string): string {
  const [, m, d] = w.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`
}

function fmtMetricValue(def: MetricDef, v: number): string {
  return def.fmtVal ? def.fmtVal(v) : fmtNum(v)
}

// ── Period options ────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '4 wks',  value: 4  },
  { label: '8 wks',  value: 8  },
  { label: '13 wks', value: 13 },
  { label: 'All',    value: 999 },
] as const

// ── Main component ────────────────────────────────────────────────────────────

export default function TrendsClient({ weeks }: { weeks: WeekRow[] }) {
  const [period, setPeriod]         = useState<number>(13)
  const [activeMetrics, setActive]  = useState<Set<MetricKey>>(new Set(DEFAULT_ACTIVE))

  const displayed = useMemo(() =>
    period >= 999 ? weeks : weeks.slice(-period),
    [weeks, period]
  )

  const toggleMetric = (k: MetricKey) => {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(k)) { if (next.size > 1) next.delete(k) }
      else next.add(k)
      return next
    })
  }

  // ── Correlation matrix ────────────────────────────────────────────────────

  const corrMatrix = useMemo(() => {
    const result: Record<string, Record<string, number | null>> = {}
    for (const ma of METRICS) {
      result[ma.key] = {}
      const xs = displayed.map(w => w[ma.key] as number)
      for (const mb of METRICS) {
        if (ma.key === mb.key) { result[ma.key][mb.key] = 1; continue }
        const ys = displayed.map(w => w[mb.key] as number)
        result[ma.key][mb.key] = pearson(xs, ys)
      }
    }
    return result
  }, [displayed])

  // ── Top correlated pairs (deduplicated) ───────────────────────────────────

  const topCorr = useMemo(() => {
    const seen = new Set<string>()
    const pairs: { a: MetricKey; b: MetricKey; r: number }[] = []
    for (const ma of METRICS) {
      for (const mb of METRICS) {
        if (ma.key === mb.key) continue
        const key = [ma.key, mb.key].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        const r = corrMatrix[ma.key]?.[mb.key]
        if (r != null) pairs.push({ a: ma.key, b: mb.key, r })
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5)
  }, [corrMatrix])

  // ── SVG chart ─────────────────────────────────────────────────────────────

  const SVG_W = 900, SVG_H = 190
  const PAD = { t: 14, b: 26, l: 8, r: 16 }
  const cW = SVG_W - PAD.l - PAD.r
  const cH = SVG_H - PAD.t - PAD.b
  const n  = displayed.length

  const chartLines = useMemo(() => {
    return METRICS.filter(m => activeMetrics.has(m.key)).map(m => {
      const vals = displayed.map(w => w[m.key] as number)
      const maxV = Math.max(...vals, 1)
      const minV = Math.min(...vals)
      const range = maxV - minV > 0 ? maxV - minV : 1
      const norm = (v: number) => (v - minV) / range

      const points = vals.map((v, i) => {
        const x = PAD.l + (i / Math.max(n - 1, 1)) * cW
        const y = PAD.t + (1 - norm(v)) * cH
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')

      return { ...m, vals, points, norm, minV, maxV }
    })
  }, [displayed, activeMetrics, n, cW, cH])

  // X-axis labels: show every 2nd label when dense
  const xLabels = displayed.map((w, i) => {
    if (n > 8 && i % 2 !== 0 && i !== n - 1) return null
    const x = PAD.l + (i / Math.max(n - 1, 1)) * cW
    return { x, label: fmtWeekLabel(w.week) }
  }).filter(Boolean) as { x: number; label: string }[]

  // ── Period-aggregate KPI cards (BUG 3 + ISSUE 13 fix) ───────────────────
  // Sum count-metrics over the selected period; average rate-metrics over non-zero weeks.
  // Compare to the equivalent previous period (same length, immediately prior).

  const kpiData = useMemo(() => {
    const len = displayed.length
    if (len === 0) return []

    const startIdx = period >= 999 ? 0 : Math.max(0, weeks.length - Math.min(period, weeks.length))
    const prevSlice = weeks.slice(Math.max(0, startIdx - len), startIdx)

    const KPI_KEYS: MetricKey[] = ['igViews', 'igEngRate', 'ytViews', 'ttViews', 'rdMentions', 'rdUpvotes']

    return KPI_KEYS.map(key => {
      const def = METRICS.find(m => m.key === key)!
      const isRate = key === 'igEngRate'
      let curr: number, prev: number

      if (isRate) {
        const cNZ = displayed.filter(w => (w[key] as number) > 0)
        curr = cNZ.length ? cNZ.reduce((s, w) => s + (w[key] as number), 0) / cNZ.length : 0
        const pNZ = prevSlice.filter(w => (w[key] as number) > 0)
        prev = pNZ.length ? pNZ.reduce((s, w) => s + (w[key] as number), 0) / pNZ.length : 0
      } else {
        curr = displayed.reduce((s, w) => s + (w[key] as number), 0)
        prev = prevSlice.reduce((s, w) => s + (w[key] as number), 0)
      }

      const pct = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0
      return { key, def, curr, pct, up: pct >= 0, hasPrev: prevSlice.length > 0 }
    })
  }, [displayed, weeks, period])

  // ── Empty state ───────────────────────────────────────────────────────────

  if (weeks.length === 0) {
    return (
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>Cross-Platform Trends</h1>
        <div className="card card-pad-lg">
          <div className="empty">No weekly data found yet. Weekly data populates as the scrapers and IG snapshot pipeline run.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            Cross-Platform Trends
            <Tip text="See how JOOLA's metrics move week-over-week across all platforms, and discover which metrics are correlated. Hover chart dots for weekly values." />
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
            {weeks.length} weeks of history · IG · YT · TT · Reddit · period filter applies to chart, KPIs &amp; correlation
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.value} className={'chip' + (period === p.value ? ' on' : '')}
              onClick={() => setPeriod(p.value)} style={{ fontSize: 11 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Period KPI Pulse (BUG 3 + ISSUE 13 fix: aggregates over selected period) ── */}
      {kpiData.length > 0 && (
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          {kpiData.map(({ key, def, curr, pct, up, hasPrev }) => (
            <div key={key} className={'kpi' + (up && Math.abs(pct) > 10 ? ' joola' : '')}>
              <div className="label" style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color, flexShrink: 0, marginRight: 6 }} />
                {def.short}
                <Tip text={def.tip} />
              </div>
              <div className="value" style={{ fontSize: 20 }}>{fmtMetricValue(def, curr)}</div>
              {hasPrev ? (
                <div className={`delta ${up ? 'up' : 'down'}`} style={{ fontSize: 11 }}>
                  {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs prior period
                </div>
              ) : (
                <div className="delta" style={{ fontSize: 11, color: 'var(--fg-4)' }}>full history</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Chart ── */}
      <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Metric Timeline
            <Tip text="Each line is normalized to its own 0–100% range so you can compare trends across very different scales. Hover a dot to see the raw value. Toggle metrics using the buttons." />
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-4)', fontWeight: 400 }}>
              (normalized — each metric scaled to its own range)
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => toggleMetric(m.key)} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${activeMetrics.has(m.key) ? m.color : 'var(--border)'}`,
                background: activeMetrics.has(m.key) ? m.color + '22' : 'transparent',
                color: activeMetrics.has(m.key) ? m.color : 'var(--fg-4)',
                fontWeight: 600, transition: 'all 0.15s',
              }}>
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {displayed.length < 2 ? (
          <div className="empty">Need at least 2 weeks of data to draw trends.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', minWidth: 340, display: 'block', maxHeight: 190 }}>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                  const y = PAD.t + t * cH
                  return <line key={t} x1={PAD.l} y1={y} x2={SVG_W - PAD.r} y2={y}
                    stroke="var(--border)" strokeWidth={0.5} />
                })}

                {/* X axis labels */}
                {xLabels.map(({ x, label }) => (
                  <text key={label} x={x} y={SVG_H - 4} textAnchor="middle"
                    fontSize={9} fill="var(--fg-4)">{label}</text>
                ))}

                {/* Metric lines + dots */}
                {chartLines.map(line => (
                  <g key={line.key}>
                    <polyline
                      points={line.points}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                    {displayed.map((w, i) => {
                      const v   = w[line.key] as number
                      const x   = PAD.l + (i / Math.max(n - 1, 1)) * cW
                      const y   = PAD.t + (1 - line.norm(v)) * cH
                      return (
                        <circle key={w.week} cx={x} cy={y} r={3}
                          fill={line.color} opacity={0.9} style={{ cursor: 'default' }}>
                          <title>{`${fmtWeekLabel(w.week)}: ${line.label} = ${fmtMetricValue(line, v)}`}</title>
                        </circle>
                      )
                    })}
                  </g>
                ))}
              </svg>
            </div>

            {/* Legend — reflects active toggles only (ISSUE 12 fix) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 10, color: 'var(--fg-4)', alignItems: 'center' }}>
              <span style={{ color: 'var(--fg-4)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 9 }}>Active:</span>
              {chartLines.map(l => (
                <span key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 5, color: l.color }}>
                  <span style={{ width: 18, height: 2, display: 'inline-block', background: l.color, borderRadius: 1 }} />
                  {l.label}
                </span>
              ))}
              {chartLines.length === 0 && <span>No metrics active — toggle one above.</span>}
            </div>
          </>
        )}
      </div>

      {/* ── Correlation Matrix ── */}
      <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          Correlation Matrix
          <Tip text="Pearson correlation (-1 to +1) between every metric pair over the selected period. Green = move together (both up or both down). Red = move opposite. Near 0 = unrelated. Needs ≥4 weeks of data." />
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-4)', fontWeight: 400 }}>
            ({displayed.length} weeks · {displayed.length < 4 ? 'need ≥4 for correlation' : 'Pearson r'})
          </span>
        </div>

        <div className="table-wrap scroll">
          <table className="data" style={{ width: '100%', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 100, fontSize: 10 }}>Metric</th>
                {METRICS.map(m => (
                  <th key={m.key} className="num" style={{ fontSize: 9, padding: '4px 5px', minWidth: 58, textAlign: 'center', color: m.color }}>
                    {m.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(ma => (
                <tr key={ma.key}>
                  <td style={{ fontSize: 10, fontWeight: 600, color: ma.color }}>{ma.short}</td>
                  {METRICS.map(mb => {
                    const isSelf = ma.key === mb.key
                    const r = corrMatrix[ma.key]?.[mb.key]
                    const highlighted = !isSelf && r != null && Math.abs(r) >= 0.4
                    return (
                      <td key={mb.key} className="cell-num" title={!isSelf && r != null ? `${ma.short} × ${mb.short} = ${r.toFixed(3)}` : undefined}
                        style={{
                          background: isSelf ? 'var(--bg-3)' : highlighted ? `${corrColor(r!)}20` : 'transparent',
                          color: isSelf ? 'var(--fg-4)' : r != null ? corrColor(r) : 'var(--fg-4)',
                          fontWeight: !isSelf && r != null && Math.abs(r) >= 0.7 ? 700 : 400,
                          fontSize: 10, textAlign: 'center', padding: '5px 4px',
                        }}>
                        {isSelf ? '—' : r != null ? r.toFixed(2) : '·'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 10 }}>
          {[
            { color: '#22c55e', label: '≥ 0.70  Strong positive' },
            { color: '#84cc16', label: '0.40–0.70  Moderate positive' },
            { color: 'var(--fg-4)', label: '< 0.40  Weak / no relation' },
            { color: '#f97316', label: '−0.40 to −0.70  Moderate negative' },
            { color: '#ef4444', label: '≤ −0.70  Strong negative' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, color }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Strongest Relationships ── */}
      {topCorr.length > 0 && (
        <div className="card card-pad-lg">
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            Strongest Relationships
            <Tip text="Top metric pairs by absolute correlation over the selected period. When two metrics have a strong positive correlation, big weeks for one tend to be big weeks for the other." />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCorr.map(({ a, b, r }) => {
              const ma    = METRICS.find(m => m.key === a)!
              const mb    = METRICS.find(m => m.key === b)!
              const abs   = Math.abs(r)
              const dir   = r > 0 ? 'move together' : 'move in opposite directions'
              const str   = abs >= 0.7 ? 'Strongly' : abs >= 0.4 ? 'Moderately' : 'Weakly'
              const hasHint = abs >= 0.5
              return (
                <div key={`${a}|${b}`} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--surface)',
                  border: `1px solid ${abs >= 0.7 ? corrColor(r) + '50' : 'var(--border)'}`,
                }}>
                  <div style={{
                    fontSize: 20, fontWeight: 800, color: corrColor(r),
                    width: 50, textAlign: 'center', flexShrink: 0,
                  }}>
                    {r.toFixed(2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: ma.color }}>{ma.label}</span>
                      <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>×</span>
                      <span style={{ color: mb.color }}>{mb.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                      {str} {dir}.
                      {hasHint && r > 0 && ` Weeks when ${ma.short} is high tend to also show high ${mb.short}.`}
                      {hasHint && r < 0 && ` Weeks when ${ma.short} rises, ${mb.short} tends to fall.`}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: corrColor(r), fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
                    {abs >= 0.7 ? 'STRONG' : abs >= 0.4 ? 'MODERATE' : 'WEAK'}
                    {r >= 0 ? ' ↑↑' : ' ↑↓'}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
            fontSize: 11, color: 'var(--fg-4)',
          }}>
            💡 <strong>Correlation ≠ causation.</strong> These patterns show which metrics tend to be high in the same week.
            To add ad spend correlation, connect your Meta Ads / Google Ads data to this dashboard.
          </div>
        </div>
      )}

      <AnalyticsInsights />
    </div>
  )
}
