'use client'

import { useMemo, useState } from 'react'
import { NewsArticleGenerateCTA } from '@/components/content/NewsArticleGenerateCTA'
import type { NewsArticle, ScrapeRun } from './page'

// =========================================================================== //
// Constants                                                                    //
// =========================================================================== //

const JOOLA_PLAYERS = [
  "Ben Johns", "Collin Johns", "Anna Bright", "Tyson McGuffin",
  "Federico Staksrud", "Simone Jardim", "Lea Jansen", "Lacy Schneemann",
  "Brooke Buckner", "Kate Fahey", "Milan Rane", "John Lucian Goins",
  "Patrick Smith", "Noe Khlif", "Alec LaMacchio", "Aanik Lohani",
  "Alka Strippoli", "Bobbi Oshiro", "Boone Casady", "Chuck Taylor",
  "Dayne Gingrich", "Jake Kusmider", "Johnny Goldberg", "Jonathan Truong",
  "Len Yang", "Luke Geiser", "Mota Alhouni", "Rachel Rettger",
  "Regina Franco Goldberg", "Ryder Brown", "Sammy Lee", "Scott Crandall",
  "Tam Trinh", "Wil Shaffer", "Zack Taylor",
]

const SENTIMENT_COLOR: Record<string, string> = {
  positive:    'var(--joola)',
  negative:    'var(--down)',
  risk:        '#ff4545',
  informative: '#60a5fa',
  neutral:     'var(--fg-4)',
  mixed:       '#c084fc',
}
const SENTIMENT_BG: Record<string, string> = {
  positive:    'rgba(34,197,94,0.12)',
  negative:    'rgba(239,68,68,0.12)',
  risk:        'rgba(255,69,69,0.15)',
  informative: 'rgba(96,165,250,0.10)',
  neutral:     'rgba(255,255,255,0.05)',
  mixed:       'rgba(192,132,252,0.12)',
}
const RELEVANCE_COLOR: Record<string, string> = {
  'Direct JOOLA News':          'var(--yellow)',
  'Sponsored Player News':      'var(--joola)',
  'Product/Brand News':         '#60a5fa',
  'Tournament/Performance News':'#f97316',
  'Competitive News':           '#c084fc',
  'Industry News':              'var(--fg-4)',
  'Not Relevant':               'var(--fg-4)',
}
const ACTION_COLOR: Record<string, string> = {
  'Risk review':          '#ff4545',
  'Share with marketing': 'var(--joola)',
  'PR opportunity':       'var(--yellow)',
  'Monitor competitor':   '#c084fc',
  'Sponsorship opportunity': '#60a5fa',
  'Product feedback':     '#f97316',
  'Leadership review':    '#ff4545',
  'Use for SEO/blog':     'var(--fg-4)',
  'No action needed':     'var(--fg-4)',
}

// =========================================================================== //
// Helpers                                                                      //
// =========================================================================== //

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

function timeSince(iso: string | null) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return 'today'
  if (d === 1) return '1d ago'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

function scoreColor(score: number | null) {
  if (!score) return 'var(--fg-4)'
  if (score >= 70) return '#ff4545'
  if (score >= 45) return 'var(--yellow)'
  if (score >= 25) return '#60a5fa'
  return 'var(--fg-4)'
}

function exportCSV(articles: NewsArticle[]) {
  const headers = [
    'Date', 'Source', 'Title', 'URL', 'Relevance', 'Sentiment',
    'Score', 'Importance', 'JOOLA', 'Players', 'Competitors',
    'Summary', 'Why It Matters', 'Action',
  ]
  const escape = (v: unknown) => {
    if (v == null) return '""'
    const s = Array.isArray(v) ? v.join('; ') : String(v)
    return '"' + s.replace(/"/g, '""') + '"'
  }
  const rows = articles.map(a => [
    escape(a.published_at?.slice(0, 10)),
    escape(a.source_site),
    escape(a.title),
    escape(a.url),
    escape(a.relevance_type),
    escape(a.sentiment),
    escape(a.sentiment_score),
    escape(a.importance_score),
    escape(a.is_joola_mention ? 'Yes' : 'No'),
    escape(a.players_mentioned),
    escape(a.competitors_mentioned),
    escape(a.ai_summary),
    escape(a.why_it_matters),
    escape(a.suggested_action),
  ].join(','))
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'joola-news.csv'; a.click()
  URL.revokeObjectURL(url)
}

// =========================================================================== //
// Pill                                                                         //
// =========================================================================== //

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 10,
      background: bg, color, border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  )
}

// =========================================================================== //
// Article card                                                                  //
// =========================================================================== //

