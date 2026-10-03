# Component inventory

All custom React components in `frontend/components/`. Use this as a quick reference when building new pages.

## Top-level

| File | One-line usage |
|---|---|
| `components/DashboardShell.tsx` | Sidebar + main shell. Wraps every page via `app/layout.tsx`. Owns sidebar collapsed/expanded state (localStorage `joola.sidebar.collapsed` and `joola.sidebar.expanded`). |
| `components/PostingTimeHeatmap.tsx` | 7×24 yellow-ramp heatmap of posts by day/hour. Used in `/posts` Heatmap tab. |
| `components/ContentCalendar.tsx` | Month-grid green-ramp calendar of post counts. Used in `/posts` Calendar tab. |

## UI primitives (`components/ui/`)

| File | One-line usage |
|---|---|
| `components/ui/Sparkline.tsx` | SVG sparkline w/ area gradient. Used inside `KpiCard`. |
| `components/ui/Donut.tsx` | SVG donut chart + `DonutLegend` (companion legend). Used in `/comments` sentiment breakdown. |
| `components/ui/PulseLineChart.tsx` | Responsive multi-series line chart with hover tooltip. Used in `/overview` trend tab, `/seo-news` analytics tab. |
| `components/ui/KpiCard.tsx` | KPI card with label, big value, delta indicator, optional sparkline. Used everywhere KPIs appear. |
| `components/ui/SortableTh.tsx` | Sortable `<th>` with stacked chevron indicator (top=asc, bottom=desc, yellow when active). Also exports `<ExtLink>` 40px icon button used in every social-table row. |
| `components/ui/Tip.tsx` | Hover/focus tooltip with italic "i" icon. State-driven popover positioning (top/bottom/right). `aria-label` set, icon `aria-hidden`. |

## Lib helpers (`frontend/lib/`)

| File | Exports |
|---|---|
| `lib/supabase.ts` | `supabase` client (uses `NEXT_PUBLIC_*` env vars) |
| `lib/types.ts` | Shared TypeScript types (page data shapes, sentiment unions) |
| `lib/format.ts` | `formatEnum(s)` → `very_negative` → "Very Negative". `sentimentColor(label)` → CSS var per sentiment. |

## Page client components (one per route, naming pattern `*Client.tsx`)

| Path | Notes |
|---|---|
| `app/overview/OverviewClient.tsx` | Section-tabbed overview. BUG-016 / BUG-017 / BUG-019 fixes live here. |
| `app/posts/PostsClient.tsx` | Posts table + heatmap + calendar. BUG-001 (hydration), BUG-005, BUG-006 here. |
| `app/comments/CommentsClient.tsx` | Comment rows + donut. BUG-007 here. |
| `app/fans/FansClient.tsx` | Fan pipeline table + tier/score badges. |
| `app/complaints/ComplaintsClient.tsx` | Complaint queue + category bars. BUG-002 here. |
| `app/seo-dashboard/SeoDashboardClient.tsx` | SEO recommendations table + modal. BUG-008 here. |
| `app/seo-news/NewsClient.tsx` | Articles / Analytics / Sources tabs. BUG-009, BUG-010, BUG-011, BUG-013, BUG-018 here. |
| `app/youtube/YoutubeClient.tsx` | YouTube analytics + videos table. |
| `app/tiktok/TikTokClient.tsx` | TikTok analytics + videos table. |
| `app/twitter/TwitterClient.tsx` | X/Twitter analytics + posts table. |
| `app/reddit/RedditClient.tsx` | Reddit mentions table with crisis banner, subreddit filter, dismissible AI-enrichment banner (persists in `joola.reddit.banner-dismissed`). |
| `app/influencers/InfluencersClient.tsx` | JOOLA athletes table + posts. |

## Server components (data fetch only)

Each page has a `page.tsx` (server) that fetches from Supabase and passes typed data into the `*Client.tsx`. No client-side data fetching anywhere in this app.

## Coding patterns to follow

1. **Server components** = `page.tsx`. Fetch from Supabase. Pass typed data to `*Client.tsx`. Use `export const dynamic = 'force-dynamic'` and `export const revalidate = 0` to disable caching.
2. **Client components** = `*Client.tsx`. Handle filtering, sorting, tabs with `useState`. No data fetching.
3. **Inline SVG icons** — no `lucide-react` dependency. Follow the `Ic({paths,size})` pattern in `DashboardShell.tsx:30-40`.
4. **Use Design2 classes** (`card`, `kpi`, `pipe-step`, etc.), **not Tailwind**, for new components.
5. **JOOLA brand constant** — every social-platform page hard-codes `const JOOLA = '04db8591-37a3-4634-9d11-536975fa6935'`. Keep this UUID identical across all 5 files (`youtube`, `tiktok`, `twitter`, `reddit`, `influencers`).

## Special routes (not page client components)

| Path | Purpose |
|---|---|
| `app/instagram/page.tsx` | 307 redirect to `/posts` (closes broken nav contract from old IG flat-list nav). |
| `app/not-found.tsx` | Branded custom 404 — yellow "404", 4 CTA buttons. |
| `app/page.tsx` | Root — likely redirects to `/overview`. |
