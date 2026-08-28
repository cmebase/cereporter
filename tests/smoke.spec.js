import { test, expect } from '@playwright/test';

test.describe('CE Reporter smoke tests', () => {
  test('site responds and renders usable content', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    expect(response, 'Expected a response from CE Reporter').not.toBeNull();
    expect(response.status(), 'Expected CE Reporter to return a non-error HTTP status').toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('site has no uncaught page errors during initial load', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    expect(pageErrors, `Uncaught browser errors: ${pageErrors.join('\n')}`).toEqual([]);
  });

  test('unknown route does not crash the app', async ({ page }) => {
    await page.goto('/playwright-health-check-route', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
