# JOOLA Pulse — Session Memory

This file is read automatically by Claude Code at session start. It captures the exact state of the project so work can resume without re-explaining context.

---

## Project Overview

**Repo:** `c:\Workspace\joola-nextjs` (subfolder: `frontend\`)  
**App root:** `c:\Workspace\joola-nextjs\frontend\`  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS (kept for compat) · Supabase  
**Design system:** Design2 (v2) — dark neuro theme, `.v2-root` CSS scope, `--yellow: #F5E625`, `--joola: #22c55e`  
**Fonts:** Archivo + Archivo Black + JetBrains Mono (loaded via @import in globals.css)  
**Branch:** `main` | **Backup:** `backup/pre-design2` (pre-redesign state)  
**Git remote:** GitHub (push via PowerShell — Bash hangs waiting for credential UI)

**ALL work happens inside `c:\Workspace\joola-nextjs\` only. Never modify files under `C:\Workspace\SEO\`.**

The FastAPI backend lives at `c:\Workspace\joola-nextjs\backend\` (copied from the old SEO folder — that folder is now obsolete).

---

## BRD Document

Full Business Requirements Document saved at:  
`c:\Workspace\joola-nextjs\JOOLA_PULSE_BRD.md`

Title: **JOOLA Pulse — Own-Brand Digital Intelligence Platform** (13 sections, May 2026).  
Scope: JOOLA's own brand only (Instagram intelligence + SEO intelligence). No competitor benchmarking.

---

## Design System (Design2 / v2)

Reference files: `frontend/design2/` — **read-only reference, do not run**

| File | Purpose |
|------|---------|
| `design2/styles.css` | Full CSS reference (copied to globals.css) |
| `design2/app.jsx` | NAV structure + shell reference |
| `design2/charts.jsx` | SVG chart components reference |
| `design2/icons.jsx` | ICONS dict + `Ic` component |
| `design2/data.js` | Mock data shapes |
| `design2/pages/*.jsx` | Page reference designs |

**CSS scope:** All design2 CSS is under `.v2-root` class applied to `<body>` in `app/layout.tsx`.

Key CSS classes to use:
- Layout: `.shell`, `.main`, `.main.collapsed`, `.main-inner`
- Sidebar: `.sidebar`, `.sidebar.collapsed`, `.brand`, `.nav-section`, `.nav-group`, `.nav-label`, `.nav-item.active`, `.sidebar-foot`
- KPIs: `.kpi-grid`, `.kpi`, `.kpi.joola/warn/danger`, `.kpi .label`, `.kpi .value`, `.kpi .delta.up/down`
- Cards: `.card`, `.card-pad-lg`, `.card-head`, `.card-grid`, `.cg-2`, `.cg-3`, `.cg-2-1`
- Tables: `table.data`, `th.num`, `.cell-num`, `tr.highlight`, `.you-badge`, `.tlink`
- Comments: `.comment-row`, `.comment-user`, `.comment-body`, `.quote`
- Pipeline: `.pipeline`, `.pipe-step.pending/running/done/error`, `.pipe-num`, `.pipe-label`, `.ps-done/running/pending/error`
- Misc: `.section`, `.divider`, `.empty`, `.pill-*`, `.chip`, `.chip.on`, `.btn`, `.btn-yellow`, `.fld`, `.tabs`, `.tab.on`, `.live-pulse-dot`

---

## Sidebar Navigation (DashboardShell.tsx)

```
INTELLIGENCE:
  Overview → /overview  [LIVE badge]

INSTAGRAM:
  Posts & Cadence → /posts
  Comment Intel   → /comments
  Fans & Ambassadors → /fans
  Complaints      → /complaints

SEO:
  Run Analysis    → /seo-analyze
  Search Health   → /seo-dashboard
  In News         → /seo-news
```

---

## Key Files Changed in Design2 Redesign

| File | Status |
|------|--------|
| `app/layout.tsx` | Rewritten — removed Inter font, added `v2-root` class, title "JOOLA Pulse" |
| `app/globals.css` | Fully rewritten — Design2 CSS system + Tailwind kept |
| `components/DashboardShell.tsx` | Rewritten — new sidebar with INTELLIGENCE/INSTAGRAM/SEO nav |
| `components/ui/Sparkline.tsx` | NEW — SVG sparkline with area gradient |
| `components/ui/Donut.tsx` | NEW — SVG donut chart + DonutLegend |
| `components/ui/PulseLineChart.tsx` | NEW — responsive line chart with hover tooltip |
| `components/ui/KpiCard.tsx` | NEW — KPI card with sparkline |
| `components/PostingTimeHeatmap.tsx` | Rewritten — design2 yellow ramp heatmap |
| `components/ContentCalendar.tsx` | Rewritten — design2 green ramp calendar |
| `app/overview/OverviewClient.tsx` | NEW — design2 overview with section tabs |
| `app/overview/page.tsx` | Rewritten — passes OverviewData to OverviewClient |
| `app/posts/PostsClient.tsx` | Rewritten — design2 posts table + heatmap/calendar |
| `app/posts/page.tsx` | Rewritten — passes all data including heatmap/calendar |
| `app/comments/CommentsClient.tsx` | Rewritten — design2 comment rows + donut sidebar |
| `app/fans/FansClient.tsx` | Rewritten — design2 pipeline table + tier/score badges |
| `app/complaints/ComplaintsClient.tsx` | Rewritten — design2 complaint queue + category bars |
| `app/seo-analyze/page.tsx` | NEW — SSE pipeline page (client component) |
| `app/seo-dashboard/page.tsx` | NEW — SEO dashboard server component |
| `app/seo-dashboard/SeoDashboardClient.tsx` | NEW — SEO dashboard UI |
| `app/seo-news/page.tsx` | NEW — News page server component (Supabase fetch) |
| `app/seo-news/NewsClient.tsx` | NEW — Full news UI: tabs (Articles/Analytics/Sources), KPIs, modal |
| `next.config.mjs` | Updated — `/seo-api/:path*` → FastAPI proxy |

---

## Supabase Tables

### Instagram
| Table | Purpose |
|-------|---------|
| `joola_ig_posts` | Post metadata + stats (post_id, post_type, engagement_rate, like_count, comment_count, view_count, posted_at, day_of_week, hour_of_day, thumbnail_url, caption) |
| `joola_ig_comments` | Raw comments (comment_id, post_id, username, comment_text, commented_at) |
| `joola_ig_comment_analysis` | AI analysis (sentiment, sentiment_score, primary_topic, emotion, is_complaint, purchase_intent, etc.) |
| `joola_ig_loyal_users` | Fan profiles (username, loyalty_tier, ambassador_score, is_potential_ambassador, active_months, avg_sentiment_score) |
| `joola_ig_complaint_log` | Complaints (comment_id, username, complaint_text, complaint_category, severity, joola_responded, complained_at) |
| `joola_ig_weekly_snapshot` | Weekly rollups (week_start, posts_published, total_comments, total_views, avg_engagement_rate, complaint_count, purchase_intent_count) |
| `joola_ig_wishlist_items` | Feature requests (wishlist_text, category, username) |
| `joola_ig_post_analysis` | Post AI analysis (post_id, content_theme, post_intent, sentiment_tone) |

### SEO (FastAPI backend tables)
| Table | Purpose |
|-------|---------|
| `runs` | SEO analysis runs (id, run_date, status) |
| `issues` | Technical issues (issue_type, severity, title, description, category) |
| `domain_ranked_keywords` | Keyword rankings (keyword, search_volume, difficulty, position, previous_position, is_gap) |
| `backlinks_summary` | Backlink overview |
| `performance_cache` | Cached GSC data |

### News Intelligence (migration 006 required)
| Table | Purpose |
|-------|---------|
| `news_articles` | Scraped articles — url (unique), title, excerpt, sentiment, sentiment_score, is_joola_mention, joola_context, players_mentioned, competitors_mentioned, has_competitor_mention, relevance_type, importance_score, suggested_action, ai_summary, why_it_matters, content_hash |
| `news_scrape_runs` | Scrape job history — status, sites_total/scraped, articles_found/new/with_mentions, joola_related_articles, successful/failed_sources |
| `news_sources` | Site registry with authority_score, last_success_at, last_failed_at |
| `news_scrape_errors` | Per-site error log linked to scrape run |

---

## FastAPI Backend (SEO + News Intelligence)

**Location:** `c:\Workspace\joola-nextjs\backend\`  
**Runs at:** `http://localhost:8000`

### Start the backend
```powershell
cd "C:\Workspace\joola-nextjs\backend"
# First time only: create venv and install
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
# Every time:
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

### Key endpoints
- `POST /api/news/scrape` → triggers background scrape, returns `{ run_id }`
- `GET /api/news/scrape/{run_id}/events` → SSE progress stream
- `GET /api/news/articles` → filtered article list
- `GET /api/news/analytics/summary` → KPI totals + trends
- `POST /seo-api/analyze` → SEO crawl (proxied via next.config.mjs)

### Next.js proxy
`/seo-api/:path*` → `${SEO_API_URL}/api/:path*`  
`SEO_API_URL` defaults to `http://localhost:8000`

### REQUIRED: Run migration 006 in Supabase SQL editor
File: `backend/supabase/migrations/006_news_tables.sql`  
Creates/updates: `news_articles`, `news_scrape_runs`, `news_sources`, `news_scrape_errors`  
**Scraping will fail until this migration is applied.**

---

## Dev Server

```powershell
# Next.js (terminal 1)
cd "C:\Workspace\joola-nextjs\frontend" ; npm run dev

# FastAPI backend (terminal 2)
cd "C:\Workspace\joola-nextjs\backend"
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Next.js runs at `http://localhost:3000`. Backend at `http://localhost:8000`.

---

## Coding Patterns

1. **Server components** fetch from Supabase, pass typed data to `*Client.tsx`
2. **Client components** handle filtering, sorting, tabs with `useState`
3. **Inline SVG icons** — no lucide-react in new components; use `Ic` pattern from DashboardShell
4. **CSS classes** — use design2 classes (`.card`, `.kpi`, `.pipe-step`, etc.), NOT Tailwind for new components
5. **`.v2-root`** is on `<body>` — all CSS vars + design2 styles apply globally
6. **Git push** via PowerShell only (Bash hangs on credential prompt)

---

## Phase 2 Features (Pending)

- Live Instagram feed (real-time comment webhook)
- Ambassador outreach CRM panel
- Content generation with JOOLA brand voice
- AI weekly briefing email digest

---

## QA Pass — 2026-05-17 (20 bugs fixed)

Source: full QA & Product Report covering all dashboard pages. `npx tsc --noEmit` passes after all changes.

### Critical

| Bug | File | Fix |
|-----|------|-----|
| BUG-001 hydration mismatch on `/posts` | `frontend/app/posts/PostsClient.tsx` | Removed `format(new Date(p.posted_at), 'MMM d')` (timezone-dependent). Added local `fmtPostedAt()` helper that parses the ISO date string directly so SSR and client render identical text. |
| BUG-002 blank Complaint Category Trend chart | `frontend/app/complaints/ComplaintsClient.tsx` | Stacked bars used `height: pct%` inside flex-column children with no defined height → all bars collapsed to 0. Switched to pixel heights computed from a `MAX_BAR_PX = 110` ceiling. |
| BUG-003 Weekly Digest goes black on scroll | `frontend/app/globals.css` | Added `position: relative; z-index; isolation: isolate` to `.shell`, `.main`, `.main-inner` so the fixed `.app-bg` / `.dot-grid` background layers can never composite over scrolled content. |
| BUG-004 async listener errors | n/a | Browser-extension noise (`chrome.runtime.onMessage`). Not in app code. |

### High

| Bug | File | Fix |
|-----|------|-----|
| BUG-005 athletes dropdown not populated | `frontend/app/posts/PostsClient.tsx` | Dropdown options now built from `athleteRows`; filters the posts table by `p.athletes_shown`. |
| BUG-006 time period filter doesn't update KPIs | `frontend/app/posts/PostsClient.tsx` | Added `period` state (`13w` / `4w` / `ytd`). `periodPosts` memo filters by cutoff; `periodKpis` recomputes totalPosts / totalViews / avgER / avgCadence client-side. |
| BUG-007 Comment search ignores Fast Starts / Slow Burns | `frontend/app/comments/CommentsClient.tsx` | Added `filteredFast` and `filteredSlow` memos that filter virality rows by `caption`, `post_id`, `post_type` against the search query. |
| BUG-008 SEO "View →" dead buttons | `frontend/app/seo-dashboard/SeoDashboardClient.tsx` | Added `openReco` state + detail modal with description, priority badge, tags, and "Suggested Next Steps" ordered list. |
| BUG-009 Smart Insights ignores non-period filters | `frontend/app/seo-news/NewsClient.tsx` | `<InsightBanner>` now receives `filtered` (all active filters applied) instead of just the period-cutoff list. |

### Medium

| Bug | File | Fix |
|-----|------|-----|
| BUG-010 Tone "ALL" missing yellow highlight | `frontend/app/seo-news/NewsClient.tsx` (`sentChip`) | Special-cased `val === 'all'` to return the standard yellow `chip(on)` style for consistency with Mentions/Relevance/Action chips. |
| BUG-011 article cards: black image placeholder | `frontend/app/seo-news/NewsClient.tsx` (`ArticleCard`) | `onError` now hides the image container and reveals a `data-fallback-stripe` sentiment gradient bar that's always present in the DOM. |
| BUG-013 tiny bars for small % | `frontend/app/seo-news/NewsClient.tsx` (Analytics tab) | Sentiment Mix and Relevance Types bars use `width: max(N%, 6px)` so 1–3% values render visibly. |
| BUG-014 / BUG-015 weekly digest dominant theme blank + 0.00% ER | `frontend/app/weekly-digest/page.tsx` | Fetch `joola_ig_post_analysis(post_id, content_theme)`. Backfill `current.avg_engagement_rate` from this week's `posts.engagement_rate` and `current.dominant_content_theme` from the modal `content_theme` of this week's posts when the snapshot row stores 0/null. |
| BUG-016 Content Theme Momentum cards blank | `frontend/app/overview/OverviewClient.tsx` | When every `themeMomentum[].theme` is null, render a single explanatory empty state pointing at the missing DB column instead of 13 blank cards. Theme cards now use "NO DATA" label + dashed border for missing weeks. |
| BUG-017 Top Posts 0.0% ER | `frontend/app/overview/OverviewClient.tsx` | `p.er` is stored as a 0–1 fraction. Now multiplied by 100 for display; color thresholds updated to 6 / 3 percent. |
| BUG-018 Export button no feedback | `frontend/app/seo-news/NewsClient.tsx` | Added `exportState` ('idle' / 'exporting' / 'done'). Button label cycles `↓ Export (N)` → `⏳ Exporting…` → `✓ Exported N` and disables itself if no rows. |
| BUG-019 Post Type Mix no legend | `frontend/app/overview/OverviewClient.tsx` | Replaced `<DonutLegend>` with an explicit always-visible legend (color swatch + name + count + pct) so labels render regardless of CSS context. |

### Low

| Bug | File | Fix |
|-----|------|-----|
| BUG-020 sidebar "OWN-BRAND INTELLIGENC" truncation | `frontend/app/globals.css` | `.brand-tag` letter-spacing 0.14em → 0.08em + added `text-overflow: ellipsis` as defensive fallback. |

### Files touched (8)

- `frontend/app/posts/PostsClient.tsx`
- `frontend/app/complaints/ComplaintsClient.tsx`
- `frontend/app/comments/CommentsClient.tsx`
- `frontend/app/seo-dashboard/SeoDashboardClient.tsx`
- `frontend/app/seo-news/NewsClient.tsx`
- `frontend/app/overview/OverviewClient.tsx`
- `frontend/app/weekly-digest/page.tsx`
- `frontend/app/globals.css`

### Verification

- `cd frontend && npx tsc --noEmit` → exit 0
- Manual smoke test recommended on `/posts`, `/complaints`, `/seo-news`, `/weekly-digest`, `/overview` (trends + movers tabs)

### Notes on data vs code issues

- **BUG-014/015/016**: Underlying problem is that `joola_ig_weekly_snapshot.avg_engagement_rate` and `dominant_content_theme` are 0/null in DB. The page-level fix backfills from `joola_ig_posts` + `joola_ig_post_analysis`. The proper long-term fix is to populate those columns in the snapshot pipeline.
- **BUG-004**: `chrome.runtime.onMessage` errors come from installed Chrome extensions (Grammarly, LastPass, ad blockers). Cannot be silenced from app code.
