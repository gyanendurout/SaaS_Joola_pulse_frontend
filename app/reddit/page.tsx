import { supabase } from '@/lib/supabase'
import RedditClient from './RedditClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface RedditMention {
  id: string
  brand_id: string
  reddit_post_id: string
  subreddit: string
  country_code: string | null
  post_title: string
  post_url: string | null
  content_type: string | null
  content_text: string | null
  author: string | null
  upvotes: number | null
  posted_at: string | null
  sentiment: string | null
  competitor_switch: boolean | null
  switch_direction: string | null
  scraped_at: string
  topics: string[] | null
  brands_mentioned: string[] | null
  players_mentioned: string[] | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
}

export default async function RedditPage() {
  const { data } = await supabase
    .from('reddit_mentions')
    .select('*')
    .eq('brand_id', JOOLA)
    .order('upvotes', { ascending: false })

  const mentions = (data ?? []) as RedditMention[]

  const totalUpvotes = mentions.reduce((s, m) => s + (m.upvotes ?? 0), 0)
  const crisisCount = mentions.filter(m => m.is_crisis).length
  const oppCount = mentions.filter(m => m.is_opportunity).length
  const switchCount = mentions.filter(m => m.competitor_switch).length

  const subCounts: Record<string, number> = {}
  for (const m of mentions) {
    const s = m.subreddit || 'unknown'
    subCounts[s] = (subCounts[s] ?? 0) + 1
  }
  const subredditBreakdown = Object.entries(subCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  return (
    <RedditClient
      mentions={mentions}
      totalUpvotes={totalUpvotes}
      crisisCount={crisisCount}
      oppCount={oppCount}
      switchCount={switchCount}
      subredditBreakdown={subredditBreakdown}
    />
  )
}
