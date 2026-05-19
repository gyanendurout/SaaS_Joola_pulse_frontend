import { test, expect } from '@playwright/test';

// All routes that should return 200 + render the app shell
const PAGES = [
  '/overview',
  '/weekly-digest',
  '/posts',
  '/comments',
  '/fans',
  '/complaints',
  '/youtube',
  '/tiktok',
  '/twitter',
  '/reddit',
  '/influencers',
  '/seo-analyze',
  '/seo-dashboard',
  '/seo-news',
];

test.describe('Route smoke — every page loads', () => {
  for (const path of PAGES) {
    test(path, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${path} returned unexpected status`).toBe(200);
      await expect(page).toHaveTitle(/JOOLA/i);
      await expect(page.locator('.sidebar')).toBeVisible();
    });
  }
});

test.describe('Redirects', () => {
  test('/ redirects to /overview', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('/instagram redirects to /posts', async ({ page }) => {
    await page.goto('/instagram');
    await expect(page).toHaveURL(/\/posts/);
  });
});

test.describe('Error pages', () => {
  test('unknown route shows custom 404', async ({ page }) => {
    const response = await page.goto('/__definitely_not_a_route__');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toContainText('404');
  });
});

test.describe('Core UI', () => {
  test('overview: KPI section renders', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    // .kpi-grid or at least one .kpi card should be visible
    const kpis = page.locator('.kpi');
    await expect(kpis.first()).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar nav: clicking Posts navigates correctly', async ({ page }) => {
    await page.goto('/overview');
    // Find a nav item pointing to /posts and click it
    await page.locator('a[href="/posts"]').first().click();
    await expect(page).toHaveURL(/\/posts/);
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('overview: no full-page error state', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    // Next.js error overlay should not appear
    const nextError = page.locator('nextjs-portal');
    await expect(nextError).not.toBeAttached({ timeout: 5_000 });
  });
});
