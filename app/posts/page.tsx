import { supabase } from '@/lib/supabase'
import PostsClient from './PostsClient'
import type { IgPost, IgPostAnalysis, IgWeeklySnapshot } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AnalysisLite = Pick<
  IgPostAnalysis,
  | 'post_id'
  | 'content_theme'
  | 'content_subtheme'
  | 'post_intent'
  | 'sentiment_tone'
  | 'visual_quality_score'
  | 'caption_quality_score'
  | 'hashtag_relevance_score'
  | 'predicted_performance'
  | 'caption_summary'
  | 'athletes_shown'
  | 'products_shown'
  | 'cta_type'
  | 'is_sponsored'
  | 'sponsor_brand'
  | 'tournament_reference'
>

export default async function PostsPage() {
  const [{ data: posts }, { data: analysis }, { data: weeklySnapshots }] = await Promise.all([
    supabase
      .from('joola_ig_posts')
      .select('*')
      .order('engagement_rate', { ascending: false })
      .returns<IgPost[]>(),
    supabase
      .from('joola_ig_post_analysis')
      .select(
        'post_id, content_theme, content_subtheme, post_intent, sentiment_tone, ' +
          'visual_quality_score, caption_quality_score, hashtag_relevance_score, predicted_performance, ' +
          'caption_summary, athletes_shown, products_shown, cta_type, ' +
          'is_sponsored, sponsor_brand, tournament_reference',
      )
      .returns<AnalysisLite[]>(),
    supabase
      .from('joola_ig_weekly_snapshot')
      .select('posts_published, total_views, avg_engagement_rate')
      .order('week_start', { ascending: true })
      .limit(13)
      .returns<Pick<IgWeeklySnapshot, 'posts_published' | 'total_views' | 'avg_engagement_rate'>>(),
  ])

  const rawPosts = posts ?? []
  // ─── Normalize engagement_rate ──────────────────────────────────────────
  // The DB stores `engagement_rate` inconsistently — some rows use fraction (0.06 = 6%),
  // others store percentage (6.0 = 6%, 89.84 = 89.84%). Without normalization the UI
  // multiplies by 100 and renders 600% / 8984%. Convention everywhere downstream:
  // engagement_rate is a fraction in [0, 1]. Any DB value > 1 is treated as already
  // a percentage and divided by 100. Also normalize the weekly snapshot below.
  const postArr = rawPosts.map((p) => {
    const er = p.engagement_rate
    if (er == null || isNaN(er)) return p
    return { ...p, engagement_rate: er > 1 ? er / 100 : er }
  })

  const analysisMap = new Map((analysis ?? []).map((a) => [a.post_id, a]))

  // Merge analysis into posts
  const enrichedPosts = postArr.map((p) => ({ ...p, ...analysisMap.get(p.post_id) }))

  const postTypes = Array.from(new Set(postArr.map((p) => p.post_type).filter(Boolean)))
  const contentThemes = Array.from(
    new Set((analysis ?? []).map((a) => a.content_theme).filter((v): v is string => !!v)),
  )

  const totalPosts = postArr.length
  const totalViews = postArr.reduce((a, p) => a + (p.view_count || 0), 0)
  const avgER = totalPosts > 0
    ? postArr.reduce((a, p) => a + (p.engagement_rate || 0), 0) / totalPosts
    : 0

  const rawSnaps = weeklySnapshots as unknown as Pick<IgWeeklySnapshot, 'posts_published' | 'total_views' | 'avg_engagement_rate'>[] ?? []
  // Apply the same ER normalization to weekly snapshots (fraction convention).
  const snaps = rawSnaps.map((w) => {
    const er = w.avg_engagement_rate
    if (er == null || isNaN(er)) return w
    return { ...w, avg_engagement_rate: er > 1 ? er / 100 : er }
  })
  function pad13(arr: number[]) { const a = [...arr]; while (a.length < 13) a.unshift(0); return a.slice(-13) }
  const postsTrend = pad13(snaps.map((w) => w.posts_published ?? 0))
  const erTrend = pad13(snaps.map((w) => +(((w.avg_engagement_rate ?? 0) * 100)).toFixed(2)))
  const viewsTrend = pad13(snaps.map((w) => w.total_views ?? 0))

  const avgCadence = snaps.length > 0
    ? +(snaps.reduce((a, w) => a + (w.posts_published ?? 0), 0) / snaps.length).toFixed(1)
    : 0

  // Heatmap data
  const cellTotals: Record<string, { sum: number; count: number }> = {}
  for (const p of postArr) {
    if (!p.day_of_week || p.hour_of_day == null) continue
    const key = `${p.day_of_week}-${p.hour_of_day}`
    if (!cellTotals[key]) cellTotals[key] = { sum: 0, count: 0 }
    cellTotals[key].sum += p.engagement_rate || 0
    cellTotals[key].count++
  }
  const heatmapData = Object.entries(cellTotals).map(([key, { sum, count }]) => {
    const sep = key.lastIndexOf('-')
    return {
      day: key.slice(0, sep),
      hour: parseInt(key.slice(sep + 1), 10),
      postCount: count,
      avgEngagement: count > 0 ? sum / count : 0,
    }
  })

  // Calendar data
  const dateTotals: Record<string, { sum: number; count: number }> = {}
  for (const p of postArr) {
    if (!p.posted_at) continue
    const date = p.posted_at.slice(0, 10)
    if (!dateTotals[date]) dateTotals[date] = { sum: 0, count: 0 }
    dateTotals[date].sum += p.engagement_rate || 0
    dateTotals[date].count++
  }
  const calendarData = Object.entries(dateTotals).map(([date, { sum, count }]) => ({
    date,
    postCount: count,
    avgEngagement: count > 0 ? sum / count : 0,
  }))

  // ─── Content Theme × Format performance matrix ──────────────────────────
  // For each (theme, post_type) compute: count, avg ER, avg views
  const themeMatrix: Record<
    string,
    Record<string, { count: number; er: number; views: number; likes: number }>
  > = {}
  for (const p of enrichedPosts) {
    const theme = (p.content_theme || 'unknown').toLowerCase()
    const type = (p.post_type || 'unknown').toLowerCase()
    if (!themeMatrix[theme]) themeMatrix[theme] = {}
    if (!themeMatrix[theme][type]) themeMatrix[theme][type] = { count: 0, er: 0, views: 0, likes: 0 }
    const cell = themeMatrix[theme][type]
    cell.count += 1
    cell.er += p.engagement_rate || 0
    cell.views += p.view_count || 0
    cell.likes += p.like_count || 0
  }
  const themeRows = Object.entries(themeMatrix).map(([theme, types]) => {
    let totalCount = 0, totalEr = 0, totalViews = 0, totalLikes = 0
    const cells: Record<string, { count: number; avgEr: number; avgViews: number }> = {}
    for (const [type, c] of Object.entries(types)) {
      const avgEr = c.count > 0 ? c.er / c.count : 0
      const avgViews = c.count > 0 ? c.views / c.count : 0
      cells[type] = { count: c.count, avgEr, avgViews }
      totalCount += c.count
      totalEr += c.er
      totalViews += c.views
      totalLikes += c.likes
    }
    return {
      theme,
      count: totalCount,
      avgEr: totalCount > 0 ? totalEr / totalCount : 0,
      avgViews: totalCount > 0 ? totalViews / totalCount : 0,
      avgLikes: totalCount > 0 ? totalLikes / totalCount : 0,
      cells,
    }
  }).sort((a, b) => b.count - a.count)

  // ─── Athlete leaderboard ────────────────────────────────────────────────
  const athleteAgg: Record<string, { count: number; er: number; views: number; likes: number }> = {}
  for (const p of enrichedPosts) {
    const athletes = p.athletes_shown
    if (!Array.isArray(athletes) || athletes.length === 0) continue
    for (const rawName of athletes) {
      const name = (rawName || '').toLowerCase().trim()
      if (!name) continue
      if (!athleteAgg[name]) athleteAgg[name] = { count: 0, er: 0, views: 0, likes: 0 }
      athleteAgg[name].count += 1
      athleteAgg[name].er += p.engagement_rate || 0
      athleteAgg[name].views += p.view_count || 0
      athleteAgg[name].likes += p.like_count || 0
    }
  }
  const athleteRows = Object.entries(athleteAgg)
    .filter(([, v]) => v.count >= 1)
    .map(([name, v]) => ({
      name,
      count: v.count,
      avgEr: v.er / v.count,
      avgViews: v.views / v.count,
      avgLikes: v.likes / v.count,
    }))
    .sort((a, b) => b.avgEr - a.avgEr)
    .slice(0, 12)

  // ─── CTA effectiveness ──────────────────────────────────────────────────
  const ctaAgg: Record<string, { count: number; er: number }> = {}
  for (const p of enrichedPosts) {
    const cta = (p.cta_type || (p.has_cta ? 'unknown_cta' : 'no_cta') || 'no_cta').toLowerCase()
    if (!ctaAgg[cta]) ctaAgg[cta] = { count: 0, er: 0 }
    ctaAgg[cta].count += 1
    ctaAgg[cta].er += p.engagement_rate || 0
  }
  const ctaRows = Object.entries(ctaAgg)
    .map(([name, v]) => ({ name, count: v.count, avgEr: v.count > 0 ? v.er / v.count : 0 }))
    .sort((a, b) => b.avgEr - a.avgEr)

  // ─── Carousel slide count vs ER (bins) ──────────────────────────────────
  function binSlides(n: number | null | undefined): string {
    if (n == null || n === 0) return 'n/a'
    if (n <= 3) return '1–3'
    if (n <= 6) return '4–6'
    if (n <= 10) return '7–10'
    return '11+'
  }
  const carouselAgg: Record<string, { count: number; er: number }> = {}
  for (const p of enrichedPosts) {
    if ((p.post_type || '').toLowerCase() !== 'carousel') continue
    const bin = binSlides(p.carousel_slide_count)
    if (bin === 'n/a') continue
    if (!carouselAgg[bin]) carouselAgg[bin] = { count: 0, er: 0 }
    carouselAgg[bin].count += 1
    carouselAgg[bin].er += p.engagement_rate || 0
  }
  const carouselOrder = ['1–3', '4–6', '7–10', '11+']
  const carouselRows = carouselOrder
    .filter((b) => carouselAgg[b])
    .map((b) => ({ name: b, count: carouselAgg[b].count, avgEr: carouselAgg[b].er / carouselAgg[b].count }))

  // ─── Sponsored vs organic ───────────────────────────────────────────────
  const spnAgg = { sponsored: { count: 0, er: 0, views: 0 }, organic: { count: 0, er: 0, views: 0 } }
  for (const p of enrichedPosts) {
    const bucket = p.is_sponsored ? 'sponsored' : 'organic'
    spnAgg[bucket].count += 1
    spnAgg[bucket].er += p.engagement_rate || 0
    spnAgg[bucket].views += p.view_count || 0
  }
  const sponsoredRows: Array<{ name: 'sponsored' | 'organic'; count: number; avgEr: number; avgViews: number }> = (
    ['sponsored', 'organic'] as const
  ).map((k) => ({
    name: k,
    count: spnAgg[k].count,
    avgEr: spnAgg[k].count > 0 ? spnAgg[k].er / spnAgg[k].count : 0,
    avgViews: spnAgg[k].count > 0 ? spnAgg[k].views / spnAgg[k].count : 0,
  }))

  // Sponsor brand counts (top 5)
  const sponsorBrandAgg: Record<string, number> = {}
  for (const p of enrichedPosts) {
    if (!p.is_sponsored) continue
    const sb = (p.sponsor_brand || 'unknown').toLowerCase().trim()
    sponsorBrandAgg[sb] = (sponsorBrandAgg[sb] || 0) + 1
  }
  const sponsorBrands = Object.entries(sponsorBrandAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // ─── Cadence Optimizer: best day_of_week per theme ──────────────────────
  const themeDayAgg: Record<string, Record<string, { sum: number; count: number }>> = {}
  for (const p of enrichedPosts) {
    const theme = (p.content_theme || 'unknown').toLowerCase()
    const day = (p.day_of_week || 'unknown').toLowerCase()
    if (!themeDayAgg[theme]) themeDayAgg[theme] = {}
    if (!themeDayAgg[theme][day]) themeDayAgg[theme][day] = { sum: 0, count: 0 }
    themeDayAgg[theme][day].sum += p.engagement_rate || 0
    themeDayAgg[theme][day].count += 1
  }
  const cadenceRows = Object.entries(themeDayAgg)
    .filter(([theme]) => theme !== 'unknown')
    .map(([theme, days]) => {
      let best = { day: '', avgEr: 0, count: 0 }
      const all: Array<{ day: string; avgEr: number; count: number }> = []
      for (const [day, v] of Object.entries(days)) {
        const avgEr = v.count > 0 ? v.sum / v.count : 0
        all.push({ day, avgEr, count: v.count })
        if (avgEr > best.avgEr) best = { day, avgEr, count: v.count }
      }
      return { theme, best, days: all.sort((a, b) => b.avgEr - a.avgEr) }
    })
    .sort((a, b) => b.best.avgEr - a.best.avgEr)
    .slice(0, 8)

  return (
    <PostsClient
      posts={enrichedPosts as (IgPost & Partial<IgPostAnalysis>)[]}
      postTypes={postTypes}
      contentThemes={contentThemes}
      kpis={{ totalPosts, totalViews, avgER, avgCadence }}
      trends={{ posts: postsTrend, er: erTrend, views: viewsTrend }}
      heatmapData={heatmapData}
      calendarData={calendarData}
      themeRows={themeRows}
      athleteRows={athleteRows}
      ctaRows={ctaRows}
      carouselRows={carouselRows}
      sponsoredRows={sponsoredRows}
      sponsorBrands={sponsorBrands}
      cadenceRows={cadenceRows}
    />
  )
}
