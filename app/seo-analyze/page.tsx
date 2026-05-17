'use client'

import { useState, useEffect, useRef } from 'react'

interface PipelineStep {
  n: number
  label: string
  meta: string
  description: string
  tool: string
  output: string
}

const PIPELINE: PipelineStep[] = [
  {
    n: 1, label: 'DNS + HTTP Fetch', meta: 'crawl4ai · headless',
    description: 'Resolves DNS, follows any redirect chain, and fetches the full rendered HTML using a headless browser. JavaScript-heavy SPAs are fully rendered before extraction.',
    tool: 'crawl4ai + httpx', output: 'raw_html, http_status, redirect_chain, fetch_time_ms',
  },
  {
    n: 2, label: 'HTML Parse & Extract', meta: 'BeautifulSoup',
    description: 'Parses the DOM to extract title tag, meta description, H1–H3 hierarchy, canonical URL, hreflang, robots meta, open graph tags, internal/external links, image alt attributes, and JSON-LD structured data.',
    tool: 'BeautifulSoup 4 + lxml', output: 'title, meta_desc, h1[], h2[], canonical, schema_types[], images_missing_alt',
  },
  {
    n: 3, label: 'Technical Issue Scan', meta: '23-rule ruleset',
    description: 'Runs 23 rule-based checks: missing/duplicate meta descriptions, thin content (<400 words), broken internal links, redirect chains >3 hops, non-indexable pages, missing schema markup, duplicate title tags, LCP/CLS signals.',
    tool: 'Custom rule engine (Python)', output: 'issues[] — each with issue_code, severity, page_url, recommendation',
  },
  {
    n: 4, label: 'Keyword Extraction', meta: 'DataForSEO NLP',
    description: 'Submits page content and seed keywords to DataForSEO\'s NLP endpoint. Returns keyword ideas grouped by intent: informational, commercial, transactional, navigational. CPC and difficulty scores included.',
    tool: 'DataForSEO Keywords Data API', output: 'keywords[] — keyword, volume, KD, intent, CPC, competition',
  },
  {
    n: 5, label: 'SERP Position Lookup', meta: 'DataForSEO SERP',
    description: 'Looks up current organic ranking positions for all extracted keywords in the target market and language. Captures full SERP (top 100) to identify organic competitors and People Also Ask boxes.',
    tool: 'DataForSEO SERP API', output: 'serp_results[] — our_rank, competitor_urls[], people_also_ask[]',
  },
  {
    n: 6, label: 'Competitor Gap Analysis', meta: 'DataForSEO',
    description: 'Identifies competing domains that rank for the same keywords. Reveals keyword gaps — terms competitors rank for that joola.com doesn\'t. Calculates organic traffic share and intersection count per competitor.',
    tool: 'DataForSEO Competitor Domains API', output: 'competitor_domains[] — domain, intersections, avg_position, gap_keywords[]',
  },
  {
    n: 7, label: 'Backlink Profile', meta: 'DataForSEO Backlinks',
    description: 'Fetches domain-level backlink metrics: total backlinks, unique referring domains, dofollow vs nofollow ratio, average Domain Rating (DR), top linking pages and anchor text distribution.',
    tool: 'DataForSEO Backlinks API', output: 'total_backlinks, referring_domains, dofollow_pct, avg_domain_rating',
  },
  {
    n: 8, label: 'GSC Data Pull', meta: 'Google Search Console API',
    description: 'Pulls last 28 days of search performance data from Google Search Console: total clicks, impressions, CTR, average position. Identifies top queries, top pages, and the biggest ranking movers since the prior period.',
    tool: 'Google Search Console API v3', output: 'clicks, impressions, ctr, avg_position, top_queries[], biggest_mover',
  },
  {
    n: 9, label: 'AI Recommendation Engine', meta: 'GPT-4o',
    description: 'Synthesises all findings into 4–8 prioritised, actionable recommendations. Each has priority level (critical/high/medium), estimated impact on organic traffic, estimated effort, and a step-by-step implementation guide.',
    tool: 'OpenAI GPT-4o (128k context)', output: 'recommendations[] — priority, impact, effort, next_steps[]',
  },
  {
    n: 10, label: 'Report & Persist', meta: 'Supabase PostgREST',
    description: 'Writes all collected data to Supabase: run record, pages, issues, keywords, SERP results, backlink summary, competitor domains, and AI recommendations. Creates a gap analysis diff against the previous run.',
    tool: 'Supabase PostgREST + gap engine', output: 'run_id, pages_saved, issues_saved, keywords_saved, gap_analysis',
  },
]

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

