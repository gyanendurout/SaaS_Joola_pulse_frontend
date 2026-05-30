import { supabase } from '@/lib/supabase'
import InfluencersClient from './InfluencersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface Influencer {
  id: string
  brand_id: string
  name: string
  type: string | null
  instagram_handle: string | null
  youtube_channel_url: string | null
  tiktok_handle: string | null
  follower_count_ig: number | null
  follower_count_yt: number | null
  country_code: string | null
  contract_type: string | null
  is_active: boolean
}

export interface InfluencerPost {
  id: string
  influencer_id: string
  brand_id: string
  platform: string
  post_url: string | null
  posted_at: string | null
  like_count: number | null
  comment_count: number | null
  view_count: number | null
  caption: string | null
  hashtags: string[] | null
  is_sponsored: boolean | null
  sentiment: string | null
  scraped_at: string
}

export default async function InfluencersPage() {
  const [infRes, postsRes] = await Promise.all([
    supabase.from('influencers').select('*').eq('brand_id', JOOLA).order('follower_count_ig', { ascending: false }),
    supabase
      .from('influencer_posts')
      .select('id,influencer_id,brand_id,platform,post_url,posted_at,like_count,comment_count,view_count,caption,is_sponsored,sentiment,scraped_at')
      .eq('brand_id', JOOLA)
      .order('like_count', { ascending: false }),
  ])

  const influencers = (infRes.data ?? []) as Influencer[]
  const posts = (postsRes.data ?? []) as InfluencerPost[]

  const totalReach = influencers.reduce((s, i) => s + (i.follower_count_ig ?? 0), 0)
  const totalLikes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0)
  const totalViews = posts.reduce((s, p) => s + (p.view_count ?? 0), 0)

  return (
    <InfluencersClient
      influencers={influencers}
      posts={posts}
      totalReach={totalReach}
      totalLikes={totalLikes}
      totalViews={totalViews}
    />
  )
}
