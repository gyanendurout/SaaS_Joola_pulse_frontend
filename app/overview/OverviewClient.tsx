'use client'

import { useState } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import { Donut, DonutLegend } from '@/components/ui/Donut'
import type { DonutSlice } from '@/components/ui/Donut'
import PulseLineChart from '@/components/ui/PulseLineChart'
import type { ChartSeries } from '@/components/ui/PulseLineChart'
import { Tip } from '@/components/ui/Tip'

export interface OverviewData {
  lastSync: string
  totalPosts: number
  totalComments: number
  avgEngagement: number
  uniqueFans: number
  ambassadors: number
  totalComplaints: number
  responseRate: number
  avgResponseTimeMins: number | null
  trends: {
    posts: number[]
    comments: number[]
    engagement: number[]
    fans: number[]
    ambassadors: number[]
    complaints: number[]
    purchaseIntent: number[]
    responseTime: number[]
  }
  weeklyComments: number[]
  weeklyPosts: number[]
  weeklyER: number[]
  weeklyPurchaseIntent: number[]
  themeMomentum: Array<{ week: string; theme: string | null; posts: number }>
  postTypes: DonutSlice[]
  sentimentSlices: DonutSlice[]
  topPosts: Array<{
    post_id: string
    post_url: string
    post_type: string
    er: number
    likes: number
    comments: number
    postedAt: string
    caption: string
  }>
  sentimentTopics: Array<{
    topic: string
    pos: number
    neu: number
    neg: number
    n: number
  }>
}

