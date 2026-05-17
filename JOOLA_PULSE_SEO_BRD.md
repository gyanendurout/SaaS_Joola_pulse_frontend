# JOOLA Pulse — SEO Intelligence Center & SEO Manager SaaS
## Business Requirements Document

**Version:** 2.0
**Date:** May 2026
**Owner:** JOOLA Growth & Brand Marketing · Engineering
**Status:** Approved for build
**Companion document:** `JOOLA_PULSE_BRD.md` (full platform BRD, includes Instagram Intelligence)

---

## 0. How To Read This Document

This BRD describes a single product: an **SEO Intelligence Center** that doubles as an autonomous **SEO Manager SaaS** for the JOOLA brand. It is organized so that:

- A **product manager** can read sections 1–6 and understand vision, users, scope.
- An **engineering team** can read sections 7–13 and start building.
- A **QA / AI code agent** can read sections 14–17 and verify behavior.

Every functional requirement has an ID (`FR-XX-NN`). Every acceptance criterion has an ID (`AC-NN`). The document deliberately mixes business-friendly language with technical specificity.

---

## 1. Executive Summary

JOOLA Pulse's SEO module is being upgraded from an audit tool into a **full SEO Manager SaaS**. Instead of merely reporting issues, the system will analyze the site, prioritize what to fix first, generate the content needed to capitalize on opportunities, track improvements over time, and recommend weekly actions — acting in the role a senior in-house SEO manager would.

The cornerstone of the upgrade is a redesigned **Run Analysis** page that is no longer a black box. Every pipeline step is an expandable, collapsible card showing:

1. What data was collected
2. Which source / API / crawler / AI step produced it
3. What was stored in the database
4. Step status: pending / running / completed / failed / skipped
5. Duration and error message (if any)
6. A "View Stored Data" / "Raw Data Preview" affordance where useful
7. A clear separation between user-friendly insights and raw technical payloads

This transparency layer turns the platform into an auditable system of record, not just a recommendation engine.

---

## 2. Business Problem

| Pain Point | Impact |
|---|---|
| SEO audits surface issues but do not prioritize, fix, or track them | Issues sit in spreadsheets and never close |
| Existing tools (Semrush / Ahrefs) are read-only and disconnected from JOOLA's content workflow | Content team duplicates work; insight does not become output |
| Ranking, technical, content, and backlink data live in 4 different products | Marketing stitches insights by hand each week |
| AI recommendations from competing tools are generic and not tied to JOOLA's own crawl data | Low trust, low actionability |
| No memory across runs — every crawl is a fresh start | Cannot see if a fix worked or a problem worsened |
| When a step fails, the entire run is opaque | Hard to debug; data loss |

JOOLA Pulse SEO closes these gaps by combining a transparent multi-step crawler, AI enrichment, content generation, and a run-to-run comparison layer in one product.

---

## 3. Product Vision

> **"An always-on SEO manager that watches our site, tells us what to fix this week, writes the content that fills the gaps, and proves the result the next time it runs."**

Three pillars:

1. **Transparency** — every recommendation traces back to the exact crawl data, API response, and AI prompt that produced it. The Run Analysis page is an audit trail.
2. **Action** — the platform doesn't stop at "what's wrong." It generates drafts, content calendars, and prioritized weekly actions.
3. **Memory** — every run is compared to the previous one. Issues, rankings, and opportunities are tracked across time.

---

## 4. Goals & KPIs (measured 90 days post-launch)

| Goal | KPI | Target |
|---|---|---|
| Faster issue detection | Avg hours from issue introduction → flagged in dashboard | < 24h |
| Faster issue triage | % of critical issues triaged within 48h | ≥ 90% |
| Higher content velocity | AI-assisted content drafts produced per month | ≥ 8 |
| Better ranking outcomes | Tracked keywords improving rank vs prior run | ≥ 25% |
| Trust & adoption | Operators who view at least one "Raw Data Preview" per run | ≥ 50% |
| Reliability | Runs that complete with ≥ 80% of steps successful | ≥ 95% |
| Cost discipline | Avg OpenAI cost per run | ≤ $0.50 |

---

## 5. Personas

| Persona | Primary need | Where they live in the app |
|---|---|---|
| **Growth Manager** | Weekly SEO health, what to fix this week | Overview → Recommendations → Run Analysis |
| **Content Strategist** | Topic ideas, content calendar, drafts | Content AI → Content Calendar → Keywords |
| **SEO Engineer** | Technical fixes, evidence, raw data | Technical SEO → Run Analysis (expanded) |
| **Brand / PR Manager** | Coverage of brand and athletes in media | News & Media Intelligence (companion module) |
| **Executive** | One-page status: improving, stable, declining | Overview → Performance |
| **AI Code Agent** | Machine-readable run state, raw payloads, retry hooks | API endpoints, run_steps + raw_api_payloads tables |

---

## 6. Scope

### 6.1 In Scope

- **Run Analysis** with expandable, transparent per-step cards
- **Technical SEO Audit** with at least 15 deterministic checks
- **On-Page SEO Optimization** with current vs suggested rewrites
- **Business Intelligence Extraction** from crawled pages
- **Keyword Intelligence** with intent classification and clustering
- **SERP & Competitor Analysis** for selected keywords
- **Ranking & Gap Analysis** including run-to-run comparison
- **Backlink & Authority Analysis**
- **AI Recommendations** prioritized by impact and effort
- **AI Content Generation** (blog, product copy, FAQ, social, calendar)
- **Export** in JSON / CSV / Excel / PDF
- **Cost control** for AI and paid APIs

