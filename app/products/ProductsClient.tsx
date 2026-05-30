'use client'

import { useState, useMemo } from 'react'
import { Tip } from '@/components/ui/Tip'
import { SortableTh } from '@/components/ui/SortableTh'
import type { PaddleStat } from './page'

interface Props {
  paddles: PaddleStat[]
  tiktokSourceCount: number
  redditSourceCount: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

type SortKey = 'mentions' | 'tiktok' | 'reddit' | 'positive' | 'purchase' | 'views'

export default function ProductsClient({ paddles, tiktokSourceCount, redditSourceCount }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('mentions')
  const [search, setSearch] = useState('')
  const [colSort, setColSort] = useState<{ key: keyof PaddleStat | ''; dir: 'asc' | 'desc' }>({ key: '', dir: 'desc' })
  const [nameSearch, setNameSearch] = useState('')

  const sorted = useMemo(() => {
    let list = paddles
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'mentions':  return b.totalMentions - a.totalMentions
        case 'tiktok': {
          // BUG 1 fix: push zero-TT paddles to bottom so sort is visibly distinct
          if (a.tiktokMentions === 0 && b.tiktokMentions > 0) return 1
          if (b.tiktokMentions === 0 && a.tiktokMentions > 0) return -1
          return b.tiktokMentions - a.tiktokMentions
        }
        case 'reddit':   return b.redditMentions - a.redditMentions
        case 'positive': {
          // BUG 1 fix: sort by positive RATE (not absolute count) so low-volume 100% paddles rank high
          if (a.totalMentions === 0) return 1
          if (b.totalMentions === 0) return -1
          return (b.positiveCount / b.totalMentions) - (a.positiveCount / a.totalMentions)
        }
        case 'purchase': return b.avgPurchaseIntent - a.avgPurchaseIntent
        case 'views':    return b.totalViews - a.totalViews
      }
    })
  }, [paddles, sortKey, search])

  const toggleCol = (key: keyof PaddleStat) =>
    setColSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  const tableSorted = useMemo(() => {
    let list = paddles
    if (nameSearch.trim()) {
      const q = nameSearch.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    if (!colSort.key) return list
    const key = colSort.key
    const mul = colSort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (typeof av === 'string' && typeof bv === 'string') {
        return mul * av.localeCompare(bv)
      }
      return mul * ((av as number) - (bv as number))
    })
  }, [paddles, nameSearch, colSort])

  const maxMentions = paddles[0]?.totalMentions ?? 1
  const topPaddle   = paddles[0]

  // Platform-aware max for bar widths — reflects the active sort key (BUG-06)
  const maxForBar = useMemo(() => {
    if (sorted.length === 0) return 1
    if (sortKey === 'tiktok') return Math.max(1, ...sorted.map(p => p.tiktokMentions))
    if (sortKey === 'reddit') return Math.max(1, ...sorted.map(p => p.redditMentions))
    return sorted[0]?.totalMentions ?? 1
  }, [sorted, sortKey])

  // BUG 6 + ISSUE 9 fix: "Most Positive" uses rate (not absolute count); PI uses min-3-mention threshold
  const topPositive = (
    [...paddles].filter(p => p.totalMentions >= 3).sort((a, b) => {
      const rA = a.totalMentions ? a.positiveCount / a.totalMentions : 0
      const rB = b.totalMentions ? b.positiveCount / b.totalMentions : 0
      return rB - rA
    })[0] ?? paddles[0]
  )
  const topPositivePct = topPositive?.totalMentions
    ? Math.round((topPositive.positiveCount / topPositive.totalMentions) * 100)
    : 0

  const topPurchase = (
    [...paddles].filter(p => p.totalMentions >= 3).sort((a, b) => b.avgPurchaseIntent - a.avgPurchaseIntent)[0]
    ?? [...paddles].sort((a, b) => b.avgPurchaseIntent - a.avgPurchaseIntent)[0]
  )

  const totalMentions = paddles.reduce((s, p) => s + p.totalMentions, 0)
  // BUG 4 fix: show per-platform mention totals (not source pool counts)
  const tiktokMentionTotal = paddles.reduce((s, p) => s + p.tiktokMentions, 0)
  const redditMentionTotal = paddles.reduce((s, p) => s + p.redditMentions, 0)

  // BUG 5: detect whether sentiment enrichment has run at all
  const hasEnrichment = paddles.some(p => p.positiveCount > 0 || p.negativeCount > 0)

  if (paddles.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Paddle Intel</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>Cross-platform product attention · TikTok + Reddit</div>
        </div>
        <div className="card card-pad-lg">
          <div className="empty">
            No paddle mentions found yet. Run the AI enrichment pipeline on TikTok videos and Reddit mentions first.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            Paddle Intel
            <Tip text="Which JOOLA paddles are being talked about across TikTok and Reddit. Data comes from AI-extracted product mentions in enriched posts. Competitor paddles mentioned in comparison threads are also counted." />
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
            Cross-platform product attention · {tiktokSourceCount} TikTok tagged · {redditSourceCount} Reddit tagged
          </div>
        </div>
        <div className="live-pulse-dot" />
      </div>

      {/* BUG 5: sentiment enrichment warning */}
      {!hasEnrichment && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'color-mix(in srgb, var(--yellow) 8%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
          fontSize: 12, color: 'var(--fg-3)',
        }}>
          ⚠️ <strong>Sentiment data pending.</strong> The AI enrichment pipeline hasn&apos;t processed TikTok/Reddit posts yet — positive/negative columns will show — until enrichment runs.
        </div>
      )}

      {/* ISSUE 7: competitor disclaimer */}
      <div style={{
        marginBottom: 20, padding: '8px 12px', borderRadius: 6,
        background: 'var(--surface)', border: '1px solid var(--border)',
        fontSize: 11, color: 'var(--fg-4)',
      }}>
        ℹ️ Includes competitor paddles mentioned alongside JOOLA products in community posts. Use the search field to filter to JOOLA models only.
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Paddles Tracked
            <Tip text="Distinct paddle names extracted by AI across all TikTok and Reddit posts. Includes competitor paddles mentioned in comparison threads." />
          </div>
          <div className="value">{paddles.length}</div>
          <div className="delta up">with AI mentions</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Mentions
            <Tip text="Total paddle mentions across TikTok + Reddit combined. One post mentioning two paddles counts as two mentions." />
          </div>
          <div className="value">{totalMentions}</div>
          {/* BUG 4 fix: show mention counts not source pool counts */}
          <div className="delta" style={{ color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
            {tiktokMentionTotal} TikTok · {redditMentionTotal} Reddit
          </div>
        </div>
        <div className="kpi warn">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Most Talked About
            <Tip text="The paddle with the highest total mention count across both platforms." />
          </div>
          <div className="value" style={{ fontSize: 15, lineHeight: '1.3' }}>{topPaddle?.name ?? '—'}</div>
          <div className="delta up">{topPaddle?.totalMentions ?? 0} mentions</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Highest Positive Rate
            {/* BUG 6 fix: renamed to clarify this is rate-based, not absolute count */}
            <Tip text="Paddle with the best positive-sentiment rate (≥3 mentions required). R4LLy at 100% beats Perseus at 41% even if Perseus has more absolute positives." />
          </div>
          <div className="value" style={{ fontSize: 15, lineHeight: '1.3' }}>{topPositive?.name ?? '—'}</div>
          <div className="delta up">{topPositivePct}% positive rate</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Purchase Intent Leader
            {/* ISSUE 9 fix: requires ≥3 mentions for reliability */}
            <Tip text="Paddle with the highest average AI purchase intent score (≥3 mentions required for reliability). Score 0–1; higher = stronger buy signal." />
          </div>
          <div className="value" style={{ fontSize: 15, lineHeight: '1.3' }}>{topPurchase?.name ?? '—'}</div>
          <div className="delta up">
            {topPurchase?.avgPurchaseIntent ? topPurchase.avgPurchaseIntent.toFixed(2) : '—'} avg PI
            {topPurchase && <span style={{ marginLeft: 4, opacity: 0.6 }}>({topPurchase.totalMentions})</span>}
          </div>
        </div>
      </div>

      {/* Rankings card */}
      <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Paddle Rankings
            <Tip text="Every paddle mentioned across TikTok + Reddit, ranked by your chosen metric. Bar width shows share of total mentions. Click a chip to rerank." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {([
              ['mentions',  'All Mentions'],
              ['tiktok',   'TikTok'],
              ['reddit',   'Reddit'],
              ['positive', 'Most Positive'],
              ['purchase', 'Purchase Intent'],
            ] as [SortKey, string][]).map(([k, label]) => (
              <button
                key={k}
                className={'chip' + (sortKey === k ? ' on' : '')}
                onClick={() => setSortKey(k)}
                style={{ fontSize: 11 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <input
          className="fld"
          placeholder="Search paddles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {sorted.length === 0 ? (
          <div className="empty">No paddles match your search.</div>
        ) : (
          <div className="table-wrap scroll" style={{ padding: '8px 6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((p, i) => {
              // BUG-06: bar width and primary count reflect active platform filter
              const primaryCount = sortKey === 'tiktok' ? p.tiktokMentions
                : sortKey === 'reddit' ? p.redditMentions
                : p.totalMentions
              const barPct = Math.max((primaryCount / maxForBar) * 100, 4)
              const barColor = sortKey === 'tiktok' ? '#69C9D0' : sortKey === 'reddit' ? '#FF6314' : 'var(--joola)'
              const countLabel = sortKey === 'tiktok' ? 'TikTok' : sortKey === 'reddit' ? 'Reddit' : `mention${primaryCount === 1 ? '' : 's'}`
              const positiveShare = p.totalMentions
                ? Math.round((p.positiveCount / p.totalMentions) * 100)
                : 0
              const isTop = i === 0
              return (
                <div
                  key={p.name}
                  className="rank-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 8,
                    background: isTop
                      ? 'color-mix(in srgb, var(--yellow) 6%, var(--card))'
                      : 'var(--surface)',
                    border: isTop
                      ? '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)'
                      : '1px solid var(--border)',
                  }}
                >
                  <div style={{
                    width: 28, flexShrink: 0, fontSize: 12, fontWeight: 700,
                    color: isTop ? 'var(--yellow)' : 'var(--fg-3)', textAlign: 'right',
                  }}>
                    #{i + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: i < 3 ? 700 : 500 }}>{p.name}</span>
                      {p.crisisCount > 0 && (
                        <span className="pill-danger" style={{ fontSize: 9 }}>🚨 {p.crisisCount}</span>
                      )}
                      {p.opportunityCount > 0 && (
                        <span className="pill-joola" style={{ fontSize: 9 }}>💡 {p.opportunityCount}</span>
                      )}
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: barColor, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--fg-4)', flexWrap: 'wrap' }}>
                      <span>{p.totalMentions} {p.totalMentions === 1 ? 'mention' : 'mentions'}</span>
                      {p.tiktokMentions > 0 && (
                        <span style={{ color: '#69C9D0', fontWeight: sortKey === 'tiktok' ? 700 : 400 }}>TT: {p.tiktokMentions}</span>
                      )}
                      {p.redditMentions > 0 && (
                        <span style={{ color: '#FF6314', fontWeight: sortKey === 'reddit' ? 700 : 400 }}>Reddit: {p.redditMentions}</span>
                      )}
                      <span style={{ color: positiveShare >= 50 ? 'var(--joola)' : 'var(--fg-3)' }}>
                        {positiveShare}% positive
                      </span>
                      {p.avgPurchaseIntent > 0 && (
                        <span>PI: {p.avgPurchaseIntent.toFixed(2)}</span>
                      )}
                      {p.totalViews > 0 && (
                        <span>{fmt(p.totalViews)} TT views</span>
                      )}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: isTop ? 'var(--yellow)' : 'inherit' }}>
                      {primaryCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-4)' }}>{countLabel}</div>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        )}
      </div>

      {/* Sentiment breakdown table */}
      <div className="card card-pad-lg">
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          Sentiment Breakdown
          <Tip text="For each paddle, the count of positive / negative / neutral mentions, platform split, total TikTok views of videos mentioning it, and average AI purchase intent score." />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            className="fld"
            placeholder="Search paddle name…"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 320 }}
          />
        </div>
        <div className="table-wrap scroll">
          <table className="data" style={{ width: '100%' }}>
            <thead>
              <tr>
                <SortableTh
                  active={colSort.key === 'name'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('name')}
                >
                  Paddle <Tip text="Paddle model name. Data merged from TikTok videos and Reddit posts mentioning this paddle. May include competitor paddles." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'totalMentions'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('totalMentions')}
                  num
                >
                  Mentions <Tip text="Total times this paddle was mentioned across TikTok videos and Reddit posts." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'tiktokMentions'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('tiktokMentions')}
                  num
                  style={{ color: '#69C9D0' }}
                >
                  TikTok <Tip text="Number of TikTok videos that mention this paddle." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'redditMentions'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('redditMentions')}
                  num
                  style={{ color: '#FF6314' }}
                >
                  Reddit <Tip text="Number of Reddit posts or comments that mention this paddle." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'positiveCount'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('positiveCount')}
                  num
                  style={{ color: 'var(--joola)' }}
                >
                  + <Tip text="Positive sentiment mentions. Requires AI enrichment pipeline to have run — shows 0 if enrichment is pending." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'negativeCount'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('negativeCount')}
                  num
                  style={{ color: '#f87171' }}
                >
                  − <Tip text="Negative sentiment mentions. Requires AI enrichment pipeline to have run." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'neutralCount'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('neutralCount')}
                  num
                >
                  ~ <Tip text="Neutral mentions — neither clearly positive nor negative." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'crisisCount'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('crisisCount')}
                  num
                >
                  Crisis <Tip text="Mentions flagged by AI as containing a crisis signal: product damage, angry complaint, or viral negative content." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'opportunityCount'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('opportunityCount')}
                  num
                >
                  Opp <Tip text="Mentions flagged as an opportunity signal: buying intent, gift recommendation, or strong product praise." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'avgPurchaseIntent'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('avgPurchaseIntent')}
                  num
                >
                  PI <Tip text="Average purchase intent score (0–10) across AI-analyzed mentions. Higher = stronger buy signals. 0 when enrichment is pending." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'totalViews'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('totalViews')}
                  num
                >
                  Views <Tip text="Total TikTok video views across all videos mentioning this paddle." placement="bottom" />
                </SortableTh>
                <SortableTh
                  active={colSort.key === 'totalUpvotes'}
                  direction={colSort.dir}
                  onClick={() => toggleCol('totalUpvotes')}
                  num
                >
                  Upvotes <Tip text="Total Reddit upvotes for all posts mentioning this paddle." placement="bottom" />
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {tableSorted.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty">No paddles match your search.</div>
                  </td>
                </tr>
              ) : (
                tableSorted.map((p, i) => (
                  <tr key={p.name} className={i === 0 && !nameSearch && !colSort.key ? 'highlight' : ''}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="cell-num" style={{ fontWeight: 700 }}>{p.totalMentions}</td>
                    <td className="cell-num" style={{ color: '#69C9D0' }}>{p.tiktokMentions || '—'}</td>
                    <td className="cell-num" style={{ color: '#FF6314' }}>{p.redditMentions || '—'}</td>
                    <td className="cell-num" style={{ color: 'var(--joola)' }}>{p.positiveCount || '—'}</td>
                    <td className="cell-num" style={{ color: p.negativeCount > 0 ? '#f87171' : 'var(--fg-4)' }}>
                      {p.negativeCount || '—'}
                    </td>
                    <td className="cell-num" style={{ color: 'var(--fg-4)' }}>{p.neutralCount || '—'}</td>
                    <td className="cell-num" style={{ color: p.crisisCount > 0 ? '#f87171' : 'var(--fg-4)' }}>
                      {p.crisisCount || '—'}
                    </td>
                    <td className="cell-num" style={{ color: p.opportunityCount > 0 ? 'var(--joola)' : 'var(--fg-4)' }}>
                      {p.opportunityCount || '—'}
                    </td>
                    <td className="cell-num" style={{ color: 'var(--fg-3)' }}>
                      {p.avgPurchaseIntent > 0 ? p.avgPurchaseIntent.toFixed(2) : '—'}
                    </td>
                    <td className="cell-num" style={{ color: 'var(--fg-3)' }}>
                      {p.totalViews > 0 ? fmt(p.totalViews) : '—'}
                    </td>
                    <td className="cell-num" style={{ color: 'var(--fg-3)' }}>
                      {p.totalUpvotes > 0 ? fmt(p.totalUpvotes) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