function ArticleCard({ article, onClick }: { article: NewsArticle; onClick: () => void }) {
  const sent = article.sentiment || 'informative'
  const isRisk = sent === 'risk' || sent === 'negative'
  const hasMention = article.is_joola_mention || (article.players_mentioned?.length ?? 0) > 0

  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 150ms',
        borderColor: isRisk ? 'rgba(255,69,69,0.25)' : hasMention ? 'rgba(245,230,37,0.18)' : undefined,
      }}
      onClick={onClick}
    >
      {/* Top strip */}
      {article.image_url ? (
        <div style={{ height: 130, overflow: 'hidden', background: 'var(--surface-2)', position: 'relative' }}>
          <img src={article.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              const img = e.target as HTMLImageElement
              const parent = img.parentElement
              if (parent) {
                parent.style.display = 'none'
                // Reveal the sibling sentiment stripe so the card still has a top accent
                const stripe = parent.nextElementSibling as HTMLElement | null
                if (stripe && stripe.dataset.fallbackStripe === '1') stripe.style.display = 'block'
              }
            }} />
        </div>
      ) : null}
      {/* Fallback stripe (always present, only shown when image fails or is missing) */}
      <div
        data-fallback-stripe="1"
        style={{
          height: 5,
          background: `linear-gradient(90deg, ${SENTIMENT_COLOR[sent]}, transparent)`,
          display: article.image_url ? 'none' : 'block',
        }}
      />

      <div style={{ padding: '13px 15px 15px' }}>
        {/* Source + date + sentiment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {article.source_site}
          </span>
          <span style={{ color: 'var(--line)', fontSize: 9 }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>{timeSince(article.published_at)}</span>
          <span style={{ flex: 1 }} />
          <Pill label={sent} color={SENTIMENT_COLOR[sent] || 'var(--fg-4)'} bg={SENTIMENT_BG[sent] || 'transparent'} />
        </div>

        {/* Title */}
        <h4 style={{
          margin: '0 0 6px', fontSize: 13, fontWeight: 700, lineHeight: 1.38, color: 'var(--fg)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.title}
        </h4>

        {/* AI summary if available, else excerpt */}
        {(article.ai_summary || article.excerpt) && (
          <p style={{
            margin: '0 0 10px', fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.ai_summary || article.excerpt}
          </p>
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {article.is_joola_mention && (
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 10, background: 'rgba(245,230,37,0.12)', color: 'var(--yellow)', border: '1px solid rgba(245,230,37,0.25)', fontWeight: 700 }}>
              JOOLA
            </span>
          )}
          {(article.players_mentioned || []).slice(0, 2).map(p => (
            <span key={p} style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', color: 'var(--joola)', border: '1px solid rgba(34,197,94,0.18)' }}>
              {p.split(' ')[1] || p.split(' ')[0]}
            </span>
          ))}
          {(article.players_mentioned?.length ?? 0) > 2 && (
            <span style={{ fontSize: 9, color: 'var(--fg-4)', padding: '2px 3px' }}>+{(article.players_mentioned?.length ?? 0) - 2}</span>
          )}
          {(article.competitors_mentioned || []).slice(0, 1).map(c => (
            <span key={c} style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 10, background: 'rgba(192,132,252,0.08)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.2)' }}>
              {c}
            </span>
          ))}
          {/* Importance score */}
          {(article.importance_score ?? 0) > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: scoreColor(article.importance_score) }}>
              {Math.round(article.importance_score!)}
            </span>
          )}
        </div>

        {/* Suggested action + Draft CTA footer */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--line-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {article.suggested_action && article.suggested_action !== 'No action needed' ? (
            <span style={{ fontSize: 10, color: ACTION_COLOR[article.suggested_action] || 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace' }}>
              → {article.suggested_action}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace' }}>
              View ↗
            </span>
          )}
          <span style={{ marginLeft: 'auto' }}>
            <NewsArticleGenerateCTA source="news" id={article.id} compact />
          </span>
        </div>
      </div>
    </div>
  )
}

// =========================================================================== //
// Article detail modal                                                          //
// =========================================================================== //

function ArticleModal({ article, onClose }: { article: NewsArticle; onClose: () => void }) {
  const sent = article.sentiment || 'informative'
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 700, padding: 0, position: 'relative' }}>
        {article.image_url && (
          <div style={{ height: 220, overflow: 'hidden' }}>
            <img src={article.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
          </div>
        )}
        <div style={{ padding: '24px 28px' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--fg-4)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg-4)', textTransform: 'uppercase' }}>{article.source_site}</span>
            <span style={{ color: 'var(--line)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtDate(article.published_at)}</span>
            {article.author && <><span style={{ color: 'var(--line)', fontSize: 10 }}>·</span><span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{article.author}</span></>}
            <span style={{ flex: 1 }} />
            <Pill label={sent} color={SENTIMENT_COLOR[sent] || 'var(--fg-4)'} bg={SENTIMENT_BG[sent] || 'transparent'} />
          </div>

          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, lineHeight: 1.3, color: 'var(--fg)' }}>{article.title}</h2>

          {/* Importance + relevance */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {article.relevance_type && (
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 10, background: `${RELEVANCE_COLOR[article.relevance_type] || 'var(--fg-4)'}18`, color: RELEVANCE_COLOR[article.relevance_type] || 'var(--fg-4)', border: `1px solid ${RELEVANCE_COLOR[article.relevance_type] || 'var(--fg-4)'}30` }}>
                {article.relevance_type}
              </span>
            )}
            {(article.importance_score ?? 0) > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: scoreColor(article.importance_score), fontWeight: 700 }}>
                Importance: {Math.round(article.importance_score!)} / 100
              </span>
            )}
          </div>

          {/* AI Summary */}
          {article.ai_summary && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '14px 16px', marginBottom: 14, borderLeft: '3px solid var(--yellow)' }}>
              <div style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Executive Summary</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>{article.ai_summary}</p>
            </div>
          )}

          {/* Why it matters */}
          {article.why_it_matters && (
            <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 8, padding: '12px 16px', marginBottom: 14, borderLeft: '3px solid var(--joola)' }}>
              <div style={{ fontSize: 10, color: 'var(--joola)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Why It Matters for JOOLA</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.6 }}>{article.why_it_matters}</p>
            </div>
          )}

          {/* Excerpt if no AI summary */}
          {!article.ai_summary && article.excerpt && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6, marginBottom: 14 }}>{article.excerpt}</p>
          )}

          {/* JOOLA context snippet */}
          {article.joola_context && (
            <div style={{ background: 'rgba(245,230,37,0.06)', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>JOOLA Mention Context</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5, fontStyle: 'italic' }}>"{article.joola_context}"</p>
            </div>
          )}

          {/* Entities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {(article.players_mentioned?.length ?? 0) > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--joola)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 7 }}>Players Mentioned</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(article.players_mentioned || []).map(p => (
                    <span key={p} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', color: 'var(--joola)', border: '1px solid rgba(34,197,94,0.15)' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {(article.competitors_mentioned?.length ?? 0) > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#c084fc', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 7 }}>Competitors Mentioned</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(article.competitors_mentioned || []).map(c => (
                    <span key={c} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px', borderRadius: 8, background: 'rgba(192,132,252,0.08)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.15)' }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggested action */}
          {article.suggested_action && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginRight: 8 }}>Suggested Action:</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ACTION_COLOR[article.suggested_action] || 'var(--fg-4)' }}>{article.suggested_action}</span>
            </div>
          )}

          {/* Open original */}
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn btn-yellow" style={{ display: 'inline-block', textDecoration: 'none', fontSize: 12 }}>
            Open Original Article ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// =========================================================================== //
