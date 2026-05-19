import { supabase } from '@/lib/supabase'
import type {
  ContentType,
  NewsSignal,
  RedditSignal,
  SeoSignal,
  SignalsPreview,
  TopPostSignal,
} from '@/lib/content/types'
import TextComposerClient from './TextComposerClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  post_type: string | null
}
interface RawIgPostAnalysis {
  post_id: string
  content_theme: string | null
}
interface RawSeoKw {
  keyword: string
  search_volume: number | null
  position: number | null
  is_gap: boolean | null
  difficulty: number | null
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
}
interface RawRedditRow {
  id: string
  title: string | null
  subreddit: string | null
  topics: string[] | null
  sentiment: string | null
  is_crisis: boolean | null
  is_opportunity: boolean | null
  excerpt: string | null
  body: string | null
  url: string | null
  created_at: string | null
  created_utc: string | null
}

async function fetchSignalsPreview(sourceArticleId?: string): Promise<SignalsPreview> {
  const sixteenDaysAgo = new Date()
  sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Run all queries in parallel; degrade gracefully on failure.
  const [seoRes, postsRes, postAnalysisRes, newsRes, redditRes] = await Promise.all([
    supabase
      .from('domain_ranked_keywords')
      .select('keyword,search_volume,position,is_gap,difficulty')
      .gte('search_volume', 500)
      .order('search_volume', { ascending: false })
      .limit(20)
      .returns<RawSeoKw[]>(),
    supabase
      .from('joola_ig_posts')
      .select('post_id,caption,thumbnail_url,engagement_rate,post_type')
      .gte('posted_at', ninetyDaysAgo.toISOString())
      .order('engagement_rate', { ascending: false })
      .limit(10)
      .returns<RawIgPost[]>(),
    supabase
      .from('joola_ig_post_analysis')
      .select('post_id,content_theme')
      .returns<RawIgPostAnalysis[]>(),
    supabase
      .from('news_articles')
      .select('id,title,ai_summary,why_it_matters,players_mentioned,suggested_action,sentiment,is_joola_mention,importance_score,url,published_at')
      .order('importance_score', { ascending: false })
      .limit(15)
      .returns<RawNewsRow[]>(),
    supabase
      .from('reddit_mentions')
      .select('id,title,subreddit,topics,sentiment,is_crisis,is_opportunity,excerpt,body,url,created_at,created_utc')
      .or('is_crisis.eq.true,is_opportunity.eq.true')
      .gte('created_at', sixteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<RawRedditRow[]>(),
  ])

  const themesByPostId = new Map<string, string>()
  for (const a of postAnalysisRes.data ?? []) {
    if (a.content_theme) themesByPostId.set(a.post_id, a.content_theme)
  }

  // If a `source=news&id=…` is present, ensure that article is in the list
  // even if it didn't rank in the importance top-15.
  const newsRows = newsRes.data ?? []
  if (sourceArticleId && !newsRows.some(n => n.id === sourceArticleId)) {
    const extra = await supabase
      .from('news_articles')
      .select('id,title,ai_summary,why_it_matters,players_mentioned,suggested_action,sentiment,is_joola_mention,importance_score,url,published_at')
      .eq('id', sourceArticleId)
      .limit(1)
      .returns<RawNewsRow[]>()
    if (extra.data && extra.data[0]) {
      newsRows.unshift(extra.data[0])
    }
  }

  const seo_keywords: SeoSignal[] = (seoRes.data ?? []).map(r => ({
    keyword: r.keyword,
    search_volume: r.search_volume,
    position: r.position,
    is_gap: Boolean(r.is_gap),
    difficulty: r.difficulty,
  }))

  const top_posts: TopPostSignal[] = (postsRes.data ?? []).map(r => ({
    post_id: r.post_id,
    content_theme: themesByPostId.get(r.post_id) ?? null,
    engagement_rate: r.engagement_rate ?? 0,
    caption_first_line: r.caption ? (r.caption.split('\n')[0] ?? '').slice(0, 140) : null,
    thumbnail_url: r.thumbnail_url,
    post_type: r.post_type,
  }))

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

  const reddit: RedditSignal[] = (redditRes.data ?? []).map(r => ({
    id: r.id,
    title: r.title ?? '(no title)',
    subreddit: r.subreddit ?? 'unknown',
    topics: r.topics,
    sentiment: r.sentiment,
    is_crisis: Boolean(r.is_crisis),
    is_opportunity: Boolean(r.is_opportunity),
    excerpt: r.excerpt ?? (r.body ? r.body.slice(0, 200) : null),
    url: r.url,
    created_at: r.created_at ?? r.created_utc ?? null,
  }))

  return { seo_keywords, top_posts, news, reddit }
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

interface SourceReddit {
  id: string
  title: string | null
  subreddit: string | null
  is_crisis: boolean | null
  excerpt: string | null
  body: string | null
}

async function fetchSourceReddit(id: string): Promise<SourceReddit | null> {
  const { data } = await supabase
    .from('reddit_mentions')
    .select('id,title,subreddit,is_crisis,excerpt,body')
    .eq('id', id)
    .limit(1)
    .returns<SourceReddit[]>()
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
  const source = searchParams.source
  const sourceId = searchParams.id
  const sample = searchParams.sample

  const sourceArticle = source === 'news' && sourceId ? await fetchSourceArticle(sourceId) : null
  const sourceReddit  = source === 'reddit' && sourceId ? await fetchSourceReddit(sourceId)  : null
  const sampleSeed    = sample ? await buildSampleSeed(sample) : null

  const preview = await fetchSignalsPreview(source === 'news' ? sourceId : undefined)

  return (
    <TextComposerClient
      preview={preview}
      sourceArticle={sourceArticle}
      sourceReddit={sourceReddit}
      sampleSeed={sampleSeed}
    />
  )
}

export type TextComposerSampleSeed = SampleSeed
export type TextComposerSourceArticle = SourceArticle
export type TextComposerSourceReddit = SourceReddit
