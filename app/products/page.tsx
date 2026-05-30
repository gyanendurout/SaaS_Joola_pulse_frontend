import { supabase } from '@/lib/supabase'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

// ISSUE 8 fix: normalize common name variants and casing to avoid duplicate rows.
// Multiple variant keys can map to the same canonical name to merge them.
const CANONICAL_NAMES: Record<string, string> = {
  'agassi':               'Agassi Pro',
  'agassi pro':           'Agassi Pro',
  'boomstik':             'BoomStik',
  'boomstick':            'BoomStik',
  'boomstik asia':        'BoomStik Asia',
  'boomstick asia':       'BoomStik Asia',
  'boomstik us':          'BoomStik US',
  'boomstick us':         'BoomStik US',
  'boomstik jack sock':   'BoomStik (Jack Sock)',
  'gen 3 pan':            'Gen 3 Pan',
  'gen3 pan':             'Gen 3 Pan',
  'gen3pan':              'Gen 3 Pan',
  'perseus':              'Perseus',
  'scorpeus':             'Scorpeus',
  'hyperion':             'Hyperion',
  'kosmos':               'Kosmos',
  'kosmos pro v':         'Kosmos Pro V',
  'kosmos prov':          'Kosmos Pro V',
}

function canonicalize(raw: string): string {
  const key = raw.toLowerCase().trim()
  return CANONICAL_NAMES[key] ?? raw.trim()
}

export interface PaddleStat {
  name: string
  totalMentions: number
  tiktokMentions: number
  redditMentions: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  crisisCount: number
  opportunityCount: number
  avgPurchaseIntent: number
  totalViews: number
  totalUpvotes: number
}

type TikTokRow = {
  products_mentioned: string[]
  sentiment_label: string | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
  purchase_intent_score: number | null
  view_count: number | string | null
}

type RedditRow = {
  products_mentioned: string[]
  sentiment: string | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
  upvotes: number | null
}

type Acc = {
  name: string
  totalMentions: number
  tiktokMentions: number
  redditMentions: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  crisisCount: number
  opportunityCount: number
  sumPI: number
  totalViews: number
  totalUpvotes: number
}

export default async function ProductsPage() {
  const [tiktokRes, redditRes] = await Promise.all([
    supabase
      .from('tiktok_videos')
      .select('products_mentioned,sentiment_label,is_crisis,is_opportunity,purchase_intent_score,view_count')
      .eq('brand_id', JOOLA)
      .not('products_mentioned', 'is', null),
    supabase
      .from('reddit_mentions')
      .select('products_mentioned,sentiment,is_crisis,is_opportunity,upvotes')
      .eq('brand_id', JOOLA)
      .not('products_mentioned', 'is', null),
  ])

  const tiktokVideos = (tiktokRes.data ?? []) as TikTokRow[]
  const redditMentions = (redditRes.data ?? []) as RedditRow[]

  const map = new Map<string, Acc>()

  const getOrCreate = (raw: string): Acc => {
    const canonical = canonicalize(raw)
    const key = canonical.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        name: canonical,
        totalMentions: 0, tiktokMentions: 0, redditMentions: 0,
        positiveCount: 0, negativeCount: 0, neutralCount: 0,
        crisisCount: 0, opportunityCount: 0,
        sumPI: 0, totalViews: 0, totalUpvotes: 0,
      })
    }
    return map.get(key)!
  }

  for (const v of tiktokVideos) {
    const views = typeof v.view_count === 'number'
      ? v.view_count
      : parseFloat(String(v.view_count ?? '0')) || 0
    for (const p of v.products_mentioned ?? []) {
      if (!p?.trim()) continue
      const s = getOrCreate(p)
      s.totalMentions++
      s.tiktokMentions++
      const sl = (v.sentiment_label ?? '').toLowerCase()
      if (sl.includes('positive')) s.positiveCount++
      else if (sl.includes('negative')) s.negativeCount++
      else s.neutralCount++
      if (v.is_crisis) s.crisisCount++
      if (v.is_opportunity) s.opportunityCount++
      s.sumPI += v.purchase_intent_score ?? 0
      s.totalViews += views
    }
  }

  for (const m of redditMentions) {
    for (const p of m.products_mentioned ?? []) {
      if (!p?.trim()) continue
      const s = getOrCreate(p)
      s.totalMentions++
      s.redditMentions++
      const sl = (m.sentiment ?? '').toLowerCase()
      if (sl.includes('positive')) s.positiveCount++
      else if (sl.includes('negative')) s.negativeCount++
      else s.neutralCount++
      if (m.is_crisis) s.crisisCount++
      if (m.is_opportunity) s.opportunityCount++
      s.totalUpvotes += m.upvotes ?? 0
    }
  }

  const paddles: PaddleStat[] = Array.from(map.values())
    .map(({ sumPI, ...rest }) => ({
      ...rest,
      avgPurchaseIntent: rest.totalMentions > 0 ? sumPI / rest.totalMentions : 0,
    }))
    .sort((a, b) => b.totalMentions - a.totalMentions)

  return (
    <ProductsClient
      paddles={paddles}
      tiktokSourceCount={tiktokVideos.length}
      redditSourceCount={redditMentions.length}
    />
  )
}
