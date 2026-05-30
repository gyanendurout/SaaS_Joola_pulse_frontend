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
  products_mentioned: string[] | null
}

export interface PaddleRedditStat {
  name: string
  mentions: number
  upvotes: number
  positive: number
  opportunity: number
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

  const paddleMap = new Map<string, { mentions: number; upvotes: number; positive: number; opportunity: number }>()
  for (const m of mentions) {
    for (const p of m.products_mentioned ?? []) {
      if (!p?.trim()) continue
      const entry = paddleMap.get(p) ?? { mentions: 0, upvotes: 0, positive: 0, opportunity: 0 }
      entry.mentions++
      entry.upvotes += m.upvotes ?? 0
      if ((m.sentiment ?? '').toLowerCase().includes('positive')) entry.positive++
      if (m.is_opportunity) entry.opportunity++
      paddleMap.set(p, entry)
    }
  }
  const paddleStats: PaddleRedditStat[] = Array.from(paddleMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.mentions - a.mentions)

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
      paddleStats={paddleStats}
    />
  )
}
