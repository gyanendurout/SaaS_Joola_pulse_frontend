import { supabase } from '@/lib/supabase'
import ComplaintsClient from './ComplaintsClient'
import type { IgComplaintLog, IgWishlistItem, IgLoyalUser } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isoWeekStart(d: Date): string {
  const dt = new Date(d)
  const day = (dt.getUTCDay() + 6) % 7 // Mon=0
  dt.setUTCDate(dt.getUTCDate() - day)
  return dt.toISOString().slice(0, 10)
}

export default async function ComplaintsPage() {
  const [{ data: complaints }, { data: wishlist }, { data: posts }, { data: repeatUsers }] = await Promise.all([
    supabase
      .from('joola_ig_complaint_log')
      .select('*')
      .order('complained_at', { ascending: false })
      .returns<IgComplaintLog[]>(),
    supabase
      .from('joola_ig_wishlist_items')
      .select('*')
      .order('requested_at', { ascending: false })
      .returns<IgWishlistItem[]>(),
    supabase
      .from('joola_ig_posts')
      .select('post_id, post_url')
      .returns<{ post_id: string; post_url: string }[]>(),
    supabase
      .from('joola_ig_loyal_users')
      .select('username, complaint_count, dominant_topic, ambassador_score, loyalty_tier, last_seen_at, avg_sentiment_score')
      .gte('complaint_count', 2)
      .order('complaint_count', { ascending: false })
      .limit(40)
      .returns<Pick<IgLoyalUser, 'username' | 'complaint_count' | 'dominant_topic' | 'ambassador_score' | 'loyalty_tier' | 'last_seen_at' | 'avg_sentiment_score'>[]>(),
  ])

  const postUrlMap = new Map((posts ?? []).map((p) => [p.post_id, p.post_url]))

  const allComplaints = (complaints ?? []).map((c) => ({
    ...c,
    post_url: postUrlMap.get(c.post_id) ?? undefined,
  }))
  const allWishlist = (wishlist ?? []).map((w) => ({
    ...w,
    post_url: postUrlMap.get(w.post_id) ?? undefined,
  }))

  // Category counts
  const categoryCounts: Record<string, number> = {}
  for (const c of allComplaints) {
    if (c.complaint_category) {
      categoryCounts[c.complaint_category] = (categoryCounts[c.complaint_category] || 0) + 1
    }
  }
  const categoryData = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))
  const categories = Object.keys(categoryCounts).sort()

  // Severity counts
  const sevCounts: Record<string, number> = { high: 0, medium: 0, low: 0 }
  for (const c of allComplaints) {
    const s = (c.severity || 'low').toLowerCase()
    sevCounts[s] = (sevCounts[s] || 0) + 1
  }
  const severityData = [
    { name: 'high', count: sevCounts.high ?? 0 },
    { name: 'medium', count: sevCounts.medium ?? 0 },
    { name: 'low', count: sevCounts.low ?? 0 },
  ]

  // Category × week trend (last 8 consecutive weeks, stacked by top categories)
  // We generate all 8 week-starts from today so weeks with 0 complaints still
  // appear as zero-height bars — without this, sparse weeks get skipped and the
  // chart timeline becomes discontinuous (e.g. Feb 9 → May 11 looks like 8 bars
  // but actually spans 13 weeks).
  const topCats = categoryData.slice(0, 4).map((c) => c.name)
  const weekAgg: Record<string, Record<string, number>> = {}
  for (const c of allComplaints) {
    if (!c.complained_at) continue
    const ws = isoWeekStart(new Date(c.complained_at))
    if (!weekAgg[ws]) weekAgg[ws] = {}
    const cat = c.complaint_category || 'other'
    weekAgg[ws][cat] = (weekAgg[ws][cat] || 0) + 1
  }
  const MS_PER_WEEK = 7 * 24 * 3600 * 1000
  const todayWeekStart = isoWeekStart(new Date())
  const last8Weeks: string[] = []
  for (let i = 7; i >= 0; i--) {
    last8Weeks.push(isoWeekStart(new Date(new Date(todayWeekStart).getTime() - i * MS_PER_WEEK)))
  }
  const categoryTrend = last8Weeks.map((ws) => {
    const row: { week: string; total: number; cats: Record<string, number> } = {
      week: ws,
      total: 0,
      cats: {},
    }
    for (const cat of [...topCats, 'other']) row.cats[cat] = 0
    if (weekAgg[ws]) {
      for (const [cat, n] of Object.entries(weekAgg[ws])) {
        const bucket = topCats.includes(cat) ? cat : 'other'
        row.cats[bucket] = (row.cats[bucket] || 0) + n
        row.total += n
      }
    }
    return row
  })

  return (
    <ComplaintsClient
      allComplaints={allComplaints}
      allWishlist={allWishlist}
      categoryData={categoryData}
      categories={categories}
      severityData={severityData}
      categoryTrend={categoryTrend}
      trendCategories={[...topCats, 'other']}
      repeatComplainers={repeatUsers ?? []}
    />
  )
}
