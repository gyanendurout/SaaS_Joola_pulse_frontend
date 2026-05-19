import { test, expect } from '@playwright/test';

// =============================================================================
// Content Generation feature — Playwright smoke tests (Task I2)
//
// Style mirrors e2e/smoke.spec.ts: thin assertions, tolerant selectors,
// `.first()` + `.or()` fallbacks so empty-DB states don't fail CI.
// =============================================================================

test.describe('Content Generation — Hub', () => {
  test('/content-generation: hub loads with title, format cards, drafts area', async ({ page }) => {
    const response = await page.goto('/content-generation', { waitUntil: 'domcontentloaded' });
    expect(response?.status(), '/content-generation returned unexpected status').toBe(200);
    await expect(page).toHaveTitle(/JOOLA/i);
    await expect(page.locator('.sidebar')).toBeVisible();

    // Hub title (heading is "Content Studio" — match case-insensitively for safety)
    await expect(
      page.getByRole('heading', { name: /content\s+studio/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Three format cards: Text (live), Image (soon), Reel (soon). Cards render
    // their title in an uppercase Archivo Black block — use text match.
    await expect(page.getByText(/^TEXT$/).first()).toBeVisible();
    await expect(page.getByText(/^IMAGE$/).first()).toBeVisible();
    await expect(page.getByText(/^REEL$/).first()).toBeVisible();

    // Image + Reel cards carry a "SOON" pill / "Q3 2026"/"Q4 2026" ETA badge.
    // Looking for at least one "SOON" pill on the page is enough.
    await expect(page.getByText(/SOON/i).first()).toBeVisible();

    // Recent drafts: either a table.data is rendered OR a `.empty` empty-state
    // message is shown ("No drafts yet…" / "No drafts match your filters.").
    const draftsTable = page.locator('table.data');
    const emptyState = page.locator('.empty');
    await expect(draftsTable.first().or(emptyState.first())).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Content Generation — Text composer', () => {
  test('/content-generation/text: composer loads with 3 zones and disabled Generate', async ({ page }) => {
    const response = await page.goto('/content-generation/text', { waitUntil: 'domcontentloaded' });
    expect(response?.status(), '/content-generation/text returned unexpected status').toBe(200);
    await expect(page.locator('.sidebar')).toBeVisible();

    // The three zones are <h3> headings inside .composer-zone cards.
    await expect(page.getByRole('heading', { name: /^SIGNALS$/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /^COMPOSER$/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /^OUTPUT$/i }).first()).toBeVisible();

    // The "Generate ▸" button exists. With no signal selected and an empty
    // brief, `canGenerate` is false → the button should be disabled.
    // There are two Generate buttons (page header + composer footer). Use
    // .first() and assert it's disabled in its initial state.
    const generateBtn = page.getByRole('button', { name: /Generate/i }).first();
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();
  });
});

test.describe('Content Generation — Coming soon stubs', () => {
  test('/content-generation/image: shows Coming soon + ETA', async ({ page }) => {
    const response = await page.goto('/content-generation/image', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('.sidebar')).toBeVisible();

    // ComingSoonCard renders the title in big text + ETA pill ("ETA · Q3 2026").
    // We accept either an "ETA" label or "Q3 2026" / "Coming" phrasing in the
    // description as proof the stub rendered.
    await expect(page.getByText(/^IMAGE$/).first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/ETA/i).first().or(page.getByText(/Coming/i).first()),
    ).toBeVisible();
    await expect(page.getByText(/Q3\s*2026/i).first()).toBeVisible();
  });

  test('/content-generation/reel: shows Coming soon + ETA', async ({ page }) => {
    const response = await page.goto('/content-generation/reel', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('.sidebar')).toBeVisible();

    await expect(page.getByText(/^REEL$/).first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/ETA/i).first().or(page.getByText(/Coming/i).first()),
    ).toBeVisible();
    await expect(page.getByText(/Q4\s*2026/i).first()).toBeVisible();
  });
});

test.describe('Content Generation — Sidebar disabled items', () => {
  test('sidebar Image item is non-interactive (aria-disabled / pointer-events: none)', async ({ page }) => {
    await page.goto('/overview', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar')).toBeVisible();

    // The disabled Image entry in the sidebar is a <span class="nav-item"
    // aria-disabled> wrapping the label "Image". Locate via the sidebar scope.
    const sidebar = page.locator('.sidebar');
    const imageItem = sidebar
      .locator('[aria-disabled]')
      .filter({ hasText: /^Image$/ })
      .first();

    // Either the item is found and verified disabled, or the sidebar nav
    // hasn't rendered Image yet (older build) — skip gracefully.
    const count = await imageItem.count();
    if (count === 0) {
      test.skip(true, 'Sidebar Image item not present in this build — skipping.');
      return;
    }

    await expect(imageItem).toBeVisible();
    await expect(imageItem).toHaveAttribute('aria-disabled', /.*/);

    // Try to click — pointer-events: none means nothing should happen.
    // Use force: true so Playwright bypasses actionability checks.
    await imageItem.click({ force: true, trial: false }).catch(() => { /* swallow */ });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/overview/);
  });
});

test.describe('Content Generation — Cross-channel CTAs', () => {
  test('News → Studio: "Draft post" CTA navigates with source=news&id=', async ({ page }) => {
    await page.goto('/seo-news', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sidebar')).toBeVisible();

    // News article cards expose <NewsArticleGenerateCTA source="news" ... />,
    // which renders as a `<a class="btn">` linking to
    // `/content-generation/text?source=news&id=<uuid>`.
    // Use the href prefix as a stable selector; tolerate empty article state.
    const draftLink = page
      .locator('a[href*="/content-generation/text?source=news"]')
      .first();

    const linkCount = await draftLink.count();
    if (linkCount === 0) {
      test.skip(true, 'No news articles with Draft post CTA in DB — skipping.');
      return;
    }

    await expect(draftLink).toBeVisible({ timeout: 10_000 });
    await draftLink.click();
    await expect(page).toHaveURL(/\/content-generation\/text\?source=news&id=/);
  });

  test('Reddit → Studio: "Draft response" CTA navigates with source=reddit&id=', async ({ page }) => {
    await page.goto('/reddit', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sidebar')).toBeVisible();

    // Reddit rows are expected to surface the same component with source="reddit".
    // The CTA isn't wired up in every build yet — skip cleanly when absent.
    const draftLink = page
      .locator('a[href*="/content-generation/text?source=reddit"]')
      .first();

    const linkCount = await draftLink.count();
    if (linkCount === 0) {
      test.skip(true, 'No Reddit Draft response CTA present — skipping.');
      return;
    }

    await expect(draftLink).toBeVisible({ timeout: 10_000 });
    await draftLink.click();
    await expect(page).toHaveURL(/\/content-generation\/text\?source=reddit&id=/);
  });
});
