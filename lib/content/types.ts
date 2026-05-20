/**
 * Shared TypeScript types for the Content Generation feature.
 *
 * These mirror the Pydantic models in `backend/app/content/types.py` (Track A).
 * Both sides implement against this contract — keep field names + value sets
 * identical. Enums are encoded as TypeScript string-literal unions (not
 * `const enum`) for cross-module compatibility.
 *
 * Spec reference:
 *   docs/superpowers/specs/2026-05-19-content-generation-design.md
 *   §4 (data model + API), §5 (signal preview sub-types), §8 (risk flags),
 *   §11 (locked defaults).
 */

// =============================================================================
// Enums (string-literal unions)
// =============================================================================

export type ContentType = 'blog' | 'ig_post' | 'twitter_response'

export type DraftStatus = 'draft' | 'approved' | 'published' | 'archived'

export type Tone =
  | 'informative'
  | 'hype'
  | 'celebratory'
  | 'defensive'
  | 'educational'
  | 'promotional'

export type Audience =
  | 'recreational'
  | 'tournament'
  | 'coaches'
  | 'parents_juniors'
  | 'general_fans'
  | 'press_media'

export type Length = 'short' | 'medium' | 'long'

export type CtaGoal = 'shop' | 'signup' | 'reply' | 'none'

export type SignalSource = 'seo' | 'top_posts' | 'news' | 'reddit' | 'free_prompt'

// =============================================================================
// Signals — what the user can pick into the prompt context
// =============================================================================

export interface SignalsConfig {
  use_seo_keywords: boolean
  use_top_posts: boolean
  use_news: boolean
  use_reddit: boolean
  use_loyal_fans: boolean
  use_player_roster: boolean
  selected_seo_keywords?: string[] // keyword strings
  selected_top_post_ids?: string[]
  selected_news_ids?: string[]
  selected_reddit_ids?: string[]
}

export interface SeoSignal {
  keyword: string
  search_volume: number | null
  position: number | null
  is_gap: boolean
  difficulty: number | null
}

export type TopPostPlatform = 'instagram' | 'tiktok' | 'twitter' | 'youtube'

export interface TopPostSignal {
  post_id: string
  platform: TopPostPlatform
  content_theme: string | null
  engagement_rate: number // 0–1 fraction (best-effort across platforms)
  likes: number | null
  views: number | null
  comments: number | null
  caption_first_line: string | null
  thumbnail_url: string | null
  post_type: string | null
  posted_at: string | null
  url: string | null
}

export interface NewsSignal {
  id: string
  title: string
  ai_summary: string | null
  why_it_matters: string | null
  players_mentioned: string[]
  suggested_action: string | null
  sentiment: string | null
  is_joola_mention: boolean
  importance_score: number | null
  url: string | null
  published_at: string | null
}

export interface RedditSignal {
  id: string
  title: string
  subreddit: string
  topics: string[] | null
  sentiment: string | null
  is_crisis: boolean
  is_opportunity: boolean
  excerpt: string | null
  url: string | null
  created_at: string | null
}

export interface SignalsPreview {
  seo_keywords: SeoSignal[]
  top_posts: TopPostSignal[]
  news: NewsSignal[]
  /** @deprecated kept for backward compat with old draft snapshots; UI no longer surfaces Reddit. */
  reddit?: RedditSignal[]
}

// =============================================================================
// Templates + brand voice
// =============================================================================

export interface Template {
  id: string
  name: string
  content_type: ContentType
  system_prompt: string
  user_prompt_template: string
  is_active: boolean
  created_at: string
}

export interface BrandVoice {
  id: string
  tone: string[]
  banned_words: string[]
  signature_phrases: string[]
  default_ctas: string[]
  forbidden_patterns: string[]
  updated_at: string
}

// =============================================================================
// Generation API — request / response
// =============================================================================

export interface GenerateRequest {
  content_type: ContentType
  template_id?: string
  signals_config: SignalsConfig
  source_article_id?: string
  source_reddit_id?: string
  instructions?: string
  tone: Tone
  length: Length
  audience: Audience
  cta_goal: CtaGoal
}

export interface GenerateResponse {
  draft_id: string
  body: string
  title?: string | null
  hashtags?: string[] | null
  run_id: string
  cost_usd: number
}

// =============================================================================
// Risk flags + brand voice score (spec §8)
// =============================================================================

export type RiskSeverity = 'block' | 'warn'

export interface RiskFlag {
  code: string
  severity: RiskSeverity
  message: string
  highlight_text?: string | null
}

export interface BrandVoiceMeta {
  score: number | null // 0-100
  flags: RiskFlag[]
}

