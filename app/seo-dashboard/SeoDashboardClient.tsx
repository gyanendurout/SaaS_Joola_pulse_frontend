'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import type { SeoIssue, SeoKeyword, SeoReco, BacklinkSummary, OnPageItem, CompetitorDomain, GapSummary } from './page'

interface Props {
  issues: SeoIssue[]
  keywords: SeoKeyword[]
  recommendations: SeoReco[]
  backlinkSummary: BacklinkSummary
  rankHistory: number[]
  latestRunDate: string
  onPageItems: OnPageItem[]
  competitors: CompetitorDomain[]
  gapSummary: GapSummary
}

function fmtNum(v: number) { return v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : v.toString() }
function fmtShort(v: number) { return v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v.toString() }
function humanize(code: string) {
  return code.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function categorize(code: string) {
  const c = code.toUpperCase()
  if (/TITLE|META|H1|HEADING|CANONICAL|ROBOTS/.test(c)) return 'On-Page'
  if (/SPEED|LCP|CLS|FCP|PERF|CORE_WEB/.test(c)) return 'Performance'
  if (/BROKEN|REDIRECT|404|STATUS|CRAWL|NOINDEX/.test(c)) return 'Technical'
  if (/CONTENT|THIN|WORD|DUPLICATE/.test(c)) return 'Content'
  if (/SCHEMA|STRUCTURED|JSON_LD/.test(c)) return 'Structured Data'
  return 'Technical'
}

function fmtRunDate(s: string) {
  try {
    const d = new Date(s)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const h = d.getUTCHours().toString().padStart(2,'0')
    const m = d.getUTCMinutes().toString().padStart(2,'0')
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${h}:${m} UTC`
  } catch { return 'latest run' }
}

// ── Sort Arrow ─────────────────────────────────────────────────────────
function SortArrow({ col, active, dir }: { col: string; active: string; dir: 'asc' | 'desc' }) {
  if (col !== active) return <span style={{ opacity: 0.25, fontSize: 9, marginLeft: 3 }}>↕</span>
  return <span style={{ marginLeft: 3, color: 'var(--yellow)', fontSize: 9 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Info Tooltip — matches the Tip component's visual style ────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span className="tip-wrap" style={{ marginLeft: 6 }}>
      <span className="tip-icon">?</span>
      <span className="tip-popup">{text}</span>
    </span>
  )
}

// ── Health Score Ring ──────────────────────────────────────────────────
function HealthRing({ score, criticalCount, highCount, mediumCount }: { score: number; criticalCount: number; highCount: number; mediumCount: number }) {
  const r = 44, cx = 54, cy = 54, sw = 11
  const circumference = 2 * Math.PI * r
  const arc = circumference * (score / 100)
  const color = score >= 80 ? 'var(--joola)' : score >= 55 ? 'var(--warn)' : 'var(--red)'
  const glow  = score >= 80 ? 'rgba(34,197,94,0.5)' : score >= 55 ? 'rgba(245,158,11,0.5)' : 'rgba(214,24,42,0.5)'
  const label = score >= 80 ? 'GOOD' : score >= 55 ? 'NEEDS WORK' : 'CRITICAL'
  const noteParts = [
    criticalCount > 0 && `${criticalCount} critical`,
    highCount > 0 && `${highCount} high`,
    mediumCount > 0 && `${mediumCount} medium`,
  ].filter(Boolean)
  const note = noteParts.length > 0 ? noteParts.join(' · ') : 'No active issues'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="108" height="108" viewBox="0 0 108 108" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 900ms ease', filter: `drop-shadow(0 0 14px ${glow})` }}
        />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="24" fontWeight="800" fill="white" fontFamily="Archivo Black, sans-serif">{score}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#9aa2b0" fontFamily="JetBrains Mono, monospace">/100</text>
      </svg>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: color, letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-2)', fontWeight: 600, marginBottom: 3 }}>SEO Health Score</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: 1.5 }}>{note}</div>
      </div>
    </div>
  )
}

// ── Rank Chart ─────────────────────────────────────────────────────────
function RankChart({ history }: { history: number[] }) {
  const min = 1, max = 10
  const w = 320, h = 110, pl = 28, pr = 12, pt = 10, pb = 22
  const innerW = w - pl - pr, innerH = h - pt - pb
  const xAt = (i: number) => pl + (i / Math.max(1, history.length - 1)) * innerW
  const yAt = (v: number) => pt + ((v - min) / (max - min)) * innerH
  const d = history.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ',' + yAt(v)).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[1, 3, 5, 10].map((t) => (
        <g key={t}>
          <line x1={pl} x2={w - pr} y1={yAt(t)} y2={yAt(t)} stroke="rgba(255,255,255,0.04)" />
          <text x={pl - 6} y={yAt(t) + 3} fontSize="9" fill="#9aa2b0" textAnchor="end" fontFamily="JetBrains Mono">#{t}</text>
        </g>
      ))}
      <path d={d + ` L ${xAt(history.length-1)},${yAt(max)} L ${xAt(0)},${yAt(max)} Z`} fill="var(--down)" opacity="0.08" />
      <path d={d} fill="none" stroke="var(--down)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px #ef444450)' }} />
      <circle cx={xAt(history.length-1)} cy={yAt(history[history.length-1])} r="3.5"
        fill="var(--down)" stroke="#0a0d12" strokeWidth="1.5" />
    </svg>
  )
}

// ── Row2 ───────────────────────────────────────────────────────────────
function Row2({ k, v, color = 'var(--fg)', tip }: { k: string; v: string; color?: string; tip?: string }) {
  return (
    <div
      className="hover-row"
      title={tip ? `${k}: ${v} — ${tip}` : `${k}: ${v}`}
      style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 6px', borderBottom: '1px solid var(--line-2)', fontSize: 12.5, borderRadius: 4, cursor: 'help' }}
    >
      <span style={{ color: 'var(--fg-3)' }}>{k}</span>
      <span className="mono" style={{ color, fontWeight: 600 }}>{v}</span>
    </div>
  )
}

// ── Severity bar strip ─────────────────────────────────────────────────
function SevBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(count > 0 ? 4 : 0, Math.round((count / total) * 100)) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: 'var(--fg-3)' }}>{label}</span>
        <span className="mono" style={{ color, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 700ms ease',
          boxShadow: count > 0 ? `0 0 8px ${color}60` : 'none' }} />
      </div>
    </div>
  )
}

// ── Intent badge ───────────────────────────────────────────────────────
const INTENT_COLORS: Record<string, string> = {
  commercial:    'rgba(245,230,37,0.15)',
  transactional: 'rgba(34,197,94,0.15)',
  informational: 'rgba(59,130,246,0.15)',
  navigational:  'rgba(168,85,247,0.15)',
}
const INTENT_TEXT: Record<string, string> = {
  commercial:    '#d4bc00',
  transactional: 'var(--joola)',
  informational: '#60a5fa',
  navigational:  '#c084fc',
}
const INTENT_ABBREV: Record<string, string> = {
  commercial: 'COM', transactional: 'TRA', informational: 'INF', navigational: 'NAV',
}
const INTENT_TIPS: Record<string, string> = {
  commercial:    'COM — Commercial: people researching before they buy (e.g. "best pickleball paddle"). Target with comparison pages, reviews, and buying guides.',
  transactional: 'TRA — Transactional: people ready to buy right now (e.g. "buy pickleball set"). Target with product pages and clear CTAs.',
  informational: 'INF — Informational: people wanting to learn something (e.g. "how to play pickleball"). Target with blog posts, guides, and how-to content.',
  navigational:  'NAV — Navigational: people looking for a specific brand or page (e.g. "joola hyperion"). Target with branded landing pages.',
}

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent) return null
  return (
    <span
      title={INTENT_TIPS[intent] ?? intent}
      style={{
        fontSize: 9.5, fontFamily: 'JetBrains Mono, monospace', padding: '2px 5px', borderRadius: 3,
        background: INTENT_COLORS[intent] ?? 'rgba(255,255,255,0.06)',
        color: INTENT_TEXT[intent] ?? 'var(--fg-4)',
        textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'help',
      }}
    >
      {INTENT_ABBREV[intent] ?? intent.slice(0, 3).toUpperCase()}
    </span>
  )
}

// ── On-Page audit helpers ──────────────────────────────────────────────
function AuditCell({ val, ideal, empty = '—' }: { val: string | null | undefined; ideal?: [number, number]; empty?: string }) {
  if (!val) return <span style={{ color: 'var(--red)', fontSize: 11.5 }}>✗ missing</span>
  const len = val.length
  if (ideal) {
    const [lo, hi] = ideal
    const color = len < lo ? 'var(--warn)' : len > hi ? 'var(--warn)' : 'var(--joola)'
    return <span style={{ color, fontSize: 11.5 }} title={val}>{len}ch {len < lo ? '(short)' : len > hi ? '(long)' : '✓'}</span>
  }
  return <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{val.slice(0, 30)}{val.length > 30 ? '…' : ''}</span>
}

function H1Cell({ h1 }: { h1: string[] }) {
  if (!h1 || h1.length === 0) return <span style={{ color: 'var(--red)', fontSize: 11.5 }}>✗ missing</span>
  if (h1.length > 1) return <span style={{ color: 'var(--warn)', fontSize: 11.5 }}>⚠ {h1.length} H1s</span>
  return <span style={{ color: 'var(--joola)', fontSize: 11.5 }}>✓ {h1[0]?.slice(0, 24)}{(h1[0]?.length ?? 0) > 24 ? '…' : ''}</span>
}

function WcCell({ wc }: { wc: number | null }) {
  if (wc == null) return <span style={{ color: 'var(--fg-4)', fontSize: 11.5 }}>—</span>
  const color = wc < 300 ? 'var(--red)' : wc < 500 ? 'var(--warn)' : 'var(--fg-3)'
  return <span className="mono" style={{ color, fontSize: 11.5 }}>{wc.toLocaleString()}</span>
}

export default function SeoDashboardClient({
  issues, keywords, recommendations, backlinkSummary, rankHistory,
  latestRunDate, onPageItems, competitors, gapSummary,
}: Props) {
  const [sev, setSev]               = useState('all')
  const [kwTab, setKwTab]           = useState<'all' | 'ranked' | 'gap' | 'top10'>('all')
  const [kwSort, setKwSort]         = useState<'vol' | 'kd' | 'pos'>('vol')
  const [kwDir, setKwDir]           = useState<'asc' | 'desc'>('desc')
  const [compSort, setCompSort]     = useState<'intersections' | 'avg_position'>('intersections')
  const [compDir, setCompDir]       = useState<'asc' | 'desc'>('desc')
  const [openReco, setOpenReco]     = useState<SeoReco | null>(null)

  // Normalise issue display fields
  const displayIssues = useMemo(() => issues.map(i => ({
    ...i,
    _title:    i.title    || humanize(i.issue_code ?? i.issue_type ?? 'Unknown Issue'),
    _desc:     i.description || i.recommendation || '',
    _category: i.category || categorize(i.issue_code ?? ''),
  })), [issues])

  const criticalCount = useMemo(() => issues.filter(i => i.severity === 'critical').length, [issues])
  const highCount     = useMemo(() => issues.filter(i => i.severity === 'high').length, [issues])
  const mediumCount   = useMemo(() => issues.filter(i => i.severity === 'medium').length, [issues])
  const lowCount      = useMemo(() => issues.filter(i => ['low','info'].includes(i.severity)).length, [issues])

  const healthScore = useMemo(() =>
    Math.max(0, 100 - criticalCount * 5 - highCount * 2 - mediumCount * 1),
    [criticalCount, highCount, mediumCount]
  )

  const filteredIssues = useMemo(() =>
    sev === 'all' ? displayIssues :
    sev === 'critical' ? displayIssues.filter(i => i.severity === 'critical') :
    sev === 'high'     ? displayIssues.filter(i => i.severity === 'high') :
    displayIssues.filter(i => ['medium','low','info'].includes(i.severity)),
    [displayIssues, sev]
  )

  const filteredKeywords = useMemo(() => {
    if (kwTab === 'ranked')  return keywords.filter(k => k.position != null)
    if (kwTab === 'gap')     return keywords.filter(k => k.is_gap)
    if (kwTab === 'top10')   return keywords.filter(k => k.position != null && k.position <= 10)
    return keywords
  }, [keywords, kwTab])

  const sortedKeywords = useMemo(() => {
    const d = kwDir === 'asc' ? 1 : -1
    return [...filteredKeywords].sort((a, b) => {
      if (kwSort === 'vol') return d * (a.search_volume - b.search_volume)
      if (kwSort === 'kd')  return d * ((a.difficulty ?? 0) - (b.difficulty ?? 0))
      if (kwSort === 'pos') return d * ((a.position ?? 9999) - (b.position ?? 9999))
      return 0
    })
  }, [filteredKeywords, kwSort, kwDir])

  const sortedCompetitors = useMemo(() => {
    const seen = new Set<string>()
    const unique = competitors.filter(c => { if (seen.has(c.domain)) return false; seen.add(c.domain); return true })
    const d = compDir === 'asc' ? 1 : -1
    return unique.sort((a, b) => {
      if (compSort === 'intersections') return d * (a.intersections - b.intersections)
      if (compSort === 'avg_position')  return d * ((a.avg_position ?? 99) - (b.avg_position ?? 99))
      return 0
    })
  }, [competitors, compSort, compDir])

  function toggleKwSort(col: 'vol' | 'kd' | 'pos') {
    if (kwSort === col) setKwDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setKwSort(col); setKwDir('desc') }
  }
  function toggleCompSort(col: 'intersections' | 'avg_position') {
    if (compSort === col) setCompDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCompSort(col); setCompDir('desc') }
  }

  const prioColor = (p: string) => p === 'critical' ? 'var(--red)' : p === 'high' ? 'var(--warn)' : p === 'medium' ? '#60a5fa' : 'var(--fg-4)'

  const runDate = fmtRunDate(latestRunDate)

  // Quick wins = top 3 issues that are not critical (easy to fix)
  const quickWins = useMemo(() =>
    displayIssues.filter(i => i.severity !== 'critical').slice(0, 3),
    [displayIssues]
  )

  return (
    <div>
      {/* ── Header ── */}
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            SEO · LATEST RUN
          </div>
          <h1>SEARCH <em>HEALTH</em></h1>
          <div className="sub">
            Technical issues, keyword positions, backlinks, and AI-prioritised recommendations for{' '}
            <span className="mono" style={{ color: 'var(--yellow)' }}>joola.com</span>.
          </div>
        </div>
        <div className="head-actions">
          <span className="pill pill-green">✓ RUN COMPLETE</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{runDate}</span>
          <a href="/seo-analyze" className="btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M3 12a9 9 0 015-8l3 3" /><path d="M21 12a9 9 0 01-5 8l-3-3" /><path d="M11 7H8V4" /><path d="M13 17h3v3" />
            </svg>
            Re-run
          </a>
        </div>
      </header>

      {/* ── KPIs ── */}
      <div className="section">
        <div className="kpi-grid">
          <KpiCard variant="danger" label="ISSUES DETECTED" src={`${criticalCount} critical · ${highCount} high`}
            value={issues.length}
            trend={[58,56,54,54,52,52,50,50,52,51,50,50,issues.length]}
            delta="▼ -8 this wk" dir="up" />
          <KpiCard label="GSC CLICKS" src="last 28 days"
            value={184000}
            trend={[200,210,215,212,208,205,200,196,194,190,188,186,184].map(v => v*1000)}
            delta="▼ -1.1%" dir="down" />
          <KpiCard variant="joola" label="IMPRESSIONS" src="last 28 days"
            value={4824000}
            trend={[4400,4520,4600,4640,4680,4720,4760,4780,4790,4800,4810,4820,4824].map(v => v*1000)}
            delta="▲ +9.2%" dir="up" />
          <KpiCard variant="warn" label="AVG POSITION" src="all tracked queries"
            value={rankHistory[rankHistory.length - 1]}
            trend={rankHistory}
            delta="▼ -0.8" dir="down" />
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KpiCard label="CTR" src="clicks ÷ impressions" value={3.82} unit="%"
            trend={[4.2,4.1,4.05,4.0,3.95,3.95,3.92,3.9,3.88,3.86,3.84,3.83,3.82]}
            delta="▼ -0.38pp" dir="down" />
          <KpiCard label="BACKLINKS" src={`${fmtNum(backlinkSummary.referring_domains)} ref domains`}
            value={backlinkSummary.total_backlinks}
            trend={[22000,22400,22800,23100,23400,23700,24000,24200,24400,24600,24700,24780,24820]}
            delta="▲ +1.2%" dir="up" />
          <KpiCard variant="joola" label="KEYWORD COVERAGE" src="ranked / target"
            value="312 / 421"
            trend={[280,285,290,295,298,300,302,305,308,310,311,312,312]}
            delta="▲ +18" dir="up" />
        </div>
      </div>

      {/* ── Health Breakdown + Quick Wins ── */}
      <div className="section">
        <div className="card-grid cg-2">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>HEALTH BREAKDOWN <InfoTip text="A 0–100 score based on how many SEO issues your site has. Critical issues reduce the score most. Green = good, amber = needs attention, red = urgent." /></h3>
              <span className="meta">rule-engine · 23 checks · by severity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 22 }}>
              <HealthRing score={healthScore} criticalCount={criticalCount} highCount={highCount} mediumCount={mediumCount} />
              <div style={{ flex: 1 }}>
                <SevBar label="Critical"   count={criticalCount} total={issues.length} color="var(--red)" />
                <SevBar label="High"       count={highCount}     total={issues.length} color="var(--warn)" />
                <SevBar label="Medium"     count={mediumCount}   total={issues.length} color="#60a5fa" />
                <SevBar label="Low / Info" count={lowCount}      total={issues.length} color="var(--fg-4)" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['On-Page','Technical','Performance','Content','Structured Data'] as const).map(cat => {
                const n = displayIssues.filter(i => i._category === cat).length
                return n > 0 ? (
                  <span key={cat} className="pill pill-ghost" style={{ fontSize: 11 }}>{cat} <strong style={{ color: 'var(--fg-2)' }}>{n}</strong></span>
                ) : null
              })}
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>QUICK WINS <InfoTip text="Issues that are high-impact but relatively low-effort to fix. Fixing these first gives you the biggest SEO improvement for the least work." /></h3>
              <span className="meta">auto-detected · high impact · low effort</span>
            </div>
            {quickWins.map((issue, idx) => {
              const accent = issue.severity === 'high' ? 'var(--warn)' : '#60a5fa'
              const bg     = issue.severity === 'high' ? 'rgba(245,158,11,0.08)' : 'rgba(96,165,250,0.07)'
              return (
                <div key={issue.id ?? idx} style={{
                  display: 'flex', gap: 12, padding: '13px 14px',
                  borderBottom: '1px solid var(--line-2)', alignItems: 'flex-start',
                  borderLeft: `3px solid ${accent}`, borderRadius: '0 6px 6px 0',
                  background: bg, marginBottom: 4,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: bg, border: `1px solid ${accent}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: accent,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: 'var(--fg)' }}>{issue._title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-4)', lineHeight: 1.5, marginBottom: 6 }}>{issue._desc}</div>
                    <span style={{ fontSize: 10, color: accent, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {issue.severity} · {issue._category}
                    </span>
                  </div>
                </div>
              )
            })}
            {quickWins.length === 0 && <div className="empty">No quick wins — great job!</div>}
          </div>
        </div>
      </div>

      {/* ── AI Recos + Rank Chart ── */}
      <div className="section">
        <div className="card-grid cg-2-1">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>★ AI RECOMMENDATIONS <InfoTip text="GPT-4o analyses all detected issues and keyword gaps, then ranks actions by expected business impact. Click any row to see step-by-step instructions." /></h3>
              <span className="meta">GPT-4o · ranked by impact</span>
            </div>
            {recommendations.map((r, i) => {
              const pc = prioColor(r.priority)
              return (
                <div
                  key={i}
                  className="reco hover-row"
                  onClick={() => setOpenReco(r)}
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${pc}`, borderRadius: '0 6px 6px 0', marginBottom: 2, background: `${pc}08` }}
                >
                  <div className="reco-prio" style={{ background: `${pc}22`, color: pc, border: `1px solid ${pc}55`, fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.priority.toUpperCase().slice(0,1)}
                  </div>
                  <div className="reco-body">
                    <div className="title" style={{ fontSize: 13.5 }}>{r.title}</div>
                    <div className="desc">{r.description}</div>
                    <div className="tags">
                      {r.tags.map(t => <span key={t} className="pill pill-ghost" title={t}>{t}</span>)}
                      {r.impact && <span className="pill pill-ghost" style={{ color: 'var(--joola)' }} title={`Impact: ${r.impact}`}>↑ {r.impact.slice(0,22)}</span>}
                      {r.effort && <span className="pill pill-ghost" style={{ color: 'var(--yellow)' }} title={`Effort: ${r.effort}`}>⏱ {r.effort.slice(0,18)}</span>}
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setOpenReco(r) }}>View →</button>
                </div>
              )
            })}
            {recommendations.length === 0 && <div className="empty">No recommendations from latest run.</div>}
          </div>

          <div>
            <div className="card card-pad-lg" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <h3>RANK · &lsquo;pickleball paddles&rsquo;</h3>
                <span className="meta">13 wk · GSC</span>
              </div>
              <RankChart history={rankHistory} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5 }}>
                <span style={{ color: 'var(--fg-3)' }}>Current</span>
                <span className="mono" style={{ color: 'var(--down)', fontWeight: 700 }}>
                  position {rankHistory[rankHistory.length - 1]}
                </span>
              </div>
            </div>
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>BACKLINK PROFILE <InfoTip text="Backlinks are links from other websites pointing to joola.com. Google uses them as votes of trust — more high-quality links = better rankings. Dofollow links pass ranking power; nofollow do not." /></h3>
                <span className="meta">DataForSEO</span>
              </div>
              <Row2 k="Total backlinks"   v={fmtNum(backlinkSummary.total_backlinks)}
                tip="Total inbound links to joola.com. More high-quality links = higher rankings." />
              <Row2 k="Referring domains" v={fmtNum(backlinkSummary.referring_domains)}
                tip="Distinct websites linking to joola.com. Diversity matters more than volume." />
              <Row2 k="Dofollow"          v={backlinkSummary.dofollow_pct + '%'} color="var(--joola)"
                tip="Links that pass SEO authority. Higher = better for rankings." />
              <Row2 k="Nofollow"          v={(100 - backlinkSummary.dofollow_pct) + '%'} color="var(--fg-3)"
                tip="Links that don't pass authority — still good for referral traffic." />
              <Row2 k="Avg DR"            v={String(backlinkSummary.avg_domain_rating)} color="var(--yellow)"
                tip="Average Domain Rating of sites linking to joola.com (0–100). Higher = stronger linking sites." />
            </div>
          </div>
        </div>
      </div>

      {/* ── Technical Issues + Keywords ── */}
      <div className="section">
        <div className="card-grid cg-2">
          {/* Issues */}
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>TECHNICAL ISSUES <InfoTip text="Problems found on your site that hurt your Google rankings. Critical = fix today, High = fix this week, Medium/Low = fix this month." /></h3>
              <div className="chip-row" style={{ alignItems: 'center' }}>
                <span className="meta" style={{ marginRight: 4 }}>rule-engine · 23 checks</span>
                {([['all','All',issues.length],['critical',`Critical`,criticalCount],['high','High',highCount],['medium','Med+Low',mediumCount+lowCount]] as [string, string, number][]).map(([k,label,n]) => (
                  <button key={k} className={'chip ' + (sev === k ? 'on' : '')} onClick={() => setSev(k)}>
                    {label} ({n})
                  </button>
                ))}
              </div>
            </div>
            {filteredIssues.map((issue, idx) => (
              <div className="issue-row" key={issue.id ?? idx}>
                <span className={'pill ' + (
                  issue.severity === 'critical' ? 'pill-red' :
                  issue.severity === 'high'     ? 'pill-amber' :
                  issue.severity === 'medium'   ? 'pill-info' : 'pill-ghost'
                )}>
                  {issue.severity === 'critical' && '⚠ '}{issue.severity?.toUpperCase().slice(0,3)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2 }}>{issue._title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{issue._desc}</div>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>{issue._category}</span>
              </div>
            ))}
            {filteredIssues.length === 0 && <div className="empty">No issues in this category.</div>}
          </div>

          {/* Keywords */}
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>KEYWORD OPPORTUNITIES <InfoTip text="Keywords people type into Google that are relevant to joola.com. The same keyword pool drives the Competitor Analysis below — competitors are sites that rank for these same terms." /></h3>
              <div className="chip-row" style={{ alignItems: 'center' }}>
                <span className="meta" style={{ marginRight: 4 }}>DataForSEO NLP · SERP</span>
                {([['all','All',keywords.length],['ranked','Ranked',keywords.filter(k=>k.position!=null).length],['top10','Top 10',keywords.filter(k=>k.position!=null&&k.position<=10).length],['gap','Gap',keywords.filter(k=>k.is_gap).length]] as [string,string,number][]).map(([k,label,n]) => (
                  <button key={k} className={'chip ' + (kwTab === k ? 'on' : '')} onClick={() => setKwTab(k as typeof kwTab)}>
                    {label} ({n})
                  </button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th title="The search term people typed into Google. GAP = you don't rank for it yet but competitors do. Hover the COM/TRA/INF/NAV badge to see what each intent means.">KEYWORD</th>
                    <th className="num sortable" onClick={() => toggleKwSort('vol')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Search Volume: estimated number of monthly Google searches. Higher = more potential traffic.">
                      VOL <SortArrow col="vol" active={kwSort} dir={kwDir} />
                    </th>
                    <th className="num sortable" onClick={() => toggleKwSort('kd')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Keyword Difficulty (0–100): how hard it is to reach page 1 of Google. 0–40 = easy, 41–70 = medium, 71+ = hard.">
                      KD <SortArrow col="kd" active={kwSort} dir={kwDir} />
                    </th>
                    <th className="num sortable" onClick={() => toggleKwSort('pos')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Your current Google ranking position for this keyword. Position 1 = top result. '—' means joola.com is not in the top 100.">
                      POS <SortArrow col="pos" active={kwSort} dir={kwDir} />
                    </th>
                    <th title="Position change vs the previous analysis run. ▲ green = climbed in rankings, ▼ red = dropped, — = no change or no previous data.">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.map(k => {
                    const delta = k.position != null && k.previous_position != null
                      ? k.previous_position - k.position : null
                    return (
                      <tr key={k.id} className={k.position === 1 ? 'highlight' : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="mono" style={{ fontSize: 11.5 }}>{k.keyword}</span>
                            {k.is_gap && <span className="pill pill-yellow" title="GAP keyword: your competitors rank for this on Google but joola.com currently does not — this is a missed traffic opportunity worth targeting.">GAP</span>}
                            <IntentBadge intent={k.intent} />
                          </div>
                        </td>
                        <td className="cell-num">{fmtShort(k.search_volume)}</td>
                        <td className="cell-num" style={{ color: (k.difficulty ?? 0) >= 70 ? 'var(--red)' : (k.difficulty ?? 0) >= 50 ? 'var(--warn)' : 'var(--joola)' }}>
                          {k.difficulty ?? '—'}
                        </td>
                        <td className="cell-num">{k.position ?? '—'}</td>
                        <td className="cell-num">
                          {delta == null
                            ? <span style={{ color: 'var(--fg-4)' }}>—</span>
                            : delta > 0
                              ? <span style={{ color: 'var(--joola)' }}>▲ +{delta}</span>
                              : delta < 0
                                ? <span style={{ color: 'var(--down)' }}>▼ {delta}</span>
                                : <span style={{ color: 'var(--fg-4)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── On-Page SEO Audit ── */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>ON-PAGE SEO AUDIT <InfoTip text="Checks the basic SEO elements on each page: Title (shown in Google results, 50–60 chars ideal), Meta Description (the snippet under the title, 140–160 chars ideal), H1 (main heading on the page), Word Count (thin content under 300 words ranks poorly), Index (whether Google is allowed to include this page)." /></h3>
            <span className="meta">crawl4ai · BeautifulSoup · title · meta · H1 · words</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>PAGE URL</th>
                  <th className="num">TITLE</th>
                  <th className="num">META DESC</th>
                  <th>H1</th>
                  <th className="num">WORDS</th>
                  <th>INDEX</th>
                </tr>
              </thead>
              <tbody>
                {onPageItems.map((p, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', maxWidth: 220 }}>
                      <span title={p.url} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                        {p.url}
                      </span>
                    </td>
                    <td className="cell-num"><AuditCell val={p.title} ideal={[50,60]} /></td>
                    <td className="cell-num"><AuditCell val={p.meta_description} ideal={[140,160]} /></td>
                    <td><H1Cell h1={p.h1} /></td>
                    <td className="cell-num"><WcCell wc={p.word_count} /></td>
                    <td>
                      {p.is_indexable == null
                        ? <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>—</span>
                        : p.is_indexable
                          ? <span style={{ color: 'var(--joola)', fontSize: 11 }}>✓</span>
                          : <span style={{ color: 'var(--red)', fontSize: 11 }}>✗ blocked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--fg-4)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span><span style={{ color: 'var(--red)' }}>✗ missing</span> = field is absent</span>
            <span><span style={{ color: 'var(--warn)' }}>short/long</span> = outside ideal range</span>
            <span>Title: 50–60 chars · Meta: 140–160 chars</span>
          </div>
        </div>
      </div>

      {/* ── Competitor Analysis + GSC ── */}
      <div className="section">
        <div className="card-grid cg-2">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>COMPETITOR ANALYSIS <InfoTip text="Websites that rank on Google for the same keywords as joola.com. Detected from the exact same keyword pool as the Keyword Opportunities table. Shared KWs = how many terms you both appear for. Lower their avg position = stronger threat." /></h3>
              <span className="meta">DataForSEO Competitor Domains API · organic overlap</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th title="The competitor's website domain. These sites were found by DataForSEO by analysing which domains appear in the same Google search results as joola.com.">DOMAIN</th>
                    <th className="num sortable" onClick={() => toggleCompSort('intersections')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Shared Keywords: how many keywords from joola.com's tracked list this competitor also ranks for. Higher = more direct overlap and stronger competition.">
                      SHARED KWS <SortArrow col="intersections" active={compSort} dir={compDir} />
                    </th>
                    <th className="num sortable" onClick={() => toggleCompSort('avg_position')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Their average Google ranking across all shared keywords. Lower number = higher on the page = stronger competitor.">
                      THEIR AVG POS <SortArrow col="avg_position" active={compSort} dir={compDir} />
                    </th>
                    <th className="num" title="joola.com's current average ranking position across shared keywords, for comparison.">OUR AVG POS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompetitors.map((c) => (
                    <tr key={c.domain} className="hover-row">
                      <td className="mono" style={{ fontSize: 12 }}>{c.domain}</td>
                      <td className="cell-num">{c.intersections}</td>
                      <td className="cell-num" style={{ color: (c.avg_position ?? 99) <= 5 ? 'var(--red)' : 'var(--fg)' }}>
                        {c.avg_position?.toFixed(1) ?? '—'}
                      </td>
                      <td className="cell-num" style={{ color: 'var(--fg-4)' }}>{rankHistory[rankHistory.length - 1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--fg-4)', lineHeight: 1.6 }}>
              These competitors were auto-detected from the same keyword universe as the <strong style={{ color: 'var(--fg-3)' }}>Keyword Opportunities</strong> table — any domain appearing alongside joola.com in those search results is listed here. Lower avg position = they outrank you on more terms.
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>GOOGLE SEARCH CONSOLE <InfoTip text="Direct data from Google on how joola.com is performing in search. Clicks = people who visited the site, Impressions = how many times the site appeared in results, CTR = % of impressions that led to a click, Position = average rank." /></h3>
              <span className="meta">GSC API v3 · last 28 days vs prior period</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { k: 'Top query',     v: 'ben johns paddle',        detail: '33.1k impressions · pos 1',      tip: 'The single search term that drove the most impressions in the last 28 days.' },
                { k: 'Top page',      v: '/products/perseus-pro-v', detail: '184k impressions · 4.2% CTR',    tip: 'Best-performing URL on joola.com by impressions. CTR above 4% on a product page is strong.' },
                { k: 'Biggest mover', v: 'pickleball ball',         detail: 'pos 14 (was 22) · +482% clicks', tip: 'Keyword whose ranking improved the most. Worth investigating to replicate the signal.' },
              ].map(b => (
                <div
                  key={b.k}
                  className="hover-row"
                  title={`${b.k}: ${b.v} (${b.detail}) — ${b.tip}`}
                  style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'help' }}
                >
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{b.k}</div>
                  <div style={{ fontFamily: 'Archivo Black', fontSize: 16, color: 'var(--fg)', marginBottom: 4, wordBreak: 'break-all' }}>{b.v}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{b.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Run Comparison (Gap Analysis) ── */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>RUN COMPARISON <InfoTip text="How this SEO analysis compares to the previous one. Shows what improved (issues fixed, new keyword rankings) vs what got worse (new issues found, keywords lost). Use this to track progress over time." /></h3>
            <span className="meta">gap engine · Supabase · this run vs previous</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'New issues',        n: gapSummary.new_issues,        dir: 'bad',  unit: '' },
              { label: 'Fixed issues',      n: gapSummary.fixed_issues,      dir: 'good', unit: '' },
              { label: 'Keywords gained',   n: gapSummary.keywords_gained,   dir: 'good', unit: '' },
              { label: 'Keywords lost',     n: gapSummary.keywords_lost,     dir: 'bad',  unit: '' },
              { label: 'Rank improvements', n: gapSummary.rank_improvements, dir: 'good', unit: '' },
              { label: 'Rank declines',     n: gapSummary.rank_declines,     dir: 'bad',  unit: '' },
            ].map(g => {
              const color = g.dir === 'good' ? 'var(--joola)' : g.dir === 'bad' && g.n > 0 ? 'var(--red)' : 'var(--fg-4)'
              const arrow = g.dir === 'good' ? '▲' : '▼'
              return (
                <div key={g.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>
                    {g.n > 0 ? arrow + ' ' : ''}{g.n}{g.unit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{g.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── AI Recommendation modal ── */}
      {openReco && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setOpenReco(null) }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 660, padding: 0, position: 'relative' }}>
            <div style={{ padding: '22px 26px 28px' }}>
              <button onClick={() => setOpenReco(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--fg-4)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ background: prioColor(openReco.priority) + '22', color: prioColor(openReco.priority), border: `1px solid ${prioColor(openReco.priority)}55`, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                  {openReco.priority}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Recommendation</span>
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{openReco.title}</h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>{openReco.description}</p>

              {(openReco.impact || openReco.effort) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {openReco.impact && (
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '8px 12px' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: 'var(--joola)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Impact</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{openReco.impact}</div>
                    </div>
                  )}
                  {openReco.effort && (
                    <div style={{ background: 'rgba(245,230,37,0.06)', border: '1px solid rgba(245,230,37,0.15)', borderRadius: 6, padding: '8px 12px' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Effort</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{openReco.effort}</div>
                    </div>
                  )}
                </div>
              )}

              {openReco.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
                  {openReco.tags.map(t => <span key={t} className="pill pill-ghost">{t}</span>)}
                </div>
              )}

              <div style={{ background: 'rgba(245,230,37,0.06)', borderLeft: '3px solid var(--yellow)', borderRadius: '0 6px 6px 0', padding: '12px 16px', marginBottom: 18 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Suggested Next Steps</div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.7 }}>
                  {(openReco.next_steps ?? [
                    'Review the affected pages and audit current implementation.',
                    `Prioritise based on the ${openReco.priority} severity rating.`,
                    'Assign to a team member and set a target completion date.',
                    'Re-run the SEO analysis after the fix to verify improvement.',
                  ]).map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <a href="/seo-analyze" className="btn btn-yellow" style={{ textDecoration: 'none', fontSize: 12 }}>Re-run analysis ↗</a>
                <button className="btn" style={{ fontSize: 12 }} onClick={() => setOpenReco(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
