/**
 * Frontend wrapper around the `/api/content/*` FastAPI endpoints.
 *
 * Path strategy:
 *   Backend routes live at `${SEO_API_URL}/api/content/*`. The existing
 *   `next.config.mjs` rewrite already maps `/seo-api/:path*` →
 *   `${SEO_API_URL}/api/:path*`. So a frontend `GET /seo-api/content/drafts`
 *   round-trips to the backend `GET /api/content/drafts`. No new rewrite
 *   needed — the existing one covers all sub-paths.
 *
 * SSE strategy:
 *   `EventSource` is GET-only and cannot send a JSON body. The backend's
 *   `POST /generate/stream` consumes a JSON request body and returns
 *   `text/event-stream`. We therefore use `fetch()` + a manual reader on
 *   `ReadableStream<Uint8Array>` to parse SSE frames. The frame format is
 *   the standard `event: <name>\ndata: <json>\n\n`.
 */

import type {
  Draft,
  DraftListResponse,
  DraftUpdate,
  GenerateRequest,
  SignalsPreview,
  SseDoneEvent,
  SseErrorEvent,
  SseMetaEvent,
  SseTokenEvent,
  Template,
  ContentType,
  DraftStatus,
} from './types'

const BASE = '/seo-api/content'

// =============================================================================
// Small helpers
// =============================================================================

async function jfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = typeof j === 'object' && j && 'detail' in j ? String((j as { detail: unknown }).detail) : ''
    } catch {
      try { detail = await res.text() } catch { /* ignore */ }
    }
    const err: Error & { status?: number; detail?: string } = new Error(
      `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`,
    )
    err.status = res.status
    err.detail = detail
    throw err
  }
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

type QsValue = string | number | boolean | null | undefined

function qs(params: { [k: string]: QsValue }) {
  const out = new URLSearchParams()
  for (const k of Object.keys(params)) {
    const v = params[k]
    if (v === null || v === undefined || v === '') continue
    out.append(k, String(v))
  }
  const s = out.toString()
  return s ? `?${s}` : ''
}

// =============================================================================
// Signals preview
// =============================================================================

export async function fetchSignalsPreview(
  content_type: ContentType,
  source_article_id?: string,
): Promise<SignalsPreview> {
  return jfetch<SignalsPreview>(
    '/signals/preview' + qs({ content_type, source_article_id }),
  )
}

// =============================================================================
// Drafts CRUD
// =============================================================================

export interface ListDraftsFilters {
  content_type?: ContentType
  status?: DraftStatus
  limit?: number
  offset?: number
}

export async function listDrafts(filters: ListDraftsFilters = {}): Promise<DraftListResponse> {
  const params: { [k: string]: QsValue } = {
    content_type: filters.content_type,
    status: filters.status,
    limit: filters.limit,
    offset: filters.offset,
  }
  return jfetch<DraftListResponse>('/drafts' + qs(params))
}

export async function getDraft(id: string): Promise<Draft> {
  return jfetch<Draft>(`/drafts/${encodeURIComponent(id)}`)
}

export async function updateDraft(id: string, patch: DraftUpdate): Promise<Draft> {
  return jfetch<Draft>(`/drafts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function regenerateDraft(id: string, instructions?: string): Promise<Draft> {
  return jfetch<Draft>(`/drafts/${encodeURIComponent(id)}/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ instructions: instructions ?? null }),
  })
}

export async function deleteDraft(id: string): Promise<void> {
  return jfetch<void>(`/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// =============================================================================
// Templates
// =============================================================================

export async function listTemplates(content_type?: ContentType): Promise<Template[]> {
  return jfetch<Template[]>('/templates' + qs({ content_type }))
}

// =============================================================================
// Streaming generate
// =============================================================================

export interface StreamHandlers {
  onMeta?: (e: SseMetaEvent) => void
  onToken?: (e: SseTokenEvent) => void
  onDone?: (e: SseDoneEvent) => void
  onError?: (e: SseErrorEvent) => void
  signal?: AbortSignal
}

/**
 * One-shot SSE POST. Returns when the backend closes the stream (after `done`
 * or `error`). Caller may pass an `AbortSignal` via `handlers.signal` to cancel.
 */
export async function generateStream(
  request: GenerateRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`${BASE}/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal: handlers.signal,
  })

  if (!res.ok || !res.body) {
    let detail = ''
    try { detail = await res.text() } catch { /* ignore */ }
    handlers.onError?.({
      type: 'error',
      message: `Stream start failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`,
      code: res.status === 429 ? 'rate_limited' : res.status === 402 ? 'cap_exceeded' : 'http_error',
    })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by a blank line. Process complete frames only.
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        dispatchFrame(rawFrame, handlers)
      }
    }
    // Flush any trailing frame (some servers don't send a final blank line).
    const tail = buffer.trim()
    if (tail) dispatchFrame(tail, handlers)
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return
    handlers.onError?.({
      type: 'error',
      message: e instanceof Error ? e.message : 'Stream read failed',
      code: 'read_error',
    })
  }
}

function dispatchFrame(frame: string, handlers: StreamHandlers): void {
  // Parse SSE frame lines. Supported keys: `event:`, `data:`, `id:`. We
  // tolerate missing `event:` (defaults to "message") and accept JSON in
  // either `data:` payload format used by FastAPI's `EventSourceResponse`
  // or `sse-starlette` (one or many data lines).
  let eventName = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) eventName = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return
  const dataStr = dataLines.join('\n')

  let payload: unknown
  try { payload = JSON.parse(dataStr) } catch {
    // Plain text token frame
    if (eventName === 'token' || eventName === 'message') {
      handlers.onToken?.({ type: 'token', text: dataStr })
    }
    return
  }

  const obj = (payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : {}
  const typeFromBody = typeof obj.type === 'string' ? obj.type : null
  const effective = typeFromBody ?? (eventName !== 'message' ? eventName : null)

  switch (effective) {
    case 'meta':
      handlers.onMeta?.({ type: 'meta', ...(obj as Omit<SseMetaEvent, 'type'>) })
      break
    case 'token':
      handlers.onToken?.({ type: 'token', ...(obj as Omit<SseTokenEvent, 'type'>) })
      break
    case 'done':
      handlers.onDone?.({ type: 'done', ...(obj as Omit<SseDoneEvent, 'type'>) })
      break
    case 'error':
      handlers.onError?.({ type: 'error', ...(obj as Omit<SseErrorEvent, 'type'>) })
      break
    default:
      // Unknown frame — ignore silently.
      break
  }
}

// =============================================================================
// Non-streaming generate (fallback / tests)
// =============================================================================

export async function generate(request: GenerateRequest): Promise<{
  draft_id: string
  body: string
  title?: string | null
  hashtags?: string[] | null
  run_id: string
  cost_usd: number
}> {
  return jfetch('/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
