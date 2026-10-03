# Design tokens (Design2 / v2)

All tokens are CSS custom properties defined on `.v2-root` (applied to `<body>` in `frontend/app/layout.tsx`). Source of truth: `frontend/app/globals.css` lines 12-51.

## Colors

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0d12` | App background |
| `--bg-2` | `#0f1219` | Secondary background (cards on cards) |
| `--surface` | `#141821` | Card surface |
| `--surface-2` | `#1a1f2b` | Elevated surface (modal, dropdown) |
| `--line` | `rgba(255,255,255,0.07)` | Primary border |
| `--line-2` | `rgba(255,255,255,0.04)` | Secondary / dividers |
| **`--fg`** | `#ffffff` | Strongest text |
| `--fg-2` | `#e2e6ed` | Body text (default) |
| `--fg-3` | `#c4cad6` | De-emphasized text |
| `--fg-4` | `#9aa2b0` | Tertiary / labels |
| **`--yellow`** | `#F5E625` | JOOLA brand accent (CTAs, active nav, KPI highlights) |
| `--yellow-deep` | `#D9CB1F` | Yellow hover state |
| `--yellow-dim` | `rgba(245,230,37,0.10)` | Yellow tint (active nav bg) |
| `--yellow-edge` | `rgba(245,230,37,0.30)` | Yellow border |
| `--red` | `#D6182A` | Critical / danger |
| `--red-deep` | `#A30E1E` | Hover variant |
| `--red-dim` | `rgba(214,24,42,0.10)` | Crisis row tint |
| **`--joola`** | `#22c55e` | Success / positive sentiment / "you" highlight |
| `--joola-dim` | `rgba(34,197,94,0.12)` | Joola tint |
| `--joola-edge` | `rgba(34,197,94,0.28)` | Joola border |
| `--up` | `#22c55e` | Positive delta |
| `--down` | `#ef4444` | Negative delta |
| `--warn` | `#f59e0b` | Warning / amber |
| `--info` | `#818cf8` | Info / indigo |
| `--pink` | `#ec4899` | Series accent (charts) |
| `--cyan` | `#06b6d4` | Series accent (charts) |

## Typography

| Family | Weight | Used for | Source |
|---|---|---|---|
| **Archivo** | 400, 500, 600, 700, 800, 900 | Body text, nav, headings | Google Fonts `@import` in `globals.css:1` |
| **Archivo Black** | 900 only | Brand wordmark, large emphasis | Google Fonts |
| **JetBrains Mono** | 500, 600, 700 | Numeric data, monospace cells (`.mono`), sidebar foot, badges | Google Fonts |

Base size: `14px` (set on `.v2-root`).
Font smoothing: `-webkit-font-smoothing: antialiased`.

## Layout

| Token | Value | Notes |
|---|---|---|
| `--sidebar-w` | `232px` | Expanded sidebar width |
| Collapsed sidebar width | `60px` | Hard-coded in `.sidebar.collapsed` |
| Main inner max-width | `1280px` | Hard-coded in `.main-inner` |
| Main inner padding | `24px 32px 64px` | Top/sides/bottom |
| Transition for sidebar | `240ms ease` | `.sidebar`, `.main` margin |

## Stacking + atmosphere

- `.shell { position: relative; z-index: 1; isolation: isolate }` — establishes stacking context (BUG-003 fix).
- `.main { position: relative; z-index: 1; overflow-x: clip }` — `clip` (not `hidden`) prevents nested scroll containers from trapping wheel events.
- `.main-inner { position: relative; z-index: 2; background: transparent }` — top of the stack.
- `.app-bg`, `.dot-grid` — fixed full-viewport background gradients + dot grid, masked to fade at bottom.

## Atmospheric backgrounds

- `.app-bg` — three radial gradients: yellow top-left, indigo top-right, green bottom-center. Each `rgba(...)`-weak at ~0.03-0.04 alpha.
- `.dot-grid` — 1px white dots on a 24x24 grid, masked to fade.

## Brand mark

- `.brand-mark` — 32×32 black square, 1.5px yellow border, Archivo Black "J" centered.
- `.brand-wordmark` — Archivo Black 13px, letter-spacing 0.04em.
- `.brand-tag` — 9.5px uppercase, letter-spacing 0.08em (was 0.14em pre-BUG-020), color `--fg-4`.

## Live pulse animation

`.live-pulse-dot` — 6px yellow dot, `box-shadow: 0 0 8px rgba(245,230,37,0.7)`, `animation: pulse 1.8s infinite` (opacity 1→0.5, scale 1→0.85).

## Tailwind compatibility

Tailwind is still installed (`tailwind.config.ts` + `postcss.config.js`) for compat with old components. **New components MUST use Design2 classes, not Tailwind.** See `design2-classes.md` for the catalog.
