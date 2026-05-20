import { supabase } from '@/lib/supabase'
import type {
  ContentType,
  NewsSignal,
  SeoSignal,
  SignalsPreview,
  TopPostSignal,
} from '@/lib/content/types'
import TextComposerClient from './TextComposerClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// JOOLA's brand_id in Supabase — used to filter cross-platform tables that
// also store competitor brands (Selkirk, Paddletek, Engage, etc.). Content
// generation only references JOOLA's OWN posts; competitor posts must never
// leak into the picker.
//   tiktok_videos / x_posts / yt_videos all carry this column.
//   joola_ig_posts is already JOOLA-only by design (table name + ingestion).
const JOOLA_BRAND_ID = '04db8591-37a3-4634-9d11-536975fa6935'

// =============================================================================
// Server-side preview fetch
// =============================================================================
//
// In v1 the FastAPI signals-preview endpoint may not be reachable from the
// server runtime (no internal network configured for `/seo-api/*` rewrites).
// We therefore fetch directly from Supabase on the server, then hand the
// fully-typed `SignalsPreview` to the client. This matches the existing
// pattern in `/seo-news/page.tsx`.
// =============================================================================

interface RawIgPost {
  post_id: string
  caption: string | null
  thumbnail_url: string | null
  engagement_rate: number | null
  like_count: number | null
  view_count: number | null
  comment_count: number | null
  post_type: string | null
  posted_at: string | null
}
interface RawIgPostAnalysis {
  post_id: string
  content_theme: string | null
}
interface RawTikTokVideo {
  id: string
  tiktok_video_id: string | null
  text: string | null
  thumbnail_url: string | null
  video_url: string | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  share_count: number | null
  posted_at: string | null
  topics: string[] | null
}
interface RawXPost {
  id: string
  text: string | null
  like_count: number | null
  retweet_count: number | null
  reply_count: number | null
  view_count: number | null
  posted_at: string | null
}
interface RawYtVideo {
  id: string
  video_id: string | null
  title: string | null
  thumbnail_url: string | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  published_at: string | null
}
interface RawSeoKw {
  keyword: string
  search_volume: number | null
  position: number | null
}
interface RawNewsRow {
  id: string
  title: string
  ai_summary: string | null
  why_it_matters: string | null
  players_mentioned: string[] | null
  suggested_action: string | null
  sentiment: string | null
  is_joola_mention: boolean | null
  importance_score: number | null
  url: string | null
  published_at: string | null
  relevance_type: string | null
  image_url: string | null
}

