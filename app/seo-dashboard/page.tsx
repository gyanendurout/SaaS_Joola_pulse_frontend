import { supabase } from '@/lib/supabase'
import SeoDashboardClient from './SeoDashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface SeoIssue {
  id: string
  issue_code?: string
  issue_type?: string
  severity: string
  title?: string
  description?: string
  category?: string
  url?: string
  source?: string
  recommendation?: string
}

export interface SeoKeyword {
  id: string
  keyword: string
  search_volume: number
  difficulty: number | null
  position: number | null
  previous_position: number | null
  is_gap: boolean
  intent?: string
  traffic?: number | null
}

export interface SeoReco {
  title: string
  description: string
  priority: string
  tags: string[]
  next_steps?: string[]
  impact?: string
  effort?: string
}

export interface BacklinkSummary {
  total_backlinks: number
  referring_domains: number
  dofollow_pct: number
  avg_domain_rating: number
}

export interface OnPageItem {
  url: string
  title: string | null
  meta_description: string | null
  h1: string[]
  word_count: number | null
  is_indexable: boolean | null
}

export interface CompetitorDomain {
  domain: string
  intersections: number
  avg_position: number | null
}

export interface GapSummary {
  new_issues: number
  fixed_issues: number
  keywords_gained: number
  keywords_lost: number
  rank_improvements: number
  rank_declines: number
}

