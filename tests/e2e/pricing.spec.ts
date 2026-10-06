import { expect, test } from './fixtures';
import { ROUTES } from './routes';

test.describe('plans', () => {
  test('lists the three plans, each with a way to start', async ({ page }) => {
    await page.goto('/pricing');
    for (const name of ['Aldente Vision', 'Aldente Verify', 'Enterprise']) {
      // Plan names are h3 under a hidden "Plans" h2, as on the home preview.
      await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
    }
    await expect(page.locator('.plans .btn')).toHaveCount(3);
    await expect(page.getByText('Most chosen')).toHaveCount(0);
  });

  test('shows no prices anywhere on the site', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Copy is the same on every device.');
    for (const route of ROUTES) {
      await page.goto(route);
      const text = await page.locator('body').innerText();
      expect(text, route).not.toMatch(/per location \/ month|per location a month|\$(150|200|300)\b/);
    }
  });
});