### 6.2 Out of Scope (this BRD)

- Instagram Intelligence (covered in `JOOLA_PULSE_BRD.md`)
- News & Media Intelligence (covered in companion module — referenced where it intersects)
- Paid acquisition / Google Ads / Meta Ads
- Email marketing analytics
- E-commerce conversion attribution
- Multi-tenant / multi-brand support (Phase 3 candidate)

---

## 7. Functional Requirements

### 7.1 Run Analysis / Live Processing

| ID | Requirement |
|---|---|
| FR-RA-01 | Operator submits a URL on `/seo-analyze`, optionally selecting market (country) and language. |
| FR-RA-02 | Backend accepts request, returns a `run_id` immediately, and processes asynchronously. |
| FR-RA-03 | The Run Analysis page displays the submitted URL, selected market, language, `run_id`, and the operator's timestamp. |
| FR-RA-04 | Pipeline progress is streamed via Server-Sent Events; each step emits a discrete event. |
| FR-RA-05 | Each pipeline step is rendered as an **expandable / collapsible card**. By default, all cards are collapsed except the currently running one. |
| FR-RA-06 | Each card displays: step name, status badge (pending / running / completed / failed / skipped), duration (live timer while running, total once done), records-created count, source label (e.g. "DataForSEO `/keywords_data/...`"), error message if failed. |
| FR-RA-07 | Each card has a body section, shown only when expanded, with two clearly separated panels: (a) **Insight** — user-friendly summary of what the step learned; (b) **Raw Data** — collapsed by default, opens to show the JSON payload sample or stored DB row reference. |
| FR-RA-08 | Each card has a **"View Stored Data"** link that opens a modal listing the rows persisted by this step (with row count and a sample). |
| FR-RA-09 | If a step fails, all previously completed step cards remain expanded and usable. The run is **not** marked as fully failed unless a critical step fails. |
| FR-RA-10 | Failed steps display the error category (network, parse, quota, auth, ai_cost_cap, ai_format), the error message, and a **"Retry Step"** button when the step is technically re-runnable. |
| FR-RA-11 | Optional steps (e.g. Google Search Console) are auto-marked `skipped` with a "Not connected" reason if their auth is missing. They never block the rest of the run. |
| FR-RA-12 | Each pipeline step writes a row to the `run_steps` table including timing, status, source, records-created count, and a reference to the raw payload. |
| FR-RA-13 | The Run Analysis page exposes a top-level run summary strip: total duration, steps completed / failed / skipped, cost (USD), and a "Re-run failed steps" button. |
| FR-RA-14 | A run can be re-opened later by `run_id`; all step cards rehydrate from `run_steps` and `raw_api_payloads`. |
| FR-RA-15 | The operator can mark a run as **archived** so it stops appearing in the default history view. |

### 7.2 Technical SEO Audit

All checks below are deterministic (no AI required). The system **must** execute at least 15 distinct rules per crawl.

| ID | Check |
|---|---|
| FR-TS-01 | Page title missing |
| FR-TS-02 | Page title duplicated across multiple pages |
| FR-TS-03 | Page title too short (< 30 chars) |
| FR-TS-04 | Page title too long (> 65 chars) |
| FR-TS-05 | Meta description missing |
| FR-TS-06 | Meta description duplicated |
| FR-TS-07 | Meta description too short (< 70 chars) |
| FR-TS-08 | Meta description too long (> 160 chars) |
| FR-TS-09 | H1 missing |
| FR-TS-10 | Multiple H1 tags on one page |
| FR-TS-11 | Broken heading hierarchy (e.g. H3 with no H2) |
| FR-TS-12 | Canonical tag missing |
| FR-TS-13 | Canonical points to a different domain or 404 |
| FR-TS-14 | `noindex` on indexable pages OR missing `noindex` on intended-private pages |
| FR-TS-15 | Broken internal links (HTTP 4xx / 5xx) |
| FR-TS-16 | Broken external links |
| FR-TS-17 | Images without `alt` attribute |
| FR-TS-18 | Thin content (< 250 words on a content page) |
| FR-TS-19 | Missing or invalid schema.org structured data (JSON-LD) |
| FR-TS-20 | Slow page (when LCP / TTFB data available from Lighthouse / PSI) |
| FR-TS-21 | Heavy assets (uncompressed images > 500 KB, JS > 1 MB) |
| FR-TS-22 | Missing viewport meta (mobile responsiveness signal) |
| FR-TS-23 | Internal link opportunities — pages with relevant content that don't link to the analyzed page |

**Per-issue acceptance fields:**

| Field | Description |
|---|---|
| `severity` | Critical / High / Medium / Low |
| `evidence` | The exact element / URL / measured value that triggered the issue |
| `why_it_matters` | Plain-English explanation of business impact |
| `recommended_fix` | Step-by-step fix |
| `suggested_rewrite` | New title / meta / heading text where applicable (AI-generated) |
| `affected_element` | CSS selector or URL fragment |
| `status` | Open / Fixed / Ignored (default `Open`; operator can change) |
| `first_detected_run_id` | When this issue first appeared |
| `last_seen_run_id` | Most recent run that re-confirmed it |

