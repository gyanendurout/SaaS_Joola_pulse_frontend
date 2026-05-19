'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SortableTh } from '@/components/ui/SortableTh'
import { Tip } from '@/components/ui/Tip'
import { DraftCard } from '@/components/content/DraftCard'
import type { ContentDraft } from '@/components/content/DraftCard'

type SortKey = 'title' | 'content_type' | 'tone' | 'updated_at' | 'status'
type SortDir = 'asc' | 'desc'

const FORMAT_LABEL: Record<string, string> = {
  blog: 'Blog',
  ig_post: 'Instagram',
  twitter_response: 'Twitter',
}

interface SamplePrompt {
  key: string
  title: string
  blurb: string
  source: string
  pill: string
}

const SAMPLES: SamplePrompt[] = [
  {
    key: 'top_post',
    title: 'Riff on this week’s top IG post',
    blurb:
      'Pull the highest-ER post from the last 7 days and draft an Instagram follow-up that builds on the same theme.',
    source: 'Top Posts · Instagram',
    pill: 'pill pill-yellow',
  },
  {
    key: 'seo_gap',
    title: 'Fill an SEO keyword gap',
    blurb:
      'Pick a high-volume gap keyword we don’t rank for and draft a blog outline that targets it natively.',
    source: 'SEO · Blog',
    pill: 'pill pill-info',
  },
  {
    key: 'news_mention',
    title: 'React to a recent news mention',
    blurb:
      'Open the most important news article from the last 7 days and draft a tone-appropriate response.',
    source: 'News · IG / Twitter',
    pill: 'pill pill-cyan',
  },
]

interface Props {
  drafts: ContentDraft[]
}

