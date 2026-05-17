import { supabase } from '@/lib/supabase'
import NewsClient from './NewsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface NewsArticle {
  id: string
  url: string
  source_site: string
  title: string
  excerpt: string
  author: string
  image_url: string
  published_at: string | null
  scraped_at: string | null
  is_joola_mention: boolean
  joola_context: string
  players_mentioned: string[]
  competitors_mentioned: string[] | null
  has_competitor_mention: boolean
  sentiment: 'positive' | 'negative' | 'informative' | 'neutral' | 'mixed' | 'risk' | null
  sentiment_score: number | null
  article_type: 'tournament' | 'product' | 'ambassador' | 'opinion' | 'general' | 'other' | null
  relevance_type: string | null
  importance_score: number | null
  ai_summary: string | null
  why_it_matters: string | null
  suggested_action: string | null
  word_count: number | null
  content_hash: string | null
}

export interface ScrapeRun {
  id: string
  status: string
  run_type: string | null
  sites_total: number
  sites_scraped: number
  articles_found: number
  articles_new: number
  articles_with_mentions: number
  joola_related_articles: number | null
  successful_sources: number | null
  failed_sources: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

async function fetchNewsData() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [articlesRes, runRes] = await Promise.all([
      supabase
        .from('news_articles')
        .select('*')
        .eq('is_active', true)
        .gte('published_at', sixMonthsAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(300)
        .returns<NewsArticle[]>(),
      supabase
        .from('news_scrape_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<ScrapeRun[]>(),
    ])

    return {
      articles: articlesRes.data ?? [],
      latestRun: runRes.data?.[0] ?? null,
    }
  } catch {
    return { articles: [], latestRun: null }
  }
}

export default async function NewsPage() {
  const { articles, latestRun } = await fetchNewsData()
  return <NewsClient articles={articles} latestRun={latestRun} />
}
