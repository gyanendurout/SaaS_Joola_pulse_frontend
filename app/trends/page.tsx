import { supabase } from '@/lib/supabase'
import TrendsClient from './TrendsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'

export interface WeekRow {
  week: string        // "YYYY-MM-DD" — Monday of that week
  igViews: number
  igPosts: number
  igEngRate: number   // stored as fraction (0.05 = 5%), multiply by 100 for display
  igPurchaseIntent: number
  igComplaints: number
  ytViews: number
  ytVideosUploaded: number
  ttVideos: number
  ttViews: number
  rdMentions: number
  rdUpvotes: number
  rdOpportunity: number
}

// Returns the ISO Monday for any date string (YYYY-MM-DD or ISO)
function weekMonday(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00Z')
  const day = d.getUTCDay() || 7 // 1=Mon, 7=Sun
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

// Converts YouTube's year+week_number to the ISO Monday of that week
function ytWeekToMonday(year: number, weekNum: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - dow + 1)
  const result = new Date(week1Mon)
  result.setUTCDate(week1Mon.getUTCDate() + (weekNum - 1) * 7)
  return result.toISOString().slice(0, 10)
}

function emptyRow(week: string): WeekRow {
  return {
    week,
    igViews: 0, igPosts: 0, igEngRate: 0, igPurchaseIntent: 0, igComplaints: 0,
    ytViews: 0, ytVideosUploaded: 0,
    ttVideos: 0, ttViews: 0,
    rdMentions: 0, rdUpvotes: 0, rdOpportunity: 0,
  }
}

export default async function TrendsPage() {
  const [igRes, ytRes, ttRes, rdRes] = await Promise.all([
    supabase
      .from('joola_ig_weekly_snapshot')
      .select('week_start,posts_published,total_views,avg_engagement_rate,purchase_intent_count,complaint_count')
      .order('week_start'),
    supabase
      .from('yt_channel_weekly')
      .select('year,week_number,total_views,videos_uploaded_this_week')
      .eq('brand_id', JOOLA)
      .order('year')
      .order('week_number'),
    supabase
      .from('tiktok_videos')
      .select('posted_at,view_count')
      .eq('brand_id', JOOLA)
      .not('posted_at', 'is', null),
    supabase
      .from('reddit_mentions')
      .select('posted_at,upvotes,is_opportunity')
      .eq('brand_id', JOOLA)
      .not('posted_at', 'is', null),
  ])

  const map = new Map<string, WeekRow>()
  const get = (w: string): WeekRow => {
    if (!map.has(w)) map.set(w, emptyRow(w))
    return map.get(w)!
  }

  // Instagram weekly snapshots
  for (const r of (igRes.data ?? [])) {
    if (!r.week_start) continue
    const w = weekMonday(r.week_start)
    const row = get(w)
    row.igViews = r.total_views ?? 0
    row.igPosts = r.posts_published ?? 0
    row.igEngRate = r.avg_engagement_rate ?? 0
    row.igPurchaseIntent = r.purchase_intent_count ?? 0
    row.igComplaints = r.complaint_count ?? 0
  }

  // YouTube weekly
  for (const r of (ytRes.data ?? [])) {
    const w = ytWeekToMonday(r.year, r.week_number)
    const row = get(w)
    row.ytViews = r.total_views ?? 0
    row.ytVideosUploaded = r.videos_uploaded_this_week ?? 0
  }

  // TikTok — group individual videos by week
  for (const v of (ttRes.data ?? [])) {
    if (!v.posted_at) continue
    const w = weekMonday(v.posted_at)
    const row = get(w)
    row.ttVideos++
    const views = typeof v.view_count === 'number'
      ? v.view_count
      : parseFloat(String(v.view_count ?? '0')) || 0
    row.ttViews += views
  }

  // Reddit — group individual mentions by week
  for (const m of (rdRes.data ?? [])) {
    if (!m.posted_at) continue
    const w = weekMonday(m.posted_at)
    const row = get(w)
    row.rdMentions++
    row.rdUpvotes += m.upvotes ?? 0
    if (m.is_opportunity) row.rdOpportunity++
  }

  // Sort chronologically, keep last 26 weeks (≈6 months)
  const weeks: WeekRow[] = Array.from(map.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-26)

  return <TrendsClient weeks={weeks} />
}