export default function ContentHubClient({ drafts }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = drafts.filter(d => {
      if (!q) return true
      const tone =
        d.metadata && typeof d.metadata === 'object' && 'tone' in d.metadata
          ? String((d.metadata as Record<string, unknown>).tone)
          : ''
      return [
        d.title ?? '',
        FORMAT_LABEL[d.content_type] ?? d.content_type,
        tone,
        d.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
    rows.sort((a, b) => {
      const get = (d: ContentDraft): string | number => {
        switch (sortKey) {
          case 'title':
            return (d.title ?? '').toLowerCase()
          case 'content_type':
            return d.content_type
          case 'tone':
            return (
              (d.metadata &&
                typeof d.metadata === 'object' &&
                'tone' in d.metadata &&
                String((d.metadata as Record<string, unknown>).tone)) ||
              ''
            )
          case 'status':
            return d.status
          case 'updated_at':
          default:
            return new Date(d.updated_at).getTime() || 0
        }
      }
      const av = get(a)
      const bv = get(b)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [drafts, search, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  const draftCount = drafts.length

  return (
    <>
      {/* Header strip */}
      <div className="card card-pad-lg" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 6,
              }}
            >
              <h1
                style={{
                  fontFamily: "'Archivo Black', 'Archivo', sans-serif",
                  fontSize: 28,
                  margin: 0,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                Content Studio
              </h1>
              <span className="pill pill-yellow" style={{ fontSize: 10 }}>BETA</span>
            </div>
            <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              Turn cross-channel signals (SEO, top posts, news, Reddit) into
              brand-voice drafts in under a minute. Drafts persist here and stay
              editable.
              <Tip text="Brand-voice scoring is in Beta and directional only. Always proofread before publishing." />
            </p>
          </div>
          <div style={{ display: 'inline-flex', gap: 8, flexShrink: 0 }}>
            <Link href="/content-generation/text" className="btn btn-yellow">
              + New Text Draft
            </Link>
          </div>
        </div>
      </div>

      {/* 3 format cards */}
      <div className="card-grid cg-3" style={{ marginBottom: 22 }}>
        <FormatCard
          href="/content-generation/text"
          title="Text"
          status="live"
          eta="Live now"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
          description="Blog, Instagram, and Twitter drafts from SEO, top IG posts, news, and Reddit signals. Brand-voice scored."
          tag="Blog · Instagram · Twitter"
        />
        <FormatCard
          href={null}
          title="Image"
          status="soon"
          eta="Q3 2026"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z" />
            </svg>
          }
          description="On-brand IG, story, and ad images from a single prompt + product reference. Athlete-likeness controls."
          tag="IG · Story · Ad"
        />
        <FormatCard
          href={null}
          title="Reel"
          status="soon"
          eta="Q4 2026"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          }
          description="Short-form video drafts. Storyboard → b-roll selection → caption + audio cue. Ships with TikTok preset."
          tag="Reels · TikTok · Shorts"
        />
      </div>

      {/* Sample prompts */}
      <div className="card card-pad-lg" style={{ marginBottom: 22 }}>
        <div className="card-head" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Quick-start prompts
              <Tip text="One-click composer presets that wire current signals into a brief." />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>
              Three signal-driven jump-offs — the composer pre-loads the brief and
              selected signals.
            </div>
          </div>
        </div>
        <div className="card-grid cg-3">
          {SAMPLES.map(s => (
            <Link
              key={s.key}
              href={`/content-generation/text?sample=${encodeURIComponent(s.key)}`}
              className="card"
              style={{
                padding: 16,
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                cursor: 'pointer',
                transition: 'transform 0.12s, border-color 0.12s',
              }}
            >
              <span className={s.pill} style={{ alignSelf: 'flex-start' }}>{s.source}</span>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.55 }}>{s.blurb}</div>
              <div
                style={{
                  marginTop: 'auto',
                  fontSize: 11,
                  color: 'var(--yellow)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Open composer →
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Drafts */}
      <div className="card card-pad-lg">
        <div
          className="card-head"
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Recent Drafts
              <span className="pill pill-ghost" style={{ marginLeft: 8, fontSize: 10 }}>
                {draftCount}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>
              Latest 20 — click a row to open in the editor.
            </div>
          </div>
          <input
            className="fld"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, tone, format…"
            style={{ width: 240, fontSize: 12 }}
          />
          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>
            Click any column to sort
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            {drafts.length === 0
              ? 'No drafts yet. Hit “+ New Text Draft” to spin one up from current signals.'
              : 'No drafts match your filters.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <SortableTh
                    active={sortKey === 'title'}
                    direction={sortDir}
                    onClick={() => toggleSort('title')}
                    title="Draft title"
                  >
                    Title
                  </SortableTh>
                  <SortableTh
                    active={sortKey === 'content_type'}
                    direction={sortDir}
                    onClick={() => toggleSort('content_type')}
                    title="Output format — Blog, Instagram, or Twitter"
                  >
                    Format
                  </SortableTh>
                  <SortableTh
                    active={false}
                    direction="desc"
                    onClick={() => {}}
                    title="Signal source the draft was seeded from"
                  >
                    Source
                  </SortableTh>
                  <SortableTh
                    active={sortKey === 'tone'}
                    direction={sortDir}
                    onClick={() => toggleSort('tone')}
                    title="Tone preset used at generation"
                  >
                    Tone
                  </SortableTh>
                  <SortableTh
                    active={sortKey === 'updated_at'}
                    direction={sortDir}
                    onClick={() => toggleSort('updated_at')}
                    title="Last edit time"
                  >
                    Updated
                  </SortableTh>
                  <SortableTh
                    active={sortKey === 'status'}
                    direction={sortDir}
                    onClick={() => toggleSort('status')}
                    title="Draft → Approved → Published"
                  >
                    Status
                  </SortableTh>
                  <th style={{ width: 40 }} aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <DraftCard key={d.id} draft={d} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function FormatCard({
  href,
  title,
  status,
  eta,
  icon,
  description,
  tag,
}: {
  href: string | null
  title: string
  status: 'live' | 'soon'
  eta: string
  icon: React.ReactNode
  description: string
  tag: string
}) {
  const isLive = status === 'live'
  const inner = (
    <div
      className="card"
      style={{
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        opacity: isLive ? 1 : 0.55,
        borderColor: isLive ? 'var(--yellow-edge)' : undefined,
        cursor: isLive ? 'pointer' : 'not-allowed',
        transition: 'transform 0.12s, border-color 0.12s',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isLive ? 'var(--yellow-dim)' : 'var(--bg-3)',
            color: isLive ? 'var(--yellow)' : 'var(--fg-3)',
          }}
        >
          {icon}
        </div>
        <span
          className={isLive ? 'pill pill-green' : 'pill pill-ghost'}
          style={{ fontSize: 10 }}
        >
          {isLive ? 'LIVE' : 'SOON'}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Archivo Black', 'Archivo', sans-serif",
          fontSize: 22,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.55 }}>{description}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          fontSize: 11,
          color: 'var(--fg-4)',
        }}
      >
        <span>{tag}</span>
        <span style={{ color: isLive ? 'var(--yellow)' : 'var(--fg-4)', fontWeight: 700 }}>
          {eta}
        </span>
      </div>
    </div>
  )

  if (isLive && href) {
    return (
      <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
        {inner}
      </Link>
    )
  }
  return inner
}
