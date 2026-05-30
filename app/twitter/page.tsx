import { supabase } from '@/lib/supabase'
import TwitterClient from './TwitterClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface XAccount {
  id: string
  brand_id: string
  handle: string
  profile_url: string
  created_at: string
}

export interface XPost {
  id: string
  account_id: string
  brand_id: string
  handle: string | null
  tweet_id: string
  post_url: string
  text: string | null
  like_count: number | string | null
  retweet_count: number | string | null
  reply_count: number | string | null
  view_count: number | string | null
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

export interface XReply {
  id: string
  tweet_reply_id: string
  post_id: string
  brand_id: string
  replier_username: string | null
  reply_text: string | null
  reply_likes: number | null
  retweet_count: number | null
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

export default async function TwitterPage() {
  const [accountRes, postsRes, repliesRes] = await Promise.all([
    supabase.from('x_accounts').select('*').eq('brand_id', JOOLA).maybeSingle(),
    supabase
      .from('x_posts')
      .select('*')
      .eq('brand_id', JOOLA)
      .order('view_count', { ascending: false }),
    supabase
      .from('x_replies')
      .select('id,tweet_reply_id,post_id,brand_id,replier_username,reply_text,reply_likes,retweet_count,is_brand_reply,posted_at,scraped_at,sentiment_label,sentiment_score,topics,is_crisis,is_opportunity')
      .eq('brand_id', JOOLA)
      .order('reply_likes', { ascending: false }),
  ])

  const account = (accountRes.data ?? null) as XAccount | null
  const posts = (postsRes.data ?? []) as XPost[]
  const replies = (repliesRes.data ?? []) as XReply[]

  const totalLikes = posts.reduce((s, p) => s + num(p.like_count), 0)
  const totalRT = posts.reduce((s, p) => s + num(p.retweet_count), 0)
  const totalReplies = posts.reduce((s, p) => s + num(p.reply_count), 0)
  const totalImpressions = posts.reduce((s, p) => s + num(p.view_count), 0)
  const enrichedCount = posts.filter(p => p.enriched_at).length
  const crisisCount = posts.filter(p => p.is_crisis).length
  const opportunityCount = posts.filter(p => p.is_opportunity).length

  return (
    <TwitterClient
      account={account}
      posts={posts}
      replies={replies}
      totalLikes={totalLikes}
      totalRT={totalRT}
      totalReplies={totalReplies}
      totalImpressions={totalImpressions}
      enrichedCount={enrichedCount}
      crisisCount={crisisCount}
      opportunityCount={opportunityCount}
    />
  )
}