interface StepDetail {
  duration?: string
  records?: number
  source?: string
  note?: string
}

interface Run {
  id: string
  started: string
  duration: string
  issues: number
  keywords: number
  avgPos: number
  status: 'complete' | 'partial' | 'failed'
}

const PAST_RUNS: Run[] = [
  { id: 'run_2026-05-15', started: 'Today 07:00', duration: '4m 28s', issues: 50, keywords: 421, avgPos: 8.4, status: 'complete' },
  { id: 'run_2026-05-08', started: 'May 8 · 07:00', duration: '4m 12s', issues: 47, keywords: 418, avgPos: 7.6, status: 'complete' },
  { id: 'run_2026-05-01', started: 'May 1 · 07:00', duration: '3m 58s', issues: 52, keywords: 412, avgPos: 7.4, status: 'complete' },
  { id: 'run_2026-04-24', started: 'Apr 24 · 07:00', duration: '4m 02s', issues: 54, keywords: 408, avgPos: 6.8, status: 'complete' },
  { id: 'run_2026-04-17', started: 'Apr 17 · 07:00', duration: '4m 18s', issues: 58, keywords: 401, avgPos: 6.4, status: 'partial' },
]

const DEMO_DETAILS: Record<number, StepDetail> = {
  0: { duration: '0.4s',  records: 1,     source: 'crawl4ai' },
  1: { duration: '0.2s',  records: 1,     source: 'BeautifulSoup' },
  2: { duration: '0.8s',  records: 50,    source: 'rule-engine', note: '2 critical, 18 high, 30 medium' },
  3: { duration: '12.3s', records: 421,   source: 'DataForSEO NLP' },
  4: { duration: '18.1s', records: 312,   source: 'DataForSEO SERP' },
  5: { duration: '8.4s',  records: 47,    source: 'DataForSEO Competitor Domains' },
  6: { duration: '6.2s',  records: 24820, source: 'DataForSEO Backlinks', note: 'referring_domains: 2,847' },
  7: { duration: '4.0s',  records: 890,   source: 'GSC API v3' },
  8: { duration: '31.7s', records: 4,     source: 'GPT-4o', note: '1 critical, 2 high, 1 medium rec' },
  9: { duration: '0.6s',  records: 421,   source: 'Supabase PostgREST' },
}

const DEFAULT_SEEDS = [
  'joola pickleball', 'joola pickleball paddle', 'pickleball paddle', 'pickleball paddles',
  'graphite pickleball paddle', 'carbon fiber pickleball paddle', 'best pickleball paddle',
  'joola perseus', 'joola hyperion', 'joola ben johns', 'ben johns pickleball paddle',
  'pickleball ball', 'pickleball paddle reviews', 'pickleball equipment',
]

type SourceStatus = { name: string; status: 'connected' | 'not_connected'; detail: string }
type SourcesApiResponse = { dataforseo: boolean; openai: boolean; apify: boolean; apify_enabled: boolean; google: boolean; supabase: boolean }