### 7.3 On-Page SEO Optimization

| ID | Requirement |
|---|---|
| FR-OP-01 | For each crawled page, store and display current title, current meta description, current H1, current H2 list. |
| FR-OP-02 | Generate AI-suggested rewrites for title, meta description, H1; show side-by-side current vs suggested. |
| FR-OP-03 | Content gap summary per page: what topics are missing vs top-ranking competitors. |
| FR-OP-04 | Keyword usage report per page: presence of the target keyword in title, headings, body (first 100 words flag), image alt, internal anchor text. |
| FR-OP-05 | Suggested FAQ section: AI-generated 4–8 question/answer pairs based on People Also Ask and competitor pages. |
| FR-OP-06 | Suggested schema markup type (Product / Article / FAQ / BreadcrumbList / Organization) with JSON-LD draft. |
| FR-OP-07 | Suggested internal links: 3–10 in-domain pages that should link to this page (or that this page should link to). |

### 7.4 Business Intelligence Extraction

The system infers, from the crawled HTML and AI enrichment:

| Field | Source |
|---|---|
| Products | Schema.org Product / heading / repeated SKU patterns / AI |
| Categories | Breadcrumb / nav / schema / AI |
| Brands | Schema / brand patterns / AI |
| Services | AI from page content |
| Target audience / persona | AI |
| Buyer intent (Awareness / Consideration / Purchase) | AI |
| Main topics (3–8) | AI from page content |
| Commercial intent keywords | AI seed list |
| Informational intent keywords | AI seed list |
| Seed keywords for deeper research | Union of above; fed into 7.5 |

Stored in `extracted_entities` linked to `run_id` and `page_id`.

### 7.5 Keyword Intelligence

Inputs: seed keywords from 7.4 + existing ranking data.

| ID | Requirement |
|---|---|
| FR-KW-01 | Generate keyword ideas (≥ 50 per run when API budget allows). |
| FR-KW-02 | For each idea, persist: search_volume, CPC, keyword_difficulty (KD). |
| FR-KW-03 | Intent classification per keyword: Informational / Commercial / Transactional / Navigational. |
| FR-KW-04 | Priority score (0–100) = f(volume, KD, current rank, intent fit, commercial value). |
| FR-KW-05 | Recommended content type per keyword: Blog / Landing / Product / Category / FAQ / Comparison / How-to. |
| FR-KW-06 | Cluster keywords by topic (semantic + lexical). Each cluster has a name, member keywords, and a suggested pillar page. |
| FR-KW-07 | Suggested target page per keyword (an existing URL or "new page needed"). |

### 7.6 SERP & Competitor Analysis

| ID | Requirement |
|---|---|
| FR-SR-01 | For each selected keyword (default: top 20 by priority), fetch top 10 SERP results. |
| FR-SR-02 | Show the analyzed page's current rank (or "Not ranking") vs competitors. |
| FR-SR-03 | Competitor title / meta / H1 captured per result. |
| FR-SR-04 | Content length comparison (word count, image count, FAQ presence). |
| FR-SR-05 | Missing topics — topics covered by ≥ 50% of competitors but not by JOOLA. |
| FR-SR-06 | Backlink count + referring domain count per competitor (when API budget allows). |
| FR-SR-07 | "Suggested positioning opportunity" — AI synthesis of the gap. |

### 7.7 Ranking & Gap Analysis

Existing ranking signals:

| ID | Requirement |
|---|---|
| FR-GA-01 | Show all keywords the domain currently ranks for (DataForSEO + GSC merged, de-duped). |
| FR-GA-02 | Per keyword: current position, search volume, opportunity score, current URL. |
| FR-GA-03 | "Near page 1" segment — keywords ranking 11–20. |
| FR-GA-04 | "Losing position" — keywords whose rank worsened ≥ 3 positions vs previous run. |
| FR-GA-05 | High impression / low CTR (from GSC) — keywords with ≥ 1000 impressions and CTR < 1%. |
| FR-GA-06 | Suggested optimization action per keyword (rewrite title / improve content / build link / new page). |

Run-to-run comparison:

| ID | Requirement |
|---|---|
| FR-GA-07 | When `previous_run_id` exists for the same domain, automatically generate a comparison view. |
| FR-GA-08 | Surface: new issues, fixed issues, worsened issues, improved keywords, lost keywords, new content opportunities. |
| FR-GA-09 | Comparison persisted to `run_gap_analysis` for historical access. |

### 7.8 Backlink & Authority Analysis

| ID | Requirement |
|---|---|
| FR-BL-01 | Referring domains list with first-seen and last-seen dates. |
| FR-BL-02 | Total backlinks, dofollow %, nofollow %. |
| FR-BL-03 | Anchor text distribution (top 20). |
| FR-BL-04 | Authority signals — avg DR / DA / spam score depending on provider. |
| FR-BL-05 | Toxic / spammy backlink warning when spam score ≥ provider threshold. |
| FR-BL-06 | Competitor backlink gap — domains linking to ≥ 2 competitors but not JOOLA. |
| FR-BL-07 | AI-suggested outreach or content ideas based on the gap. |

### 7.9 AI Recommendations