// Insight banner                                                                //
// =========================================================================== //

function InsightBanner({ articles, days }: { articles: NewsArticle[]; days: number }) {
  const insights = useMemo(() => {
    const total = articles.length
    if (total === 0) return []
    const joolaCount = articles.filter(a => a.is_joola_mention).length
    const playerCount = articles.filter(a => (a.players_mentioned?.length ?? 0) > 0).length
    const riskCount = articles.filter(a => a.sentiment === 'risk' || a.suggested_action === 'Risk review').length
    const positiveCount = articles.filter(a => a.sentiment === 'positive').length
    const competitorCount = articles.filter(a => a.has_competitor_mention).length

    // Player with most mentions
    const playerTally: Record<string, number> = {}
    articles.forEach(a => (a.players_mentioned || []).forEach(p => { playerTally[p] = (playerTally[p] || 0) + 1 }))
    const topPlayer = Object.entries(playerTally).sort((a, b) => b[1] - a[1])[0]

    // Top source for JOOLA mentions
    const sourceTally: Record<string, number> = {}
    articles.filter(a => a.is_joola_mention).forEach(a => { sourceTally[a.source_site] = (sourceTally[a.source_site] || 0) + 1 })
    const topSource = Object.entries(sourceTally).sort((a, b) => b[1] - a[1])[0]

    const msgs: string[] = []
    if (joolaCount > 0) msgs.push(`${joolaCount} articles mention JOOLA by name out of ${total} total in the last ${days === 180 ? '6 months' : days + ' days'}.`)
    if (topPlayer) msgs.push(`${topPlayer[0]} leads player visibility with ${topPlayer[1]} mention${topPlayer[1] > 1 ? 's' : ''}.`)
    if (topSource) msgs.push(`${topSource[0]} is the top source for JOOLA coverage (${topSource[1]} articles).`)
    if (riskCount > 0) msgs.push(`${riskCount} article${riskCount > 1 ? 's' : ''} flagged for Risk Review — check the Negative/Risk filter.`)
    if (positiveCount > 0 && riskCount === 0) msgs.push(`${positiveCount} positive articles — strong coverage for marketing and PR opportunities.`)
    if (competitorCount > 0) msgs.push(`${competitorCount} articles mention competitor brands — review Competitive News filter.`)
    return msgs
  }, [articles, days])

  if (insights.length === 0) return null

  return (
    <div style={{ background: 'rgba(245,230,37,0.06)', border: '1px solid rgba(245,230,37,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        ⚡ Smart Insights
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {insights.map((msg, i) => (
          <div key={i} style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>· {msg}</div>
        ))}
      </div>
    </div>
  )
}

// =========================================================================== //
// Analytics tab — player leaderboard + sentiment chart                         //
// =========================================================================== //

function AnalyticsTab({ articles }: { articles: NewsArticle[] }) {
  // Player leaderboard
  const playerStats = useMemo(() => {
    const map: Record<string, { total: number; positive: number; negative: number; informative: number }> = {}
    articles.forEach(a => {
      (a.players_mentioned || []).forEach(p => {
        if (!map[p]) map[p] = { total: 0, positive: 0, negative: 0, informative: 0 }
        map[p].total++
        const s = a.sentiment
        if (s === 'positive') map[p].positive++
        else if (s === 'negative' || s === 'risk') map[p].negative++
        else map[p].informative++
      })
    })
    return Object.entries(map).map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
  }, [articles])

  // Sentiment breakdown
  const sentStats = useMemo(() => {
    const total = articles.length
    if (!total) return []
    const counts: Record<string, number> = {}
    articles.forEach(a => { const s = a.sentiment || 'informative'; counts[s] = (counts[s] || 0) + 1 })
    return Object.entries(counts)
      .map(([sent, count]) => ({ sent, count, pct: Math.round(count / total * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [articles])

  // Relevance breakdown
  const relevanceStats = useMemo(() => {
    const counts: Record<string, number> = {}
    articles.forEach(a => { if (a.relevance_type) counts[a.relevance_type] = (counts[a.relevance_type] || 0) + 1 })
    return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  }, [articles])

  const maxPlayerCount = playerStats[0]?.total || 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Player leaderboard */}
      <div className="card card-pad-lg" style={{ gridColumn: '1 / -1' }}>
        <div className="card-head" style={{ marginBottom: 16 }}>
          <h3>PLAYER MEDIA VISIBILITY</h3>
          <span className="meta">{playerStats.length} players mentioned</span>
        </div>
        {playerStats.length === 0 ? (
          <div className="empty">No player mentions in current filter window</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {playerStats.slice(0, 20).map((p, idx) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace', width: 18, textAlign: 'right' }}>{idx + 1}</span>
                <span style={{ fontSize: 12.5, color: 'var(--fg-2)', minWidth: 160 }}>{p.name}</span>
                {/* Stacked bar */}
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(p.positive / maxPlayerCount) * 100}%`, background: 'var(--joola)', height: '100%' }} />
                  <div style={{ width: `${(p.informative / maxPlayerCount) * 100}%`, background: '#60a5fa', height: '100%' }} />
                  <div style={{ width: `${(p.negative / maxPlayerCount) * 100}%`, background: 'var(--down)', height: '100%' }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--fg)', minWidth: 24, textAlign: 'right' }}>{p.total}</span>
                {p.positive > 0 && <span style={{ fontSize: 10, color: 'var(--joola)' }}>+{p.positive}</span>}
                {p.negative > 0 && <span style={{ fontSize: 10, color: 'var(--down)' }}>−{p.negative}</span>}
              </div>
            ))}
            {playerStats.length > 20 && (
              <div style={{ fontSize: 11, color: 'var(--fg-4)', textAlign: 'center', marginTop: 4 }}>+ {playerStats.length - 20} more players with mentions</div>
            )}
          </div>
        )}
      </div>

      {/* Sentiment chart */}
      <div className="card card-pad-lg">
        <div className="card-head" style={{ marginBottom: 14 }}><h3>SENTIMENT MIX</h3></div>
        {sentStats.length === 0 ? <div className="empty">No data</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {sentStats.map(s => (
              <div key={s.sent} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', minWidth: 80, color: SENTIMENT_COLOR[s.sent] || 'var(--fg-4)' }}>{s.sent}</span>
                <div style={{ flex: 1, height: 7, borderRadius: 3.5, background: 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `max(${s.pct}%, ${s.count > 0 ? 6 : 0}px)`, height: '100%', background: SENTIMENT_COLOR[s.sent] || 'var(--fg-4)', borderRadius: 3.5 }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg-2)', minWidth: 46, textAlign: 'right' }}>{s.count} ({s.pct}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relevance breakdown */}
      <div className="card card-pad-lg">
        <div className="card-head" style={{ marginBottom: 14 }}><h3>RELEVANCE TYPES</h3></div>
        {relevanceStats.length === 0 ? <div className="empty">No data</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {relevanceStats.map(r => {
              const maxR = relevanceStats[0]?.count || 1
              const pct = Math.round(r.count / maxR * 100)
              const color = RELEVANCE_COLOR[r.type] || 'var(--fg-4)'
              return (
                <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color, minWidth: 160, lineHeight: 1.3 }}>{r.type}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{ width: `max(${pct}%, ${r.count > 0 ? 6 : 0}px)`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg-2)', minWidth: 28, textAlign: 'right' }}>{r.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// =========================================================================== //
// Sources tab                                                                   //
// =========================================================================== //

function SourcesTab({ articles }: { articles: NewsArticle[] }) {
  const sourceStats = useMemo(() => {
    const map: Record<string, { total: number; joola: number; player: number; competitor: number; positive: number; negative: number }> = {}
    articles.forEach(a => {
      const src = a.source_site
      if (!map[src]) map[src] = { total: 0, joola: 0, player: 0, competitor: 0, positive: 0, negative: 0 }
      map[src].total++
      if (a.is_joola_mention) map[src].joola++
      if ((a.players_mentioned?.length ?? 0) > 0) map[src].player++
      if (a.has_competitor_mention) map[src].competitor++
      if (a.sentiment === 'positive') map[src].positive++
      if (a.sentiment === 'negative' || a.sentiment === 'risk') map[src].negative++
    })
    return Object.entries(map).map(([src, stats]) => ({ source: src, ...stats }))
      .sort((a, b) => b.joola - a.joola || b.total - a.total)
  }, [articles])

  return (
    <div className="card card-pad-lg">
      <div className="card-head" style={{ marginBottom: 16 }}>
        <h3>SOURCE COVERAGE</h3>
        <span className="meta">{sourceStats.length} sources with articles</span>
      </div>
      {sourceStats.length === 0 ? (
        <div className="empty">No source data</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Source</th>
                <th className="num">Total</th>
                <th className="num" style={{ color: 'var(--yellow)' }}>JOOLA</th>
                <th className="num" style={{ color: 'var(--joola)' }}>Players</th>
                <th className="num" style={{ color: '#c084fc' }}>Competitors</th>
                <th className="num" style={{ color: 'var(--joola)' }}>Positive</th>
                <th className="num" style={{ color: 'var(--down)' }}>Negative</th>
              </tr>
            </thead>
            <tbody>
              {sourceStats.map(s => (
                <tr key={s.source}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.source}</td>
                  <td className="cell-num">{s.total}</td>
                  <td className="cell-num" style={{ color: s.joola > 0 ? 'var(--yellow)' : 'var(--fg-4)', fontWeight: s.joola > 0 ? 700 : 400 }}>{s.joola}</td>
                  <td className="cell-num" style={{ color: s.player > 0 ? 'var(--joola)' : 'var(--fg-4)' }}>{s.player}</td>
                  <td className="cell-num" style={{ color: s.competitor > 0 ? '#c084fc' : 'var(--fg-4)' }}>{s.competitor}</td>
                  <td className="cell-num" style={{ color: 'var(--joola)' }}>{s.positive}</td>
                  <td className="cell-num" style={{ color: s.negative > 0 ? 'var(--down)' : 'var(--fg-4)' }}>{s.negative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// =========================================================================== //
// Filter chip helpers                                                           //
// =========================================================================== //

function chip(on: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20,
    fontSize: 11, cursor: 'pointer', userSelect: 'none',
    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em', textTransform: 'uppercase',
    background: on ? 'var(--yellow)' : 'rgba(255,255,255,0.05)',
    color: on ? '#0a0d12' : 'var(--fg-4)',
    border: on ? '1px solid var(--yellow)' : '1px solid var(--line)',
    transition: 'all 150ms ease',
  }
}

function sentChip(val: string, active: string): React.CSSProperties {
  const on = active === val
  // 'all' has no sentiment color — use the standard yellow active state for consistency with other "All" chips.
  if (val === 'all') return chip(on)
  const color = SENTIMENT_COLOR[val] || 'var(--fg-4)'
  return {
    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20,
    fontSize: 11, cursor: 'pointer', userSelect: 'none',
    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em', textTransform: 'uppercase',
    background: on ? `${color}22` : 'rgba(255,255,255,0.05)',
    color: on ? color : 'var(--fg-4)',
    border: on ? `1px solid ${color}55` : '1px solid var(--line)',
    fontWeight: on ? 700 : 400, transition: 'all 150ms ease',
  }
}

// =========================================================================== //
// Main component                                                                //
// =========================================================================== //

interface Props {
  articles: NewsArticle[]
  latestRun: ScrapeRun | null
}

export default function NewsClient({ articles: initialArticles, latestRun }: Props) {
  // Navigation
  const [tab, setTab] = useState<'articles' | 'analytics' | 'sources'>('articles')

  // Filters
  const [sentiment, setSentiment] = useState('all')
  const [mention,   setMention]   = useState('all')
  const [relevanceType, setRelevanceType] = useState('all')
  const [articleType,   setArticleType]   = useState('all')
  const [days,      setDays]      = useState(180)
  const [search,    setSearch]    = useState('')
  const [selectedPlayers,   setSelectedPlayers]   = useState<Set<string>>(new Set())
  const [selectedSources,   setSelectedSources]   = useState<Set<string>>(new Set())
  const [selectedAction,    setSelectedAction]    = useState('all')
  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [showAllSources,  setShowAllSources]  = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'importance'>('date')

  // Article detail modal
  const [modalArticle, setModalArticle] = useState<NewsArticle | null>(null)

  // Export feedback ('idle' | 'exporting' | 'done')
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle')

  const allSources = useMemo(() => {
    const s = new Set(initialArticles.map(a => a.source_site).filter(Boolean))
    return Array.from(s).sort()
  }, [initialArticles])

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - days); return d
  }, [days])

  // KPI stats (pre-filter)
  const stats = useMemo(() => {
    const recent = initialArticles.filter(a => a.published_at && new Date(a.published_at) >= cutoff)
    return {
      total:     recent.length,
      joola:     recent.filter(a => a.is_joola_mention).length,
      player:    recent.filter(a => (a.players_mentioned?.length ?? 0) > 0).length,
      positive:  recent.filter(a => a.sentiment === 'positive').length,
      negative:  recent.filter(a => a.sentiment === 'negative' || a.sentiment === 'risk').length,
      competitor:recent.filter(a => a.has_competitor_mention).length,
      week:      recent.filter(a => {
        const w = new Date(); w.setDate(w.getDate() - 7)
        return a.scraped_at && new Date(a.scraped_at) >= w
      }).length,
    }
  }, [initialArticles, cutoff])

  // Filtered articles
  const filtered = useMemo(() => {
    let list = initialArticles.filter(a => a.published_at && new Date(a.published_at) >= cutoff)
    if (sentiment !== 'all') list = list.filter(a => a.sentiment === sentiment)
    if (mention === 'joola')    list = list.filter(a => a.is_joola_mention)
    if (mention === 'player')   list = list.filter(a => (a.players_mentioned?.length ?? 0) > 0)
    if (mention === 'both')     list = list.filter(a => a.is_joola_mention && (a.players_mentioned?.length ?? 0) > 0)
    if (mention === 'any')      list = list.filter(a => a.is_joola_mention || (a.players_mentioned?.length ?? 0) > 0)
    if (mention === 'competitor')list = list.filter(a => a.has_competitor_mention)
    if (articleType !== 'all')  list = list.filter(a => a.article_type === articleType)
    if (relevanceType !== 'all')list = list.filter(a => a.relevance_type === relevanceType)
    if (selectedAction !== 'all')list = list.filter(a => a.suggested_action === selectedAction)
    if (selectedPlayers.size > 0) list = list.filter(a => (a.players_mentioned || []).some(p => selectedPlayers.has(p)))
    if (selectedSources.size > 0) list = list.filter(a => selectedSources.has(a.source_site))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.excerpt || '').toLowerCase().includes(q) ||
        (a.ai_summary || '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'importance') {
      list = [...list].sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0))
    }
    return list
  }, [initialArticles, cutoff, sentiment, mention, articleType, relevanceType, selectedPlayers, selectedSources, selectedAction, search, sortBy])

  function togglePlayer(p: string) {
    setSelectedPlayers(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })
  }
  function toggleSource(s: string) {
    setSelectedSources(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  const visiblePlayers = showAllPlayers ? JOOLA_PLAYERS : JOOLA_PLAYERS.slice(0, 12)
  const visibleSources  = showAllSources  ? allSources  : allSources.slice(0, 8)

  const hasFilters = sentiment !== 'all' || mention !== 'all' || articleType !== 'all' || relevanceType !== 'all' || selectedAction !== 'all' || selectedPlayers.size > 0 || selectedSources.size > 0 || search

  return (
    <div>
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                              */}
      {/* ----------------------------------------------------------------- */}
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            SEO · PICKLEBALL MEDIA
          </div>
          <h1>IN <em>NEWS</em></h1>
          <div className="sub">
            JOOLA brand &amp; sponsored player coverage across pickleball media.
            {latestRun?.finished_at && <> Scraped <b style={{ color: 'var(--fg-2)' }}>{timeSince(latestRun.finished_at)}</b>.</>}
          </div>
        </div>
        <div className="head-actions">
          <button
            className="btn"
            style={{
              fontSize: 11,
              opacity: exportState === 'exporting' ? 0.7 : 1,
              color: exportState === 'done' ? 'var(--joola)' : undefined,
              borderColor: exportState === 'done' ? 'rgba(34,197,94,0.4)' : undefined,
            }}
            disabled={exportState === 'exporting' || filtered.length === 0}
            onClick={() => {
              if (exportState === 'exporting' || filtered.length === 0) return
              setExportState('exporting')
              try {
                exportCSV(filtered)
                setExportState('done')
                setTimeout(() => setExportState('idle'), 2200)
              } catch {
                setExportState('idle')
              }
            }}
            title={filtered.length === 0 ? 'No articles to export' : `Export ${filtered.length} filtered articles as CSV`}
          >
            {exportState === 'exporting' ? '⏳ Exporting…' :
             exportState === 'done'      ? `✓ Exported ${filtered.length}` :
                                           `↓ Export (${filtered.length})`}
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* KPI row                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
        <div className="kpi">
          <div className="label">Total Articles</div>
          <div className="row"><span className="value">{stats.total.toLocaleString()}</span></div>
          <div className="src">last {days === 180 ? '6 months' : `${days}d`}</div>
        </div>
        <div className="kpi joola">
          <div className="label">JOOLA Mentions</div>
          <div className="row"><span className="value">{stats.joola}</span></div>
          <div className="src">brand name found</div>
        </div>
        <div className="kpi">
          <div className="label">Player Mentions</div>
          <div className="row"><span className="value">{stats.player}</span></div>
          <div className="src">sponsored athletes</div>
        </div>
        <div className="kpi">
          <div className="label">Positive Coverage</div>
          <div className="row"><span className="value">{stats.positive}</span></div>
          <div className="src" style={{ color: 'var(--joola)' }}>good news</div>
        </div>
        <div className="kpi danger" style={stats.negative > 0 ? { borderColor: 'rgba(239,68,68,0.25)' } : undefined}>
          <div className="label">Negative / Risk</div>
          <div className="row"><span className="value" style={{ color: stats.negative > 0 ? 'var(--down)' : undefined }}>{stats.negative}</span></div>
          <div className="src">needs attention</div>
        </div>
        <div className="kpi">
          <div className="label">Competitor Mentions</div>
          <div className="row"><span className="value">{stats.competitor}</span></div>
          <div className="src">competitive intel</div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Tab nav                                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        {(['articles', 'analytics', 'sources'] as const).map(t => (
          <button key={t} className={'tab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
            {t === 'articles'  ? `Articles (${filtered.length})` :
             t === 'analytics' ? 'Analytics' : 'Sources'}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Insight banner (articles tab only)                                  */}
      {/* ----------------------------------------------------------------- */}
      {tab === 'articles' && initialArticles.length > 0 && (
        <InsightBanner articles={filtered} days={days} />
      )}

      {/* ================================================================= */}
      {/* ARTICLES TAB                                                        */}
      {/* ================================================================= */}
      {tab === 'articles' && (
        <>
          {/* Filter panel */}
          <div className="card card-pad-lg" style={{ marginBottom: 18 }}>
            {/* Period + sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64 }}>Period</span>
              {[90, 120, 150, 180].map(d => (
                <span key={d} style={chip(days === d)} onClick={() => setDays(d)}>
                  {d === 180 ? '6M' : `${d}D`}
                </span>
              ))}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>Sort</span>
              <span style={chip(sortBy === 'date')}       onClick={() => setSortBy('date')}>Date</span>
              <span style={chip(sortBy === 'importance')} onClick={() => setSortBy('importance')}>Importance</span>
            </div>

            {/* Tone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64 }}>Tone</span>
              <span style={sentChip('all', sentiment)} onClick={() => setSentiment('all')}>All</span>
              {['positive', 'negative', 'risk', 'informative', 'neutral', 'mixed'].map(s => (
                <span key={s} style={sentChip(s, sentiment)} onClick={() => setSentiment(s)}>{s}</span>
              ))}
            </div>

            {/* Mention type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64 }}>Mentions</span>
              {[
                { v: 'all', l: 'All' },
                { v: 'any', l: 'Any' },
                { v: 'joola', l: 'JOOLA' },
                { v: 'player', l: 'Players' },
                { v: 'both', l: 'Both' },
                { v: 'competitor', l: 'Competitor' },
              ].map(({ v, l }) => (
                <span key={v} style={chip(mention === v)} onClick={() => setMention(v)}>{l}</span>
              ))}
            </div>

            {/* Relevance type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64 }}>Relevance</span>
              <span style={chip(relevanceType === 'all')} onClick={() => setRelevanceType('all')}>All</span>
              {['Direct JOOLA News', 'Sponsored Player News', 'Product/Brand News', 'Tournament/Performance News', 'Competitive News', 'Industry News'].map(t => (
                <span key={t} style={{
                  ...chip(relevanceType === t),
                  ...(relevanceType === t ? { background: `${RELEVANCE_COLOR[t] || 'var(--fg-4)'}22`, color: RELEVANCE_COLOR[t] || 'var(--fg-4)', border: `1px solid ${RELEVANCE_COLOR[t] || 'var(--fg-4)'}40` } : {}),
                }} onClick={() => setRelevanceType(t)}>
                  {t.replace(' News', '').replace('/Brand', '')}
                </span>
              ))}
            </div>

            {/* Suggested action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64 }}>Action</span>
              <span style={chip(selectedAction === 'all')} onClick={() => setSelectedAction('all')}>All</span>
              {['Risk review', 'Share with marketing', 'PR opportunity', 'Sponsorship opportunity', 'Monitor competitor', 'Use for SEO/blog'].map(a => (
                <span key={a} style={{
                  ...chip(selectedAction === a),
                  ...(selectedAction === a ? { background: `${ACTION_COLOR[a] || 'var(--fg-4)'}22`, color: ACTION_COLOR[a] || 'var(--fg-4)', border: `1px solid ${ACTION_COLOR[a] || 'var(--fg-4)'}40` } : {}),
                }} onClick={() => setSelectedAction(a)}>
                  {a}
                </span>
              ))}
            </div>

            {/* Source filter */}
            {allSources.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64, paddingTop: 4 }}>Source</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
                  {visibleSources.map(s => (
                    <span key={s} style={{ ...chip(selectedSources.has(s)), fontSize: 10 }} onClick={() => toggleSource(s)}>
                      {s.replace(/^www\./, '').split('.')[0]}
                    </span>
                  ))}
                  {allSources.length > 8 && (
                    <span style={{ fontSize: 10, color: 'var(--yellow)', cursor: 'pointer', padding: '4px 8px' }} onClick={() => setShowAllSources(v => !v)}>
                      {showAllSources ? '− less' : `+ ${allSources.length - 8} more`}
                    </span>
                  )}
                  {selectedSources.size > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--fg-4)', cursor: 'pointer', padding: '4px 8px' }} onClick={() => setSelectedSources(new Set())}>clear</span>
                  )}
                </div>
              </div>
            )}

            {/* Player filter */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', minWidth: 64, paddingTop: 4 }}>Player</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
                {visiblePlayers.map(p => (
                  <span key={p} style={{
                    ...chip(selectedPlayers.has(p)), fontSize: 10,
                    ...(selectedPlayers.has(p) ? { background: 'rgba(34,197,94,0.15)', color: 'var(--joola)', border: '1px solid rgba(34,197,94,0.3)' } : {}),
                  }} onClick={() => togglePlayer(p)}>
                    {p.split(' ').pop()}
                  </span>
                ))}
                {JOOLA_PLAYERS.length > 12 && (
                  <span style={{ fontSize: 10, color: 'var(--yellow)', cursor: 'pointer', padding: '4px 8px' }} onClick={() => setShowAllPlayers(v => !v)}>
                    {showAllPlayers ? '− less' : `+ ${JOOLA_PLAYERS.length - 12} more`}
                  </span>
                )}
                {selectedPlayers.size > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--fg-4)', cursor: 'pointer', padding: '4px 8px' }} onClick={() => setSelectedPlayers(new Set())}>clear</span>
                )}
              </div>
            </div>

            {/* Search + clear */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" placeholder="Search titles, summaries…" value={search}
                onChange={e => setSearch(e.target.value)} className="fld"
                style={{ flex: 1, maxWidth: 380 }} />
              {hasFilters && (
                <button className="btn" style={{ fontSize: 11 }} onClick={() => {
                  setSentiment('all'); setMention('all'); setArticleType('all')
                  setRelevanceType('all'); setSelectedAction('all')
                  setSelectedPlayers(new Set()); setSelectedSources(new Set()); setSearch('')
                }}>
                  Clear all
                </button>
              )}
              <span style={{ fontSize: 11.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>
                <b style={{ color: 'var(--fg)' }}>{filtered.length}</b> articles
              </span>
            </div>
          </div>

          {/* Article grid */}
          {filtered.length === 0 ? (
            <div className="card card-pad-lg">
              <div className="empty">
                {initialArticles.length === 0
                  ? <>No articles yet — click <b>↻ Scrape Now</b> to fetch the latest pickleball news.</>
                  : <>No articles match your filters. Try clearing some to see more results.</>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {filtered.map(a => (
                <ArticleCard key={a.id} article={a} onClick={() => setModalArticle(a)} />
              ))}
            </div>
          )}
          {filtered.length >= 200 && (
            <p style={{ textAlign: 'center', color: 'var(--fg-4)', fontSize: 12, marginTop: 20 }}>
              Showing first 200 articles — narrow your filters for more specific results.
            </p>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* ANALYTICS TAB                                                       */}
      {/* ================================================================= */}
      {tab === 'analytics' && (
        <AnalyticsTab articles={initialArticles.filter(a => a.published_at && new Date(a.published_at) >= cutoff)} />
      )}

      {/* ================================================================= */}
      {/* SOURCES TAB                                                         */}
      {/* ================================================================= */}
      {tab === 'sources' && (
        <SourcesTab articles={initialArticles.filter(a => a.published_at && new Date(a.published_at) >= cutoff)} />
      )}

      {/* Article detail modal */}
      {modalArticle && (
        <ArticleModal article={modalArticle} onClose={() => setModalArticle(null)} />
      )}
    </div>
  )
}