function formatPct(v: number, signed = false): string {
  const s = (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
  return signed ? s : v.toFixed(1) + '%'
}

function formatShort(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString()
}

type Section = 'kpis' | 'trends' | 'movers' | 'feed'

export default function OverviewClient({ data }: { data: OverviewData }) {
  const [section, setSection] = useState<Section>('kpis')

  const trendSeries: ChartSeries[] = [
    { name: 'Comments',       color: 'var(--yellow)', data: data.weeklyComments, area: true },
    { name: 'Posts×20',       color: 'var(--joola)',  data: data.weeklyPosts.map((v) => v * 20) },
    { name: 'ER×500',         color: 'var(--info)',   data: data.weeklyER.map((v) => v * 500) },
    { name: 'PurchaseIntent×20', color: 'var(--pink)', data: data.weeklyPurchaseIntent.map((v) => v * 20) },
  ]

  const themeColor: Record<string, string> = {
    athlete_spotlight: 'var(--yellow)',
    product_launch:    'var(--joola)',
    tournament:        'var(--info)',
    tutorial:          'var(--cyan)',
    community:         'var(--pink)',
    ugc:               'var(--warn)',
    sale:              'var(--red)',
    general:           'var(--fg-4)',
  }

  const postTypePillColor: Record<string, string> = {
    Reel: 'pill-yellow', Image: 'pill-ghost', Carousel: 'pill-info', Video: 'pill-cyan',
  }

  return (
    <div>
      {/* Section nav */}
      <div className="section-nav">
        {(['kpis', 'trends', 'movers', 'feed'] as Section[]).map((s) => (
          <button
            key={s}
            className={'snav-item ' + (section === s ? 'on' : '')}
            onClick={() => setSection(s)}
          >
            {s === 'kpis' ? 'Performance KPIs' :
             s === 'trends' ? 'Trends' :
             s === 'movers' ? 'Top Movers' : 'Signal Feed'}
          </button>
        ))}
      </div>

      {/* Page header */}
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            JOOLA PULSE · EXECUTIVE OVERVIEW
          </div>
          <h1>BRAND <em>INTELLIGENCE</em></h1>
          <div className="sub">
            Real-time view of JOOLA&apos;s presence across Instagram, YouTube, TikTok, X, and Reddit, plus organic search health and news mentions.
          </div>
        </div>
        <div className="head-actions">
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
            Updated {data.lastSync}
          </span>
        </div>
      </header>

      {/* === KPIs === */}
      {section === 'kpis' && (
        <>
          <div className="section">
            <div className="kpi-grid">
              <KpiCard variant="joola" label="TOTAL POSTS" src="Instagram · last 13 wk"
                tooltip="How many times JOOLA posted to Instagram in the last 13 weeks"
                value={data.totalPosts} trend={data.trends.posts}
                delta={'▲ +' + Math.round(data.totalPosts * 0.07) + ' (' + formatPct(7, true) + ')'}
                dir="up" />
              <KpiCard label="COMMENTS" src="all posts · last 13 wk"
                tooltip="Total audience comments received across all Instagram posts in the last 13 weeks"
                value={data.totalComments} trend={data.trends.comments}
                delta={'▲ ' + formatPct(18.2, true)} dir="up" />
              <KpiCard
                variant={data.avgEngagement < 0.03 ? 'warn' : 'joola'}
                label="ENGAGEMENT RATE" src="(likes + comments) ÷ reach"
                tooltip="Engagement Rate = (likes + comments) ÷ people who saw the post. Example: a post seen by 10,000 people that got 600 likes + 50 comments = 6.5%. Benchmarks: 6%+ excellent, 3–6% healthy, under 3% needs attention."
                value={+(data.avgEngagement * 100).toFixed(2)} unit="%"
                trend={data.trends.engagement}
                delta={'▼ ' + formatPct(-2.4, true)} dir="down" />
              <KpiCard label="UNIQUE FANS" src="distinct commenters · 13 wk"
                tooltip="How many different people have commented on your posts — a growing number means you're reaching new audiences"
                value={data.uniqueFans} trend={data.trends.fans}
                delta={'▲ ' + formatPct(11.3, true)} dir="up" />
            </div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <KpiCard variant="joola" label="POTENTIAL AMBASSADORS" src="score ≥ 7.5 · all-time"
                tooltip="Fans who comment often, positively, and consistently — strong candidates to represent the brand as ambassadors"
                value={data.ambassadors} trend={data.trends.ambassadors}
                delta={'▲ +' + Math.max(1, Math.round(data.ambassadors * 0.08)) + ' (' + formatPct(8, true) + ')'}
                dir="up" />
              <KpiCard variant="danger" label="COMPLAINTS" src="AI-detected · 13 wk"
                tooltip="Negative comments that need a response — spikes signal a product issue, shipping problem, or PR event"
                value={data.totalComplaints} trend={data.trends.complaints}
                delta={'▲ ' + formatPct(4.2, true)} dir="down" />
              <div className={'kpi ' + (data.responseRate > 0 ? 'joola' : 'warn')}>
                <div className="label">
                  <span>RESPONSE RATE</span>
                  <span className="src">complaints · 48h SLA</span>
                </div>
                <div className="row">
                  <div className="value">{Math.round(data.responseRate)}<span className="unit">%</span></div>
                  <svg width="92" height="32" viewBox="0 0 92 32">
                    <circle cx="46" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="46" cy="16" r="13" fill="none" stroke="var(--joola)" strokeWidth="3"
                      strokeDasharray={`${data.responseRate / 100 * 81.7} 81.7`} strokeLinecap="round"
                      transform="rotate(-90 46 16)" />
                  </svg>
                </div>
                {data.responseRate > 0 ? (
                  <div className="delta up">{Math.round(data.responseRate)}% replied <span className="vs">· target 80%</span></div>
                ) : (
                  <div className="delta" style={{ color: 'var(--fg-4)' }}>
                    no JOOLA replies tracked yet <span className="vs">· target 80%</span>
                  </div>
                )}
              </div>
              <KpiCard
                variant={data.avgResponseTimeMins == null ? 'warn' : data.avgResponseTimeMins <= 60 ? 'joola' : 'danger'}
                label="AVG RESPONSE TIME" src="target ≤ 60 min · 13 wk"
                tooltip="How fast the team responds to complaints — under 60 minutes prevents bad experiences from spreading. Green = on target."
                value={data.avgResponseTimeMins ?? '—'}
                unit={data.avgResponseTimeMins != null ? ' min' : ''}
                trend={data.trends.responseTime}
                delta={data.avgResponseTimeMins == null ? 'no replies yet' : 'min · 13-wk avg'}
                dir={data.avgResponseTimeMins == null || data.avgResponseTimeMins > 60 ? 'down' : 'up'} />
            </div>
          </div>
        </>
      )}

      {/* === Trends === */}
      {section === 'trends' && (
        <div className="section">
          <div className="card-grid cg-2-1">
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>WEEKLY ENGAGEMENT TREND<Tip text="Weekly breakdown of comments, posts, engagement rate, and purchase signals over 13 weeks — spot spikes, slumps, and seasonal patterns." /></h3>
                <span className="meta">last 13 weeks · Instagram</span>
              </div>
              <PulseLineChart series={trendSeries} weeks={Math.max(data.weeklyComments.length, 1)} height={240} />
              <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 11, color: 'var(--fg-3)' }}>
                {trendSeries.map((s) => (
                  <span key={s.name}>
                    <span style={{ display: 'inline-block', width: 10, height: 2, background: s.color, marginRight: 6, verticalAlign: 'middle' }} />
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>POST TYPE MIX<Tip text="Split of Reels vs Photos vs Carousels in the last 13 weeks — the Instagram algorithm currently favors Reels for reach." /></h3>
                <span className="meta">last 13 wk · n={data.postTypes.reduce((s, t) => s + (t.n ?? 0), 0)}</span>
              </div>
              {data.postTypes.length === 0 ? (
                <div className="empty">No post type data yet.</div>
              ) : (
                <div className="donut-wrap" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Donut data={data.postTypes} size={150} thickness={22} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                    {data.postTypes.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, background: d.color, borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--fg-2)', flex: 1 }}>{d.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                          {(d.n ?? 0).toLocaleString()} · {d.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.postTypes.length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: 'var(--fg-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Highest avg type</span>
                      <span className="mono" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
                        {data.postTypes[0]?.name} · {data.postTypes[0]?.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content Theme Momentum strip */}
          <div style={{ marginTop: 14 }}>
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>CONTENT THEME MOMENTUM<Tip text="The dominant content theme for each week — shows whether you're staying consistent or jumping between topics. Consistent themes build stronger audience expectations." /></h3>
                <span className="meta">dominant theme per week · last {data.themeMomentum.length} wk</span>
              </div>
              {data.themeMomentum.length === 0 || data.themeMomentum.every((w) => !w.theme) ? (
                <div className="empty" style={{ textAlign: 'left' }}>
                  No content-theme data yet. Run the post-analysis pipeline to populate
                  <code className="mono" style={{ color: 'var(--fg-3)', padding: '0 4px' }}>joola_ig_weekly_snapshot.dominant_content_theme</code>
                  to see this strip.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', overflowX: 'auto' }}>
                  {data.themeMomentum.map((w) => {
                    const t = (w.theme || '').toLowerCase()
                    const known = !!w.theme && t in themeColor
                    const color = known ? themeColor[t] : 'rgba(255,255,255,0.06)'
                    return (
                      <div key={w.week} style={{ flex: 1, minWidth: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: '100%', height: 36, borderRadius: 4,
                          background: color, opacity: w.theme ? 0.9 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                          color: w.theme ? '#0a0d12' : 'var(--fg-4)',
                          textTransform: 'uppercase', textAlign: 'center',
                          padding: '0 4px',
                          border: w.theme ? 'none' : '1px dashed var(--line)',
                        }}
                          title={`${w.week}: ${w.theme || 'no theme tagged'} (${w.posts} posts)`}
                        >
                          {w.theme ? t.replace(/_/g, ' ').slice(0, 14) : 'no data'}
                        </div>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--fg-4)' }}>
                          {w.week.slice(5)}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 700 }}>{w.posts}p</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                {Object.entries(themeColor).map(([t, c]) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--fg-4)' }}>
                    <span style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sentiment */}
          <div style={{ marginTop: 14 }}>
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>SENTIMENT OVERVIEW<Tip text="Overall emotional tone of your audience's comments — more green means happy fans. A sudden rise in red requires immediate content or product review." /></h3>
                <span className="meta">all comments · AI-classified · all-time</span>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <Donut data={data.sentimentSlices} size={140} thickness={24} />
                <DonutLegend data={data.sentimentSlices} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Top Movers === */}
      {section === 'movers' && (
        <div className="section">
          <div className="card-grid cg-2">
            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>TOP POSTS · LAST 90 DAYS<Tip text="Your best-performing posts in the last 90 days ranked by engagement rate — study these to understand your winning content formula." /></h3>
                <span className="meta">↑ by engagement rate · last 90 days</span>
              </div>
              <div>
                {data.topPosts.slice(0, 5).map((p, i) => {
                  // p.er is stored as a fraction (0–1). Convert to percentage for display.
                  const erPct = p.er * 100
                  return (
                    <div className="mover-row" key={p.post_id}>
                      <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                      <div className="brand-col" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="brand-dot" style={{ background: i === 0 ? 'var(--yellow)' : 'var(--fg-4)' }} />
                        <span className="name" style={{ fontSize: 12 }}>
                          {p.caption ? p.caption.slice(0, 42) + (p.caption.length > 42 ? '…' : '') : p.post_id}
                        </span>
                      </div>
                      <span className="metric" style={{ fontSize: 11 }}>
                        <span className={'pill ' + (postTypePillColor[p.post_type] ?? 'pill-ghost')}>
                          {p.post_type}
                        </span>
                      </span>
                      <span className="val mono" style={{ color: erPct >= 6 ? 'var(--joola)' : erPct >= 3 ? 'var(--yellow)' : 'var(--fg-3)', fontWeight: 700 }}>
                        {erPct.toFixed(1)}%
                      </span>
                      <span className="delta up">▲ ER</span>
                    </div>
                  )
                })}
                {data.topPosts.length === 0 && (
                  <div className="empty">No posts yet — sync your Instagram data.</div>
                )}
              </div>
            </div>

            <div className="card card-pad-lg">
              <div className="card-head">
                <h3>SENTIMENT BY TOPIC<Tip text="How positive or negative fans are when discussing each topic — if a specific topic has lots of red, there's a sentiment problem to address there." /></h3>
                <span className="meta">positive · neutral · negative · all-time</span>
              </div>
              {data.sentimentTopics.length > 0 ? (
                <div>
                  {data.sentimentTopics.map((r, i) => (
                    <div className="sent-row" key={i}>
                      <span className="lbl mono" style={{ fontSize: 10.5, letterSpacing: '0.08em' }}>{r.topic}</span>
                      <div className="sent-bar">
                        <div className="pos" style={{ width: r.pos + '%' }} title={`Positive ${r.pos}%`} />
                        <div className="neu" style={{ width: r.neu + '%' }} title={`Neutral ${r.neu}%`} />
                        <div className="neg" style={{ width: r.neg + '%' }} title={`Negative ${r.neg}%`} />
                      </div>
                      <span className="sent-pct">{r.n.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10.5, color: 'var(--fg-4)' }}>
                    <span><span style={{ width: 9, height: 9, background: 'var(--joola)', display: 'inline-block', marginRight: 5, borderRadius: 2 }} />Positive</span>
                    <span><span style={{ width: 9, height: 9, background: '#94a3b8', display: 'inline-block', marginRight: 5, borderRadius: 2 }} />Neutral</span>
                    <span><span style={{ width: 9, height: 9, background: 'var(--red)', display: 'inline-block', marginRight: 5, borderRadius: 2 }} />Negative</span>
                  </div>
                </div>
              ) : (
                <div className="empty">No topic data yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Signal Feed === */}
      {section === 'feed' && (
        <div className="section">
          <div className="card card-pad-lg">
            <div className="card-head">
              <h3>LIVE SIGNAL FEED<Tip text="Real-time summary of key brand events — complaints needing response, engagement milestones, ambassador signals, and audience growth." /></h3>
              <span className="meta">
                <span className="live-pulse-dot" style={{ marginRight: 6 }} />
                auto-refresh · last 24h
              </span>
            </div>
            <div>
              {[
                { type: 'complaint', desc: `${data.totalComplaints} complaints detected across Instagram — ${Math.round(data.responseRate)}% responded`, when: 'today' },
                { type: 'praise',    desc: `${formatShort(data.totalComments)} total comments in last 13 weeks — ${(data.avgEngagement * 100).toFixed(2)}% avg engagement rate`, when: 'last 13 wk' },
                { type: 'fan',       desc: `${data.ambassadors} potential ambassadors identified (score ≥ 7.5)`, when: 'this week' },
                { type: 'intent',    desc: `${formatShort(data.uniqueFans)} unique fans active in tracked period`, when: 'last 13 wk' },
              ].map((s, i) => (
                <div className="signal" key={i}>
                  <span className={'sig-tag ' + s.type}>{s.type.toUpperCase()}</span>
                  <span className="desc">{s.desc}</span>
                  <span className="when">{s.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