Recommendations are generated **only from collected, persisted run data** — never from LLM general knowledge.

| Field | Requirement |
|---|---|
| `priority` | Critical / High / Medium / Low (FR-AI-01) |
| `impact` | High / Medium / Low — projected effect on traffic/revenue (FR-AI-02) |
| `effort` | High / Medium / Low — engineering or content effort (FR-AI-03) |
| `category` | Technical / Content / Keyword / Competitor / Backlink / UX (FR-AI-04) |
| `explanation` | Plain-English reason (FR-AI-05) |
| `evidence` | Reference to the specific issue / keyword / SERP row that triggered it (FR-AI-06) |
| `suggested_implementation` | Concrete next steps (FR-AI-07) |
| `expected_business_impact` | Quantified where possible (e.g. "+~480 monthly visits") (FR-AI-08) |
| `owner_suggestion` | SEO / Content / Developer / Marketing (FR-AI-09) |

| FR-AI-10 | Recommendations are sortable and filterable by priority, category, effort, owner. |
| FR-AI-11 | Each recommendation has a status: Open / In Progress / Done / Ignored. |
| FR-AI-12 | Status changes write to history so we can show "% recommendations closed since last run". |

---

## 8. Run Analysis Data Transparency

### 8.1 Why this section exists

Many SEO tools show only the final list of recommendations. JOOLA Pulse must show **how** it reached every recommendation. The Run Analysis page is therefore an **audit trail**, not just a progress bar.

### 8.2 What "transparency" means concretely

| Layer | What the operator can see |
|---|---|
| **Step status** | pending / running / completed / failed / skipped — with timestamps and duration |
| **Source** | Exact API endpoint, crawler module, or AI prompt used |
| **Data collected** | Counts (e.g. "287 pages fetched", "412 keywords pulled") |
| **Database write** | The exact table(s) and row count(s) persisted by this step |
| **Raw payload** | The first ~5 KB of the actual API response (truncatable), referenceable via `raw_api_payloads.id` |
| **Cost** | API cost in USD (DataForSEO units consumed, OpenAI tokens × rate) |
| **Insight** | A human-friendly bullet list of what the data tells us |
| **Failure detail** | Error category, error message, retry-ability, recommended remediation |

### 8.3 Behavior

| ID | Requirement |
|---|---|
| FR-DT-01 | When a step finishes, its card collapses but its summary line (status, count, duration, cost) stays visible. |
| FR-DT-02 | Re-expanding a card shows Insight panel first; Raw Data panel is collapsed under a `▸ Raw Data` toggle. |
| FR-DT-03 | Operators with the `engineer` role see an additional `Stored Rows (N)` panel listing the actual DB rows. |
| FR-DT-04 | Operators with the `viewer` role do not see raw payloads, only Insights. |
| FR-DT-05 | The full audit trail of a run is exportable as a single JSON envelope (`/api/runs/{id}/export.json`). |

---

## 9. SEO Intelligence Center (Aggregated View)

The SEO Intelligence Center is the **post-run dashboard** — what the user sees after a Run Analysis completes. It surfaces the same data as Run Analysis but organized by business question instead of pipeline step.

### 9.1 Modules inside the Intelligence Center

| Module | Backed by | FR refs |
|---|---|---|
| Overview | Aggregated KPIs across all modules | FR-DB-01 |
| Run Analysis (live + historical) | `runs`, `run_steps`, `raw_api_payloads` | 7.1 |
| Technical SEO | `seo_issues` | 7.2 |
| On-Page SEO | `pages`, `crawl_data` | 7.3 |
| Business Intel | `extracted_entities` | 7.4 |
| Keywords | `keywords`, `keyword_clusters` | 7.5 |
| SERP | `serp_results`, `competitors` | 7.6 |
| Rankings | `keywords` ∪ `gsc_performance` | 7.7 |
| Competitors | `competitors`, `backlinks` | 7.6, 7.8 |
| Backlinks | `backlinks` | 7.8 |
| Issues | `seo_issues` (status-tracked view) | 7.2 |
| Recommendations | `seo_recommendations` | 7.9 |
| Content AI | `content_outputs` | §10 |
| Content Calendar | `content_calendar` | §10 |
| Gap Analysis | `run_gap_analysis` | 7.7 |
| Performance / Google Search Console | `gsc_performance` | 7.7 |

### 9.2 Behavior

| ID | Requirement |
|---|---|
| FR-IC-01 | Each module is its own tab inside the Intelligence Center. |
| FR-IC-02 | Tabs whose data source is empty for the selected run show `Not Available` and are visually de-emphasized. |
| FR-IC-03 | Tabs whose required integration is not connected (e.g. GSC) show `Not Connected` with a Connect button. |
| FR-IC-04 | A persistent "Run" selector at the top of the Intelligence Center lets the operator switch between the latest run and historical runs. |
| FR-IC-05 | Every chart and table has a "Drill into Run Analysis step" link that jumps back to the source step in the Run Analysis page. |

---

## 10. AI Content Generation

The platform produces content directly from collected SEO data — not from generic LLM knowledge.

### 10.1 Output types

