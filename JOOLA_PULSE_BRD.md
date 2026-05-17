# Business Requirements Document
## JOOLA Pulse — Own-Brand Digital Intelligence Platform

**Version:** 1.0  
**Date:** May 2026  
**Prepared for:** JOOLA  
**Classification:** Internal

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Problem Statement](#2-business-context--problem-statement)
3. [Goals & Success Criteria](#3-goals--success-criteria)
4. [Scope](#4-scope)
5. [Users & Stakeholders](#5-users--stakeholders)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Sources & Integrations](#8-data-sources--integrations)
9. [System Architecture](#9-system-architecture)
10. [Feature Roadmap](#10-feature-roadmap)
11. [Data Privacy & Compliance](#11-data-privacy--compliance)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Glossary](#13-glossary)

---

## 1. Executive Summary

JOOLA Pulse is an internal digital intelligence platform that consolidates JOOLA's own-brand performance data across two primary channels: **Instagram social media** and **organic search (SEO)**. It replaces ad-hoc spreadsheet reporting and disconnected third-party tools with a single, real-time dashboard purpose-built for JOOLA's marketing and growth teams.

The platform surfaces actionable intelligence — not raw data — enabling marketing managers, content strategists, and brand executives to make faster, evidence-based decisions about content, SEO investment, fan engagement, and brand health.

JOOLA Pulse is scoped exclusively to **JOOLA's own brand performance**. Competitor benchmarking is explicitly out of scope for this document.

---

## 2. Business Context & Problem Statement

### 2.1 Background

JOOLA operates a growing Instagram presence and relies on organic search as a primary acquisition channel. Currently, performance insights are scattered across:

- Native Instagram Insights (limited historical depth, no comment intelligence)
- Google Search Console (keyword data only, no AI enrichment)
- Manual monthly exports processed in Excel/Sheets
- Ad-hoc Python scripts with no shared access

### 2.2 Pain Points

| Pain Point | Impact |
|---|---|
| No unified view of Instagram engagement + SEO health | Marketing team works in silos |
| Comment data is unread at scale | Complaints, purchase intent, and fan signals go unnoticed |
| SEO issues are discovered reactively | Organic traffic lost before problems are surfaced |
| No fan identification or loyalty tracking | Ambassador and partnership opportunities missed |
| Reporting takes days, not hours | Leadership decisions are based on stale data |

### 2.3 Opportunity

By combining real-time Instagram comment intelligence with automated SEO auditing, JOOLA can:

- Identify and activate high-value fans before competitors do
- Fix SEO issues within days, not quarters
- Understand what content resonates and replicate it
- Respond to complaints before they escalate publicly

---

## 3. Goals & Success Criteria

### 3.1 Primary Goals

1. **Unified visibility** — All brand performance metrics in one authenticated dashboard
2. **Automated intelligence** — AI-driven sentiment, topic, and issue detection (no manual tagging)
3. **Actionable output** — Every metric panel surfaces a recommended action or next step
4. **Operational speed** — Marketing team can act on insights within the same business day

### 3.2 Success Criteria (measured at 90-day post-launch)

| Metric | Target |
|---|---|
| Time to generate weekly performance report | < 5 minutes (from ~2 days) |
| Complaint response rate (Instagram) | ≥ 80% within 48 hours |
| SEO issues identified and triaged | 100% of critical issues flagged within 24 hours of crawl |
| Ambassador pipeline activation | ≥ 10 potential ambassadors identified per quarter |
| Dashboard weekly active users (internal) | ≥ 5 team members |

---

## 4. Scope

### 4.1 In Scope

**Instagram Intelligence Module**
- Post performance analytics (engagement rate, reach, views, post type breakdown)
- Comment sentiment analysis (positive / neutral / negative, scored –1.0 to +1.0)
- Fan loyalty classification (Super Fan, Regular Fan tiers)
- Ambassador scoring and pipeline
- Complaint detection and response tracking
- Purchase intent signal detection
- Posting-time optimization heatmap
- Fan tenure and retention analytics
- Content calendar (engagement-by-date visualization)

**SEO Intelligence Module**
- Automated site crawl and technical issue detection
- Keyword research and ranking analysis
- SERP position tracking for target keywords
- Backlink profile analysis
- Google Search Console (GSC) integration for click/impression/CTR data
- AI-generated SEO recommendations
- Historical run comparison (trend over multiple crawls)
- **News & Media Intelligence** — automated pickleball media scraping with AI classification (JOOLA mention detection, sponsored-player mention tracking, competitor mention surveillance, sentiment + importance scoring, suggested action routing)

### 4.2 Out of Scope

- Competitor brand tracking or benchmarking
- Paid social or Google Ads performance
- Email marketing analytics
- TikTok, YouTube, or other social channels (Phase 2 candidate)
- E-commerce conversion tracking
- Content publishing or scheduling (read-only intelligence only)

---

## 5. Users & Stakeholders

### 5.1 Primary Users

| Role | Primary Use Cases |
|---|---|
| **Marketing Manager** | Weekly performance review, campaign ROI, content strategy |
| **Content Strategist** | Best posting times, top-performing topics, content calendar |
| **Community Manager** | Complaint triage, fan identification, purchase intent follow-up |
| **SEO Specialist** | Technical issue queue, keyword gaps, backlink health |
| **Brand Executive** | KPI dashboards, trend snapshots, ambassador pipeline |

### 5.2 Stakeholders

- **JOOLA Marketing Leadership** — Platform sponsor; defines KPI targets
- **IT / Engineering** — Infrastructure, security, Supabase database management
- **Legal / Privacy** — Data retention policies, Instagram API compliance

---

## 6. Functional Requirements

### 6.1 Instagram Intelligence Module

#### 6.1.1 Overview Dashboard

- **FR-IG-01**: Display top-level KPIs: Total Posts, Total Comments, Average Engagement Rate, Unique Fans, Potential Ambassadors, Total Complaints with response rate
- **FR-IG-02**: Weekly trend charts for posts published, engagement rate, and total views (last 12 weeks)
- **FR-IG-03**: Sentiment distribution donut chart across all comment analysis
- **FR-IG-04**: Post type breakdown (image, video, reel, carousel) donut chart
- **FR-IG-05**: Posting-time heatmap — 7 days × 24 hours grid, cells colored by average engagement rate; identifies optimal publishing windows
- **FR-IG-06**: Content calendar — 26-week GitHub-style grid, cells colored by average engagement rate per posting date

#### 6.1.2 Posts Module

- **FR-IG-07**: Paginated, sortable table of all posts with: post ID, type, engagement rate, view count, like count, comment count, posted date
- **FR-IG-08**: Filter by post type and date range
- **FR-IG-09**: Per-athlete engagement breakdown (average engagement rate by athlete tagged)
- **FR-IG-10**: Per-product engagement breakdown (average engagement rate by product mentioned)

#### 6.1.3 Comments Module

- **FR-IG-11**: Paginated, sortable, filterable table of all comments with: username, comment text, sentiment, sentiment score, primary topic, emotion, likes, date, post link
- **FR-IG-12**: Filter comments by sentiment (positive / neutral / negative)
- **FR-IG-13**: Sentiment distribution and topic distribution charts
- **FR-IG-14**: Purchase Intent Signals panel — comments where AI detected intent to buy, surfaced separately with post context
- **FR-IG-15**: Sentiment scoring methodology explanation rendered inline

#### 6.1.4 Fans Module

- **FR-IG-16**: KPI cards for Super Fans count, Regular Fans count, Potential Ambassadors count
- **FR-IG-17**: Fan tenure distribution bar chart (1–2 mo, 3–6 mo, 7–12 mo, 13+ mo active months)
- **FR-IG-18**: Ambassador scoring explanation panel with tier definitions (Top Ambassador ≥ 7.5, Strong Candidate 7.0–7.4, Emerging Fan 6.5–6.9, Regular Fan < 6.5)
- **FR-IG-19**: Potential Ambassadors table with: rank, username (linked to Instagram profile), posts commented on, praise count, dominant emotion, ambassador score badge
- **FR-IG-20**: All Fans table with: username, loyalty tier badge, posts commented on, avg sentiment score, active months, first seen date

#### 6.1.5 Complaints Module

- **FR-IG-21**: Complaint list with: username, comment text, detection date, response status (responded / not responded)
- **FR-IG-22**: Response rate KPI and trend
- **FR-IG-23**: Mark complaint as responded (write action — Phase 2)

#### 6.1.6 Ambassador Pipeline (Phase 2)

- **FR-IG-24**: Status workflow: Identified → Contacted → Active → Inactive
- **FR-IG-25**: Notes field per ambassador candidate
- **FR-IG-26**: CSV export of ambassador pipeline

### 6.2 SEO Intelligence Module

#### 6.2.1 Analysis Pipeline

- **FR-SEO-01**: User initiates analysis by entering a target URL
- **FR-SEO-02**: 10-step automated pipeline executes: Fetch → Parse → Detect Issues → Extract Entities → Keyword Research → SERP Analysis → AI Recommendations → Domain Rankings → Competitor Domains → Backlinks
- **FR-SEO-03**: Real-time progress displayed via Server-Sent Events (SSE); each pipeline step shows status (pending / running / complete / error)
- **FR-SEO-04**: Completed analysis stored and retrievable by run ID
- **FR-SEO-05**: Historical run list with timestamps; user can compare runs over time

#### 6.2.2 SEO Dashboard

- **FR-SEO-06**: Technical issues list with severity (critical / warning / info), category, affected element, and recommendation
- **FR-SEO-07**: Keyword opportunities table: keyword, search volume, difficulty, current position (if ranked), gap flag
- **FR-SEO-08**: SERP results for target keywords: position, title, URL, featured snippet flag
- **FR-SEO-09**: Domain ranking history chart (position over time for tracked keywords)
- **FR-SEO-10**: Backlink profile summary: total backlinks, referring domains, authority distribution, dofollow/nofollow split
- **FR-SEO-11**: Google Search Console panel: impressions, clicks, CTR, average position (last 28 days vs prior period)
- **FR-SEO-12**: AI Recommendations panel: prioritized list of actionable SEO improvements with implementation guidance
- **FR-SEO-13**: Gap Analysis — keywords driving traffic to identified top-ranking pages that JOOLA does not rank for

#### 6.2.3 GSC Integration

- **FR-SEO-14**: OAuth 2.0 authentication flow for Google Search Console
- **FR-SEO-15**: Property selection (JOOLA domain)
- **FR-SEO-16**: Automatic data refresh on each analysis run

#### 6.2.4 News & Media Intelligence

- **FR-SEO-17**: Operator triggers a scrape run from the In News page; backend returns a `run_id` immediately and processes asynchronously
- **FR-SEO-18**: Real-time scrape progress via SSE: sites scraped / total, articles found / new / with mentions, JOOLA-related articles, per-source successes and failures
- **FR-SEO-19**: Article extraction pulls title, excerpt, author, publication date, OG image, and full content from a registry of pickleball news sources (`news_sources` table)
- **FR-SEO-20**: AI enrichment per article: sentiment (positive / negative / risk / informative / neutral / mixed), sentiment score, importance score (0–100), executive summary, "why it matters" rationale, suggested action label
- **FR-SEO-21**: Entity detection: JOOLA brand mention (true/false), sponsored players mentioned (35-name canonical list), competitors mentioned (Selkirk, Head, Franklin, etc.), JOOLA mention context snippet
- **FR-SEO-22**: Relevance classification per article (Direct JOOLA News, Sponsored Player News, Product/Brand News, Tournament/Performance News, Competitive News, Industry News, Not Relevant)
- **FR-SEO-23**: Articles tab: filterable card grid by period (90 / 120 / 150 / 180 days), tone, mention type, relevance, suggested action, source, player, free-text search; sortable by date or importance; CSV export of the filtered set
- **FR-SEO-24**: Article detail modal: full AI summary, "why it matters", JOOLA mention context, players + competitors mentioned, suggested action, link to original
- **FR-SEO-25**: Smart Insights banner: AI-generated narrative summarizing the current filtered set (top player, top source, risk count, positive count, competitor count)
- **FR-SEO-26**: Analytics tab: Player Media Visibility leaderboard (stacked bar: positive / informative / negative per player), Sentiment Mix bar chart, Relevance Types bar chart
- **FR-SEO-27**: Sources tab: per-source coverage table — total articles, JOOLA mentions, player mentions, competitor mentions, positive, negative
- **FR-SEO-28**: Duplicate detection via `content_hash` (SHA-256 of normalized title + excerpt) to avoid re-processing the same article across runs
- **FR-SEO-29**: Per-source error log written to `news_scrape_errors` and surfaced in run history

---

## 7. Non-Functional Requirements

### 7.1 Performance

- **NFR-01**: Dashboard initial load < 3 seconds (P95) on standard broadband
- **NFR-02**: Supabase queries return within 1 second for pre-aggregated data
- **NFR-03**: SEO pipeline completes within 5 minutes for a standard domain (< 1,000 indexed pages)
- **NFR-04**: SSE progress updates delivered within 2 seconds of each pipeline step completion

### 7.2 Reliability

- **NFR-05**: Dashboard availability ≥ 99.5% uptime (internal tool SLA)
- **NFR-06**: SEO pipeline failures are isolated per step; partial results are saved and surfaced
- **NFR-07**: Supabase real-time subscriptions reconnect automatically on drop

### 7.3 Security

- **NFR-08**: All dashboard routes protected behind authentication (Supabase Auth or equivalent)
- **NFR-09**: Supabase Row Level Security (RLS) enforced on all tables
- **NFR-10**: API keys (DataForSEO, OpenAI, Supabase) stored in environment variables; never exposed client-side
- **NFR-11**: GSC OAuth tokens stored securely server-side; refresh token rotation enforced
- **NFR-12**: No PII (commenter usernames treated as pseudonyms; no email/phone stored)

### 7.4 Scalability

- **NFR-13**: Instagram data tables designed to support up to 500,000 comments without query degradation
- **NFR-14**: SEO analysis runs stored with full JSON payloads; old runs prunable after 90 days

### 7.5 Accessibility & UX

- **NFR-15**: Dark theme UI consistent across all modules (`#0a0a0f` background, `#00d4ff` accent)
- **NFR-16**: All interactive elements keyboard-navigable; mouse-click focus rings suppressed (focus-visible only)
- **NFR-17**: All data tables support client-side sorting and pagination
- **NFR-18**: Responsive layout — usable on 1280px+ desktop; mobile is read-only acceptable

---

## 8. Data Sources & Integrations

### 8.1 Instagram Data (Supabase Tables)

| Table | Description |
|---|---|
| `joola_ig_posts` | All Instagram posts: post_id, type, engagement_rate, views, likes, comments, posted_at, day_of_week, hour_of_day |
| `joola_ig_comments` | Raw comments: comment_id, post_id, username, comment_text, likes_on_comment, commented_at |
| `joola_ig_comment_analysis` | AI analysis per comment: sentiment, sentiment_score, primary_topic, emotion, is_question, is_complaint, purchase_intent |
| `joola_ig_loyal_users` | Classified fans: username, loyalty_tier, ambassador_score, active_months, first_seen_at, is_potential_ambassador |
| `joola_ig_complaint_log` | Detected complaints: comment_id, joola_responded, responded_at |
| `joola_ig_weekly_snapshot` | Pre-aggregated weekly metrics: posts_published, avg_engagement_rate, total_views, sentiment breakdowns |
| `joola_ig_wishlist_items` | Wishlist signals extracted from comments |

### 8.1b News Intelligence Data (Supabase Tables)

| Table | Description |
|---|---|
| `news_articles` | One row per article: url (unique), title, excerpt, ai_summary, why_it_matters, sentiment, sentiment_score, importance_score, is_joola_mention, joola_context, players_mentioned (array), competitors_mentioned (array), has_competitor_mention, relevance_type, suggested_action, source_site, published_at, scraped_at, content_hash |
| `news_scrape_runs` | Per-run record: status, started_at, finished_at, sites_total, sites_scraped, articles_found, articles_new, articles_with_mentions, joola_related_articles, successful_sources, failed_sources |
| `news_sources` | Site registry: domain, name, scraper_strategy, authority_score, last_success_at, last_failed_at |
| `news_scrape_errors` | Per-site error log linked to a scrape run: source_site, error_type, message, http_status |

### 8.2 SEO Data

| Source | Data Retrieved |
|---|---|
| **DataForSEO API** | Keyword search volume, difficulty, SERP results, domain rankings, backlinks |
| **Google Search Console API** | Impressions, clicks, CTR, average position by query and page |
| **OpenAI API** | AI-generated recommendations, entity extraction, gap analysis narratives, article sentiment + importance + summary |
| **Custom crawler (Python/FastAPI)** | On-page HTML parsing, technical issue detection |
| **News scraper (Python/FastAPI)** | Pickleball news sites (`news_sources` registry); BeautifulSoup + httpx extraction with retry/backoff per source |

### 8.3 Infrastructure

| Component | Technology |
|---|---|
| Frontend (Instagram dashboard) | Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts |
| Frontend (SEO dashboard) | Next.js 14, TypeScript, Tailwind CSS |
| Backend (SEO pipeline) | Python, FastAPI, Server-Sent Events |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (frontend), Cloud VM or Railway (FastAPI backend) |
| Auth | Supabase Auth |

---

## 9. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JOOLA Pulse Frontend                     │
│                     (Next.js 14 App Router)                     │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  Instagram Module    │    │       SEO Module             │   │
│  │  /overview           │    │  /analyze/[id]/dashboard     │   │
│  │  /posts              │    │  /analyze (new run)          │   │
│  │  /comments           │    │                              │   │
│  │  /fans               │    │  SSE progress stream         │   │
│  │  /complaints         │    └──────────────┬───────────────┘   │
│  └──────────┬───────────┘                   │                   │
│             │                               │                   │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
              ▼                               ▼
   ┌──────────────────┐           ┌───────────────────────┐
   │  Supabase        │           │  FastAPI Backend       │
   │  (PostgreSQL)    │           │  (SEO Pipeline)        │
   │                  │           │                        │
   │  joola_ig_*      │           │  10-step pipeline      │
   │  tables          │           │  DataForSEO API        │
   │                  │           │  OpenAI API            │
   │  Row Level       │           │  GSC OAuth             │
   │  Security        │           │  Crawler               │
   └──────────────────┘           └───────────────────────┘
```

### 9.1 Data Flow — Instagram

```
Instagram API / Data Export
         │
         ▼
   Ingestion scripts (Python)
         │
         ▼
   Supabase tables (raw data)
         │
         ▼
   AI enrichment (OpenAI) → comment_analysis, loyal_users
         │
         ▼
   Next.js server components (aggregate + query)
         │
         ▼
   Client components (charts, tables, filters)
```

### 9.2 Data Flow — SEO

```
User enters URL
      │
      ▼
 FastAPI /analyze endpoint
      │
      ▼
 Pipeline steps (sequential, with SSE events):
 1. Fetch page HTML
 2. Parse DOM structure
 3. Detect technical issues
 4. Extract named entities
 5. Keyword research (DataForSEO)
 6. SERP analysis (DataForSEO)
 7. AI recommendations (OpenAI)
 8. Domain rankings (DataForSEO)
 9. Competitor domain detection
10. Backlink analysis (DataForSEO)
      │
      ▼
 Results stored in Supabase (analysis_runs table)
      │
      ▼
 Next.js dashboard reads completed run by ID
```

---

## 10. Feature Roadmap

### Phase 1 — Core Intelligence (Complete / In Progress)

| ID | Feature | Status |
|---|---|---|
| IG-1 | Overview KPI dashboard | ✅ Complete |
| IG-2 | Weekly trend charts (posts, engagement, views) | ✅ Complete |
| IG-3 | Sentiment distribution donut | ✅ Complete |
| IG-4 | Posting-time heatmap | ✅ Complete |
| IG-5 | Content calendar (26-week engagement grid) | ✅ Complete |
| IG-6 | Comments table with sentiment filter | ✅ Complete |
| IG-7 | Purchase intent signal panel | ✅ Complete |
| IG-8 | Fans module — loyalty tiers, ambassador scoring | ✅ Complete |
| IG-9 | Fan tenure distribution chart | ✅ Complete |
| IG-10 | Avg engagement per athlete chart | ✅ Complete |
| IG-11 | Avg engagement per product chart | ✅ Complete |
| IG-12 | Competitor sentiment comparison | ✅ Complete |
| SEO-1 | Automated crawl pipeline (10 steps) | ✅ Complete |
| SEO-2 | Real-time SSE progress display | ✅ Complete |
| SEO-3 | SEO dashboard (issues, keywords, SERP, backlinks) | ✅ Complete |
| SEO-4 | GSC OAuth integration | ✅ Complete |
| SEO-5 | AI recommendations panel | ✅ Complete |
| SEO-8 | News & Media Intelligence module (scrape pipeline, SSE progress, articles/analytics/sources tabs) | ✅ Complete |
| SEO-9 | AI article enrichment (sentiment, importance, summary, suggested action) | ✅ Complete |
| SEO-10 | Player Media Visibility leaderboard | ✅ Complete |

### Phase 2 — Activation & Workflow (Next Quarter)

| ID | Feature | Priority |
|---|---|---|
| IG-13 | Giveaway ROI tracker (heuristic detection + engagement lift) | High |
| IG-14 | Ambassador Pipeline CRM (status workflow, notes, CSV export) | High |
| IG-15 | Wishlist clustering (tag frequency / category grouping) | Medium |
| IG-16 | Background Studio Gallery (generated image library) | Low |
| SEO-6 | Scheduled crawls (weekly automatic re-analysis) | High |
| SEO-7 | Cross-run trend comparison (issue count, ranking delta) | Medium |
| SEO-11 | Scheduled daily news scrape + email digest of risk articles | High |
| SEO-12 | Share-of-voice chart (JOOLA vs competitors over time) | High |
| SEO-13 | Multi-tone filter and date-range picker in News module | Medium |

### Phase 3 — Expansion (Future)

| ID | Feature | Notes |
|---|---|---|
| EX-1 | TikTok performance module | Requires TikTok Business API access |
| EX-2 | YouTube analytics module | YouTube Data API v3 |
| EX-3 | Email campaign integration | Klaviyo or Mailchimp API |
| EX-4 | Paid social overlay | Meta Ads API |
| EX-5 | Multi-brand support | Schema changes required |

---

## 11. Data Privacy & Compliance

### 11.1 Instagram Data

- All Instagram data collected via official Instagram Graph API or authorized data exports
- Commenter usernames are treated as pseudonymous public identifiers; no private profile data is stored
- Comment text is retained for analysis purposes consistent with Instagram's Platform Policy
- Data retention: comment-level data retained for 24 months; weekly snapshots retained indefinitely
- No targeted advertising or data monetization; data used solely for brand performance analysis

### 11.2 Google Search Console

- GSC access requires explicit OAuth consent by an authorized JOOLA Google account
- GSC data is proprietary to JOOLA; not shared externally
- OAuth tokens stored encrypted at rest; refresh tokens rotated per Google's requirements

### 11.3 GDPR / CCPA Considerations

- Platform is internal-only; no external user accounts
- No collection of end-user personal data beyond what is publicly visible on Instagram
- If ambassador outreach is implemented (Phase 2), a contact-consent workflow must be added

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Instagram API rate limits or policy changes | Medium | High | Cache data in Supabase; avoid real-time API calls from dashboard |
| DataForSEO API cost overrun | Medium | Medium | Per-run cost cap; cache results; limit crawl frequency |
| OpenAI API latency or outage | Low | Medium | Async enrichment; surface raw data when AI enrichment unavailable |
| Supabase query performance degradation at scale | Low | High | Add indexes on `commented_at`, `post_id`, `username`; use pre-aggregated snapshot tables |
| GSC OAuth token expiry breaks SEO pipeline | Medium | Low | Implement token refresh; surface clear re-auth prompt in UI |
| Instagram scraping policy violation | Low | High | Use only official Graph API or first-party data exports |
| Sensitive complaint data mishandled | Low | High | RLS enforced; access limited to authenticated internal users only |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **Ambassador Score** | AI-generated score (0–10) reflecting a fan's brand affinity, frequency of engagement, sentiment positivity, and consistency over time |
| **Engagement Rate** | (Likes + Comments) / Reach × 100, expressed as a percentage |
| **Fan Tenure** | Number of months between a fan's first recorded comment and the current date |
| **GSC** | Google Search Console — Google's own-site performance analytics tool |
| **Loyalty Tier** | Classification of fans into Super Fan or Regular Fan based on comment volume and recency |
| **Purchase Intent** | AI-detected signal in a comment indicating the commenter is interested in buying a product |
| **SERP** | Search Engine Results Page |
| **Share of Voice** | JOOLA's share of total pickleball news mentions versus competitors over a given period |
| **Importance Score** | AI-assigned 0–100 score per news article representing strategic importance to JOOLA (factors: mention type, sentiment, source authority, recency) |
| **Suggested Action** | One of: Risk review, Share with marketing, PR opportunity, Sponsorship opportunity, Monitor competitor, Product feedback, Leadership review, Use for SEO/blog, No action needed |
| **Relevance Type** | One of: Direct JOOLA News, Sponsored Player News, Product/Brand News, Tournament/Performance News, Competitive News, Industry News, Not Relevant |
| **Sentiment Score** | Float from –1.0 to +1.0 assigned by AI to each comment; > 0.2 = positive, < –0.2 = negative, otherwise neutral |
| **SSE** | Server-Sent Events — HTTP streaming protocol used to push real-time pipeline progress to the browser |
| **Super Fan** | Highest loyalty tier; fans with the highest comment volume and most recent activity |
| **Weekly Snapshot** | Pre-aggregated row in `joola_ig_weekly_snapshot` summarizing all posts and comments for a given calendar week |

---

*Document prepared by JOOLA Engineering. For questions, contact api@joola.com.*
