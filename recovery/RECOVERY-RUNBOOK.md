# Frontend Recovery Runbook

> **Audience:** A senior dev with no prior context on this project, who has the contents of `frontend/` and an empty machine.
> **Goal:** Re-deploy a working JOOLA Pulse frontend within ~2 hours, assuming the backend + Supabase are already restored.
> **Snapshot:** 2026-05-19

If Supabase or the backend service are also wiped, do `backend/recovery/RECOVERY-RUNBOOK.md` **first** — this runbook assumes their outputs (Supabase URL + anon key + backend and analytics Vercel URLs) are available.

---

## Phase 0 — Prerequisites

- **Node** 18+
- **npm** (bundled with Node)
- **PowerShell** (Windows). Bash hangs on Windows git-credential prompts; use PowerShell for `git push`.
- **Python 3.11+** — only needed if you want to run `scripts/scrape_joola_ig.py` locally.
- **Accounts:**
  - GitHub — for `SaaS_Joola_pulse_frontend` repo
  - Vercel — for hosting
  - Supabase project (URL + anon key already exist from backend recovery)

---

## Phase 1 — Restore source

```powershell
# Get the frontend folder onto disk (extract from this backup or git clone)
cd c:\Workspace\SaaS_Joola_pulse\frontend

# Recreate GitHub remote
git init
git remote add origin https://github.com/<your-org>/SaaS_Joola_pulse_frontend.git

# (skip git add until .env.local is in place and you've verified .gitignore)
```

`.gitignore` must include `.env*` (it does by default for Next.js).

---

## Phase 2 — Environment

```powershell
copy recovery\env.template .env.local
```

Edit `.env.local`. Required values:

| Var | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API → anon (public) |
| `SEO_API_URL` | Backend Vercel URL (`https://<backend>.vercel.app`, no trailing slash). Defaults to `http://localhost:8000` if unset. |
| `ANALYTICS_API_URL` | Analytics Vercel URL (`https://<analytics>.vercel.app`). |

For the Instagram scraper script (optional local use), also fill:
- `APIFY_TOKEN`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never reaches the browser)

See `../backend/recovery/secrets-checklist.md` for where each value comes from.

---

## Phase 3 — Install + dev

```powershell
npm install
npm run dev
```

Expected: Next.js compiles, `http://localhost:3000/overview` loads.

If `/overview` shows "no data" empty states everywhere — that's fine if scrapers haven't been run yet. If it 500s with `relation ... does not exist` you skipped the backend Supabase migrations — go fix those first.

---

## Phase 4 — Push to GitHub

```powershell
git add .
git commit -m "Restore frontend from disaster-recovery backup"
git push -u origin main
```

If you have prior pushes that should be preserved: `git pull --rebase origin main` first.

---

## Phase 5 — Wire Vercel

See [vercel-setup.md](./vercel-setup.md). Summary:

1. Vercel → Add New → Project → Import `gyanendurout/SaaS_Joola_pulse_frontend`.
2. Framework auto-detected as Next.js (`vercel.json`); root directory = repo root.
3. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SEO_API_URL`, `ANALYTICS_API_URL`.
4. Deploy → record the `<frontend>.vercel.app` URL and add it to `CORS_ORIGINS` on the backend and analytics projects.
5. Later pushes to `main` auto-deploy.

---

## Phase 6 — Verification

Open the deployed frontend and walk through the 16 routes:

| Path | Expected |
|---|---|
| `/` | 307 → `/overview` |
| `/overview` | KPI cards render (data may be empty until scrapers run) |
| `/weekly-digest` | Snapshot history table |
| `/posts` `/comments` `/fans` `/complaints` | Instagram pages |
| `/instagram` | 307 → `/posts` |
| `/youtube` `/tiktok` `/twitter` `/reddit` `/influencers` | Social pages |
| `/seo-analyze` `/seo-dashboard` `/seo-news` | SEO pages (need backend running) |
| `/nonsense-path` | Branded 404 page |

Then run the regression script:

```powershell
cd c:\Workspace\SaaS_Joola_pulse\frontend
.\qa\regression.ps1
```

Must exit 0. See [qa/README.md](../qa/README.md) for what it covers.

---

## Known frontend-only gaps

| # | Gap | Mitigation |
|---|---|---|
| 1 | No automated UI tests | Use `qa/regression.ps1` for typecheck + build + route smoke; rely on the `/end-session` workflow for repeat coverage. |
| 2 | `next.config.mjs` rewrite assumes backend is reachable at `SEO_API_URL` | If backend isn't up, `/seo-*` pages will fail. Frontend-only deploys are fine for the IG/social pages. |
| 3 | Design system has no Storybook | Reference `design-system/` docs + read the rendered pages directly. |
| 4 | Long backend jobs exceed the Vercel function limit (300s Hobby / 800s Pro) | Run news scrape, paddle sync and large SEO crawls locally via the backend scripts. |