| ID | Output type | Inputs |
|---|---|---|
| FR-CG-01 | Blog topic ideas (≥ 10 per run) | keyword clusters, competitor gaps, business entities |
| FR-CG-02 | Blog outline for any selected topic | competitor headings, SERP analysis, intent |
| FR-CG-03 | Full blog draft (1000–1800 words) | outline + business entities + brand voice config |
| FR-CG-04 | Product page copy improvement | current page + suggested rewrites + competitor comparison |
| FR-CG-05 | Meta title + meta description rewrites | current values + target keyword + brand voice |
| FR-CG-06 | Email copy (1 subject + 1 body) | latest blog or product launch |
| FR-CG-07 | Social captions for Instagram / LinkedIn (1 each) | blog summary + brand voice |
| FR-CG-08 | FAQ content (4–8 Q/A pairs) | People Also Ask + competitor FAQs |
| FR-CG-09 | 4-week content calendar | keyword clusters, business entities, planned launches |

### 10.2 Generation rules

| ID | Requirement |
|---|---|
| FR-CG-10 | Every generated output is persisted to `content_outputs` with `run_id`, `type`, `inputs_json`, `output_text`, `model`, `prompt_version`, `cost_usd`. |
| FR-CG-11 | Operator can regenerate any output; both versions are kept (no destructive overwrite). |
| FR-CG-12 | Operator can edit any output in-app; edits saved as a new version. |
| FR-CG-13 | Each output exposes the prompt + inputs that produced it (transparency parity with §8). |
| FR-CG-14 | Brand voice config (`tone`, `audience`, `forbidden_words`, `signature_phrases`) lives in `settings` and is injected into every prompt. |

---

## 11. Dashboard / Tabs

The dashboard exposes the following tabs in this exact order (left to right):

1. **Overview** — top-level KPIs, last run summary, current week recommendations
2. **Run Analysis** — live + historical (§7.1, §8)
3. **Technical SEO** — issues list with severity filter and status workflow (§7.2)
4. **On-Page SEO** — per-page current vs suggested (§7.3)
5. **Business Intel** — extracted entities (§7.4)
6. **Keywords** — keyword ideas + clusters (§7.5)
7. **SERP** — SERP comparison per keyword (§7.6)
8. **Rankings** — ranked keywords + opportunity segments (§7.7)
9. **Competitors** — competitor profile + content + backlink gap (§7.6, §7.8)
10. **Backlinks** — backlink profile (§7.8)
11. **Issues** — same data as Technical SEO but cross-page, status-grouped
12. **Recommendations** — prioritized AI recommendations (§7.9)
13. **Content AI** — generated content library (§10)
14. **Content Calendar** — 4-week roadmap (§10)
15. **Gap Analysis** — run-to-run comparison (§7.7)
16. **Performance / Google Search Console** — GSC panel (§7.7)

| ID | Requirement |
|---|---|
| FR-DB-01 | Each tab is independently loadable; not loading other tabs' data. |
| FR-DB-02 | Empty / unavailable tabs are visible but disabled, with a tooltip explaining why. |
| FR-DB-03 | The user's last-viewed tab is remembered per run. |

---

## 12. Data Model

### 12.1 Core tables

| Table | Purpose | Key columns |
|---|---|---|
| `runs` | One row per analysis | id, url, market, language, started_at, finished_at, status, total_duration_ms, total_cost_usd, operator_id, archived |
| `run_steps` | One row per pipeline step within a run | id, run_id, step_name, status, started_at, completed_at, duration_ms, source, records_created_count, payload_summary, raw_payload_reference, error_category, error_message, cost_usd, retryable |
| `pages` | Crawled pages | id, run_id, url, status_code, content_type, word_count, lcp_ms, ttfb_ms, viewport_present |
| `crawl_data` | Per-page raw fields | id, page_id, title, meta_description, h1_list, h2_list, canonical, robots, schema_jsonld, internal_links_count, external_links_count, images_no_alt_count, full_html_ref |
| `seo_issues` | Issues detected by the audit | id, run_id, page_id, rule_id, severity, evidence, why_it_matters, recommended_fix, suggested_rewrite, affected_element, status, first_detected_run_id, last_seen_run_id |
| `seo_recommendations` | AI recommendations | id, run_id, priority, impact, effort, category, explanation, evidence_refs, suggested_implementation, expected_business_impact, owner_suggestion, status |
| `extracted_entities` | Business intelligence from page | id, run_id, page_id, products, categories, brands, services, target_audience, buyer_intent, main_topics, commercial_keywords, informational_keywords, seed_keywords |
| `keywords` | Keyword ideas + ranking data | id, run_id, keyword, search_volume, cpc, difficulty, intent, priority_score, recommended_content_type, current_rank, current_url, previous_rank, opportunity_score, cluster_id |
| `keyword_clusters` | Topical clusters | id, run_id, name, suggested_pillar_url, member_count |
| `serp_results` | Top-10 per tracked keyword | id, run_id, keyword_id, position, url, title, meta_description, h1, word_count, has_faq, backlinks_count, refdomains_count |
| `competitors` | Discovered competitors | id, run_id, domain, appearance_count, avg_position, content_strength_score |
| `backlinks` | Backlinks (one row per unique referring URL) | id, run_id, referring_url, referring_domain, anchor_text, dofollow, first_seen, last_seen, dr, spam_score, is_toxic |
| `content_outputs` | AI-generated content | id, run_id, type, title, body, inputs_json, model, prompt_version, cost_usd, parent_output_id (for versions) |
| `content_calendar` | Scheduled content | id, run_id, week_start, day_of_week, content_type, topic, target_keyword, status |
| `gsc_performance` | Cached GSC data | id, run_id, query, page, clicks, impressions, ctr, position, date_range_start, date_range_end |
| `run_gap_analysis` | Comparison of run N vs run N-1 | id, run_id, previous_run_id, new_issues_count, fixed_issues_count, worsened_issues_count, improved_keywords, lost_keywords, new_opportunities_json |
| `cost_ledger` | Per-API-call cost record | id, run_id, step_id, provider, units, unit_type, cost_usd, timestamp |
| `raw_api_payloads` | Raw API responses for transparency | id, run_id, step_id, provider, endpoint, request_payload, response_payload, sha256, stored_size_bytes |

