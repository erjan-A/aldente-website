import { expect, test } from './fixtures';

test.describe('Aldente Verify page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/order-verification');
  });

  test('leads with the decks’ claim and both loops', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Verify checks every order. Dispute answers every claim.',
    );
    await expect(page.locator('.loop__title')).toHaveText(['1. Aldente Verify', '2. Aldente Dispute']);
  });

  test('plays Aldente Dispute step by step as it scrolls into view, ending with the evidence ready, never an outcome', async ({ page }) => {
    const beats = page.locator('.dispute scroll-beats');
    await page.locator('.dispute').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.6));
    await expect(beats).not.toHaveAttribute('data-beat', '4');
    await page.locator('.desk__toast').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.4));
    await expect(beats).toHaveAttribute('data-beat', '4');
    await expect(page.locator('.desk__toast')).toBeVisible();
    await expect(page.locator('.st--back')).toHaveText('Evidence ready');
    await expect(page.locator('.desk__toast')).toHaveText('Evidence pack ready for order #4821');
    await expect(page.locator('.dispute')).not.toContainText(/reversed|won back|returned to/i);
  });

  test('shows the case study numbers the decks use', async ({ page }) => {
    const study = page.locator('#customers');
    await expect(study.locator('.pill')).toHaveText('Customer results');
    await expect(study).toContainText('~1%');
    await expect(study).toContainText('12 fewer wrong orders a day × 365 days × $17 average check');
  });
});

test('shows "How we start" on pricing, every product page and security, not on the demo page', async ({ page }) => {
  for (const path of ['/pricing', '/order-verification', '/playbooks', '/security']) {
    await page.goto(path);
    await expect(page.locator('.start .pill')).toHaveText('How we start');
    await expect(page.locator('.start .weeks__when')).toHaveText(['Week 1', 'Weeks 2–3', 'Week 4']);
  }
  await page.goto('/demo');
  await expect(page.locator('.start, .demo__start')).toHaveCount(0);
});
