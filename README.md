# JOOLA Pulse — Own-Brand Digital Intelligence
<!-- redeploy: 2026-05-20 -->


Next.js 14 (App Router) dashboard reading from Supabase tables (`joola_ig_*`). Designed as a single deployable unit for **Vercel** or **Railway**.

## Quick start (local)

```bash
npm ci
cp .env.local.example .env.local   # then fill in values
npm run dev
# → http://localhost:3000
```

## Environment variables

Set these in your platform dashboard (Vercel Project Settings → Environment Variables, Railway Service → Variables).

| Key | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | **Anon/public key only.** Never put the service-role key here — `NEXT_PUBLIC_*` ships to every visitor's browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Only used by `scripts/scrape_joola_ig.py` (Node app never reads it). |
| `APIFY_API_TOKEN` | optional | Scraper only |
| `OPENAI_API_KEY` | optional | Scraper only |

## Deploy

### Vercel
1. Import the repo
2. **Root Directory** → `frontend`
3. Framework auto-detects as Next.js
4. Set env vars above
5. Deploy

### Railway
1. New Project → Deploy from GitHub
2. **Root Directory** → `frontend`
3. `railway.json` will be picked up (`npm ci && npm run build` build, `npm run start` start)
4. Set env vars above

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

`scripts/scrape_joola_ig.py` keeps `joola_ig_*` tables current. **Not run by Vercel/Railway** — invoke locally or from a cron worker:

```bash
python scripts/scrape_joola_ig.py
```

Idempotent: reads each table's latest timestamp from the DB and only scrapes the delta, then runs OpenAI analysis and rebuilds derived tables. See file header for details.