### 12.2 Required columns on every `run_steps` row

`run_id, step_name, status, started_at, completed_at, duration_ms, source, records_created_count, payload_summary, raw_payload_reference, error_message`

### 12.3 Indexes (must-have)

`runs(operator_id, started_at desc)`,
`run_steps(run_id, started_at)`,
`seo_issues(run_id, severity, status)`,
`keywords(run_id, priority_score desc)`,
`backlinks(run_id, referring_domain)`,
`raw_api_payloads(run_id, step_id)`.

---

## 13. APIs

All endpoints are JSON unless noted. SSE endpoints use `text/event-stream`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyze` | Submit a new run. Body: `{ url, market?, language?, options? }`. Returns `{ run_id }`. |
| GET | `/api/analyze/{id}` | Get a run summary (status, durations, costs, step counts). |
| GET | `/api/analyze/{id}/events` | SSE stream of pipeline events for live progress. |
| GET | `/api/analyze/{id}/dashboard` | Aggregated payload for the Intelligence Center tabs. |
| GET | `/api/analyze/{id}/run-steps` | Full list of step rows for the Run Analysis page. |
| GET | `/api/analyze/{id}/raw-data/{step}` | Raw stored payload for a single step. Returns 403 for `viewer` role. |
| POST | `/api/analyze/{id}/rerun-step` | Body: `{ step_name }`. Replays only the requested step. |
| GET | `/api/runs/{id}/export.json` | Full report as a single JSON envelope. |
| GET | `/api/runs/{id}/report.xlsx` | Excel workbook with one sheet per module. |
| GET | `/api/runs/{id}/report.pdf` | Executive PDF report. |
| GET | `/api/runs` | List runs (filter by domain, date range, status). |

| ID | Requirement |
|---|---|
| FR-API-01 | All endpoints require authentication; runs are scoped to the operator's organization. |
| FR-API-02 | All write endpoints return the full updated resource (no follow-up GET needed). |
| FR-API-03 | SSE events follow a documented schema: `event: step.{started\|progress\|completed\|failed\|skipped}` with JSON `data`. |
| FR-API-04 | All errors follow `{ error: { code, message, details? } }`. |
| FR-API-05 | Rate limit: 5 concurrent runs per organization (configurable). |

---

## 14. Non-Functional Requirements

### 14.1 Performance

| ID | Requirement |
|---|---|
| NFR-01 | SEO crawl completes within 5 min for a domain with < 1,000 indexed pages. |
| NFR-02 | SSE progress event delivered within 2 seconds of step completion. |
| NFR-03 | Dashboard P95 initial load < 3 seconds. |
| NFR-04 | "View Stored Data" modal opens within 1 second for payloads ≤ 100 KB. |

### 14.2 Reliability & Failure Handling

| ID | Requirement |
|---|---|
| NFR-05 | A failed step never aborts the run. Subsequent steps that don't depend on the failed step still execute. |
| NFR-06 | Completed steps stay visible and usable when a later step fails. |
| NFR-07 | Optional steps (GSC, Backlinks if no API key) auto-skip with a clear `Not Connected` reason. |
| NFR-08 | API quota / cost-cap errors surface as a distinct `quota_exceeded` error category, not generic "failed". |
| NFR-09 | AI cost cap stops **only** AI-dependent steps; deterministic steps (crawl, parse, audit rules) always complete. |
| NFR-10 | The system retries transient errors (HTTP 5xx, timeouts) up to 3 times with exponential backoff before marking a step failed. |

### 14.3 Security

| ID | Requirement |
|---|---|
| NFR-11 | All routes protected behind authentication (Supabase Auth or equivalent). |
| NFR-12 | Row-Level Security enforced on every table that contains run data. |
| NFR-13 | API keys (DataForSEO, OpenAI, Google) stored as server-side env vars; never client-readable. |
| NFR-14 | GSC OAuth tokens stored encrypted at rest; refresh tokens rotated. |
| NFR-15 | Raw payloads exposed only to `engineer` and `admin` roles. |

### 14.4 Scalability

| ID | Requirement |
|---|---|
| NFR-16 | Pipeline workers horizontally scalable (queue-backed). |
| NFR-17 | `raw_api_payloads` can be moved to object storage (S3-compatible) when row exceeds 256 KB. |
| NFR-18 | Old runs prunable after 90 days; aggregated summaries kept indefinitely. |

### 14.5 Observability

| ID | Requirement |
|---|---|
| NFR-19 | Every pipeline step emits structured logs with `run_id`, `step_name`, `duration_ms`, `status`, `cost_usd`. |
| NFR-20 | Admin debug view shows live run telemetry: queue depth, error rates per source, cost per run trend. |

### 14.6 Cost Control

| ID | Requirement |
|---|---|
| NFR-21 | OpenAI cost tracked per run in `cost_ledger`. |
| NFR-22 | Hard cap per run (configurable, default $1.00). Exceeding the cap stops AI-only steps and marks them `quota_exceeded`. |
| NFR-23 | Keyword and SERP results cached per (keyword, market, language) with a configurable TTL (default 7 days). |
| NFR-24 | Same domain not re-crawled within 60 minutes unless `force=true` is passed. |

### 14.7 Accessibility & UX

| ID | Requirement |
|---|---|
| NFR-25 | Dark theme consistent with JOOLA Pulse design system v2 (`#0a0d12` background, `#F5E625` accent). |
| NFR-26 | All interactive elements keyboard-navigable; focus rings on `:focus-visible` only. |
| NFR-27 | All tables sortable and paginated client-side. |
| NFR-28 | All tooltips escape their container and are not clipped by `overflow: hidden`. |
| NFR-29 | Engagement / score / percentage values displayed with bounded scales (no > 100% unless a viral edge case is explicitly labeled). |

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DataForSEO API cost overrun | Medium | Medium | Per-run cap, caching, scheduled crawl frequency, alerts when monthly spend > 80% of budget |
| OpenAI rate limit or outage | Medium | Medium | Async queue, exponential backoff, deterministic steps proceed independently |
| AI mis-classification (sentiment, intent, severity) | Medium | Medium | Show confidence; allow operator override; require evidence pointer |
| Source website blocks crawler | Low | High | Respect robots.txt; per-host rate limit; user-agent rotation; surface block reason in step error |
| GSC OAuth token expiry | Medium | Low | Auto-refresh; clear re-auth prompt; mark step `skipped` if refresh fails |
| Operator over-trusts AI recommendations | Medium | High | Every recommendation links back to the raw evidence; "Why this?" link always present |
| Raw payload exposure leaks API keys | Low | High | Strip auth headers from stored payloads; redact tokens before persistence |
| Run state lost on worker crash | Low | High | All step state persisted before emitting SSE event; runs resumable from `run_steps` table |
| Cost cap stops critical step | Low | Medium | Cost cap applies only to AI-dependent steps; deterministic crawl/audit always completes |

