import { test, expect } from '@playwright/test';

const keyRoutes = [
  '/Dashboard',
  '/Records',
  '/CreditManagement',
  '/ParticipantManagement',
  '/MyHospitals',
  '/CertificateSetup',
  '/UserManagement',
  '/AdminSettings',
];

test.describe('CE Reporter key route health', () => {
  for (const route of keyRoutes) {
    test(`${route} does not return a server error or blank page`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response, `Expected an HTTP response for ${route}`).not.toBeNull();
      expect(response.status(), `${route} returned an HTTP error`).toBeLessThan(500);

      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toBeEmpty();

      // Give client-side routing/auth enough time to initialize.
      await page.waitForTimeout(1000);
      expect(pageErrors, `Uncaught errors on ${route}: ${pageErrors.join('\n')}`).toEqual([]);
    });
  }
});
