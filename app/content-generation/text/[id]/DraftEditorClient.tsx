'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedDraft } from '@/components/content/GeneratedDraft'
import { deleteDraft, regenerateDraft, updateDraft } from '@/lib/content/api'
import type { Draft, DraftStatus } from '@/lib/content/types'

interface Props {
  initialDraft: Draft
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DEBOUNCE_MS = 2_000

function formatRelative(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default function DraftEditorClient({ initialDraft }: Props) {
  const router = useRouter()

  // --- Editable state -----------------------------------------------------
  const [title, setTitle] = useState(initialDraft.title ?? '')
  const [body, setBody] = useState(initialDraft.body)
  const [hashtags, setHashtags] = useState<string>(
    (initialDraft.hashtags ?? []).join(' '),
  )
  const [status, setStatus] = useState<DraftStatus>(initialDraft.status)

  // --- Autosave plumbing --------------------------------------------------
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    initialDraft.updated_at ? new Date(initialDraft.updated_at).getTime() : null,
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRunRef = useRef(true)

  const flushSave = useCallback(async () => {
    setSaveState('saving')
    try {
      await updateDraft(initialDraft.id, {
        title: title || null,
        body,
        hashtags: hashtags.trim()
          ? hashtags.split(/\s+/).map(h => h.startsWith('#') ? h : `#${h}`)
          : null,
      })
      setSaveState('saved')
      setLastSavedAt(Date.now())
    } catch (e) {
      setSaveState('error')
      // eslint-disable-next-line no-console
      console.error('Autosave failed', e)
    }
  }, [initialDraft.id, title, body, hashtags])

  // Schedule a debounced save when any editable field changes.
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    setSaveState('dirty')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void flushSave() }, AUTOSAVE_DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [title, body, hashtags, flushSave])

  // Tick "Xs ago" indicator once a second while idle.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 5_000)
    return () => clearInterval(t)
  }, [])

  // --- Actions ------------------------------------------------------------

  const handleStatusChange = useCallback(async (next: DraftStatus) => {
    setStatus(next)
    try {
      await updateDraft(initialDraft.id, { status: next })
      setSaveState('saved')
      setLastSavedAt(Date.now())
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Status update failed', e)
      setSaveState('error')
    }
  }, [initialDraft.id])

  const [archiving, setArchiving] = useState(false)
  const handleArchive = useCallback(async () => {
    if (!confirm('Archive this draft?')) return
    setArchiving(true)
    try {
      await deleteDraft(initialDraft.id)
      router.push('/content-generation')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Archive failed', e)
      setArchiving(false)
    }
  }, [initialDraft.id, router])

  const [regenBusy, setRegenBusy] = useState(false)
  const handleRegenerate = useCallback(async () => {
    setRegenBusy(true)
    try {
      const next = await regenerateDraft(initialDraft.id)
      router.push(`/content-generation/text/${next.id}`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Regenerate failed', e)
    } finally {
      setRegenBusy(false)
    }
  }, [initialDraft.id, router])

  // --- Derived ------------------------------------------------------------

  const currentDraft: Draft = useMemo(() => ({
    ...initialDraft,
    title: title || null,
    body,
    hashtags: hashtags.trim()
      ? hashtags.split(/\s+/).map(h => h.startsWith('#') ? h : `#${h}`)
      : null,
    status,
  }), [initialDraft, title, body, hashtags, status])

  const isBlog = initialDraft.content_type === 'blog'

  // --- Render -------------------------------------------------------------

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span className="live-pulse-dot" />
            CONTENT STUDIO · DRAFT EDITOR
          </div>
          <h1>EDIT <em>DRAFT</em></h1>
          <div className="sub mono" style={{ fontSize: 11, marginTop: 4 }}>
            id: {initialDraft.id} · {initialDraft.content_type} · v{initialDraft.version}
          </div>
        </div>
        <div className="head-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
          <select
            className="fld"
            value={status}
            onChange={e => { void handleStatusChange(e.target.value as DraftStatus) }}
            style={{ fontSize: 11 }}
            aria-label="Draft status"
          >
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn" onClick={handleArchive} disabled={archiving} style={{ fontSize: 11 }}>
            🗄 Archive
          </button>
        </div>
      </header>

      {/* Editable fields */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>EDIT</h3>
            <span className="meta">Autosaves every {AUTOSAVE_DEBOUNCE_MS / 1000}s</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}
              >
                Title
              </div>
              <input
                className="fld"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={isBlog ? 'H1 / page title' : '(optional)'}
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            <div>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}
              >
                Body {isBlog ? '(markdown)' : ''}
              </div>
              <textarea
                className="fld"
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: isBlog ? 420 : 220,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  padding: '12px 14px',
                  resize: 'vertical',
                }}
              />
            </div>

            {initialDraft.content_type === 'ig_post' && (
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}
                >
                  Hashtags (space-separated)
                </div>
                <input
                  className="fld"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="#JOOLA #pickleball …"
                  style={{ width: '100%', fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live preview using shared component */}
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>PREVIEW</h3>
            <span className="meta">As the audience will see it</span>
          </div>
          <GeneratedDraft
            draft={currentDraft}
            meta={{
              wordCount: body.trim() ? body.trim().split(/\s+/).length : 0,
              brandVoice: initialDraft.metadata?.brand_voice ?? null,
            }}
            onRegenerate={handleRegenerate}
            busy={regenBusy}
          />
        </div>
      </div>

      {/* Source snapshot — collapsible */}
      <SourceSnapshot draft={initialDraft} />
    </div>
  )
}

