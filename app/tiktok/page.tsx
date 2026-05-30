import { supabase } from '@/lib/supabase'
import TikTokClient from './TikTokClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface TikTokAccount {
  id: string
  brand_id: string
  handle: string
  profile_url: string
  created_at: string
}

export interface TikTokVideo {
  id: string
  account_id: string
  brand_id: string
  handle: string | null
  tiktok_video_id: string
  video_url: string
  text: string | null
  view_count: number | string | null
  like_count: number | string | null
  comment_count: number | string | null
  share_count: number | string | null
  duration_seconds: number | string | null
  thumbnail_url: string | null
  posted_at: string | null
  created_at: string
  sentiment_score: number | null
  sentiment_label: string | null
  topics: string[] | null
  brands_mentioned: string[] | null
  players_mentioned: string[] | null
  products_mentioned: string[] | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
  purchase_intent_score: number | null
  crisis_keywords: string[] | null
  enriched_at: string | null
}

export interface PaddleBuzz {
  name: string
  mentions: number
  views: number
  positive: number
  opportunity: number
}

export interface TikTokComment {
  id: string
  tiktok_comment_id: string
  video_id: string
  brand_id: string
  commenter_username: string | null
  comment_text: string | null
  comment_likes: number | null
  is_brand_reply: boolean
  posted_at: string | null
  scraped_at: string
  sentiment_label: string | null
  sentiment_score: number | null
  topics: string[] | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
}

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export default async function TikTokPage() {
  const [accountRes, videosRes, commentsRes] = await Promise.all([
    supabase.from('tiktok_accounts').select('*').eq('brand_id', JOOLA).maybeSingle(),
    supabase
      .from('tiktok_videos')
      .select('*')
      .eq('brand_id', JOOLA)
      .order('view_count', { ascending: false }),
    supabase
      .from('tiktok_comments')
      .select('id,tiktok_comment_id,video_id,brand_id,commenter_username,comment_text,comment_likes,is_brand_reply,posted_at,scraped_at,sentiment_label,sentiment_score,topics,is_crisis,is_opportunity')
      .eq('brand_id', JOOLA)
      .order('comment_likes', { ascending: false }),
  ])

  const account = (accountRes.data ?? null) as TikTokAccount | null
  const videos = (videosRes.data ?? []) as TikTokVideo[]
  const comments = (commentsRes.data ?? []) as TikTokComment[]

  const totalViews = videos.reduce((s, v) => s + num(v.view_count), 0)
  const totalLikes = videos.reduce((s, v) => s + num(v.like_count), 0)
  const totalComments = videos.reduce((s, v) => s + num(v.comment_count), 0)
  const totalShares = videos.reduce((s, v) => s + num(v.share_count), 0)
  const topViews = videos.length ? num(videos[0].view_count) : 0

  const enrichedCount = videos.filter(v => v.enriched_at).length
  const crisisCount = videos.filter(v => v.is_crisis).length
  const opportunityCount = videos.filter(v => v.is_opportunity).length

  const paddleMap = new Map<string, { mentions: number; views: number; positive: number; opportunity: number }>()
  for (const v of videos) {
    const vv = num(v.view_count)
    for (const p of v.products_mentioned ?? []) {
      if (!p?.trim()) continue
      const entry = paddleMap.get(p) ?? { mentions: 0, views: 0, positive: 0, opportunity: 0 }
      entry.mentions++
      entry.views += vv
      if ((v.sentiment_label ?? '').toLowerCase().includes('positive')) entry.positive++
      if (v.is_opportunity) entry.opportunity++
      paddleMap.set(p, entry)
    }
  }
  const paddleStats: PaddleBuzz[] = Array.from(paddleMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.mentions - a.mentions)

  return (
    <TikTokClient
      account={account}
      videos={videos}
      comments={comments}
      totalViews={totalViews}
      totalLikes={totalLikes}
      totalComments={totalComments}
      totalShares={totalShares}
      topViews={topViews}
      enrichedCount={enrichedCount}
      crisisCount={crisisCount}
      opportunityCount={opportunityCount}
      paddleStats={paddleStats}
    />
  )
}
