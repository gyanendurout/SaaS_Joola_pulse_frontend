# JOOLA Pulse — Own-Brand Digital Intelligence

Next.js 14 (App Router) dashboard reading from Supabase tables (`joola_ig_*`). Deployed as a single unit on **Vercel** (moved from Railway on 2026-10-03).

## Quick start (local)

```bash
npm ci
cp .env.local.example .env.local   # then fill in values
npm run dev
# → http://localhost:3000
```

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

| Key | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | **Anon/public key only.** Never put the service-role key here — `NEXT_PUBLIC_*` ships to every visitor's browser. |
| `SEO_API_URL` | yes (prod) | Backend Vercel URL, no trailing slash. `/seo-api/:path*` rewrites to `${SEO_API_URL}/api/:path*`. Defaults to `http://localhost:8000`. |
| `ANALYTICS_API_URL` | yes (prod) | Analytics Vercel URL. `/analytics-api/:path*` rewrites to `${ANALYTICS_API_URL}/:path*`. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Only used by `scripts/scrape_joola_ig.py` (Node app never reads it). |
| `APIFY_API_TOKEN` | optional | Scraper only |
| `OPENAI_API_KEY` | optional | Scraper only |

## Deploy

### Vercel
1. Import the GitHub repo `gyanendurout/SaaS_Joola_pulse_frontend` (pushed from the staging copy at `C:\tmp\joola-frontend`)
2. **Root Directory** → repo root
3. Framework auto-detects as Next.js (`vercel.json`)
4. Set env vars above
5. Deploy — later pushes to `main` auto-deploy

The backend and analytics services are separate Vercel projects; see `recovery/vercel-setup.md`.

## Routes

- `/` redirects to `/overview`
- `/overview` — executive KPIs, weekly trends, top movers, signal feed
- `/posts` — content theme matrix, athlete leaderboard, CTA & cadence analysis, full post table
- `/comments` — sentiment / questions / purchase intent / complaints / competitors / wishlist tabs + emotion + virality
- `/fans` — ambassador pipeline with topic, intent, wishlist, cross-brand columns
- `/complaints` — queue + severity mix + category trend + repeat-complainer list + SLA tracker
- `/weekly-digest` — auto-generated marketing report card
- `/seo-analyze` — SEO crawl demo (graceful fallback; no backend required for the dashboard to run)
- `/seo-dashboard` — SEO health view (reads `runs` / `issues` / `domain_ranked_keywords` if present)

## Data pipeline

`scripts/scrape_joola_ig.py` keeps `joola_ig_*` tables current. **Not run by Vercel** — invoke locally or from a cron worker:

```bash
python scripts/scrape_joola_ig.py
```

Idempotent: reads each table's latest timestamp from the DB and only scrapes the delta, then runs OpenAI analysis and rebuilds derived tables. See file header for details.
