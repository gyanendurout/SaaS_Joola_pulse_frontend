'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BriefEditor } from '@/components/content/BriefEditor'
import { CtaGoalSelect } from '@/components/content/CtaGoalSelect'
import { GeneratedDraft } from '@/components/content/GeneratedDraft'
import { SignalPickerTabs } from '@/components/content/SignalPickerTabs'
import { Tip } from '@/components/ui/Tip'
import {
  AUDIENCE_OPTIONS,
  FORMAT_OPTIONS,
  LENGTH_OPTIONS,
  TONE_OPTIONS,
} from '@/lib/content/types'
import { deleteDraft, generateStream, updateDraft } from '@/lib/content/api'
import { recommendStyle } from '@/lib/content/recommend'
import {
  EMPTY_SELECTED_SIGNALS,
  type Audience,
  type ContentType,
  type CtaGoal,
  type Draft,
  type DraftMetadata,
  type DraftStatus,
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
} from './page'

// =============================================================================
// Props
// =============================================================================

interface Props {
  preview: SignalsPreview
  sourceArticle: TextComposerSourceArticle | null
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
    use_reddit: false,
    use_loyal_fans: true,
    use_player_roster: true,
    selected_seo_keywords: Array.from(selected.seo),
    selected_top_post_ids: Array.from(selected.top_posts),
    selected_news_ids: Array.from(selected.news),
    selected_reddit_ids: [],
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
  sampleSeed,
}: Props) {
  // --- Format + style state ------------------------------------------------
  const [format, setFormat] = useState<ContentType>(() =>
    sampleSeed?.format ?? 'ig_post',
  )
  const [tone, setTone] = useState<Tone>('informative')
  const [length, setLength] = useState<Length>('medium')
  const [audience, setAudience] = useState<Audience>('general_fans')
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('shop')

  // --- Brief + free prompt --------------------------------------------------
  const initialBrief =
    sourceArticle
      ? `Write an Instagram caption responding to "${sourceArticle.title}" — angle: ${sourceArticle.suggested_action ?? 'highlight the JOOLA angle'}.`
      : sampleSeed?.brief ?? ''
  const [brief, setBrief] = useState(initialBrief)
  const [freePrompt, setFreePrompt] = useState('')

  // --- Selected signals -----------------------------------------------------
  const [selected, setSelected] = useState<SelectedSignals>(() => {
    const init = EMPTY_SELECTED_SIGNALS()
    if (sourceArticle) init.news.add(sourceArticle.id)
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
    sourceArticle ? 'news' : sampleSeed?.activeTab ?? 'seo',
  )

  // --- News-source dismissible banner --------------------------------------
  const [sourceBannerVisible, setSourceBannerVisible] = useState<boolean>(
    Boolean(sourceArticle),
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
    selected.seo.size + selected.top_posts.size + selected.news.size > 0
  const canGenerate = !generating && (anySignal || brief.trim().length > 0 || freePrompt.trim().length > 0)

  // --- AI recommendation based on selected signals ------------------------
  const recommendation = useMemo(
    () => recommendStyle(selected, preview),
    [selected, preview],
  )

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
        // Stay on the composer — the OUTPUT panel handles inline preview,
        // edit, save, status, and delete. No navigation away.
      },
      onError: e => {
        setError(e.message)
        setGenerating(false)
      },
    })
  }, [
    canGenerate, freePrompt, brief, format, selected, sourceArticle,
    tone, length, audience, ctaGoal, genStartedAt, preview,
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
    // Reddit removed from UI but keep tolerating old `selected.reddit` ids in snapshots.
    Array.from(selected.reddit).forEach(id => {
      const p = preview.reddit?.find(x => x.id === id)
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
      </header>

      {/* Source banner */}
      {sourceBannerVisible && sourceArticle && (
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
                Pre-loaded from news article:
              </span>
              <em style={{ color: 'var(--fg)' }}>{sourceArticle.title}</em>
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
            {/* AI recommendation banner — appears only when at least one suggestion differs from current */}
            {(recommendation.tone || recommendation.length || recommendation.audience || recommendation.cta_goal) && (
              (recommendation.tone && recommendation.tone !== tone) ||
              (recommendation.length && recommendation.length !== length) ||
              (recommendation.audience && recommendation.audience !== audience) ||
              (recommendation.cta_goal && recommendation.cta_goal !== ctaGoal)
            ) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(245,230,37,0.06)',
                  border: '1px dashed rgba(245,230,37,0.45)',
                  borderRadius: 6,
                  fontSize: 11,
                  color: 'var(--fg-2)',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--yellow)' }}>AI suggests</strong> a content profile based on your selected signals.
                  Click each <span className="mono" style={{ color: 'var(--yellow)' }}>AI: …</span> chip to accept, or use:
                </span>
                <button
                  className="btn btn-yellow"
                  onClick={() => {
                    if (recommendation.tone) setTone(recommendation.tone)
                    if (recommendation.length) setLength(recommendation.length)
                    if (recommendation.audience) setAudience(recommendation.audience)
                    if (recommendation.cta_goal) setCtaGoal(recommendation.cta_goal)
                  }}
                  style={{ fontSize: 10.5, padding: '3px 10px' }}
                >
                  ⤴ Apply all
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Field label="Format">
                <select
                  className="fld"
                  value={format}
                  onChange={e => setFormat(e.target.value as ContentType)}
                  style={{ fontSize: 12, width: '100%' }}
                  aria-label="Output format"
                >
                  {FORMAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Tone"
                aiBadge={
                  recommendation.tone && recommendation.tone !== tone ? (
                    <AiBadge
                      label={TONE_OPTIONS.find(o => o.value === recommendation.tone)?.label ?? recommendation.tone}
                      reason={recommendation.reasons.tone}
                      onApply={() => setTone(recommendation.tone!)}
                    />
                  ) : null
                }
              >
                <select
                  className="fld"
                  value={tone}
                  onChange={e => setTone(e.target.value as Tone)}
                  style={{ fontSize: 12, width: '100%' }}
                  aria-label="Tone"
                  title={TONE_OPTIONS.find(o => o.value === tone)?.description}
                >
                  {TONE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} title={o.description}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Length"
                aiBadge={
                  recommendation.length && recommendation.length !== length ? (
                    <AiBadge
                      label={LENGTH_OPTIONS.find(o => o.value === recommendation.length)?.label ?? recommendation.length}
                      reason={recommendation.reasons.length}
                      onApply={() => setLength(recommendation.length!)}
                    />
                  ) : null
                }
              >
                <select
                  className="fld"
                  value={length}
                  onChange={e => setLength(e.target.value as Length)}
                  style={{ fontSize: 12, width: '100%' }}
                  aria-label="Length"
                >
                  {LENGTH_OPTIONS.map(o => {
                    const sub = format === 'blog' ? o.blog : format === 'twitter_response' ? o.tweet : o.ig
                    return (
                      <option key={o.value} value={o.value}>{o.label} — {sub}</option>
                    )
                  })}
                </select>
              </Field>

              <Field
                label="Audience"
                aiBadge={
                  recommendation.audience && recommendation.audience !== audience ? (
                    <AiBadge
                      label={AUDIENCE_OPTIONS.find(o => o.value === recommendation.audience)?.label ?? recommendation.audience}
                      reason={recommendation.reasons.audience}
                      onApply={() => setAudience(recommendation.audience!)}
                    />
                  ) : null
                }
              >
                <select
                  className="fld"
                  value={audience}
                  onChange={e => setAudience(e.target.value as Audience)}
                  style={{ fontSize: 12, width: '100%' }}
                  aria-label="Audience"
                >
                  {AUDIENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    CTA goal
                    <Tip
                      size={11}
                      text="Call-To-Action goal — what action the closing line should drive readers to take. 'Shop' adds a product link, 'Sign-up' invites them to a list, 'Reply' encourages engagement, 'No CTA' omits the call-out entirely."
                    />
                  </span>
                }
                aiBadge={
                  recommendation.cta_goal && recommendation.cta_goal !== ctaGoal ? (
                    <AiBadge
                      label={recommendation.cta_goal}
                      reason={recommendation.reasons.cta_goal}
                      onApply={() => setCtaGoal(recommendation.cta_goal!)}
                    />
                  ) : null
                }
              >
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 6 }}>
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
            <DraftOutputPanel
              draft={draft}
              onChange={setDraft}
              onClear={() => setDraft(null)}
              onRegenerate={generate}
              busy={generating}
            />
          )}
        </section>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .composer-grid {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr) 440px;
          gap: 14px;
          align-items: start;
        }
        .composer-zone {
          display: flex;
          flex-direction: column;
          height: 680px;
          max-height: 80vh;
          overflow: hidden;
        }
        .composer-zone > .card-head { flex: 0 0 auto; }
        .composer-zone > div:not(.card-head) {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
        }
        @media (max-width: 1280px) {
          .composer-grid { grid-template-columns: 280px minmax(0, 1fr) 380px; }
        }
        @media (max-width: 1100px) {
          .composer-grid { grid-template-columns: 1fr; }
          .composer-zone { height: 520px; max-height: 60vh; }
        }
      `,
        }}
      />
    </div>
  )
}

// =============================================================================
// Tiny helpers
// =============================================================================

function Field({
  label,
  aiBadge,
  children,
}: {
  label: React.ReactNode
  aiBadge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          gap: 6,
          minHeight: 14,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--fg-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </div>
        {aiBadge}
      </div>
      {children}
    </div>
  )
}

function AiBadge({
  label,
  reason,
  onApply,
}: {
  label: string
  reason?: string
  onApply: () => void
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      title={reason ?? 'Apply AI recommendation'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(245,230,37,0.10)',
        border: '1px dashed rgba(245,230,37,0.55)',
        color: 'var(--yellow)',
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 9.5,
        fontFamily: 'JetBrains Mono, monospace',
        cursor: 'pointer',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      AI: {label} ⤴
    </button>
  )
}

// =============================================================================
// Draft output panel — preview + inline edit + status + save + delete
// =============================================================================

const STATUS_OPTIONS: { value: DraftStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

function DraftOutputPanel({
  draft,
  onChange,
  onClear,
  onRegenerate,
  busy,
}: {
  draft: Draft
  onChange: (next: Draft) => void
  onClear: () => void
  onRegenerate?: () => void
  busy?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [bodyDraft, setBodyDraft] = useState(draft.body)
  const [titleDraft, setTitleDraft] = useState(draft.title ?? '')
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Reset local edit buffers when a new draft arrives (e.g. after regenerate)
  useEffect(() => {
    setBodyDraft(draft.body)
    setTitleDraft(draft.title ?? '')
    setEditing(false)
    setErr(null)
  }, [draft.id, draft.body, draft.title])

  const dirty = editing && (bodyDraft !== draft.body || titleDraft !== (draft.title ?? ''))

  const save = useCallback(async () => {
    setSaving(true)
    setErr(null)
    try {
      const patch: { body?: string; title?: string | null } = {}
      if (bodyDraft !== draft.body) patch.body = bodyDraft
      if (titleDraft !== (draft.title ?? '')) patch.title = titleDraft || null
      const updated = Object.keys(patch).length > 0 ? await updateDraft(draft.id, patch) : draft
      onChange(updated)
      setEditing(false)
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 1600)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [bodyDraft, titleDraft, draft, onChange])

  const cancel = useCallback(() => {
    setBodyDraft(draft.body)
    setTitleDraft(draft.title ?? '')
    setEditing(false)
    setErr(null)
  }, [draft.body, draft.title])

  const setStatus = useCallback(async (next: DraftStatus) => {
    setSaving(true)
    setErr(null)
    try {
      const updated = await updateDraft(draft.id, { status: next })
      onChange(updated)
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 1600)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Status update failed')
    } finally {
      setSaving(false)
    }
  }, [draft.id, onChange])

  const doDelete = useCallback(async () => {
    if (!window.confirm('Delete this draft from the database? This cannot be undone.')) return
    setSaving(true)
    setErr(null)
    try {
      await deleteDraft(draft.id)
      onClear()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }, [draft.id, onClear])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            STATUS
          </span>
          <select
            className="fld"
            value={draft.status}
            onChange={e => setStatus(e.target.value as DraftStatus)}
            disabled={saving}
            style={{ fontSize: 11, padding: '2px 6px' }}
            aria-label="Draft status"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {savedTick && (
            <span style={{ fontSize: 10, color: 'var(--joola)' }}>✓ saved</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editing ? (
            <button
              className="btn"
              onClick={() => setEditing(true)}
              style={{ fontSize: 11 }}
              disabled={saving}
            >
              ✎ Edit
            </button>
          ) : (
            <>
              <button
                className="btn"
                onClick={cancel}
                style={{ fontSize: 11 }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-yellow"
                onClick={save}
                style={{ fontSize: 11 }}
                disabled={saving || !dirty}
              >
                {saving ? 'Saving…' : '✓ Save'}
              </button>
            </>
          )}
          <button
            className="btn"
            onClick={doDelete}
            style={{ fontSize: 11, color: '#fca5a5' }}
            disabled={saving}
          >
            🗑
          </button>
        </div>
      </div>

      {err && (
        <div
          role="alert"
          style={{
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.08)',
            color: '#fca5a5',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          {err}
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {draft.content_type === 'blog' && (
            <input
              type="text"
              className="fld"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              placeholder="Title (H1)"
              style={{ fontSize: 13, fontWeight: 600 }}
            />
          )}
          <textarea
            value={bodyDraft}
            onChange={e => setBodyDraft(e.target.value)}
            spellCheck
            style={{
              minHeight: 320,
              maxHeight: 540,
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12.5,
              lineHeight: 1.55,
              background: 'var(--surface-2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              resize: 'vertical',
              width: '100%',
            }}
          />
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textAlign: 'right' }}>
            {bodyDraft.trim().split(/\s+/).filter(Boolean).length} words · {bodyDraft.length} chars
          </div>
        </div>
      ) : (
        <GeneratedDraft
          draft={draft}
          meta={{
            wordCount: typeof draft.metadata?.word_count === 'number' ? draft.metadata.word_count : undefined,
            genMs: typeof draft.metadata?.gen_ms === 'number' ? draft.metadata.gen_ms : undefined,
            brandVoice: draft.metadata?.brand_voice ?? null,
          }}
          onRegenerate={onRegenerate}
          busy={busy}
        />
      )}
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
