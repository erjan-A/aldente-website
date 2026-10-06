import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.use({ consent: false });

test.describe('cookie consent', () => {
  test('asks once, and rejecting takes one click', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Cookies' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Reject all' }).click();
    await expect(banner).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-consent-marketing', 'denied');

    await page.goto('/pricing');
    await expect(page.getByRole('region', { name: 'Cookies' })).toBeHidden();
  });

  test('saves a choice per category and reopens from the footer', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Cookies' });
    await banner.getByRole('button', { name: 'Settings' }).click();
    // Visit counting is cookieless, so marketing (Calendly) is the only optional category.
    await expect(banner.getByRole('checkbox')).toHaveCount(2);
    await banner.getByLabel(/Marketing/).check();
    await banner.getByRole('button', { name: 'Save choices' }).click();
    await expect(banner).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-consent-marketing', 'granted');

    await page.getByRole('button', { name: 'Cookie settings' }).click();
    await expect(banner).toBeVisible();
    await expect(banner.getByLabel(/Marketing/)).toBeChecked();
  });

  test('stays accessible with the settings open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('region', { name: 'Cookies' }).getByRole('button', { name: 'Settings' }).click();
    const results = await new AxeBuilder({ page }).include('cookie-consent').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });
});