async function fetchSeoData() {
  try {
    const [runsRes, issuesRes, keywordsRes, pagesRes, competitorsRes, gapRes] = await Promise.all([
      supabase.from('runs')
        .select('id, created_at, status, run_date, recommendations')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('issues')
        .select('id, issue_code, issue_type, severity, title, description, category, url, source, recommendation')
        .limit(60),
      supabase.from('domain_ranked_keywords')
        .select('id, keyword, search_volume, position, previous_position, difficulty, is_gap, intent, traffic')
        .order('search_volume', { ascending: false })
        .limit(100),
      supabase.from('pages')
        .select('url, title, meta_description, h1, word_count, is_indexable')
        .limit(15),
      supabase.from('competitor_domains')
        .select('domain, intersections, avg_position')
        .order('intersections', { ascending: false })
        .limit(8),
      supabase.from('gap_analyses')
        .select('new_issues, fixed_issues, keyword_volume_gained')
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const run = runsRes.data?.[0]
    let recos: SeoReco[] = []
    if (run?.recommendations) {
      try {
        recos = typeof run.recommendations === 'string'
          ? JSON.parse(run.recommendations)
          : run.recommendations
      } catch { /* ignore */ }
    }

    return {
      run,
      issues: (issuesRes.data ?? []) as SeoIssue[],
      keywords: (keywordsRes.data ?? []) as SeoKeyword[],
      pages: (pagesRes.data ?? []) as OnPageItem[],
      competitors: (competitorsRes.data ?? []) as CompetitorDomain[],
      gap: gapRes.data?.[0] ?? null,
      recos,
    }
  } catch {
    return { run: null, issues: [], keywords: [], pages: [], competitors: [], gap: null, recos: [] }
  }
}

// --- Mock data (shown when DB tables are empty) ---

const MOCK_ISSUES: SeoIssue[] = [
  { id: '1', severity: 'critical', title: 'Missing meta descriptions', description: '14 pages lack meta descriptions — direct CTR impact.', category: 'On-Page', issue_code: 'MISSING_META_DESCRIPTION' },
  { id: '2', severity: 'critical', title: 'LCP > 4s on product pages', description: 'Core Web Vitals failure on 8 product pages — ranking penalty risk.', category: 'Performance', issue_code: 'SLOW_LCP' },
  { id: '3', severity: 'high',     title: '3 broken internal links',  description: 'Return 404 — dilutes crawl budget and creates dead ends.', category: 'Technical', issue_code: 'BROKEN_INTERNAL_LINK' },
  { id: '4', severity: 'high',     title: 'Thin content on blog posts', description: '6 posts under 400 words — low ranking potential.', category: 'Content', issue_code: 'THIN_CONTENT' },
  { id: '5', severity: 'high',     title: 'Duplicate title tags',    description: '4 pages share identical titles — cannibalisation risk.', category: 'On-Page', issue_code: 'DUPLICATE_TITLE' },
  { id: '6', severity: 'medium',   title: 'Missing product schema',   description: '22 product pages lack JSON-LD schema — losing rich results.', category: 'Structured Data', issue_code: 'MISSING_PRODUCT_SCHEMA' },
  { id: '7', severity: 'medium',   title: 'Long redirect chains',    description: '5 URLs redirect through 3+ hops — slow and fragile.', category: 'Technical', issue_code: 'LONG_REDIRECT_CHAIN' },
  { id: '8', severity: 'low',      title: 'Images missing alt text',  description: '31 images without alt attributes — accessibility & image SEO.', category: 'On-Page', issue_code: 'MISSING_ALT_TEXT' },
]

const MOCK_KEYWORDS: SeoKeyword[] = [
  { id: '1',  keyword: 'pickleball',                      search_volume: 246000, difficulty: 72, position: 23,   previous_position: 28, is_gap: false, intent: 'commercial' },
  { id: '2',  keyword: 'pickleball paddles',              search_volume: 60500,  difficulty: 78, position: 7,    previous_position: 9,  is_gap: false, intent: 'commercial' },
  { id: '3',  keyword: 'best pickleball paddle',          search_volume: 40500,  difficulty: 82, position: 14,   previous_position: 17, is_gap: false, intent: 'commercial' },
  { id: '4',  keyword: 'ben johns paddle',                search_volume: 27100,  difficulty: 62, position: 1,    previous_position: 1,  is_gap: false, intent: 'commercial' },
  { id: '5',  keyword: 'pickleball shoes',                search_volume: 22200,  difficulty: 55, position: null, previous_position: null, is_gap: true, intent: 'commercial' },
  { id: '6',  keyword: 'pickleball rules',                search_volume: 22000,  difficulty: 32, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '7',  keyword: 'pickleball set',                  search_volume: 18100,  difficulty: 48, position: null, previous_position: null, is_gap: true, intent: 'transactional' },
  { id: '8',  keyword: 'pickleball courts near me',       search_volume: 14800,  difficulty: 35, position: null, previous_position: null, is_gap: true, intent: 'navigational' },
  { id: '9',  keyword: 'pickleball court',                search_volume: 12400,  difficulty: 38, position: null, previous_position: null, is_gap: true, intent: 'navigational' },
  { id: '10', keyword: 'pickleball apparel',              search_volume: 12100,  difficulty: 44, position: null, previous_position: null, is_gap: true, intent: 'commercial' },
  { id: '11', keyword: 'carbon fiber pickleball paddle',  search_volume: 9900,   difficulty: 55, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '12', keyword: 'pickleball tournament',           search_volume: 8800,   difficulty: 28, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '13', keyword: 'pickleball ball',                 search_volume: 8100,   difficulty: 48, position: 14,   previous_position: 22, is_gap: false, intent: 'transactional' },
  { id: '14', keyword: 'pickleball bag',                  search_volume: 8100,   difficulty: 40, position: null, previous_position: null, is_gap: true, intent: 'transactional' },
  { id: '15', keyword: 'pickleball grip tape',            search_volume: 6600,   difficulty: 34, position: null, previous_position: null, is_gap: true, intent: 'transactional' },
  { id: '16', keyword: 'pickleball paddle buying guide',  search_volume: 5400,   difficulty: 44, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '17', keyword: 'joola perseus pro v',             search_volume: 4400,   difficulty: 31, position: 2,    previous_position: 4,  is_gap: false, intent: 'navigational' },
  { id: '18', keyword: 'pickleball coaching',             search_volume: 4200,   difficulty: 25, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '19', keyword: 'outdoor pickleball paddle',       search_volume: 3900,   difficulty: 52, position: null, previous_position: null, is_gap: true, intent: 'commercial' },
  { id: '20', keyword: 'joola hyperion',                  search_volume: 3600,   difficulty: 28, position: 3,    previous_position: 5,  is_gap: false, intent: 'navigational' },
  { id: '21', keyword: 'pickleball training',             search_volume: 3600,   difficulty: 22, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '22', keyword: 'pickleball net',                  search_volume: 3300,   difficulty: 36, position: null, previous_position: null, is_gap: true, intent: 'transactional' },
  { id: '23', keyword: 'indoor pickleball paddle',        search_volume: 2900,   difficulty: 49, position: null, previous_position: null, is_gap: true, intent: 'commercial' },
  { id: '24', keyword: 'pickleball gloves',               search_volume: 2400,   difficulty: 31, position: null, previous_position: null, is_gap: true, intent: 'transactional' },
  { id: '25', keyword: 'pickleball tournament 2026',      search_volume: 1900,   difficulty: 22, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '26', keyword: 'how to play pickleball',          search_volume: 1600,   difficulty: 18, position: null, previous_position: null, is_gap: true, intent: 'informational' },
  { id: '27', keyword: 'joola ben johns hyperion',        search_volume: 1200,   difficulty: 26, position: 1,    previous_position: 2,  is_gap: false, intent: 'navigational' },
]

const MOCK_RECOS: SeoReco[] = [
  {
    title: 'Fix missing meta descriptions on 14 pages',
    description: 'Add unique, keyword-rich meta descriptions to all product and category pages. Estimated +12–18% CTR improvement.',
    priority: 'critical', tags: ['On-Page', 'CTR', 'Quick Win'],
    next_steps: ['Audit all pages via crawl report for blank meta_description', 'Write 150–160 char descriptions with primary keyword in first 60 chars', 'Prioritise product pages — highest traffic impact', 'Verify in GSC after 1–2 weeks for CTR uplift'],
    impact: 'High — direct CTR improvement on top 14 pages', effort: 'Low — 2–4 hours copywriting',
  },
  {
    title: 'Create content hub for "pickleball paddles"',
    description: 'Publish a comprehensive buying guide targeting the head term (60k/mo). Potential top-5 in 60–90 days with internal link cluster.',
    priority: 'high', tags: ['Content', 'Organic', 'Top Funnel'],
    next_steps: ['Research top 10 SERP results for structure and depth', 'Write 2,500+ word guide covering types, specs, price tiers', 'Link from all product pages as cornerstone', 'Update quarterly to maintain freshness signal'],
    impact: 'High — captures head term at 60.5k/mo search volume', effort: 'Medium — 1–2 days content creation',
  },
  {
    title: 'Resolve LCP issues on 8 product detail pages',
    description: 'Compress hero images and implement lazy loading. LCP < 2.5s required for Good CWV score and ranking signal.',
    priority: 'high', tags: ['Performance', 'CWV', 'Ranking Signal'],
    next_steps: ['Run PageSpeed Insights on each of the 8 failing pages', 'Convert hero images to WebP / AVIF at 800px max-width', 'Add loading="lazy" to below-fold images', 'Implement server-side image optimisation via next/image'],
    impact: 'High — fixes Core Web Vitals failure on 8 key product pages', effort: 'Medium — 4–8 hours engineering',
  },
  {
    title: 'Acquire 5 new DR 50+ backlinks via pickleball media',
    description: 'Competitor gap shows ~300 domain gap vs selkirk.com. Target pickleball publications for outreach to close authority gap.',
    priority: 'medium', tags: ['Link Building', 'Authority', 'Off-Page'],
    next_steps: ['Identify top 20 pickleball publications that link to competitors', 'Prepare outreach pitch with JOOLA Pro athlete content angles', 'Offer product reviews or exclusive interview content', 'Track DR and referring domain growth weekly'],
    impact: 'Medium — authority uplift over 3–6 months', effort: 'High — 1–2 weeks outreach effort',
  },
]

const MOCK_PAGES: OnPageItem[] = [
  { url: '/products/ben-johns-hyperion-pro', title: 'Ben Johns Hyperion Pro Pickleball Paddle | JOOLA', meta_description: null, h1: ['Ben Johns Hyperion Pro'], word_count: 450, is_indexable: true },
  { url: '/products/perseus-pro-v', title: 'Perseus Pro V Pickleball Paddle | JOOLA', meta_description: 'The Perseus Pro V paddle delivers unmatched power and touch for elite players.', h1: ['Perseus Pro V'], word_count: 380, is_indexable: true },
  { url: '/blog/pickleball-paddle-guide', title: 'Ultimate Pickleball Paddle Guide 2026', meta_description: null, h1: [], word_count: 1200, is_indexable: true },
  { url: '/collections/pickleball', title: null, meta_description: null, h1: ['Pickleball', 'Shop Pickleball'], word_count: 190, is_indexable: true },
  { url: '/products/joola-vision-cgfs', title: 'JOOLA Vision CGS-FS Pickleball Paddle | JOOLA', meta_description: 'JOOLA Vision CGS-FS — carbon fibre surface for precision control.', h1: ['Vision CGS-FS'], word_count: 320, is_indexable: true },
  { url: '/about', title: 'About JOOLA | Premium Sports Equipment', meta_description: 'JOOLA is a world-leading manufacturer of table tennis and pickleball equipment.', h1: ['About JOOLA'], word_count: 640, is_indexable: true },
]

const MOCK_COMPETITORS: CompetitorDomain[] = [
  { domain: 'selkirk.com',                intersections: 312, avg_position: 5.8 },
  { domain: 'paddletek.com',              intersections: 287, avg_position: 6.2 },
  { domain: 'pickleball-central.com',     intersections: 241, avg_position: 7.4 },
  { domain: 'engage-pickleball.com',      intersections: 198, avg_position: 8.1 },
  { domain: 'franklin-sports.com',        intersections: 156, avg_position: 9.3 },
]

const MOCK_GAP: GapSummary = {
  new_issues: 3, fixed_issues: 8, keywords_gained: 24,
  keywords_lost: 7, rank_improvements: 18, rank_declines: 9,
}

const MOCK_BACKLINKS: BacklinkSummary = {
  total_backlinks: 24820, referring_domains: 2847, dofollow_pct: 68, avg_domain_rating: 48,
}

export default async function SeoDashboardPage() {
  const { run, issues, keywords, pages, competitors, gap, recos } = await fetchSeoData()

  const finalIssues     = issues.length     > 0 ? issues     : MOCK_ISSUES
  const finalKeywords   = keywords.length   > 0 ? keywords   : MOCK_KEYWORDS
  const finalPages      = pages.length      > 0 ? pages      : MOCK_PAGES
  const finalCompetitors = competitors.length > 0 ? competitors : MOCK_COMPETITORS
  const finalRecos      = recos.length      > 0 ? recos      : MOCK_RECOS
  const finalGap        = gap ? {
    new_issues:       0,
    fixed_issues:     0,
    keywords_gained:  gap.keyword_volume_gained ?? 0,
    keywords_lost:    0,
    rank_improvements: 0,
    rank_declines:    0,
  } as GapSummary : MOCK_GAP

  const rankHistory = [6.2, 6.4, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 7.9, 8.0, 8.1, 8.3, 8.4]
  const latestRunDate = run?.run_date ?? run?.created_at ?? '2026-05-15T07:00:00'

  return (
    <SeoDashboardClient
      issues={finalIssues}
      keywords={finalKeywords}
      recommendations={finalRecos}
      backlinkSummary={MOCK_BACKLINKS}
      rankHistory={rankHistory}
      latestRunDate={latestRunDate}
      onPageItems={finalPages}
      competitors={finalCompetitors}
      gapSummary={finalGap}
    />
  )
}
