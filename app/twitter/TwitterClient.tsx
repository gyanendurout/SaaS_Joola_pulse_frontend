'use client'

import { useState, useMemo } from 'react'
import { SortableTh, ExtLink } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { formatEnum } from '@/lib/format'
import type { XAccount, XPost } from './page'

interface Props {
  account: XAccount | null
  posts: XPost[]
  totalLikes: number
  totalRT: number
  totalReplies: number
  totalImpressions: number
  enrichedCount: number
  crisisCount: number
  opportunityCount: number
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
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

type SortKey = 'text' | 'type' | 'impressions' | 'likes' | 'rt' | 'replies' | 'sentiment' | 'date'

export default function TwitterClient({ account, posts, totalLikes, totalRT, totalReplies, totalImpressions, enrichedCount, crisisCount, opportunityCount }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('impressions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterType, setFilterType] = useState<'all' | 'rt' | 'original'>('all')

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const aiPending = enrichedCount === 0
  const rtCount = posts.filter(p => p.text?.startsWith('RT @')).length
  const origCount = posts.length - rtCount
  const avgImpressions = posts.length ? Math.round(totalImpressions / posts.length) : 0

  const filtered = useMemo(() => {
    let list = posts
    if (filterType === 'rt') list = list.filter(p => p.text?.startsWith('RT @'))
    if (filterType === 'original') list = list.filter(p => !p.text?.startsWith('RT @'))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.text?.toLowerCase().includes(q))
    }
    const m = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'text': return ((a.text ?? '').localeCompare(b.text ?? '')) * m
        case 'type': {
          const ta = a.text?.startsWith('RT @') ? 1 : 0
          const tb = b.text?.startsWith('RT @') ? 1 : 0
          return (ta - tb) * m
        }
        case 'impressions': return (num(a.view_count) - num(b.view_count)) * m
        case 'likes': return (num(a.like_count) - num(b.like_count)) * m
        case 'rt': return (num(a.retweet_count) - num(b.retweet_count)) * m
        case 'replies': return (num(a.reply_count) - num(b.reply_count)) * m
        case 'sentiment': return ((a.sentiment_label ?? '').localeCompare(b.sentiment_label ?? '')) * m
        case 'date': return ((a.posted_at ?? '').localeCompare(b.posted_at ?? '')) * m
      }
    })
  }, [posts, sortKey, sortDir, search, filterType])

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            X / Twitter
            <Tip text="JOOLA's X (formerly Twitter) activity — every tweet and retweet from @joolausa, with impression and engagement metrics." />
          </h1>
          {account && (
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>
              <a href={account.profile_url} target="_blank" rel="noreferrer" className="tlink">@{account.handle}</a>
              {' · '}{posts.length} posts tracked
            </div>
          )}
        </div>
        <div className="live-pulse-dot" />
      </div>

      {aiPending && posts.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--yellow) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>⚡ AI enrichment pending</span>
          <span style={{ color: 'var(--fg-3)' }}>
            Sentiment, topics, and crisis/opportunity flags will appear once the AI pipeline runs on these {posts.length} posts.
          </span>
        </div>
      )}

      {rtCount === posts.length && posts.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--joola) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--joola) 25%, transparent)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13,
        }}>
          <span style={{ color: 'var(--joola)', fontWeight: 700 }}>ℹ️ Amplifier account:</span>
          <span style={{ color: 'var(--fg-3)', marginLeft: 6 }}>
            All {posts.length} tracked posts are retweets — @{account?.handle ?? 'joolausa'} is primarily used to amplify athlete and partner content rather than post original tweets.
          </span>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi joola">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Posts
            <Tip text="Total tweets and retweets from @joolausa in our database." />
          </div>
          <div className="value">{posts.length}</div>
          <div className="delta up">tracked</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Impressions
            <Tip text="Total times JOOLA's posts appeared on a user's screen. An impression is counted even if the user just scrolled past." />
          </div>
          <div className="value">{fmt(totalImpressions)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>avg {fmt(avgImpressions)} / post</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Likes
            <Tip text="Combined hearts/likes across all posts, plus total reply count — a measure of audience reaction." />
          </div>
          <div className="value">{fmt(totalLikes)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>{fmt(totalReplies)} replies</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Total Retweets
            <Tip text="Times JOOLA's posts were re-shared by other accounts. Retweets multiply reach beyond JOOLA's own followers." />
          </div>
          <div className="value">{fmt(totalRT)}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>amplification</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Post Mix
            <Tip text="RT = retweets (JOOLA amplifying someone else's tweet). Original = JOOLA's own tweets. A high RT-ratio suggests an amplifier account rather than a content creator." />
          </div>
          <div className="value">{rtCount}/{origCount}</div>
          <div className="delta" style={{ color: 'var(--fg-3)' }}>RT / Original</div>
        </div>
      </div>

      {!aiPending && (
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className={'kpi' + (crisisCount > 0 ? ' danger' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Crisis Signals
              <Tip text="Posts the AI flagged as containing complaints, defects, warranty issues, or other content that could damage the brand." />
            </div>
            <div className="value">{crisisCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className={'kpi' + (opportunityCount > 0 ? ' joola' : '')}>
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              Opportunities
              <Tip text="Posts the AI flagged as showing strong buying intent or praise — content worth amplifying or responding to." />
            </div>
            <div className="value">{opportunityCount}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>AI-flagged</div>
          </div>
          <div className="kpi">
            <div className="label" style={{ display: 'flex', alignItems: 'center' }}>
              AI Enriched
              <Tip text="Percentage of posts processed by the AI pipeline (sentiment, topics, crisis/opportunity flags)." />
            </div>
            <div className="value">{enrichedCount}/{posts.length}</div>
            <div className="delta" style={{ color: 'var(--fg-3)' }}>{Math.round((enrichedCount / posts.length) * 100)}%</div>
          </div>
        </div>
      )}

      <div className="card card-pad-lg">
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
            Posts ({filtered.length})
            <Tip text="Every tweet and retweet from @joolausa. Click any column header to sort. Click the ↗ icon on the right to open the post on X." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {origCount > 0 && (
              <>
                <button className={'chip' + (filterType === 'all' ? ' on' : '')} onClick={() => setFilterType('all')} style={{ fontSize: 11 }}>All</button>
                <button className={'chip' + (filterType === 'rt' ? ' on' : '')} onClick={() => setFilterType('rt')} style={{ fontSize: 11 }}>RT</button>
                <button className={'chip' + (filterType === 'original' ? ' on' : '')} onClick={() => setFilterType('original')} style={{ fontSize: 11 }}>Original</button>
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center', marginLeft: 4 }}>
              Click any column to sort
            </span>
          </div>
        </div>
        <input
          className="fld"
          placeholder="Search post text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {filtered.length === 0 ? (
          <div className="empty">No posts match your filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableTh active={sortKey === 'text'} direction={sortDir} onClick={() => setSort('text')} title="Post text content">Text</SortableTh>
                  <SortableTh active={sortKey === 'type'} direction={sortDir} onClick={() => setSort('type')} title="RT = Retweet (JOOLA amplifying another account). Original = JOOLA's own tweet.">Type</SortableTh>
                  <SortableTh active={sortKey === 'impressions'} direction={sortDir} onClick={() => setSort('impressions')} num title="Total times the post appeared on a user's screen">Impressions</SortableTh>
                  <SortableTh active={sortKey === 'likes'} direction={sortDir} onClick={() => setSort('likes')} num title="Total likes (hearts) on the post">Likes</SortableTh>
                  <SortableTh active={sortKey === 'rt'} direction={sortDir} onClick={() => setSort('rt')} num title="Retweets — times the post was re-shared by other accounts">RTs</SortableTh>
                  <SortableTh active={sortKey === 'replies'} direction={sortDir} onClick={() => setSort('replies')} num title="Total replies to the post">Replies</SortableTh>
                  <SortableTh active={sortKey === 'sentiment'} direction={sortDir} onClick={() => setSort('sentiment')} title="AI-classified sentiment of the post">Sentiment</SortableTh>
                  <th title="Crisis & opportunity flags from AI enrichment">Flags</th>
                  <SortableTh active={sortKey === 'date'} direction={sortDir} onClick={() => setSort('date')} num title="Date the post was published on X">Posted</SortableTh>
                  <th style={{ width: 40 }} aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isRT = p.text?.startsWith('RT @')
                  return (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 380 }}>
                        <a href={p.post_url} target="_blank" rel="noreferrer" className="tlink"
                          style={{ fontSize: 13, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.text || '(no text)'}
                        </a>
                      </td>
                      <td>
                        {isRT ? (
                          <span className="chip" style={{ fontSize: 10 }}>RT</span>
                        ) : (
                          <span className="pill-joola" style={{ fontSize: 10 }}>Original</span>
                        )}
                      </td>
                      <td className="cell-num" style={{ fontWeight: 600 }}>{fmt(num(p.view_count))}</td>
                      <td className="cell-num">{fmt(num(p.like_count))}</td>
                      <td className="cell-num">{fmt(num(p.retweet_count))}</td>
                      <td className="cell-num">{fmt(num(p.reply_count))}</td>
                      <td>
                        {p.sentiment_label ? (() => {
                          const low = p.sentiment_label.toLowerCase()
                          const color = low.includes('positive') ? 'var(--joola)' : low.includes('negative') ? '#f87171' : 'var(--fg-3)'
                          return <span style={{ fontSize: 11, color }}>{formatEnum(p.sentiment_label)}</span>
                        })() : (
                          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.is_crisis && <span className="pill-danger" style={{ fontSize: 9, marginRight: 4 }}>🚨</span>}
                        {p.is_opportunity && <span className="pill-joola" style={{ fontSize: 9 }}>💡</span>}
                        {!p.is_crisis && !p.is_opportunity && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>}
                      </td>
                      <td className="cell-num" style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(p.posted_at)}</td>
                      <td><ExtLink href={p.post_url} label="Open on X" /></td>
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
