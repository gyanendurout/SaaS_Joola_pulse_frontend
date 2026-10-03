# Design2 CSS classes — quick reference

All design2 styles are scoped under `.v2-root` (applied to `<body>` in `app/layout.tsx`). Full source: `frontend/app/globals.css`.

When building a new component, prefer these classes over Tailwind utilities. Tailwind is kept only for compat with old code.

## Layout

| Class | Purpose |
|---|---|
| `.shell` | Outer page wrapper, establishes stacking context (`isolation: isolate`) |
| `.main` | Main content area, has `margin-left: var(--sidebar-w)` (232px). Add `.collapsed` for 60px collapsed sidebar. `overflow-x: clip` |
| `.main.collapsed` | Use when sidebar is collapsed |
| `.main-inner` | Constrained content container — `max-width: 1280px`, `padding: 24px 32px 64px`, centered |

## Sidebar

| Class | Purpose |
|---|---|
| `.sidebar` | Fixed left nav, 232px wide, `backdrop-filter: blur(16px)` |
| `.sidebar.collapsed` | 60px wide variant |
| `.brand` | Top brand-mark cell, height 64px |
| `.brand-mark` | 32×32 yellow-bordered "J" logo |
| `.brand-wordmark` | Wordmark text next to logo |
| `.brand-tag` | Sub-label under wordmark ("OWN-BRAND INTELLIGENCE") |
| `.nav-section` | Wrapping container for nav groups |
| `.nav-group` | One section block (INTELLIGENCE / SOCIAL MEDIA / SEO) |
| `.nav-label` | Tiny uppercase section label |
| `.nav-item` | Single nav link |
| `.nav-item.active` | Active state — yellow tint + border + glow on icon |
| `.ni-label` | Label text inside `.nav-item` |
| `.ni-badge` | LIVE / other badge pill |
| `.sidebar-foot` | Bottom strip — clock + live pulse |
| `.live-pulse-dot` | Animated pulsing yellow dot |

## Page head

`.page-head` — page title block at top of each route.

## KPI cards

| Class | Purpose |
|---|---|
| `.kpi-grid` | Grid container for KPIs (typically 4 columns) |
| `.kpi` | Single KPI card |
| `.kpi.joola` | Green accent variant (positive metric) |
| `.kpi.warn` | Amber accent (warning state) |
| `.kpi.danger` | Red accent (critical) |
| `.kpi .label` | Top label text |
| `.kpi .value` | Big number — usually Archivo Black or JetBrains Mono |
| `.kpi .delta` | Delta indicator below value |
| `.kpi .delta.up` | Green / up arrow |
| `.kpi .delta.down` | Red / down arrow |

## Cards

| Class | Purpose |
|---|---|
| `.card` | Standard card surface — bg `--surface`, 1px `--line` border, rounded |
| `.card-pad-lg` | Increased padding variant |
| `.card-head` | Top strip inside a card (title left, controls right) |
| `.card-grid` | Grid container for laying out cards |
| `.cg-2` | 2-column grid |
| `.cg-3` | 3-column grid |
| `.cg-2-1` | 2:1 ratio grid (left 2/3, right 1/3) |

## Tables

| Class | Purpose |
|---|---|
| `table.data` | Base data table |
| `th.num` | Numeric column header (right-aligned) |
| `.cell-num` | Numeric cell (right-aligned, JetBrains Mono) |
| `tr.highlight` | Highlighted row (e.g. "you" row in rankings) |
| `.you-badge` | Inline "YOU" badge for the user's own row |
| `.tlink` | Table link styling |

## Comments

| Class | Purpose |
|---|---|
| `.comment-row` | One comment item |
| `.comment-user` | Username strip |
| `.comment-body` | Body text |
| `.quote` | Quote-style block |

## Pipeline (SEO crawl progress)

| Class | Purpose |
|---|---|
| `.pipeline` | Container for the step row |
| `.pipe-step.pending` | Step not yet started |
| `.pipe-step.running` | Step in progress (animated) |
| `.pipe-step.done` | Step complete |
| `.pipe-step.error` | Step failed |
| `.pipe-num` | Step number circle |
| `.pipe-label` | Step name |
| `.ps-done` / `.ps-running` / `.ps-pending` / `.ps-error` | Status color modifiers |

## Tabs

| Class | Purpose |
|---|---|
| `.tabs` | Tab strip container |
| `.tab` | Individual tab |
| `.tab.on` | Active tab — yellow underline |

## Chips / pills / buttons

| Class | Purpose |
|---|---|
| `.chip` | Filter chip |
| `.chip.on` | Active chip — yellow tint |
| `.pill-*` | Generic small pills (sentiment, severity, etc.) — variants like `.pill-pos`, `.pill-neg`, `.pill-crit` are conventional but not strictly defined |
| `.btn` | Standard button |
| `.btn-yellow` | Yellow CTA button |
| `.fld` | Form field |

## Misc

| Class | Purpose |
|---|---|
| `.section` | Section block within a page |
| `.divider` | Horizontal divider |
| `.empty` | Empty-state container ("No items match your filters.") |
| `.mono` | JetBrains Mono font family |
| `.app-bg` | Fixed gradient background (added once globally) |
| `.dot-grid` | Fixed dot-grid overlay (added once globally) |

## Table UX standard (apply to any new table — from CLAUDE.md QA pass)

1. Every column is a `<SortableTh>` with `title=` describing the column in plain language.
2. Last column is a fixed-40px `<ExtLink>` button (from `SortableTh.tsx`) to open the source row.
3. Search input above the table searches all visible text.
4. Filter chips on the card-head left; "Click any column to sort" hint top-right.
5. Empty state: `<div className="empty">No items match your filters.</div>`.
6. Sort behaviour: click same column → toggle direction; click new column → default desc.
