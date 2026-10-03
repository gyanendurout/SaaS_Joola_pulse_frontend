# JOOLA Pulse Frontend — Disaster Recovery

> **Premise:** If this repo, the GitHub remote, and the Vercel project were all wiped today, this folder contains everything needed to rebuild the JOOLA Pulse frontend from scratch.

**Snapshot date:** 2026-05-19
**Repo root:** `frontend/`
**Stack:** Next.js 14 (App Router) · TypeScript · Design2 CSS · Tailwind (compat) · Supabase JS

This recovery package is **frontend-only**. The backend has its own recovery folder at `backend/recovery/` covering the FastAPI service, Supabase schema, and scrapers.

---

## What's in here

| File / folder | Purpose |
|---|---|
| `RECOVERY-RUNBOOK.md` | **Start here.** Step-by-step rebuild for the frontend. |
| `code-architecture.md` | Map of `app/`, `components/`, `lib/`, `scripts/`. |
| `design-system/` | Design tokens, component inventory, Design2 CSS class reference. |
| `env.template` | `.env.local` template (no real secrets). |
| `secrets-checklist.md` | Where each env var comes from. |
| `vercel-setup.md` | Vercel project config notes + limitations. |
| `github-repos.md` | Push workflow + Vercel auto-deploy. |
| `domain-dns.md` | Custom domain (none configured currently). |

---

## Stack summary

| Layer | Tech | Where |
|---|---|---|
| App | Next.js 14 App Router · TypeScript | `app/` |
| UI | Design2 CSS (`globals.css`) + inline SVG icons | `components/` |
| Data | Server components → Supabase JS · `/seo-api/*` proxy → backend | `lib/supabase.ts`, `next.config.mjs` |
| Deploy | Vercel project, auto-deploys on push to `main` | GitHub `SaaS_Joola_pulse_frontend` |

---

## JOOLA brand identity (shared with backend)

`brand_id = 04db8591-37a3-4634-9d11-536975fa6935`
Hard-coded as `const JOOLA` in every social-media `page.tsx` (youtube, tiktok, twitter, reddit, influencers).

---

## Critical frontend-only gaps

1. **No tests in repo.** Regression coverage is the manual `qa/regression.ps1` script — `npx tsc --noEmit` + production build + route HTTP smoke. No Jest/Playwright suite exists yet.
2. **Tailwind is dead weight.** Kept for compat; new components use Design2 classes. Don't be surprised if removing Tailwind doesn't change rendered output.
3. **`scripts/scrape_joola_ig.py` lives here but is Python.** It reads `frontend/.env.local` because it pre-dates the backend split. Consider moving to backend on next refactor — for now, treat it as a frontend-owned helper.
4. **No SSR caching.** Every page sets `dynamic = 'force-dynamic'` + `revalidate = 0`. Fast dev iteration, but each request hits Supabase. Don't add ISR without measuring load first.

---

## How to use this backup

1. Read [RECOVERY-RUNBOOK.md](./RECOVERY-RUNBOOK.md) end-to-end before doing anything.
2. Make sure the **backend recovery** has been started (you need Supabase URL + service-role key from there).
3. Push code to a fresh GitHub repo per [github-repos.md](./github-repos.md).
4. Wire Vercel to the repo per [vercel-setup.md](./vercel-setup.md).
5. Fill `.env.local` per [env.template](./env.template) + [secrets-checklist.md](../recovery/secrets-checklist.md) (in backend recovery — shared file).
6. Run `qa/regression.ps1` to verify everything builds and routes serve.
