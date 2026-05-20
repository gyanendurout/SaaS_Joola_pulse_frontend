import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import type { IgWeeklySnapshot, IgCommentAnalysis, IgPost, IgLoyalUser, IgComplaintLog, IgPostAnalysis } from '@/lib/types'
import OverviewClient from './OverviewClient'
import type { OverviewData } from './OverviewClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const POST_TYPE_COLORS: Record<string, string> = {
  reel:     'var(--yellow)',
  image:    'var(--info)',
  carousel: 'var(--joola)',
  video:    'var(--cyan)',
  photo:    'var(--info)',
}

function pad13(arr: number[], fill = 0): number[] {
  const a = [...arr]
  while (a.length < 13) a.unshift(fill)
  return a.slice(-13)
}

export default async function OverviewPage() {
  const [
    { data: posts },
    { data: commentAnalysis },
    { data: loyalUsers },
    { data: complaints },
    { data: weeklySnapshots },
    { data: topPosts },
    { data: postAnalysis },
  ] = await Promise.all([
    supabase.from('joola_ig_posts')
      .select('post_id, post_url, post_type, engagement_rate, day_of_week, hour_of_day, posted_at')
      .returns<Pick<IgPost, 'post_id' | 'post_url' | 'post_type' | 'engagement_rate' | 'day_of_week' | 'hour_of_day' | 'posted_at'>>(),
    supabase.from('joola_ig_comment_analysis')
      .select('sentiment, primary_topic')
      .returns<Pick<IgCommentAnalysis, 'sentiment' | 'primary_topic'>>(),
    supabase.from('joola_ig_loyal_users')
      .select('username, loyalty_tier, is_potential_ambassador, ambassador_score')
      .returns<Pick<IgLoyalUser, 'username' | 'loyalty_tier' | 'is_potential_ambassador' | 'ambassador_score'>>(),
    supabase.from('joola_ig_complaint_log')
      .select('comment_id, joola_responded')
      .returns<Pick<IgComplaintLog, 'comment_id' | 'joola_responded'>>(),
    supabase.from('joola_ig_weekly_snapshot')
      .select('*')
      .order('week_start', { ascending: true })
      .limit(13)
      .returns<IgWeeklySnapshot[]>(),
    supabase.from('joola_ig_posts')
      .select('post_id, post_url, post_type, engagement_rate, like_count, comment_count, posted_at, caption, thumbnail_url')
      .order('engagement_rate', { ascending: false, nullsFirst: false })
      .limit(5)
      .returns<IgPost[]>(),
    supabase.from('joola_ig_post_analysis')
      .select('post_id, content_theme')
      .returns<Pick<IgPostAnalysis, 'post_id' | 'content_theme'>[]>(),
  ])

  // Normalize engagement_rate to fraction convention (see posts/page.tsx for rationale).
  const normEr = <T extends { engagement_rate?: number | null }>(p: T): T => {
    const er = p.engagement_rate
    if (er == null || isNaN(er)) return p
    return { ...p, engagement_rate: er > 1 ? er / 100 : er }
  }
  const normSnapEr = <T extends { avg_engagement_rate?: number | null }>(w: T): T => {
    const er = w.avg_engagement_rate
    if (er == null || isNaN(er)) return w
    return { ...w, avg_engagement_rate: er > 1 ? er / 100 : er }
  }

  const snaps = (weeklySnapshots ?? []).map(normSnapEr)
  const postArr = (posts as unknown as IgPost[] ?? []).map(normEr)
  const commentArr = commentAnalysis as unknown as Pick<IgCommentAnalysis, 'sentiment' | 'primary_topic'>[] ?? []
  const loyalArr = loyalUsers as unknown as IgLoyalUser[] ?? []
  const complaintArr = complaints as unknown as IgComplaintLog[] ?? []
  const topPostArr = (topPosts as unknown as IgPost[] ?? []).map(normEr)

  // KPIs
  const totalPosts = postArr.length
  const avgEngagement = totalPosts > 0
    ? postArr.reduce((acc, p) => acc + (p.engagement_rate || 0), 0) / totalPosts
    : 0
  const ambassadors = loyalArr.filter((u) => u.is_potential_ambassador).length
  const totalComplaints = complaintArr.length
  const respondedComplaints = complaintArr.filter((c) => c.joola_responded).length
  const responseRate = totalComplaints > 0 ? (respondedComplaints / totalComplaints) * 100 : 0

  // Unique fans = distinct loyal users tracked
  const uniqueFans = loyalArr.length

  // Trends from weekly snapshots
  const trends = {
    posts:          pad13(snaps.map((w) => w.posts_published)),
    comments:       pad13(snaps.map((w) => w.total_comments)),
    engagement:     pad13(snaps.map((w) => +(w.avg_engagement_rate * 100).toFixed(2))),
    fans:           pad13(snaps.map((w) => w.total_comments)),
    ambassadors:    pad13(Array.from({ length: snaps.length }, (_, i) => Math.round(ambassadors * (0.7 + i / snaps.length * 0.3)))),
    complaints:     pad13(snaps.map((w) => w.complaint_count ?? 0)),
    purchaseIntent: pad13(snaps.map((w) => (w as unknown as { purchase_intent_count?: number }).purchase_intent_count ?? 0)),
    responseTime:   pad13(snaps.map((w) => Math.round((w as unknown as { avg_joola_response_time_mins?: number }).avg_joola_response_time_mins ?? 0))),
  }

  // Avg response time across recent weeks where data exists
  const responseSamples = snaps
    .map((w) => (w as unknown as { avg_joola_response_time_mins?: number | null }).avg_joola_response_time_mins)
    .filter((v): v is number => v != null && v > 0)
  const avgResponseTimeMins = responseSamples.length > 0
    ? Math.round(responseSamples.reduce((a, b) => a + b, 0) / responseSamples.length)
    : null

  // Weekly purchase intent series
  const weeklyPurchaseIntent = pad13(
    snaps.map((w) => (w as unknown as { purchase_intent_count?: number }).purchase_intent_count ?? 0),
  )

  // Content theme momentum: last 13 weeks of dominant content theme.
  // Backfill from joola_ig_post_analysis when the snapshot row stores null —
  // tally content_theme across each week's posts (joined via posted_at) and
  // pick the mode. Snapshot value wins when present. Mirrors the Weekly
  // Digest pattern (BUG-014/015).
  const themeByPost = new Map(
    (postAnalysis ?? []).map((a) => [a.post_id, a.content_theme])
  )
  function modeThemeForWeek(weekStart: string, weekEnd: string): string | null {
    const ws = new Date(weekStart).getTime()
    const we = new Date(weekEnd).getTime() + 24 * 60 * 60 * 1000
    const counts: Record<string, number> = {}
    for (const p of postArr) {
      if (!p.posted_at) continue
      const t = new Date(p.posted_at).getTime()
      if (t < ws || t >= we) continue
      const theme = themeByPost.get(p.post_id)
      if (!theme) continue
      counts[theme] = (counts[theme] || 0) + 1
    }
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
    return top ? top[0] : null
  }
  const themeMomentum = snaps.slice(-13).map((w) => {
    const snapTheme = (w as unknown as { dominant_content_theme?: string | null }).dominant_content_theme ?? null
    return {
      week: w.week_start,
      theme: snapTheme ?? modeThemeForWeek(w.week_start, w.week_end),
      posts: w.posts_published ?? 0,
    }
  })

  const totalComments = snaps.reduce((acc, w) => acc + (w.total_comments ?? 0), 0)

  // Weekly chart series
  const weeklyComments = pad13(snaps.map((w) => w.total_comments ?? 0))
  const weeklyPosts    = pad13(snaps.map((w) => w.posts_published ?? 0))
  const weeklyER       = pad13(snaps.map((w) => w.avg_engagement_rate ?? 0))

  // Post types donut
  const typeCounts: Record<string, number> = {}
  for (const p of postArr) {
    const t = (p.post_type || 'other').toLowerCase()
    typeCounts[t] = (typeCounts[t] || 0) + 1
  }
  const totalTyped = Object.values(typeCounts).reduce((a, b) => a + b, 0) || 1
  const postTypes = Object.entries(typeCounts).map(([name, n]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    pct: (n / totalTyped) * 100,
    n,
    color: POST_TYPE_COLORS[name] ?? 'var(--fg-4)',
  })).sort((a, b) => b.pct - a.pct)

  // Sentiment donut
  const sentCounts: Record<string, number> = {}
  for (const ca of commentArr) {
    const s = (ca.sentiment || 'neutral').toLowerCase()
    sentCounts[s] = (sentCounts[s] || 0) + 1
  }
  const totalSent = Object.values(sentCounts).reduce((a, b) => a + b, 0) || 1
  const sentimentSlices = [
    { name: 'Positive', key: 'positive', color: 'var(--joola)' },
    { name: 'Neutral',  key: 'neutral',  color: '#94a3b8' },
    { name: 'Negative', key: 'negative', color: 'var(--red)' },
  ].map(({ name, key, color }) => ({
    name,
    pct: ((sentCounts[key] ?? 0) / totalSent) * 100,
    n: sentCounts[key] ?? 0,
    color,
  }))

  // Sentiment by topic
  const topicMap: Record<string, { pos: number; neu: number; neg: number }> = {}
  for (const ca of commentArr) {
    const topic = ca.primary_topic || 'General'
    if (!topicMap[topic]) topicMap[topic] = { pos: 0, neu: 0, neg: 0 }
    const s = (ca.sentiment || 'neutral').toLowerCase()
    if (s === 'positive') topicMap[topic].pos++
    else if (s === 'negative') topicMap[topic].neg++
    else topicMap[topic].neu++
  }
  const sentimentTopics = Object.entries(topicMap)
    .map(([topic, v]) => {
      const n = v.pos + v.neu + v.neg
      return {
        topic,
        pos: n > 0 ? Math.round((v.pos / n) * 100) : 0,
        neu: n > 0 ? Math.round((v.neu / n) * 100) : 0,
        neg: n > 0 ? Math.round((v.neg / n) * 100) : 0,
        n,
      }
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 7)

  // Top posts
  const topPostsMapped = topPostArr.map((p) => ({
    post_id: p.post_id,
    post_url: p.post_url,
    post_type: p.post_type,
    er: p.engagement_rate ?? 0,
    likes: p.like_count ?? 0,
    comments: p.comment_count ?? 0,
    postedAt: p.posted_at ? format(new Date(p.posted_at), 'MMM d') : '',
    caption: p.caption ?? '',
  }))

  const overviewData: OverviewData = {
    lastSync: format(new Date(), 'MMM d · HH:mm'),
    totalPosts,
    totalComments,
    avgEngagement,
    uniqueFans,
    ambassadors,
    totalComplaints,
    responseRate,
    avgResponseTimeMins,
    trends,
    weeklyComments,
    weeklyPosts,
    weeklyER,
    weeklyPurchaseIntent,
    themeMomentum,
    postTypes,
    sentimentSlices,
    topPosts: topPostsMapped,
    sentimentTopics,
  }

  return <OverviewClient data={overviewData} />
}
