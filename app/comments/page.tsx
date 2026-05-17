import { supabase } from '@/lib/supabase'
import CommentsClient from './CommentsClient'
import type { IgComment, IgCommentAnalysis, IgWishlistItem } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AnalysisLite = Pick<
  IgCommentAnalysis,
  | 'comment_id'
  | 'sentiment'
  | 'sentiment_score'
  | 'primary_topic'
  | 'emotion'
  | 'is_question'
  | 'question_text'
  | 'is_complaint'
  | 'complaint_category'
  | 'is_wishlist'
  | 'wishlist_text'
  | 'mentions_competitor'
  | 'competitor_mentioned'
  | 'competitor_context'
  | 'purchase_intent'
>

export default async function CommentsPage() {
  const [{ data: comments }, { data: analysis }, { data: posts }, { data: wishlist }] = await Promise.all([
    supabase
      .from('joola_ig_comments')
      .select('*')
      .order('commented_at', { ascending: false })
      .returns<IgComment[]>(),
    supabase
      .from('joola_ig_comment_analysis')
      .select(
        'comment_id, sentiment, sentiment_score, primary_topic, emotion, ' +
          'is_question, question_text, is_complaint, complaint_category, ' +
          'is_wishlist, wishlist_text, ' +
          'mentions_competitor, competitor_mentioned, competitor_context, purchase_intent',
      )
      .returns<AnalysisLite[]>(),
    supabase
      .from('joola_ig_posts')
      .select('post_id, post_url, post_type, posted_at, caption, thumbnail_url')
      .returns<{ post_id: string; post_url: string; post_type: string | null; posted_at: string | null; caption: string | null; thumbnail_url: string | null }[]>(),
    supabase
      .from('joola_ig_wishlist_items')
      .select('*')
      .order('times_similar_requested', { ascending: false, nullsFirst: false })
      .returns<IgWishlistItem[]>(),
  ])

  const allComments = comments ?? []
  const allAnalysis = analysis ?? []
  const allWishlist = wishlist ?? []
  const postMap = new Map((posts ?? []).map((p) => [p.post_id, p]))

  const analysisMap = new Map(allAnalysis.map((a) => [a.comment_id, a]))
  const enriched = allComments.map((c) => {
    const p = postMap.get(c.post_id)
    return {
      ...c,
      ...analysisMap.get(c.comment_id),
      post_url: p?.post_url ?? undefined,
      post_type: p?.post_type ?? undefined,
    }
  })

  // Sentiment distribution
  const sentimentCounts: Record<string, number> = {}
  for (const a of allAnalysis) {
    const s = (a.sentiment || 'unknown').toLowerCase()
    sentimentCounts[s] = (sentimentCounts[s] || 0) + 1
  }
  const sentimentData = Object.entries(sentimentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  // Topic distribution (top 6)
  const topicCounts: Record<string, number> = {}
  for (const a of allAnalysis) {
    if (a.primary_topic) {
      topicCounts[a.primary_topic] = (topicCounts[a.primary_topic] || 0) + 1
    }
  }
  const topicData = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  // Emotion distribution (top 8)
  const emotionCounts: Record<string, number> = {}
  for (const a of allAnalysis) {
    if (a.emotion) {
      const e = a.emotion.toLowerCase()
      emotionCounts[e] = (emotionCounts[e] || 0) + 1
    }
  }
  const emotionData = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Competitor breakdown (top mentions + sentiment split)
  const competitorAgg: Record<string, { count: number; pos: number; neg: number; neu: number }> = {}
  for (const a of allAnalysis) {
    if (!a.mentions_competitor) continue
    const name = (a.competitor_mentioned || 'unspecified').toLowerCase().trim()
    if (!competitorAgg[name]) competitorAgg[name] = { count: 0, pos: 0, neg: 0, neu: 0 }
    competitorAgg[name].count += 1
    const s = (a.sentiment || '').toLowerCase()
    if (s === 'positive') competitorAgg[name].pos += 1
    else if (s === 'negative') competitorAgg[name].neg += 1
    else competitorAgg[name].neu += 1
  }
  const competitorData = Object.entries(competitorAgg)
    .filter(([name]) => name && name !== 'null' && name !== 'unspecified')
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 12)
    .map(([name, v]) => ({ name, ...v }))

  // Wishlist categories breakdown
  const wishCategoryAgg: Record<string, number> = {}
  for (const w of allWishlist) {
    const c = (w.category || 'general').toLowerCase()
    wishCategoryAgg[c] = (wishCategoryAgg[c] || 0) + 1
  }
  const wishlistCategoryData = Object.entries(wishCategoryAgg)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  const uniqueUsers = new Set(allComments.map((c) => c.username)).size
  const questionsCount = allAnalysis.filter((a) => a.is_question).length
  // Count from enriched (joined) comments so the badge matches what the filter actually shows
  const purchaseIntentCount = enriched.filter((c) => c.purchase_intent).length
  const competitorMentionsCount = allAnalysis.filter((a) => a.mentions_competitor).length
  const wishlistCount = allWishlist.length

  // ─── Virality (first-hour velocity vs slow-burn) ─────────────────────────
  const commentsByPost: Record<string, Array<{ commented_at: string }>> = {}
  for (const c of allComments) {
    if (!c.post_id || !c.commented_at) continue
    if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = []
    commentsByPost[c.post_id].push({ commented_at: c.commented_at })
  }
  type ViralityRow = {
    post_id: string
    post_url?: string
    caption: string
    post_type: string
    posted_at: string
    total_comments: number
    first_hour: number
    first_24h: number
    first_hour_pct: number
  }
  const viralityRows: ViralityRow[] = []
  for (const [postId, p] of Array.from(postMap.entries())) {
    if (!p.posted_at) continue
    const postedTs = new Date(p.posted_at).getTime()
    const cs = commentsByPost[postId] || []
    if (cs.length < 5) continue
    let fh = 0
    let f24 = 0
    for (const c of cs) {
      const dt = new Date(c.commented_at).getTime()
      const diff = dt - postedTs
      if (diff >= 0 && diff < 60 * 60 * 1000) fh += 1
      if (diff >= 0 && diff < 24 * 60 * 60 * 1000) f24 += 1
    }
    const total = cs.length
    viralityRows.push({
      post_id: postId,
      post_url: p.post_url,
      caption: (p.caption || '').slice(0, 80),
      post_type: p.post_type || 'image',
      posted_at: p.posted_at,
      total_comments: total,
      first_hour: fh,
      first_24h: f24,
      first_hour_pct: total > 0 ? fh / total : 0,
    })
  }
  const viralityFast = [...viralityRows]
    .filter((r) => r.first_hour >= 3)
    .sort((a, b) => b.first_hour_pct - a.first_hour_pct || b.first_hour - a.first_hour)
    .slice(0, 5)
  const viralitySlow = [...viralityRows]
    .filter((r) => r.total_comments >= 15 && r.first_hour_pct < 0.15)
    .sort((a, b) => b.total_comments - a.total_comments)
    .slice(0, 5)

  return (
    <CommentsClient
      comments={enriched}
      wishlist={allWishlist}
      sentimentData={sentimentData}
      topicData={topicData}
      emotionData={emotionData}
      competitorData={competitorData}
      wishlistCategoryData={wishlistCategoryData}
      totalComments={allComments.length}
      uniqueUsers={uniqueUsers}
      questionsCount={questionsCount}
      purchaseIntentCount={purchaseIntentCount}
      competitorMentionsCount={competitorMentionsCount}
      wishlistCount={wishlistCount}
      viralityFast={viralityFast}
      viralitySlow={viralitySlow}
    />
  )
}
