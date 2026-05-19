'use client'

import { useState } from 'react'
import { Tip } from '@/components/ui/Tip'
import { BrandVoiceScore } from './BrandVoiceScore'
import type {
  BrandVoiceMeta,
  ContentType,
  Draft,
} from '@/lib/content/types'

interface Props {
  draft: Draft
  /** Optional override; falls back to `draft.content_type`. */
  format?: ContentType
  meta?: {
    wordCount?: number
    genMs?: number
    brandVoice?: BrandVoiceMeta | null
  }
  onCopy?: (text: string, label: string) => void
  onRegenerate?: () => void
  /** Opens the long-form editor at `/content-generation/text/[id]` (Blog). */
  onOpenEditor?: () => void
  /** Inline body edits — used for IG/Tweet quick edits. */
  onInlineEdit?: (newBody: string) => void
  busy?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function mdToHtml(md: string): string {
  // Very small markdown subset — headers, bold, italics, links, paragraphs.
  // We deliberately avoid pulling a parser dep; the dedicated editor route
  // is the source of truth for full markdown preview.
  let html = escapeHtml(md)
  // headers
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')
  // bold + italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  // paragraphs — preserve blank-line splits
  html = html
    .split(/\n{2,}/)
    .map(block => /^<(h\d|ul|ol|li|p|pre|blockquote)/.test(block.trim()) ? block : `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
  return html
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function downloadMarkdown(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

// =============================================================================
// Action bar
// =============================================================================

function ActionBar({
  onCopy,
  onRegenerate,
  onOpenEditor,
  sendItems,
  busy,
}: {
  onCopy: () => void
  onRegenerate?: () => void
  onOpenEditor?: () => void
  sendItems: { label: string; action: () => void; soon?: boolean }[]
  busy?: boolean
}) {
  const [sendOpen, setSendOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, position: 'relative' }}>
      {onOpenEditor && (
        <button className="btn" onClick={onOpenEditor} style={{ fontSize: 11 }}>
          ✎ Open in editor
        </button>
      )}
      <button className="btn" onClick={onCopy} style={{ fontSize: 11 }}>
        ⎘ Copy
      </button>
      <div style={{ position: 'relative' }}>
        <button className="btn" onClick={() => setSendOpen(o => !o)} style={{ fontSize: 11 }}>
          ↗ Send to…
        </button>
        {sendOpen && (
          <div
            onMouseLeave={() => setSendOpen(false)}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              background: '#0e0e10',
              border: '1px solid var(--bg-3)',
              borderRadius: 6,
              minWidth: 180,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {sendItems.map((it, i) => (
              <button
                key={i}
                onClick={() => { setSendOpen(false); it.action() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: it.soon ? 'var(--fg-4)' : 'var(--fg-2)',
                  cursor: 'pointer',
                }}
              >
                {it.label}
                {it.soon && (
                  <span style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>SOON</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {onRegenerate && (
        <button className="btn btn-yellow" onClick={onRegenerate} disabled={busy} style={{ fontSize: 11 }}>
          ⟳ Regenerate
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Per-format renderers
// =============================================================================

function CopyBlock({
  title,
  text,
  hint,
  onCopy,
}: {
  title: string
  text: string
  hint?: string
  onCopy: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid var(--line)' }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}{hint && <span style={{ marginLeft: 8, color: 'var(--fg-4)' }}>{hint}</span>}
        </span>
        <button className="btn" onClick={onCopy} style={{ fontSize: 10, padding: '2px 8px' }}>
          ⎘ Copy
        </button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '10px 12px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.55, color: 'var(--fg)' }}>
        {text}
      </pre>
    </div>
  )
}

function IgDraft({
  draft,
  onCopy,
}: {
  draft: Draft
  onCopy: (text: string, label: string) => void
}) {
  const hashtags = (draft.hashtags ?? []).filter(Boolean)
  const hashtagBlock = hashtags.length ? hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <CopyBlock
        title="Caption"
        text={draft.body}
        hint="put this in the post body"
        onCopy={() => { void copyToClipboard(draft.body).then(ok => onCopy(draft.body, ok ? 'Caption copied' : 'Copy failed')) }}
      />
      {hashtagBlock && (
        <CopyBlock
          title="Hashtags"
          text={hashtagBlock}
          hint={`${hashtags.length} tags · drop into first comment`}
          onCopy={() => { void copyToClipboard(hashtagBlock).then(ok => onCopy(hashtagBlock, ok ? 'Hashtags copied' : 'Copy failed')) }}
        />
      )}
    </div>
  )
}

function TweetDraft({
  draft,
  onCopy,
}: {
  draft: Draft
  onCopy: (text: string, label: string) => void
}) {
  const body = draft.body
  const alt = (draft.metadata?.alternate as string | undefined) ?? null
  const TWEET_LIMIT = 280
  const SOFT_LIMIT = 270
  const len = body.length
  const charColor =
    len > TWEET_LIMIT ? '#f87171' :
    len > SOFT_LIMIT ? '#fbbf24' :
    'var(--fg-3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid var(--line)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reply</span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: charColor }}>
            {len}/{TWEET_LIMIT}
          </span>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '10px 12px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, lineHeight: 1.55 }}>
          {body}
        </pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', borderTop: '1px solid var(--line)' }}>
          <button className="btn" onClick={() => { void copyToClipboard(body).then(ok => onCopy(body, ok ? 'Reply copied' : 'Copy failed')) }} style={{ fontSize: 10, padding: '2px 8px' }}>
            ⎘ Copy
          </button>
        </div>
      </div>

      {alt && (
        <CopyBlock
          title="Alternate (conservative)"
          text={alt}
          hint={`${alt.length}/${TWEET_LIMIT}`}
          onCopy={() => { void copyToClipboard(alt).then(ok => onCopy(alt, ok ? 'Alternate copied' : 'Copy failed')) }}
        />
      )}
    </div>
  )
}

function BlogDraft({
  draft,
  onCopy,
}: {
  draft: Draft
  onCopy: (text: string, label: string) => void
}) {
  const [mode, setMode] = useState<'preview' | 'raw'>('preview')
  const html = mdToHtml(draft.body)
  const meta = draft.metadata?.meta_description as string | undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tabs" style={{ gap: 4 }}>
          <button
            className={'tab' + (mode === 'preview' ? ' on' : '')}
            onClick={() => setMode('preview')}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Preview
          </button>
          <button
            className={'tab' + (mode === 'raw' ? ' on' : '')}
            onClick={() => setMode('raw')}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Markdown
          </button>
        </div>
        <button
          className="btn"
          onClick={() => downloadMarkdown(`${(draft.title || 'draft').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.md`, draft.body)}
          style={{ fontSize: 10, padding: '2px 8px' }}
        >
          ↓ Download .md
        </button>
      </div>

      {draft.title && (
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.3 }}>{draft.title}</div>
      )}
      {meta && (
        <div style={{ fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>{meta}</div>
      )}

      {mode === 'preview' ? (
        <div
          // Markdown rendered via small in-house helper; outputs constrained tag set.
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 6,
            background: 'var(--surface-2)',
            padding: '14px 16px',
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--fg-2)',
            maxHeight: 360,
            overflowY: 'auto',
          }}
        />
      ) : (
        <CopyBlock
          title="Markdown"
          text={draft.body}
          onCopy={() => { void copyToClipboard(draft.body).then(ok => onCopy(draft.body, ok ? 'Markdown copied' : 'Copy failed')) }}
        />
      )}
    </div>
  )
}

// =============================================================================
// Top-level component
// =============================================================================

export function GeneratedDraft({
  draft,
  format,
  meta,
  onCopy,
  onRegenerate,
  onOpenEditor,
  busy,
}: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const ct = format ?? draft.content_type

  const fireCopy = (text: string, label: string) => {
    setToast(label)
    setTimeout(() => setToast(null), 1800)
    onCopy?.(text, label)
  }

  const sendItems = [
    {
      label: 'Clipboard',
      action: () => { void copyToClipboard(draft.body).then(ok => fireCopy(draft.body, ok ? 'Copied' : 'Copy failed')) },
    },
    {
      label: 'Markdown (.md)',
      action: () => downloadMarkdown(`${(draft.title || 'draft').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.md`, draft.body),
    },
    {
      label: 'Notion',
      action: () => {
        // eslint-disable-next-line no-console
        console.warn('Notion send not wired')
        fireCopy('', 'Notion send not yet wired')
      },
      soon: true,
    },
  ]

  const headerMeta = (
    <div className="mono" style={{ display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--fg-4)' }}>
      {meta?.wordCount != null && <span>{meta.wordCount} words</span>}
      {meta?.genMs != null && <span>{(meta.genMs / 1000).toFixed(1)}s gen</span>}
      <span>{ct === 'ig_post' ? 'Instagram' : ct === 'blog' ? 'Blog' : 'Tweet'}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {headerMeta}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--fg-4)' }}>
          <Tip text="Output is AI-generated. Always review before publishing." size={11} />
        </span>
      </div>

      {ct === 'ig_post'          && <IgDraft draft={draft} onCopy={fireCopy} />}
      {ct === 'twitter_response' && <TweetDraft draft={draft} onCopy={fireCopy} />}
      {ct === 'blog'             && <BlogDraft draft={draft} onCopy={fireCopy} />}

      <BrandVoiceScore meta={meta?.brandVoice ?? draft.metadata?.brand_voice ?? null} />

      <ActionBar
        onCopy={() => { void copyToClipboard(draft.body).then(ok => fireCopy(draft.body, ok ? 'Copied' : 'Copy failed')) }}
        onRegenerate={onRegenerate}
        onOpenEditor={ct === 'blog' ? onOpenEditor : undefined}
        sendItems={sendItems}
        busy={busy}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0e0e10',
            border: '1px solid var(--yellow)',
            color: 'var(--yellow)',
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