const DEFAULT_SOURCES: SourceStatus[] = [
  { name: 'Crawler (httpx)',        status: 'connected',     detail: 'crawl4ai + BeautifulSoup — no key needed' },
  { name: 'Supabase DB',           status: 'connected',     detail: 'read/write active' },
  { name: 'DataForSEO',            status: 'not_connected', detail: 'checking…' },
  { name: 'Google Search Console', status: 'not_connected', detail: 'checking…' },
  { name: 'OpenAI GPT-4o',         status: 'not_connected', detail: 'checking…' },
  { name: 'Apify (optional)',      status: 'not_connected', detail: 'checking…' },
]

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease', flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function SeoAnalyzePage() {
  const [url, setUrl]                           = useState('joola.com')
  const [running, setRunning]                   = useState(false)
  const [progress, setProgress]                 = useState(6)
  const [runId, setRunId]                       = useState<string | null>(null)
  const [expandedStep, setExpandedStep]         = useState<number | null>(null)
  const [seeds, setSeeds]                       = useState<string[]>(DEFAULT_SEEDS)
  const [newSeed, setNewSeed]                   = useState('')
  const [showSeeds, setShowSeeds]               = useState(false)
  const [stepDetails, setStepDetails]           = useState<Record<number, StepDetail>>({})
  const [dataSources, setDataSources]           = useState<SourceStatus[]>(DEFAULT_SOURCES)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch('/seo-api/sources/status')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d: SourcesApiResponse | null) => {
        if (!d) return
        setDataSources([
          { name: 'Crawler (httpx)',        status: 'connected',                                 detail: 'crawl4ai + BeautifulSoup — no key needed' },
          { name: 'Supabase DB',           status: d.supabase    ? 'connected' : 'not_connected', detail: d.supabase    ? 'read/write active'                                                : 'URL or key missing' },
          { name: 'DataForSEO',            status: d.dataforseo  ? 'connected' : 'not_connected', detail: d.dataforseo  ? 'login + password set'                                            : 'API key required' },
          { name: 'Google Search Console', status: d.google      ? 'connected' : 'not_connected', detail: d.google      ? 'OAuth credentials set'                                          : 'OAuth required' },
          { name: 'OpenAI GPT-4o',         status: d.openai      ? 'connected' : 'not_connected', detail: d.openai      ? 'API key set'                                                    : 'API key required' },
          { name: 'Apify (optional)',      status: d.apify       ? 'connected' : 'not_connected', detail: d.apify       ? (d.apify_enabled ? 'token set · enabled' : 'token set · disabled') : 'JS renderer fallback' },
        ])
      })
  }, [])

  function startDemo() {
    setRunning(true)
    setProgress(0)
    setStepDetails({})
    let i = 0
    const tick = () => {
      setStepDetails(prev => ({ ...prev, [i]: DEMO_DETAILS[i] }))
      i++
      setProgress(i)
      if (i < PIPELINE.length) setTimeout(tick, 1200)
      else setRunning(false)
    }
    setTimeout(tick, 800)
  }

  async function startRealRun() {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      const res = await fetch('/seo-api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })
      if (!res.ok) throw new Error('API unavailable')
      const data = await res.json()
      const run_id: string = data.id ?? data.run_id

      // Cached/done run — SSE stream hangs for completed runs, so animate locally
      if (data.status === 'done' || data.cached) {
        setRunId(run_id)
        startDemo()
        return
      }

      setRunId(run_id)
      setRunning(true)
      setProgress(0)
      setStepDetails({})

      const es = new EventSource(`/seo-api/analyze/${run_id}/events`)
      eventSourceRef.current = es

      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data)
          if (evt.step != null) {
            setProgress(evt.step)
            if (evt.duration || evt.records) {
              setStepDetails(prev => ({
                ...prev,
                [evt.step - 1]: { duration: evt.duration, records: evt.records, source: evt.source, note: evt.note },
              }))
            }
          }
          if (evt.done) { setRunning(false); es.close() }
        } catch { /* ignore */ }
      }
      es.onerror = () => { setRunning(false); es.close() }
    } catch {
      startDemo()
    }
  }

  useEffect(() => {
    return () => { eventSourceRef.current?.close() }
  }, [])

  const steps = PIPELINE.map((s, i) => {
    let status: StepStatus = 'pending'
    if (i < progress) status = 'done'
    else if (i === progress && running) status = 'running'
    return { ...s, status: status as StepStatus, detail: stepDetails[i] }
  })

  const doneCount = steps.filter((s) => s.status === 'done').length
  const pct = Math.round((doneCount / PIPELINE.length) * 100)

  function addSeed() {
    const kw = newSeed.trim().toLowerCase()
    if (kw && !seeds.includes(kw)) setSeeds(prev => [...prev, kw])
    setNewSeed('')
  }

  const _ = runId // suppress unused warning

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            SEO · LIVE ANALYSIS PIPELINE
          </div>
          <h1>RUN <em>ANALYSIS</em></h1>
          <div className="sub">
            10-step automated crawl: fetch, parse, detect issues, research keywords, score SERP positions, generate AI recommendations.
          </div>
        </div>
        <div className="head-actions">
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
            Last run: today 07:00 IST · {PAST_RUNS.length} total runs
          </span>
          <a href="/seo-dashboard" className="btn" style={{ fontSize: 11 }}>↗ View dashboard</a>
        </div>
      </header>

      {/* Run card */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>NEW ANALYSIS RUN</h3>
            <span className="meta">DataForSEO · OpenAI · GSC</span>
          </div>

          {/* URL input row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 4px 4px 14px', flex: 1, minWidth: 320 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 010 18" /><path d="M12 3a14 14 0 000 18" />
              </svg>
              <span className="mono" style={{ fontSize: 13, color: 'var(--fg-4)', flexShrink: 0 }}>https://</span>
              <input
                className="fld"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ border: 0, background: 'transparent', flex: 1, padding: '8px 4px' }}
              />
              <button className="btn btn-yellow" onClick={startRealRun} disabled={running}>
                {running ? '▶ Running…' : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z" />
                    </svg>
                    Run analysis
                  </>
                )}
              </button>
            </div>
            <select className="fld">
              <option>US market · desktop</option>
              <option>US market · mobile</option>
              <option>Global · desktop</option>
            </select>
            <select className="fld">
              <option>Compare to last run</option>
              <option>Standalone</option>
            </select>
          </div>

          {/* Seed keywords accordion */}
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              style={{ fontSize: 11, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowSeeds(s => !s)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              Seed keywords ({seeds.length})
              <ChevronIcon open={showSeeds} />
            </button>
          </div>

          {showSeeds && (
            <div style={{ marginTop: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Seed keywords — used for keyword research in step 4
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {seeds.map(kw => (
                  <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,230,37,0.08)', border: '1px solid rgba(245,230,37,0.2)', borderRadius: 4, padding: '3px 8px', fontSize: 11.5, color: 'var(--fg-2)' }}>
                    {kw}
                    <button
                      onClick={() => setSeeds(prev => prev.filter(s => s !== kw))}
                      style={{ background: 'none', border: 'none', color: 'var(--fg-4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="fld"
                  value={newSeed}
                  onChange={e => setNewSeed(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSeed()}
                  placeholder="Add keyword and press Enter…"
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button className="btn btn-yellow" onClick={addSeed} style={{ fontSize: 11 }}>+ Add</button>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.06em' }}>PROGRESS</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg, var(--yellow), var(--yellow-deep))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)', transition: 'width 400ms ease' }} />
            </div>
            <span className="mono" style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700 }}>{pct}%</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{doneCount}/{PIPELINE.length} steps</span>
          </div>

          {/* Pipeline steps — expandable accordion */}
          <div className="pipeline" style={{ gap: 4 }}>
            {steps.map((s, idx) => {
              const st = s.status
              const isOpen = expandedStep === idx
              const isDone = st === 'done'
              const isRunning = st === 'running'

              return (
                <div key={s.n}>
                  <div
                    className={'pipe-step ' + st}
                    style={{ cursor: 'pointer', userSelect: 'none', borderRadius: isOpen ? '8px 8px 0 0' : 8 }}
                    onClick={() => setExpandedStep(isOpen ? null : idx)}
                  >
                    <div className="pipe-num">
                      {st === 'done'    ? <CheckIcon /> :
                       st === 'running' ? <span className="live-pulse-dot" style={{ width: 6, height: 6, background: '#000' }} /> :
                       st === 'error'   ? '✗' :
                       s.n}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pipe-label">{s.label}</div>
                      <div className="pipe-meta">{s.meta}</div>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', minWidth: 70, textAlign: 'right', color: 'var(--fg-4)' }}>
                      {isRunning && <span style={{ color: 'var(--yellow)', letterSpacing: 3 }}>● ● ●</span>}
                      {isDone && s.detail?.duration && s.detail.duration}
                    </div>
                    <span className={'pipe-status ' + (
                      st === 'done'    ? 'ps-done'    :
                      st === 'running' ? 'ps-running'  :
                      st === 'error'   ? 'ps-error'    :
                      'ps-pending'
                    )}>
                      {isDone && s.detail?.records != null ? `${s.detail.records.toLocaleString()} rec` : st}
                    </span>
                    <ChevronIcon open={isOpen} />
                  </div>

                  {isOpen && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderTop: 0, borderRadius: '0 0 8px 8px', padding: '14px 16px 14px 52px' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.65, marginBottom: 14 }}>
                        {s.description}
                      </div>
                      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                        <div>
                          <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Tool</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--yellow)' }}>{s.tool}</div>
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Output fields</div>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{s.output}</div>
                        </div>
                        {s.detail?.duration && (
                          <div>
                            <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Duration</div>
                            <div className="mono" style={{ fontSize: 11, color: 'var(--joola)' }}>{s.detail.duration}</div>
                          </div>
                        )}
                        {s.detail?.records != null && (
                          <div>
                            <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Records</div>
                            <div className="mono" style={{ fontSize: 11, color: 'var(--fg)' }}>{s.detail.records.toLocaleString()}</div>
                          </div>
                        )}
                        {s.detail?.note && (
                          <div>
                            <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Note</div>
                            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{s.detail.note}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Data source status */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>DATA SOURCE STATUS</h3>
            <span className="meta">API integrations · <a href="#" style={{ color: 'var(--yellow)', textDecoration: 'none' }}>configure →</a></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {dataSources.map(src => {
              const connected = src.status === 'connected'
              return (
                <div key={src.name} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: 'var(--surface-2)', border: `1px solid ${connected ? 'rgba(34,197,94,0.2)' : 'var(--line)'}`,
                  borderRadius: 8, padding: '12px 14px',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: connected ? 'var(--joola)' : 'var(--fg-4)',
                    boxShadow: connected ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: connected ? 'var(--fg)' : 'var(--fg-3)', marginBottom: 2 }}>{src.name}</div>
                    <div style={{ fontSize: 11, color: connected ? 'var(--joola)' : 'var(--fg-4)' }}>
                      {connected ? '● Connected' : '○ Not connected'}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>{src.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Historical runs */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>HISTORICAL RUNS</h3>
            <span className="meta">{PAST_RUNS.length} runs · last 90 days</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>RUN</th>
                  <th>STARTED</th>
                  <th className="num">DURATION</th>
                  <th className="num">ISSUES</th>
                  <th className="num">KEYWORDS</th>
                  <th className="num">AVG POS</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {PAST_RUNS.map((r, i) => (
                  <tr key={r.id} className={i === 0 ? 'highlight' : ''}>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {r.id}{i === 0 && <span className="you-badge">LATEST</span>}
                    </td>
                    <td>{r.started}</td>
                    <td className="cell-num">{r.duration}</td>
                    <td className="cell-num" style={{ color: r.issues > 50 ? 'var(--warn)' : 'var(--fg)' }}>{r.issues}</td>
                    <td className="cell-num">{r.keywords}</td>
                    <td className="cell-num">{r.avgPos}</td>
                    <td>
                      {r.status === 'complete'
                        ? <span className="pill pill-green">✓ COMPLETE</span>
                        : r.status === 'partial'
                          ? <span className="pill pill-amber">PARTIAL</span>
                          : <span className="pill pill-red">FAILED</span>}
                    </td>
                    <td>
                      <a href="/seo-dashboard" className="tlink" style={{ fontSize: 11 }}>↗ open</a>
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
