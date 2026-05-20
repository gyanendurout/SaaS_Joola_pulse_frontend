import { supabase } from '@/lib/supabase'
import WeeklyDigestClient from './WeeklyDigestClient'
import type { IgWeeklySnapshot, IgPost, IgPostAnalysis, IgWishlistItem, IgComplaintLog, IgLoyalUser, IgCommentAnalysis } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function WeeklyDigestPage() {
  // Fetch snapshots first so we know the date range we need to cover when
  // pulling posts for the 8-week history theme backfill.
  const { data: snapshotsPre } = await supabase
    .from('joola_ig_weekly_snapshot')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(8)
    .returns<IgWeeklySnapshot[]>()

  const snapshotsArr = snapshotsPre ?? []
  // Earliest week start in the 8-week history — used as the cutoff for the
  // posts query so we have enough rows to backfill TOP THEME for every row.
  const oldestWeekStartIso = snapshotsArr.length > 0
    ? snapshotsArr[snapshotsArr.length - 1].week_start
    : null

  const postsQuery = supabase
    .from('joola_ig_posts')
    .select('post_id, post_url, post_type, posted_at, caption, thumbnail_url, like_count, comment_count, view_count, engagement_rate')
    .order('posted_at', { ascending: false })

  const [
    { data: posts },
    { data: postAnalysis },
    { data: wishlist },
    { data: complaints },
    { data: superFans },
    { data: analysis },
    { data: comments },
  ] = await Promise.all([
    (oldestWeekStartIso
      ? postsQuery.gte('posted_at', oldestWeekStartIso).limit(500)
      : postsQuery.limit(50)
    ).returns<IgPost[]>(),
    supabase
      .from('joola_ig_post_analysis')
      .select('post_id, content_theme')
      .returns<Pick<IgPostAnalysis, 'post_id' | 'content_theme'>[]>(),
    supabase
      .from('joola_ig_wishlist_items')
      .select('*')
      .order('times_similar_requested', { ascending: false, nullsFirst: false })
      .limit(8)
      .returns<IgWishlistItem[]>(),
    supabase
      .from('joola_ig_complaint_log')
      .select('*')
      .order('complained_at', { ascending: false })
      .returns<IgComplaintLog[]>(),
    supabase
      .from('joola_ig_loyal_users')
      .select('username, loyalty_tier, ambassador_score, total_comments, dominant_topic, first_seen_at, last_seen_at, purchase_intent_count')
      .eq('loyalty_tier', 'super_fan')
      .order('ambassador_score', { ascending: false })
      .limit(10)
      .returns<Pick<IgLoyalUser, 'username' | 'loyalty_tier' | 'ambassador_score' | 'total_comments' | 'dominant_topic' | 'first_seen_at' | 'last_seen_at' | 'purchase_intent_count'>[]>(),
    supabase
      .from('joola_ig_comment_analysis')
      .select('comment_id, sentiment_score, is_complaint, mentions_competitor, competitor_mentioned')
      .returns<Pick<IgCommentAnalysis, 'comment_id' | 'sentiment_score' | 'is_complaint' | 'mentions_competitor' | 'competitor_mentioned'>[]>(),
    supabase
      .from('joola_ig_comments')
      .select('comment_id, commented_at')
      .returns<{ comment_id: string; commented_at: string }[]>(),
  ])

  // Normalize engagement_rate (see posts/page.tsx) so downstream math is consistent.
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

  const snapsRaw = snapshotsArr.map(normSnapEr)
  const postArr = (posts ?? []).map(normEr)
  const postAnalysisArr = postAnalysis ?? []
  const wishArr = wishlist ?? []
  const complaintArr = complaints ?? []
  const superArr = superFans ?? []
  const analysisArr = analysis ?? []
  const commentArr = comments ?? []

  // Build a post_id → content_theme map so we can compute the dominant theme
  // for each week even when the snapshot's dominant_content_theme is null.
  const themeByPost = new Map(postAnalysisArr.map((a) => [a.post_id, a.content_theme]))

  // Backfill dominant_content_theme for every snapshot in the 8-week history
  // when the snapshot row stores null/empty. Tally content_theme across that
  // week's posts (joined via posted_at) and pick the mode. Snapshot value wins
  // when present. Mirrors the Overview page pattern.
  const snaps = snapsRaw.map((w) => {
    if (w.dominant_content_theme) return w
    const ws = new Date(w.week_start).getTime()
    const we = new Date(w.week_end).getTime() + 24 * 60 * 60 * 1000
    const themeCounts: Record<string, number> = {}
    for (const p of postArr) {
      if (!p.posted_at) continue
      const t = new Date(p.posted_at).getTime()
      if (t < ws || t >= we) continue
      const theme = themeByPost.get(p.post_id)
      if (!theme) continue
      themeCounts[theme] = (themeCounts[theme] || 0) + 1
    }
    const top = Object.entries(themeCounts).sort(([, a], [, b]) => b - a)[0]
    return top ? { ...w, dominant_content_theme: top[0] } : w
  })

  // Latest week + prev week for deltas
  let current = snaps[0]
  const previous = snaps[1]

  // Backfill avg_engagement_rate from the underlying post data when the
  // snapshot row stores 0 / null for the current week (BUG-014/015).
  // Theme backfill is already applied to every week in the `snaps` map above.
  if (current) {
    const ws = new Date(current.week_start).getTime()
    const we = new Date(current.week_end).getTime() + 24 * 60 * 60 * 1000
    const weekPosts = postArr.filter((p) => {
      if (!p.posted_at) return false
      const t = new Date(p.posted_at).getTime()
      return t >= ws && t < we
    })
    if ((!current.avg_engagement_rate || current.avg_engagement_rate === 0) && weekPosts.length > 0) {
      const avgER = weekPosts.reduce((a, p) => a + (p.engagement_rate || 0), 0) / weekPosts.length
      current = { ...current, avg_engagement_rate: avgER }
    }
  }

  function delta(curr: number | null | undefined, prev: number | null | undefined) {
    const c = curr ?? 0
    const p = prev ?? 0
    if (p === 0) return { abs: c, pct: 0 }
    return { abs: c - p, pct: ((c - p) / p) * 100 }
  }

  const deltas = current ? {
    posts:        delta(current.posts_published, previous?.posts_published),
    comments:     delta(current.total_comments, previous?.total_comments),
    views:        delta(current.total_views, previous?.total_views),
    er:           delta(current.avg_engagement_rate, previous?.avg_engagement_rate),
    complaints:   delta(current.complaint_count, previous?.complaint_count),
    purchase:     delta(current.purchase_intent_count, previous?.purchase_intent_count),
    competitor:   delta(current.competitor_mention_count, previous?.competitor_mention_count),
    wishlist:     delta(current.wishlist_count, previous?.wishlist_count),
    sentiment:    delta(current.avg_sentiment_score, previous?.avg_sentiment_score),
  } : null

  // Top post of the week (highest ER among posts published in this week)
  let topPost: IgPost | null = null
  if (current) {
    const ws = new Date(current.week_start).getTime()
    const we = new Date(current.week_end).getTime() + 24 * 60 * 60 * 1000
    const weekPosts = postArr.filter((p) => {
      if (!p.posted_at) return false
      const t = new Date(p.posted_at).getTime()
      return t >= ws && t < we
    })
    topPost = weekPosts.sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))[0] ?? null
  }

  // Top complaint of the week (most severe + recent)
  const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }
  let topComplaint: IgComplaintLog | null = null
  if (current) {
    const ws = new Date(current.week_start).getTime()
    const we = new Date(current.week_end).getTime() + 24 * 60 * 60 * 1000
    const wc = complaintArr.filter((c) => {
      if (!c.complained_at) return false
      const t = new Date(c.complained_at).getTime()
      return t >= ws && t < we
    })
    topComplaint = wc.sort((a, b) =>
      (SEV_RANK[(b.severity || 'low').toLowerCase()] ?? 0) -
      (SEV_RANK[(a.severity || 'low').toLowerCase()] ?? 0)
    )[0] ?? null
  }

  // Competitor mentions this week
  const analysisMap = new Map(analysisArr.map((a) => [a.comment_id, a]))
  const commentTsMap = new Map(commentArr.map((c) => [c.comment_id, c.commented_at]))
  const competitorAgg: Record<string, number> = {}
  if (current) {
    const ws = new Date(current.week_start).getTime()
    const we = new Date(current.week_end).getTime() + 24 * 60 * 60 * 1000
    for (const a of analysisArr) {
      if (!a.mentions_competitor) continue
      const ts = commentTsMap.get(a.comment_id)
      if (!ts) continue
      const t = new Date(ts).getTime()
      if (t < ws || t >= we) continue
      const name = (a.competitor_mentioned || 'unspecified').toLowerCase().trim()
      if (!name || name === 'null') continue
      competitorAgg[name] = (competitorAgg[name] || 0) + 1
    }
  }
  const competitorBreakdown = Object.entries(competitorAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return (
    <WeeklyDigestClient
      current={current ?? null}
      previous={previous ?? null}
      deltas={deltas}
      topPost={topPost}
      topComplaint={topComplaint}
      wishlist={wishArr}
      superFans={superArr}
      competitorBreakdown={competitorBreakdown}
      history={snaps}
    />
  )
}