---

## 16. Roadmap

### Phase 1 — Transparent Crawl & Audit (M0–M2)

| ID | Feature |
|---|---|
| P1-1 | Run Analysis with expandable per-step cards (§7.1, §8) |
| P1-2 | Technical SEO audit rules FR-TS-01 → FR-TS-23 |
| P1-3 | On-Page rewrites (FR-OP-01 → FR-OP-04) |
| P1-4 | Run history + re-open by `run_id` |
| P1-5 | Raw payload viewer (engineer role) |
| P1-6 | JSON export |

### Phase 2 — Intelligence & Memory (M2–M4)

| ID | Feature |
|---|---|
| P2-1 | Business Intelligence Extraction (§7.4) |
| P2-2 | Keyword Intelligence + clusters (§7.5) |
| P2-3 | SERP + Competitor analysis (§7.6) |
| P2-4 | Ranking & Gap Analysis (§7.7) |
| P2-5 | Backlink module (§7.8) |
| P2-6 | AI Recommendations with status workflow (§7.9) |
| P2-7 | Run-to-run comparison (FR-GA-07 → FR-GA-09) |
| P2-8 | Excel + PDF export |

### Phase 3 — Active SEO Manager (M4–M6)

| ID | Feature |
|---|---|
| P3-1 | AI Content Generation (§10) |
| P3-2 | 4-week content calendar (FR-CG-09) |
| P3-3 | Weekly digest email |
| P3-4 | "What to fix this week" prioritized brief |
| P3-5 | Brand voice config + multi-version content management |

### Phase 4 — Scale (M6+)

| ID | Feature |
|---|---|
| P4-1 | Scheduled auto-crawls (weekly) |
| P4-2 | Slack / email alerts when critical issues regress |
| P4-3 | Multi-brand support |
| P4-4 | Public read-only share links for stakeholders |

---

## 17. Acceptance Criteria

Each criterion below must be independently testable. Failure of any blocks GA.

