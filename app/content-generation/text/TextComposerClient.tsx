'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BriefEditor } from '@/components/content/BriefEditor'
import { CtaGoalSelect } from '@/components/content/CtaGoalSelect'
import { GeneratedDraft } from '@/components/content/GeneratedDraft'
import { LengthToggle } from '@/components/content/LengthToggle'
import { OutputFormatChips } from '@/components/content/OutputFormatChips'
import { SignalPickerTabs } from '@/components/content/SignalPickerTabs'
import { ToneSelector } from '@/components/content/ToneSelector'
import { AUDIENCE_OPTIONS } from '@/lib/content/types'
import { generateStream } from '@/lib/content/api'
import {
  EMPTY_SELECTED_SIGNALS,
  type Audience,
  type ContentType,
  type CtaGoal,
  type Draft,
  type DraftMetadata,
  type GenerateRequest,
  type Length,
  type SelectedSignals,
  type SignalsConfig,
  type SignalSource,
  type SignalsPreview,
  type Tone,
} from '@/lib/content/types'
import type {
  TextComposerSampleSeed,
  TextComposerSourceArticle,
  TextComposerSourceReddit,
} from './page'

// =============================================================================
// Props
// =============================================================================

interface Props {
  preview: SignalsPreview
  sourceArticle: TextComposerSourceArticle | null
  sourceReddit: TextComposerSourceReddit | null
  sampleSeed: TextComposerSampleSeed | null
}

// =============================================================================
// Helpers
// =============================================================================

function buildSignalsConfig(selected: SelectedSignals): SignalsConfig {
  return {
    use_seo_keywords: selected.seo.size > 0,
    use_top_posts: selected.top_posts.size > 0,
    use_news: selected.news.size > 0,
    use_reddit: selected.reddit.size > 0,
    use_loyal_fans: true,
    use_player_roster: true,
    selected_seo_keywords: Array.from(selected.seo),
    selected_top_post_ids: Array.from(selected.top_posts),
    selected_news_ids: Array.from(selected.news),
    selected_reddit_ids: Array.from(selected.reddit),
  }
}

