# Frontend QA — Regression Script

`regression.ps1` is the canonical pre-push check for the JOOLA Pulse frontend.

## What it covers

| Stage | Command | Detects |
|---|---|---|
| 1. Typecheck | `npx tsc --noEmit` | Type errors, missing imports, prop-shape mismatches |
| 2. Build | `npm run build` (next build) | Runtime errors at build time, missing env vars in `force-dynamic` pages, bundle issues |
| 3. Route smoke | HTTP HEAD/GET to every route at `http://localhost:3000` | Pages that compile but crash at request time, broken redirects, missing 404 |

Stage 3 only runs if a dev server is already reachable. If not, it's silently skipped (not a failure) — typecheck + build alone are enough for CI / pre-push.

## What it does NOT cover

- **UI / visual regression** — there's no Playwright/Cypress suite yet. Add one before the team grows past 1-2 devs.
- **API integration with Supabase** — pages render with whatever data Supabase returns. If Supabase is down, build still passes (data-fetching errors surface at request time, caught by stage 3).
- **Lint / style** — no ESLint config is wired into this script. Add later if needed.

## Usage

```powershell
# Full run (typecheck + build + routes if dev server is up)
.\qa\regression.ps1

# Faster iteration
.\qa\regression.ps1 -SkipBuild

# CI / pre-push
.\qa\regression.ps1 -SkipRoutes

# Custom dev URL
.\qa\regression.ps1 -DevUrl http://localhost:3001

# Run all stages even after failure
.\qa\regression.ps1 -Continue
```

Exit code 0 = pass, non-zero = fail. Designed to be invoked by the `/end-session` orchestrator.

## When to update this script

- A new route was added → add it to the `$routes` array.
- A new check matters at pre-push time → add a stage. Keep stages independent and short-circuiting.
- A check is too slow or flaky → make it skippable via a `-Skip*` switch rather than removing it.
