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

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export default async function TikTokPage() {
  const [accountRes, videosRes] = await Promise.all([
    supabase.from('tiktok_accounts').select('*').eq('brand_id', JOOLA).maybeSingle(),
    supabase
      .from('tiktok_videos')
      .select('*')
      .eq('brand_id', JOOLA)
      .order('view_count', { ascending: false }),
  ])

  const account = (accountRes.data ?? null) as TikTokAccount | null
  const videos = (videosRes.data ?? []) as TikTokVideo[]

  const totalViews = videos.reduce((s, v) => s + num(v.view_count), 0)
  const totalLikes = videos.reduce((s, v) => s + num(v.like_count), 0)
  const totalComments = videos.reduce((s, v) => s + num(v.comment_count), 0)
  const totalShares = videos.reduce((s, v) => s + num(v.share_count), 0)
  const topViews = videos.length ? num(videos[0].view_count) : 0

  const enrichedCount = videos.filter(v => v.enriched_at).length
  const crisisCount = videos.filter(v => v.is_crisis).length
  const opportunityCount = videos.filter(v => v.is_opportunity).length

  return (
    <TikTokClient
      account={account}
      videos={videos}
      totalViews={totalViews}
      totalLikes={totalLikes}
      totalComments={totalComments}
      totalShares={totalShares}
      topViews={topViews}
      enrichedCount={enrichedCount}
      crisisCount={crisisCount}
      opportunityCount={opportunityCount}
    />
  )
}
