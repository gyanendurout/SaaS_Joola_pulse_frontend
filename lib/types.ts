export interface IgPost {
  post_id: string
  post_url: string
  post_type: string
  caption: string
  hashtags: string[]
  like_count: number
  comment_count: number
  view_count: number
  engagement_rate: number
  posted_at: string
  thumbnail_url: string
  day_of_week: string
  hour_of_day: number
  carousel_slide_count: number | null
  has_cta: boolean | null
  comments_first_hour: number | null
  comments_first_24h: number | null
}

export interface IgPostAnalysis {
  post_id: string
  content_theme: string
  content_subtheme: string | null
  shot_type: string
  setting: string
  post_intent: string
  sentiment_tone: string
  visual_quality_score: number
  caption_quality_score: number | null
  hashtag_relevance_score: number | null
  predicted_performance: string
  caption_summary: string
  athletes_shown: string[]
  products_shown: string[]
  cta_type: string | null
  is_sponsored: boolean | null
  sponsor_brand: string | null
  tournament_reference: string | null
}

export interface IgComment {
  comment_id: string
  post_id: string
  username: string
  comment_text: string
  commented_at: string
  is_reply: boolean
  is_joola_reply: boolean
  likes_on_comment: number
}

export interface IgCommentAnalysis {
  comment_id: string
  post_id: string
  username: string
  sentiment: string
  sentiment_score: number
  emotion: string
  primary_topic: string
  is_question: boolean
  question_text: string | null
  is_complaint: boolean
  complaint_category: string | null
  is_wishlist: boolean
  wishlist_text: string | null
  mentions_competitor: boolean
  competitor_mentioned: string | null
  competitor_context: string | null
  purchase_intent: boolean
  product_mentioned: string | null
  athlete_mentioned: string | null
}

export interface IgLoyalUser {
  username: string
  total_comments: number
  total_posts_commented_on: number
  avg_sentiment_score: number
  dominant_emotion: string
  dominant_topic: string | null
  loyalty_tier: string
  ambassador_score: number
  is_potential_ambassador: boolean
  praise_count: number
  complaint_count: number
  question_count: number | null
  purchase_intent_count: number | null
  competitor_mention_count: number | null
  wishlist_count: number | null
  also_comments_on_competitors: boolean | null
  first_seen_at: string
  last_seen_at: string
  active_months: number
  follower_count: number | null
  is_verified: boolean | null
  is_business_account: boolean | null
  is_potential_influencer: boolean | null
}

export interface IgUserPostActivity {
  username: string
  post_id: string
  comment_count_on_post: number
  avg_sentiment_on_post: number
}

export interface IgHashtagPerformance {
  hashtag: string
  times_used: number
  avg_like_count: number
  avg_comment_count: number
  avg_engagement_rate: number
  best_post_id: string
}

export interface IgProductMention {
  post_id: string
  product_name: string
  source: string
  sentiment: string
  mention_context: string
}

export interface IgAthleteMention {
  post_id: string
  athlete_name: string
  source: string
  sentiment: string
}

export interface IgCompetitorMention {
  comment_id: string
  post_id: string
  username: string
  competitor_name: string
  full_comment_text: string
  sentiment_toward_joola: string
  mentioned_at: string
}

export interface IgComplaintLog {
  comment_id: string
  post_id: string
  username: string
  complaint_category: string
  complaint_text: string
  severity: string
  joola_responded: boolean
  complained_at: string
}

export interface IgWishlistItem {
  comment_id: string
  post_id: string
  username: string
  wishlist_text: string
  category: string
  product_reference: string | null
  request_summary: string | null
  times_similar_requested: number | null
  requested_at: string
}

export interface IgJoolaReply {
  post_id: string
  reply_text: string
  original_username: string
  replied_at: string
  response_time_mins: number
}

export interface IgWeeklySnapshot {
  week_start: string
  week_end: string
  posts_published: number
  total_likes: number
  total_comments: number
  total_views: number
  avg_engagement_rate: number
  positive_comment_pct: number
  negative_comment_pct: number
  neutral_comment_pct: number
  avg_sentiment_score: number
  complaint_count: number
  purchase_intent_count: number
  competitor_mention_count: number
  wishlist_count: number | null
  joola_reply_count: number | null
  avg_joola_response_time_mins: number | null
  dominant_content_theme: string | null
  top_post_id: string | null
  top_post_engagement: number | null
  new_commenters: number | null
  returning_commenters: number | null
  top_emotion: string | null
  new_super_fans: number | null
}