// =============================================================================
// SaveIndicator
// =============================================================================

function SaveIndicator({
  state,
  lastSavedAt,
}: {
  state: SaveState
  lastSavedAt: number | null
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000)
    return () => clearInterval(t)
  }, [])

  let label = ''
  let color = 'var(--fg-4)'
  switch (state) {
    case 'idle':
    case 'saved':
      label = lastSavedAt ? `Saved ${formatRelative(now - lastSavedAt)}` : 'Saved'
      color = 'var(--joola)'
      break
    case 'dirty':
      label = 'Unsaved changes…'
      color = 'var(--yellow)'
      break
    case 'saving':
      label = 'Saving…'
      color = 'var(--yellow)'
      break
    case 'error':
      label = 'Save failed'
      color = '#f87171'
      break
  }
  return (
    <span
      className="mono"
      style={{ fontSize: 10.5, color, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          boxShadow: state === 'saved' || state === 'idle' ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
        }}
      />
      {label}
    </span>
  )
}

// =============================================================================
// SourceSnapshot
// =============================================================================

function SourceSnapshot({ draft }: { draft: Draft }) {
  const [open, setOpen] = useState(false)
  const snap = draft.source_signal_snapshot
  const hasAny = snap && (
    snap.seo_keywords.length + snap.top_posts.length + snap.news.length + snap.reddit.length > 0
  )
  if (!hasAny) return null

  return (
    <div className="section">
      <div className="card card-pad-lg">
        <div
          className="card-head"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setOpen(o => !o)}
        >
          <h3>SOURCE SIGNALS{open ? '' : ''}</h3>
          <span className="meta">
            {snap!.seo_keywords.length} SEO · {snap!.top_posts.length} posts · {snap!.news.length} news · {snap!.reddit.length} reddit
            <span style={{ marginLeft: 12, color: 'var(--yellow)' }}>{open ? '▴ Hide' : '▾ Show'}</span>
          </span>
        </div>
        {open && (
          <pre
            style={{
              fontSize: 10.5,
              color: 'var(--fg-3)',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '10px 12px',
              maxHeight: 320,
              overflow: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1.5,
            }}
          >
{JSON.stringify(snap, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
