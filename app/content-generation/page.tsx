import { supabase } from '@/lib/supabase'
import ContentHubClient from './ContentHubClient'
import type { ContentDraft } from '@/components/content/DraftCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ContentGenerationHubPage() {
  let drafts: ContentDraft[] = []

  // Track A owns the migration (007_content_generation.sql). Until that's applied
  // the table won't exist — swallow the error and pass empty list.
  try {
    const { data, error } = await supabase
      .from('content_drafts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (!error && Array.isArray(data)) {
      drafts = data as unknown as ContentDraft[]
    }
  } catch {
    drafts = []
  }

  return <ContentHubClient drafts={drafts} />
}
