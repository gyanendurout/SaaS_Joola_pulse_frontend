import { supabase } from '@/lib/supabase'
import type { Draft } from '@/lib/content/types'
import DraftEditorClient from './DraftEditorClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchDraft(id: string): Promise<Draft | null> {
  const { data, error } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('id', id)
    .limit(1)
  if (error || !data || !data[0]) return null
  const row = data[0] as Record<string, unknown>
  // Hand-roll the cast — Supabase columns are loosely typed at runtime.
  return {
    id:                     String(row.id),
    created_at:             String(row.created_at),
    updated_at:             String(row.updated_at ?? row.created_at),
    created_by:             String(row.created_by ?? ''),
    content_type:           (row.content_type as Draft['content_type']) ?? 'ig_post',
    status:                 (row.status as Draft['status']) ?? 'draft',
    title:                  (row.title as string | null) ?? null,
    body:                   String(row.body ?? ''),
    hashtags:               (row.hashtags as string[] | null) ?? null,
    metadata:               ((row.metadata as Record<string, unknown>) ?? {}) as Draft['metadata'],
    source_article_id:      (row.source_article_id as string | null) ?? null,
    source_signal_snapshot: (row.source_signal_snapshot as Draft['source_signal_snapshot']) ?? null,
    generation_run_id:      (row.generation_run_id as string | null) ?? null,
    parent_draft_id:        (row.parent_draft_id as string | null) ?? null,
    version:                typeof row.version === 'number' ? row.version : 1,
  }
}

export default async function DraftEditorPage({ params }: { params: { id: string } }) {
  const draft = await fetchDraft(params.id)
  if (!draft) {
    return (
      <div className="section">
        <div className="card card-pad-lg">
          <div className="card-head">
            <h3>DRAFT NOT FOUND</h3>
            <span className="meta">id: {params.id}</span>
          </div>
          <div className="empty">
            We couldn’t find a draft with that id. It may have been archived or the URL is wrong.
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/content-generation" className="btn">← Back to Content Studio</a>
          </div>
        </div>
      </div>
    )
  }
  return <DraftEditorClient initialDraft={draft} />
}