function wordCount(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

// =============================================================================
// Component
// =============================================================================

export default function TextComposerClient({
  preview,
  sourceArticle,
  sourceReddit,
  sampleSeed,
}: Props) {
  const router = useRouter()

  // --- Format + style state ------------------------------------------------
  const [format, setFormat] = useState<ContentType>(() =>
    sampleSeed?.format ?? (sourceArticle || sourceReddit ? 'ig_post' : 'ig_post'),
  )
  const [tone, setTone] = useState<Tone>(
    sourceReddit?.is_crisis ? 'defensive' : 'informative',
  )
  const [length, setLength] = useState<Length>('medium')
  const [audience, setAudience] = useState<Audience>('general_fans')
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('shop')

  // --- Brief + free prompt --------------------------------------------------
  const initialBrief =
    sourceArticle
      ? `Write an Instagram caption responding to "${sourceArticle.title}" — angle: ${sourceArticle.suggested_action ?? 'highlight the JOOLA angle'}.`
      : sourceReddit
        ? sourceReddit.is_crisis
          ? `Draft a defensive but factual response to r/${sourceReddit.subreddit} thread: "${sourceReddit.title ?? '(no title)'}". Tone must be calm, accountable, and avoid escalation.`
          : `Draft a response to r/${sourceReddit.subreddit} thread: "${sourceReddit.title ?? '(no title)'}".`
        : sampleSeed?.brief ?? ''
  const [brief, setBrief] = useState(initialBrief)
  const [freePrompt, setFreePrompt] = useState('')

  // --- Selected signals -----------------------------------------------------
  const [selected, setSelected] = useState<SelectedSignals>(() => {
    const init = EMPTY_SELECTED_SIGNALS()
    if (sourceArticle) init.news.add(sourceArticle.id)
    if (sourceReddit) init.reddit.add(sourceReddit.id)
    if (sampleSeed) {
      if (sampleSeed.preselectId) {
        if (sampleSeed.activeTab === 'news') init.news.add(sampleSeed.preselectId)
        if (sampleSeed.activeTab === 'top_posts') init.top_posts.add(sampleSeed.preselectId)
      }
      if (sampleSeed.preselectKeyword && sampleSeed.activeTab === 'seo') {
        init.seo.add(sampleSeed.preselectKeyword)
      }
    }
    return init
  })

  const [activeTab, setActiveTab] = useState<SignalSource>(() =>
    sourceArticle ? 'news'
      : sourceReddit ? 'reddit'
      : sampleSeed?.activeTab ?? 'seo',
  )

  // --- News-source dismissible banner --------------------------------------
  const [sourceBannerVisible, setSourceBannerVisible] = useState<boolean>(
    Boolean(sourceArticle || sourceReddit),
  )

  // --- Generation state -----------------------------------------------------
  const [generating, setGenerating] = useState(false)
  const [progressTokens, setProgressTokens] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup on unmount.
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // --- Selection toggle ----------------------------------------------------
  const onToggleSignal = useCallback((source: SignalSource, id: string) => {
    setSelected(prev => {
      const next = { ...prev, [source]: new Set(prev[source]) }
      if (next[source].has(id)) next[source].delete(id)
      else next[source].add(id)
      return next
    })
  }, [])

  // --- Derived: Can generate? ---------------------------------------------
  const anySignal =
    selected.seo.size + selected.top_posts.size + selected.news.size + selected.reddit.size > 0
  const canGenerate = !generating && (anySignal || brief.trim().length > 0 || freePrompt.trim().length > 0)

  // --- Reset all -----------------------------------------------------------
  const reset = useCallback(() => {
    setFormat('ig_post')
    setTone('informative')
    setLength('medium')
    setAudience('general_fans')
    setCtaGoal('shop')
    setBrief('')
    setFreePrompt('')
    setSelected(EMPTY_SELECTED_SIGNALS())
    setDraft(null)
    setError(null)
    setProgressTokens(0)
  }, [])

  // --- Generate ------------------------------------------------------------
  const generate = useCallback(async () => {
    if (!canGenerate) return
    setError(null)
    setDraft(null)
    setGenerating(true)
    setProgressTokens(0)
    setGenStartedAt(Date.now())

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const fullBrief = freePrompt.trim()
      ? `${brief.trim()}\n\nADDITIONAL CONTEXT:\n${freePrompt.trim()}`
      : brief.trim()

    const req: GenerateRequest = {
      content_type: format,
      signals_config: buildSignalsConfig(selected),
      source_article_id: sourceArticle?.id ?? undefined,
      source_reddit_id: sourceReddit?.id ?? undefined,
      instructions: fullBrief || undefined,
      tone,
      length,
      audience,
      cta_goal: ctaGoal,
    }

    let receivedBody = ''
    let receivedTitle: string | null | undefined = null
    let receivedHashtags: string[] | null | undefined = null

    await generateStream(req, {
      signal: ctrl.signal,
      onToken: e => {
        receivedBody += e.text
        setProgressTokens(t => t + 1)
      },
      onMeta: () => {
        // No-op for now; surfaced in future for variant cycling.
      },
      onDone: e => {
        receivedBody = e.body
        receivedTitle = e.title ?? null
        receivedHashtags = e.hashtags ?? null
        const now = Date.now()
        // Build a lightweight local Draft for immediate display.
        // The persisted row in Supabase is the source of truth on `/text/[id]`.
        const localDraft: Draft = {
          id: e.draft_id,
          created_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
          created_by: 'me',
          content_type: format,
          status: 'draft',
          title: receivedTitle ?? null,
          body: receivedBody,
          hashtags: receivedHashtags ?? null,
          metadata: {
            format,
            tone,
            length,
            audience,
            cta_goal: ctaGoal,
            word_count: wordCount(receivedBody),
            gen_ms: genStartedAt ? now - genStartedAt : 0,
            brand_voice: e.brand_voice ?? undefined,
          } satisfies DraftMetadata,
          source_article_id: sourceArticle?.id ?? null,
          source_signal_snapshot: preview,
          generation_run_id: null,
          parent_draft_id: null,
          version: 1,
        }
        setDraft(localDraft)
        setGenerating(false)

        // For Blog, jump to the long-form editor immediately.
        if (format === 'blog' && e.draft_id) {
          router.push(`/content-generation/text/${e.draft_id}`)
        }
      },
      onError: e => {
        setError(e.message)
        setGenerating(false)
      },
    })
  }, [
    canGenerate, freePrompt, brief, format, selected, sourceArticle, sourceReddit,
    tone, length, audience, ctaGoal, genStartedAt, preview, router,
  ])

  // --- Selected pills ------------------------------------------------------
  const selectedPills = useMemo(() => {
    const pills: { source: SignalSource; id: string; label: string }[] = []
    Array.from(selected.seo).forEach(kw => pills.push({ source: 'seo', id: kw, label: kw }))
    Array.from(selected.top_posts).forEach(id => {
      const p = preview.top_posts.find(x => x.post_id === id)
      pills.push({ source: 'top_posts', id, label: p?.content_theme ?? p?.caption_first_line?.slice(0, 30) ?? id.slice(0, 8) })
    })
    Array.from(selected.news).forEach(id => {
      const p = preview.news.find(x => x.id === id)
      pills.push({ source: 'news', id, label: p?.title?.slice(0, 40) ?? id.slice(0, 8) })
    })
    Array.from(selected.reddit).forEach(id => {
      const p = preview.reddit.find(x => x.id === id)
      pills.push({ source: 'reddit', id, label: p?.title?.slice(0, 40) ?? id.slice(0, 8) })
    })
    return pills
  }, [selected, preview])

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="content-composer-root">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            CONTENT STUDIO · TEXT
          </div>
          <h1>CONTENT <em>STUDIO</em></h1>
          <div className="sub">
            Cross-channel signals → on-brand Blog, IG and Twitter drafts. Drafts persist for editing and export.
          </div>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={reset} style={{ fontSize: 11 }}>
            ↺ Reset
          </button>
          <button
            className="btn btn-yellow"
            onClick={generate}
            disabled={!canGenerate}
            style={{ fontSize: 12 }}
          >
            {generating ? '▶ Generating…' : 'Generate ▸'}
          </button>
        </div>
      </header>

      {/* Source banner */}
      {sourceBannerVisible && (sourceArticle || sourceReddit) && (
        <div className="section">
          <div
            className="card"
            style={{
              borderColor: 'rgba(245,230,37,0.45)',
              background: 'rgba(245,230,37,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--yellow)', fontWeight: 700, marginRight: 6 }}>
                Pre-loaded from {sourceArticle ? 'news article' : 'Reddit thread'}:
              </span>
              <em style={{ color: 'var(--fg)' }}>
                {sourceArticle ? sourceArticle.title : (sourceReddit?.title ?? '(no title)')}
              </em>
            </div>
            <button
              className="btn"
              onClick={() => setSourceBannerVisible(false)}
              style={{ fontSize: 10, padding: '2px 8px' }}
              aria-label="Dismiss source banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Three-zone grid */}
      <div className="composer-grid">
        {/* SIGNALS */}
        <section className="card card-pad-lg composer-zone composer-zone-signals">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>SIGNALS</h3>
            <span className="meta">Pick what feeds the prompt</span>
          </div>
          <SignalPickerTabs
            preview={preview}
            selected={selected}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onToggle={onToggleSignal}
            freePrompt={freePrompt}
            onFreePromptChange={setFreePrompt}
          />
        </section>

        {/* COMPOSER */}
        <section className="card card-pad-lg composer-zone composer-zone-center">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>COMPOSER</h3>
            <span className="meta">Format · tone · length · audience · CTA</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Format">
              <OutputFormatChips value={format} onChange={setFormat} />
            </Field>

            <Field label="Tone">
              <ToneSelector value={tone} onChange={setTone} />
            </Field>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Field label="Length">
                <LengthToggle value={length} onChange={setLength} format={format} />
              </Field>
              <Field label="Audience">
                <select
                  className="fld"
                  value={audience}
                  onChange={e => setAudience(e.target.value as Audience)}
                  style={{ fontSize: 12, minWidth: 200 }}
                >
                  {AUDIENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="CTA goal">
                <CtaGoalSelect value={ctaGoal} onChange={setCtaGoal} />
              </Field>
            </div>

            <Field label="Brief">
              <BriefEditor
                value={brief}
                onChange={setBrief}
                seedPlaceholder="Describe the post you want… or pick signals on the left to auto-seed this."
              />
            </Field>

            {selectedPills.length > 0 && (
              <Field label={`Selected signals (${selectedPills.length})`}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedPills.map(p => (
                    <span
                      key={`${p.source}::${p.id}`}
                      className="chip on"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                    >
                      <span style={{ opacity: 0.7, fontSize: 9, textTransform: 'uppercase' }}>{p.source}</span>
                      <span>{p.label}</span>
                      <button
                        aria-label="Deselect"
                        onClick={() => onToggleSignal(p.source, p.id)}
                        style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              </Field>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <button className="btn" onClick={reset} style={{ fontSize: 11 }}>↺ Reset</button>
              <button
                className="btn btn-yellow"
                onClick={generate}
                disabled={!canGenerate}
                style={{ fontSize: 12 }}
              >
                {generating ? '▶ Generating…' : 'Generate ▸'}
              </button>
            </div>
          </div>
        </section>

        {/* OUTPUT */}
        <section className="card card-pad-lg composer-zone composer-zone-output">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <h3>OUTPUT</h3>
            <span className="meta">Draft preview · editable</span>
          </div>

          {!draft && !generating && !error && (
            <div className="empty" style={{ marginTop: 12 }}>
              Click <strong>Generate ▸</strong> to draft your content. Output appears here.
            </div>
          )}

          {generating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="live-pulse-dot" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--yellow)', letterSpacing: '0.08em' }}>
                  GENERATING · {progressTokens} tokens
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(95, 10 + progressTokens * 0.4)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--yellow), var(--yellow-deep, #c9a906))',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <Skeleton lines={5} />
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.08)',
                color: '#fca5a5',
                padding: '10px 12px',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#fca5a5' }}>Generation failed.</strong> {error}
            </div>
          )}

          {draft && (
            <GeneratedDraft
              draft={draft}
              meta={{
                wordCount: typeof draft.metadata?.word_count === 'number' ? draft.metadata.word_count : undefined,
                genMs: typeof draft.metadata?.gen_ms === 'number' ? draft.metadata.gen_ms : undefined,
                brandVoice: draft.metadata?.brand_voice ?? null,
              }}
              onRegenerate={generate}
              onOpenEditor={() => router.push(`/content-generation/text/${draft.id}`)}
              busy={generating}
            />
          )}
        </section>
      </div>

      <style>{`
        .composer-grid {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr) 440px;
          gap: 14px;
          align-items: stretch;
        }
        .composer-zone {
          display: flex;
          flex-direction: column;
          min-height: 520px;
        }
        .composer-zone-signals { min-height: 640px; }
        @media (max-width: 1280px) {
          .composer-grid { grid-template-columns: 280px minmax(0, 1fr) 380px; }
        }
        @media (max-width: 1100px) {
          .composer-grid { grid-template-columns: 1fr; }
          .composer-zone { min-height: 0; }
          .composer-zone-signals { min-height: 420px; }
        }
      `}</style>
    </div>
  )
}

// =============================================================================
// Tiny helpers
// =============================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--fg-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 12,
            background: 'linear-gradient(90deg, var(--bg-3) 0%, var(--surface-2) 50%, var(--bg-3) 100%)',
            backgroundSize: '200% 100%',
            animation: 'pulse-skel 1.4s ease-in-out infinite',
            borderRadius: 4,
            width: `${80 + Math.random() * 20}%`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse-skel {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
