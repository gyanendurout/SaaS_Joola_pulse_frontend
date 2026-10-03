# Frontend Code Architecture

A map of `frontend/` so you can find your way fast after restoration.

---

## Layout

```
frontend/
├── app/                          ← Next.js App Router pages
│   ├── layout.tsx                Adds .v2-root to <body>, sets metadata
│   ├── page.tsx                  Root — redirects to /overview
│   ├── not-found.tsx             Branded 404
│   ├── globals.css               Design2 CSS system + Tailwind imports
│   │
│   ├── overview/                 Cross-platform overview
│   │   ├── page.tsx              Fetches Supabase, passes to client
│   │   └── OverviewClient.tsx
│   ├── posts/, comments/, fans/, complaints/
│   │                             Instagram pages — joola_ig_* tables
│   ├── youtube/, tiktok/, twitter/, reddit/, influencers/
│   │                             Other-platform pages
│   ├── weekly-digest/            Weekly snapshot view
│   ├── seo-analyze/              SSE pipeline for SEO crawl
│   ├── seo-dashboard/            SEO findings dashboard
│   ├── seo-news/                 News articles dashboard (Articles/Analytics/Sources tabs)
│   └── instagram/page.tsx        307 redirect to /posts
│
├── components/
│   ├── DashboardShell.tsx        Sidebar + main shell (every page wraps in this)
│   ├── PostingTimeHeatmap.tsx    7×24 yellow-ramp heatmap
│   ├── ContentCalendar.tsx       Green-ramp month calendar
│   └── ui/
│       ├── KpiCard.tsx           KPI block w/ sparkline
│       ├── Sparkline.tsx         SVG sparkline
│       ├── Donut.tsx             SVG donut + DonutLegend
│       ├── PulseLineChart.tsx    Responsive line chart
│       ├── SortableTh.tsx        Sortable <th> + <ExtLink> icon
│       └── Tip.tsx               Hover tooltip
│
├── lib/
│   ├── supabase.ts               Supabase client (uses NEXT_PUBLIC_* env)
│   ├── types.ts                  Shared TypeScript types
│   └── format.ts                 formatEnum(), sentimentColor()
│
├── scripts/
│   └── scrape_joola_ig.py        The ONLY scraper that lives in this repo (Python — reads frontend/.env.local; consider relocating to backend)
│
├── design2/                      Read-only reference design system (jsx, not run)
├── recovery/                     This folder — disaster recovery package
├── qa/                           Regression scripts
├── next.config.mjs               /seo-api/:path* → backend rewrite
├── tailwind.config.ts            Tailwind (kept for compat)
├── tsconfig.json
└── package.json                  deps: next, react, @supabase/supabase-js, date-fns
```

---

## Routes (16 total)

| Path | Section | Notes |
|---|---|---|
| `/` | — | Redirect to `/overview` |
| `/overview` | INTELLIGENCE | LIVE badge |
| `/weekly-digest` | INTELLIGENCE | |
| `/posts` | INSTAGRAM (under collapsible parent) | Posts table + heatmap + calendar |
| `/comments` | INSTAGRAM | Donut + comment rows |
| `/fans` | INSTAGRAM | Loyal users pipeline |
| `/complaints` | INSTAGRAM | Complaint queue + trend |
| `/instagram` | — | 307 → `/posts` |
| `/youtube` | SOCIAL MEDIA | |
| `/tiktok` | SOCIAL MEDIA | |
| `/twitter` | SOCIAL MEDIA | X/Twitter |
| `/reddit` | SOCIAL MEDIA | Includes crisis banner |
| `/influencers` | SOCIAL MEDIA | JOOLA athletes |
| `/seo-analyze` | SEO | SSE pipeline trigger |
| `/seo-dashboard` | SEO | Findings + reco modal |
| `/seo-news` | SEO | Articles/Analytics/Sources tabs |

---

## Coding conventions

1. **Server / client split** — every page has `page.tsx` (server, fetches Supabase) → `*Client.tsx` (client, owns state).
2. **No client-side data fetching.** All data fetched in server components.
3. **`export const dynamic = 'force-dynamic'; export const revalidate = 0`** — disables ISR. Dashboard always shows live data.
4. **`force-dynamic` everywhere implies Node runtime** — Vercel runs these as Node.js serverless functions by default, which is what we want.
5. **Inline SVG icons** — no `lucide-react`, no SVG sprite. `DashboardShell.tsx` has the master ICONS dict.
6. **Design2 classes over Tailwind** for new components. Tailwind is kept only for legacy compat.
7. **Enum text** — never display raw enum values. Always go through `formatEnum()` in `lib/format.ts`.
8. **`brand_id` everywhere** — Every social-media page hard-codes JOOLA's UUID `04db8591-37a3-4634-9d11-536975fa6935` as `const JOOLA`. Keep this in sync across all 5 files.

---

## Where data flows (frontend perspective)

```
Supabase (server components) ──► page.tsx ──► *Client.tsx ──► rendered HTML
Backend FastAPI ──► /seo-api/* rewrite (next.config.mjs) ──► server-side fetch ──► *Client.tsx
```

The frontend never talks to scrapers directly. All scrape data is read from Supabase tables.

---

## Quick navigation

| To find... | Look at... |
|---|---|
| A specific page's UI | `app/<route>/<Route>Client.tsx` |
| A page's data fetch | `app/<route>/page.tsx` |
| The sidebar nav structure | `components/DashboardShell.tsx` (NAV constant near top) |
| A new chart pattern | `components/ui/PulseLineChart.tsx` (or `Donut.tsx`) — copy + adapt |
| The full design system | `app/globals.css` (~1500 lines) |
| Shared formatters | `lib/format.ts` |