| ID | Criterion |
|---|---|
| AC-01 | Operator can submit a URL on `/seo-analyze` and start an analysis. |
| AC-02 | Operator can see live run progress within 2 seconds of each step completion. |
| AC-03 | Each Run Analysis section is expandable / collapsible by clicking its header. |
| AC-04 | Each section shows: status, duration, source, collected data summary, and stored DB row count. |
| AC-05 | At least 15 deterministic SEO rules are executed and produce `seo_issues` rows. |
| AC-06 | AI recommendations are generated and every recommendation references at least one piece of evidence (issue id, keyword id, or SERP row). |
| AC-07 | Keyword, SERP, competitor, and backlink sections render data when their API keys are configured. |
| AC-08 | If any single step fails, all previously completed step data remains visible and usable, and the run is **not** marked fully failed. |
| AC-09 | Failed steps display the error category and an actionable error message. |
| AC-10 | Optional / unconnected steps render as `skipped` with a clear "Not Connected" reason and do not block the rest of the run. |
| AC-11 | A failed step can be re-run individually via "Retry Step" and the new outcome replaces the prior failure record. |
| AC-12 | A run can be exported as JSON, CSV (zip with one CSV per table), Excel (.xlsx with one sheet per module), and PDF (executive summary). |
| AC-13 | Re-analysis of a previously crawled domain auto-generates a Gap Analysis page comparing new vs previous run. |
| AC-14 | AI Content Generation produces: ≥ 10 blog topic ideas, ≥ 1 blog outline, ≥ 1 full draft, meta rewrites for at least the analyzed page, ≥ 1 email, ≥ 1 social caption per channel, ≥ 1 FAQ block, and a 4-week content calendar. |
| AC-15 | The Performance / Google Search Console tab appears only when GSC is connected; otherwise it is visible but disabled with a "Connect GSC" call to action. |
| AC-16 | Engagement / percentage / score displays never exceed their plausible scale (e.g. ER never shown as > 999%; KD shown 0–100; priority score 0–100). |
| AC-17 | Tooltips on every KPI and chart are visible — they are not clipped by any parent container. |
| AC-18 | OpenAI cost per run is recorded in `cost_ledger` and surfaced in the admin debug view. |
| AC-19 | When the AI cost cap is hit mid-run, only AI-dependent steps are stopped; the crawl, audit, and ranking pulls still complete. |
| AC-20 | Raw API payloads are visible to `engineer` / `admin` roles and 403 for `viewer`. |

---

## 18. SEO Manager Intelligence Layer (Vision Section)

JOOLA Pulse SEO is not just an audit tool. The long-term ambition is for the platform to behave like a senior SEO manager on the team. Concretely:

1. **It watches the site.** Scheduled crawls run automatically. Critical issues create alerts.
2. **It diagnoses.** Every issue has severity, evidence, and a fix.
3. **It prioritizes.** Recommendations are ranked by impact ÷ effort, not alphabetically.
4. **It writes.** Once a gap is identified, the platform drafts the asset that closes it.
5. **It tracks.** Every recommendation has a status and a closure date. Improvement is visible over time.
6. **It compares.** Competitors and run-over-run baselines are always one click away.
7. **It plans.** A weekly brief — "Fix these 3 things, publish this 1 blog" — is generated automatically.

The Intelligence Center is the workspace. The SEO Manager Intelligence Layer is the behavior: proactive, opinionated, accountable.

---

## 19. Open Questions

| # | Question | Needed before |
|---|---|---|
| Q-01 | Which backlink provider becomes primary — DataForSEO Backlinks or Ahrefs? Cost & coverage trade-off. | Phase 2 start |
| Q-02 | Should historical pages (`pages` rows) be retained beyond 90 days for trend analysis, or aggregated? | Phase 2 start |
| Q-03 | Brand voice config — single global voice, or per-content-type voices? | Phase 3 start |
| Q-04 | Should the platform open access to JOOLA partners (agencies, contractors), or remain JOOLA-only? | Phase 3 |
| Q-05 | PDF report design — executive 1-pager only, or full multi-page report? | Phase 2 |
| Q-06 | How aggressive should the "Retry Step" auto-retry be? Soft retry on quota errors? | Phase 1 |
| Q-07 | Do we expose the AI prompt + model used per generated content piece to the operator? | Phase 3 |
| Q-08 | Should `seo_issues.status` changes trigger a Slack notification for "Fixed" events? | Phase 4 |

---

## 20. Glossary

| Term | Definition |
|---|---|
| **Run** | One execution of the SEO analysis pipeline against a single URL. Has a `run_id`, status, and timing. |
| **Step** | One discrete unit of work inside a run (e.g. "Fetch HTML", "AI Recommendations"). |
| **Audit Trail** | The full chain of step outputs, raw payloads, and stored rows that justify a final recommendation. |
| **Gap Analysis** | Side-by-side comparison of run N vs run N-1: new issues, fixed issues, improved keywords, etc. |
| **KD** | Keyword Difficulty — provider-supplied 0–100 score. |
| **Opportunity Score** | Internal 0–100 score combining volume, difficulty, current rank, and intent fit. |
| **Cluster** | Group of semantically related keywords mapped to a single pillar page. |
| **Pillar Page** | The page intended to rank for a cluster's main topic. |
| **SERP** | Search Engine Results Page. |
| **GSC** | Google Search Console. |
| **DR / DA** | Domain Rating / Domain Authority — provider-specific authority scores. |
| **Toxic Backlink** | Backlink with spam score ≥ threshold; candidate for disavow. |
| **Raw Payload** | Untransformed API or AI response stored in `raw_api_payloads`. |
| **Insight Panel** | The user-friendly summary in a Run Analysis card. |
| **Run Step Card** | The expandable UI unit on the Run Analysis page corresponding to one `run_steps` row. |
| **Cost Cap** | Configurable max OpenAI spend per run; when hit, AI-only steps stop while deterministic steps continue. |

---

*This document is the canonical specification for the SEO Intelligence Center and SEO Manager SaaS portion of JOOLA Pulse. For platform-wide context, refer to `JOOLA_PULSE_BRD.md`. For the News & Media Intelligence companion module, see §6.2.4 of the platform BRD.*