async function fetchSignalsPreview(sourceArticleId?: string): Promise<SignalsPreview> {
  // Cross-platform top posts: pull JOOLA-owned posts from IG / TikTok / X / YouTube.
  // News: lift limit to 150 with full filter fields so the in-composer News tab
  // can replicate the /seo-news search & filter UX without a second roundtrip.
  const [
    seoRes,
    igRes,
    igAnalysisRes,
    tiktokRes,
    xRes,
    ytRes,
    newsRes,
  ] = await Promise.all([
    supabase
      .from('domain_ranked_keywords')
      .select('keyword,search_volume,position')
      .order('search_volume', { ascending: false })
      .limit(400)
      .returns<RawSeoKw[]>(),
    supabase
      .from('joola_ig_posts')
      .select('post_id,caption,thumbnail_url,engagement_rate,like_count,view_count,comment_count,post_type,posted_at')
      .order('engagement_rate', { ascending: false, nullsFirst: false })
      .limit(30)
      .returns<RawIgPost[]>(),
    supabase
      .from('joola_ig_post_analysis')
      .select('post_id,content_theme')
      .returns<RawIgPostAnalysis[]>(),
    // JOOLA's own TikTok account only (filter by brand_id — DB also tracks competitors).
    supabase
      .from('tiktok_videos')
      .select('id,tiktok_video_id,text,thumbnail_url,video_url,view_count,like_count,comment_count,share_count,posted_at,topics')
      .eq('brand_id', JOOLA_BRAND_ID)
      .order('view_count', { ascending: false, nullsFirst: false })
      .limit(30)
      .returns<RawTikTokVideo[]>(),
    // JOOLA's own X account only.
    supabase
      .from('x_posts')
      .select('id,text,like_count,retweet_count,reply_count,view_count,posted_at')
      .eq('brand_id', JOOLA_BRAND_ID)
      .order('like_count', { ascending: false, nullsFirst: false })
      .limit(30)
      .returns<RawXPost[]>(),
    // JOOLA's own YouTube channel only.
    supabase
      .from('yt_videos')
      .select('id,video_id,title,thumbnail_url,view_count,like_count,comment_count,published_at')
      .eq('brand_id', JOOLA_BRAND_ID)
      .order('view_count', { ascending: false, nullsFirst: false })
      .limit(30)
      .returns<RawYtVideo[]>(),
    supabase
      .from('news_articles')
      .select('id,title,ai_summary,why_it_matters,players_mentioned,suggested_action,sentiment,is_joola_mention,importance_score,url,published_at,relevance_type,image_url')
      .order('published_at', { ascending: false })
      .limit(150)
      .returns<RawNewsRow[]>(),
  ])

  const themesByPostId = new Map<string, string>()
  for (const a of igAnalysisRes.data ?? []) {
    if (a.content_theme) themesByPostId.set(a.post_id, a.content_theme)
  }

  // If a `source=news&id=…` is present, ensure that article is in the list
  // even if it didn't rank in the date-sorted top-150.
  const newsRows = newsRes.data ?? []
  if (sourceArticleId && !newsRows.some(n => n.id === sourceArticleId)) {
    const extra = await supabase
      .from('news_articles')
      .select('id,title,ai_summary,why_it_matters,players_mentioned,suggested_action,sentiment,is_joola_mention,importance_score,url,published_at,relevance_type,image_url')
      .eq('id', sourceArticleId)
      .limit(1)
      .returns<RawNewsRow[]>()
    if (extra.data && extra.data[0]) {
      newsRows.unshift(extra.data[0])
    }
  }

  // JOOLA Pulse is pickleball-only. JOOLA the brand sells table tennis too,
  // so the SEO table is full of TT/ping-pong rows we don't want here.
  // Positive include: must mention pickleball, JOOLA, or a JOOLA pickleball
  // roster athlete / paddle line. Negative deny: any table-tennis term.
  const PICKLEBALL_KW = /\b(pickle\s*ball|pickleball|ben\s*johns|anna\s*leigh|tyson\s*mcguffin|hyperion|perseus|joola)\b/i
  const TT_KW = /\b(table[\s-]?tennis|tennis[\s-]?table|ping[\s-]?pong|pong[\s-]?ping|\btt\b|tt[\s-]?(?:table|ball|rubber|blade)|(?:foldable|outdoor|indoor)\s+tt|tennis\s+(?:equipment|sport|racket|racquet|paddle|ball|rubber|blade)|stiga|butterfly|killerspin)\b/i

  // Dedupe by keyword — table tracks multiple position snapshots per keyword.
  // Keep the best signal: highest volume, then best (lowest) position.
  const seenKw = new Map<string, RawSeoKw>()
  for (const r of seoRes.data ?? []) {
    const k = (r.keyword ?? '').trim().toLowerCase()
    if (!k) continue
    if (TT_KW.test(k)) continue           // drop table-tennis variants
    if (!PICKLEBALL_KW.test(k)) continue  // require pickleball relevance
    const prev = seenKw.get(k)
    if (!prev) { seenKw.set(k, r); continue }
    const prevVol = prev.search_volume ?? 0
    const nextVol = r.search_volume ?? 0
    if (nextVol > prevVol) seenKw.set(k, r)
    else if (nextVol === prevVol && (r.position ?? 9999) < (prev.position ?? 9999)) seenKw.set(k, r)
  }
  const seo_keywords: SeoSignal[] = Array.from(seenKw.values())
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .map(r => ({
      keyword: r.keyword,
      search_volume: r.search_volume,
      position: r.position,
      is_gap: r.position == null,
      difficulty: null,
    }))

  const ig_posts: TopPostSignal[] = (igRes.data ?? []).map(r => ({
    post_id: r.post_id,
    platform: 'instagram' as const,
    content_theme: themesByPostId.get(r.post_id) ?? null,
    engagement_rate: r.engagement_rate ?? 0,
    likes: r.like_count,
    views: r.view_count,
    comments: r.comment_count,
    caption_first_line: r.caption ? (r.caption.split('\n')[0] ?? '').slice(0, 140) : null,
    thumbnail_url: r.thumbnail_url,
    post_type: r.post_type,
    posted_at: r.posted_at,
    url: null,
  }))

  const tiktok_posts: TopPostSignal[] = (tiktokRes.data ?? []).map(r => ({
    post_id: r.id,
    platform: 'tiktok' as const,
    content_theme: (r.topics && r.topics[0]) || null,
    engagement_rate: r.view_count && r.like_count ? r.like_count / r.view_count : 0,
    likes: r.like_count,
    views: r.view_count,
    comments: r.comment_count,
    caption_first_line: r.text ? (r.text.split('\n')[0] ?? '').slice(0, 140) : null,
    thumbnail_url: r.thumbnail_url,
    post_type: 'video',
    posted_at: r.posted_at,
    url: r.video_url ?? (r.tiktok_video_id ? `https://www.tiktok.com/@joolapickleball/video/${r.tiktok_video_id}` : null),
  }))

  const x_posts: TopPostSignal[] = (xRes.data ?? []).map(r => ({
    post_id: r.id,
    platform: 'twitter' as const,
    content_theme: null,
    engagement_rate: r.view_count && r.like_count ? r.like_count / r.view_count : 0,
    likes: r.like_count,
    views: r.view_count,
    comments: r.reply_count,
    caption_first_line: r.text ? (r.text.split('\n')[0] ?? '').slice(0, 140) : null,
    thumbnail_url: null,
    post_type: 'tweet',
    posted_at: r.posted_at,
    url: null,
  }))

  const yt_posts: TopPostSignal[] = (ytRes.data ?? []).map(r => ({
    post_id: r.id,
    platform: 'youtube' as const,
    content_theme: null,
    engagement_rate: r.view_count && r.like_count ? r.like_count / r.view_count : 0,
    likes: r.like_count,
    views: r.view_count,
    comments: r.comment_count,
    caption_first_line: r.title,
    thumbnail_url: r.thumbnail_url,
    post_type: 'video',
    posted_at: r.published_at,
    url: r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null,
  }))

  // Merge — order: IG first (richest theme data), then YT, TT, X. Client sorts by platform filter.
  const top_posts: TopPostSignal[] = [...ig_posts, ...yt_posts, ...tiktok_posts, ...x_posts]

  const news: NewsSignal[] = newsRows.map(r => ({
    id: r.id,
    title: r.title,
    ai_summary: r.ai_summary,
    why_it_matters: r.why_it_matters,
    players_mentioned: r.players_mentioned ?? [],
    suggested_action: r.suggested_action,
    sentiment: r.sentiment,
    is_joola_mention: Boolean(r.is_joola_mention),
    importance_score: r.importance_score,
    url: r.url,
    published_at: r.published_at,
  }))

  return { seo_keywords, top_posts, news }
}