// =============================================================================
// Draft
// =============================================================================

export interface DraftMetadata {
  format?: ContentType
  tone?: Tone
  length?: Length
  audience?: Audience
  cta_goal?: CtaGoal
  word_count?: number
  gen_ms?: number
  brand_voice?: BrandVoiceMeta
  hook?: string | null
  cta?: string | null
  meta_description?: string | null
  alt_text?: string | null
  alternate?: string | null
  variant_label?: string | null
  [key: string]: unknown
}

export interface Draft {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  content_type: ContentType
  status: DraftStatus
  title: string | null
  body: string
  hashtags: string[] | null
  metadata: DraftMetadata
  source_article_id: string | null
  source_signal_snapshot: SignalsPreview | null
  generation_run_id: string | null
  parent_draft_id: string | null
  version: number
}

export interface DraftUpdate {
  body?: string
  title?: string | null
  hashtags?: string[] | null
  status?: DraftStatus
  metadata?: DraftMetadata
}

export interface DraftListResponse {
  drafts: Draft[]
  total: number
}

// =============================================================================
// SSE event payloads emitted by /api/content/generate/stream
// =============================================================================

export interface SseMetaEvent {
  type: 'meta'
  run_id: string
  variant_count: number
  variant_index?: number
  content_type: ContentType
}

export interface SseTokenEvent {
  type: 'token'
  text: string
  variant_index?: number
}

export interface SseDoneEvent {
  type: 'done'
  draft_id: string
  body: string
  title?: string | null
  hashtags?: string[] | null
  cost_usd: number
  brand_voice?: BrandVoiceMeta
}

export interface SseErrorEvent {
  type: 'error'
  message: string
  code?: string
  retry_after_seconds?: number
}

export type SseEvent = SseMetaEvent | SseTokenEvent | SseDoneEvent | SseErrorEvent

// =============================================================================
// UI-only helpers
// =============================================================================

/**
 * Maps a `SignalSource` tab to the Set of selected ids for that source.
 * Used by `<SignalPickerTabs>` and the composer's selection reducer.
 */
export type SelectedSignals = Record<SignalSource, Set<string>>

export const EMPTY_SELECTED_SIGNALS = (): SelectedSignals => ({
  seo: new Set(),
  top_posts: new Set(),
  news: new Set(),
  reddit: new Set(),
  free_prompt: new Set(),
})

export const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'informative', label: 'Informative', description: 'Factual, neutral — newsy launches and explainers.' },
  { value: 'hype', label: 'Hype', description: 'High-energy. Tournament wins, paddle drops, big moments.' },
  { value: 'celebratory', label: 'Celebratory', description: 'Athlete wins, milestone congratulations.' },
  { value: 'defensive', label: 'Crisis / Defensive', description: 'Factual response to a complaint or news risk.' },
  { value: 'educational', label: 'Educational', description: 'How-to, tips, technique breakdowns.' },
  { value: 'promotional', label: 'Promotional', description: 'Direct product sell, BOGO, limited drops.' },
]

export const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'recreational', label: 'Recreational (3.0–3.5)' },
  { value: 'tournament', label: 'Tournament (4.0+)' },
  { value: 'coaches', label: 'Coaches' },
  { value: 'parents_juniors', label: 'Parents of juniors' },
  { value: 'general_fans', label: 'General fans' },
  { value: 'press_media', label: 'Press / media' },
]

export const LENGTH_OPTIONS: { value: Length; label: string; ig: string; blog: string; tweet: string }[] = [
  { value: 'short',  label: 'Short',  ig: '~80 words',  blog: '~800 words',  tweet: '~140 chars' },
  { value: 'medium', label: 'Medium', ig: '~140 words', blog: '~1100 words', tweet: '~220 chars' },
  { value: 'long',   label: 'Long',   ig: '~200 words', blog: '~1400 words', tweet: '~270 chars' },
]

export const CTA_OPTIONS: { value: CtaGoal; label: string }[] = [
  { value: 'shop', label: 'Shop / product link' },
  { value: 'signup', label: 'Sign-up / waitlist' },
  { value: 'reply', label: 'Invite reply' },
  { value: 'none', label: 'No CTA' },
]

export const FORMAT_OPTIONS: { value: ContentType; label: string; description: string }[] = [
  { value: 'ig_post', label: 'Instagram', description: 'Caption + hashtag block, 80–220 words.' },
  { value: 'blog', label: 'Blog', description: 'Long-form for joola.com, 800–1400 words.' },
  { value: 'twitter_response', label: 'Tweet', description: 'Single reply, ≤270 chars.' },
]
