/**
 * Pure recommendation engine for the Content Studio composer.
 *
 * Given the currently-selected signals + the preview data, returns the
 * suggested Tone / Audience / Length / CTA goal with a human-readable
 * reason per field. Pure function — no side effects, no backend call.
 *
 * Rules priority (first match wins per field):
 *   1. CRISIS — any selected news article with negative sentiment OR a
 *      risk-/crisis-flagged suggested_action.
 *   2. CELEBRATION — JOOLA-mention news that's positive, OR athlete-win
 *      top posts with ER ≥ 5%.
 *   3. HYPE — product-launch / paddle-drop top post themes.
 *   4. EDUCATIONAL — tutorial/technique top posts OR gap SEO keywords.
 *   5. INFORMATIVE — fallback default.
 */

import type {
  Audience,
  CtaGoal,
  Length,
  NewsSignal,
  SelectedSignals,
  SignalsPreview,
  Tone,
  TopPostSignal,
} from './types'

export interface Recommendation {
  tone?: Tone
  audience?: Audience
  length?: Length
  cta_goal?: CtaGoal
  reasons: Partial<Record<'tone' | 'audience' | 'length' | 'cta_goal', string>>
}

function asNews(preview: SignalsPreview, ids: Set<string>): NewsSignal[] {
  return preview.news.filter(n => ids.has(n.id))
}

function asPosts(preview: SignalsPreview, ids: Set<string>): TopPostSignal[] {
  return preview.top_posts.filter(p => ids.has(p.post_id))
}

function isNegative(s: string | null): boolean {
  if (!s) return false
  const v = s.toLowerCase()
  return v.includes('negative') || v === 'crisis'
}

function isPositive(s: string | null): boolean {
  if (!s) return false
  return s.toLowerCase().includes('positive')
}

function isCrisisLikeAction(action: string | null): boolean {
  if (!action) return false
  const v = action.toLowerCase()
  return v.includes('crisis') || v.includes('risk') || v.includes('respond') || v.includes('defen')
}

export function recommendStyle(
  selected: SelectedSignals,
  preview: SignalsPreview,
): Recommendation {
  const news = asNews(preview, selected.news)
  const posts = asPosts(preview, selected.top_posts)
  const gapKeyword = Array.from(selected.seo).find(kw => {
    const s = preview.seo_keywords.find(k => k.keyword === kw)
    return s?.is_gap
  })

  const rec: Recommendation = { reasons: {} }

  // --- TONE (priority cascade) -------------------------------------------
  const crisisNews = news.find(n => isNegative(n.sentiment) || isCrisisLikeAction(n.suggested_action))
  const celebrationNews = news.find(n => n.is_joola_mention && isPositive(n.sentiment))
  const winPost = posts.find(p => (p.content_theme ?? '').toLowerCase().includes('win') && p.engagement_rate >= 0.05)
  const launchPost = posts.find(p => /launch|drop|release|product/i.test(p.content_theme ?? ''))
  const tutorialPost = posts.find(p => /tutorial|technique|how|drill|tip/i.test(p.content_theme ?? ''))

  if (crisisNews) {
    rec.tone = 'defensive'
    rec.reasons.tone = `News "${crisisNews.title.slice(0, 40)}…" is ${crisisNews.sentiment ?? 'flagged'}`
    rec.audience = 'press_media'
    rec.reasons.audience = 'Crisis topics typically land with press/media first'
    rec.length = 'medium'
    rec.reasons.length = 'Crisis replies need room to clarify facts'
    rec.cta_goal = 'reply'
    rec.reasons.cta_goal = 'Invite a direct reply, don\'t push a product link'
  } else if (celebrationNews) {
    rec.tone = 'celebratory'
    rec.reasons.tone = `Positive JOOLA mention: "${celebrationNews.title.slice(0, 40)}…"`
    rec.audience = 'general_fans'
    rec.reasons.audience = 'Fan-facing win'
    rec.length = 'short'
    rec.reasons.length = 'Celebrations are most shareable when tight'
    rec.cta_goal = 'shop'
    rec.reasons.cta_goal = 'Capitalize on the moment with a product link'
  } else if (winPost) {
    rec.tone = 'celebratory'
    rec.reasons.tone = `Athlete-win post (ER ${(winPost.engagement_rate * 100).toFixed(1)}%)`
    rec.audience = 'general_fans'
    rec.length = 'short'
    rec.cta_goal = 'shop'
  } else if (launchPost) {
    rec.tone = 'hype'
    rec.reasons.tone = `Product launch theme: "${launchPost.content_theme ?? ''}"`
    rec.audience = 'recreational'
    rec.length = 'short'
    rec.cta_goal = 'shop'
  } else if (tutorialPost) {
    rec.tone = 'educational'
    rec.reasons.tone = `Tutorial/technique post: "${tutorialPost.content_theme ?? ''}"`
    rec.audience = 'coaches'
    rec.length = 'medium'
    rec.cta_goal = 'signup'
  } else if (gapKeyword) {
    rec.tone = 'educational'
    rec.reasons.tone = `Targeting SEO gap keyword "${gapKeyword}"`
    rec.audience = 'recreational'
    rec.reasons.audience = 'SEO gaps usually hit search beginners'
    rec.length = 'long'
    rec.reasons.length = 'Gap-fill blog should rank — go long'
    rec.cta_goal = 'signup'
  }

  return rec
}