interface SourceArticle {
  id: string
  title: string
  ai_summary: string | null
  suggested_action: string | null
  sentiment: string | null
}

async function fetchSourceArticle(id: string): Promise<SourceArticle | null> {
  const { data } = await supabase
    .from('news_articles')
    .select('id,title,ai_summary,suggested_action,sentiment')
    .eq('id', id)
    .limit(1)
    .returns<SourceArticle[]>()
  return data?.[0] ?? null
}

// =============================================================================
// Sample seed (?sample=...) — pre-fills the composer for the hub's example cards
// =============================================================================

interface SampleSeed {
  kind: 'top_post' | 'seo_gap' | 'news_mention'
  brief: string
  format: ContentType
  preselectId?: string
  preselectKeyword?: string
  activeTab: 'seo' | 'top_posts' | 'news'
}

async function buildSampleSeed(sample: string): Promise<SampleSeed | null> {
  if (sample === 'top_post') {
    const { data } = await supabase
      .from('joola_ig_posts')
      .select('post_id,caption,engagement_rate')
      .order('engagement_rate', { ascending: false })
      .limit(1)
      .returns<{ post_id: string; caption: string | null; engagement_rate: number | null }[]>()
    const row = data?.[0]
    if (!row) return null
    const firstLine = (row.caption?.split('\n')[0] ?? '').slice(0, 120)
    return {
      kind: 'top_post',
      brief: `Write an Instagram caption in the same style as our top-performing post (ER ${((row.engagement_rate ?? 0) * 100).toFixed(1)}%): "${firstLine}".`,
      format: 'ig_post',
      preselectId: row.post_id,
      activeTab: 'top_posts',
    }
  }
  if (sample === 'seo_gap') {
    const { data } = await supabase
      .from('domain_ranked_keywords')
      .select('keyword,search_volume')
      .eq('is_gap', true)
      .order('search_volume', { ascending: false })
      .limit(1)
      .returns<{ keyword: string; search_volume: number | null }[]>()
    const row = data?.[0]
    if (!row) return null
    return {
      kind: 'seo_gap',
      brief: `Write a blog post targeting the gap keyword "${row.keyword}" (volume ${row.search_volume ?? '?'}). Use it in the H1 and first 100 words.`,
      format: 'blog',
      preselectKeyword: row.keyword,
      activeTab: 'seo',
    }
  }
  if (sample === 'news_mention') {
    const { data } = await supabase
      .from('news_articles')
      .select('id,title,suggested_action')
      .eq('is_joola_mention', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .returns<{ id: string; title: string; suggested_action: string | null }[]>()
    const row = data?.[0]
    if (!row) return null
    return {
      kind: 'news_mention',
      brief: `Draft an Instagram response to the news article "${row.title}". Angle: ${row.suggested_action ?? 'celebrate the moment'}.`,
      format: 'ig_post',
      preselectId: row.id,
      activeTab: 'news',
    }
  }
  return null
}

// =============================================================================
// Page
// =============================================================================

interface SearchParams {
  source?: string
  id?: string
  sample?: string
}

export default async function TextComposerPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // 'reddit' is no longer surfaced in the UI but old links may still land here;
  // we just ignore the source param in that case.
  const source = searchParams.source === 'reddit' ? undefined : searchParams.source
  const sourceId = searchParams.id
  const sample = searchParams.sample

  const sourceArticle = source === 'news' && sourceId ? await fetchSourceArticle(sourceId) : null
  const sampleSeed    = sample ? await buildSampleSeed(sample) : null

  const preview = await fetchSignalsPreview(source === 'news' ? sourceId : undefined)

  return (
    <TextComposerClient
      preview={preview}
      sourceArticle={sourceArticle}
      sampleSeed={sampleSeed}
    />
  )
}

export type TextComposerSampleSeed = SampleSeed
export type TextComposerSourceArticle = SourceArticle
