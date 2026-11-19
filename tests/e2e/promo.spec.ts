import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { PROMO } from '../../src/data/promo';
import { underProductionHeaders } from './csp';
import { expect, test } from './fixtures';

// The game popup greets a visitor for a few days and stops by itself (PROMO in src/data/promo.ts).
// The visitor's clock decides, so each test picks the moment.
test.use({ promo: true });

const popup = 'promo-popup dialog';
const [from, until] = [Date.parse(PROMO!.from), Date.parse(PROMO!.until)];
const inside = new Date((from + until) / 2);

/** Long enough for the popup to have opened, had it been due. */
const settle = (page: Page) => page.waitForTimeout(1600);

test('inside its days it greets the visitor with the game’s art and one action', async ({ page }) => {
  await page.clock.setFixedTime(inside);
  await page.goto('/');
  const dialog = page.locator(popup);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(PROMO!.label);
  // It never opens as an empty frame: the picture is there with it.
  expect(await dialog.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  await expect(dialog.getByText(PROMO!.line)).toBeVisible();
  // One action for the keyboard and a screen reader, after Close.
  await expect(dialog.getByRole('link')).toHaveCount(1);
  await expect(dialog.getByRole('link', { name: 'Play now' })).toHaveAttribute('href', '/play');
  // Focus is on the popup itself; Tab reaches Close, then the action.
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('link', { name: 'Play now' })).toBeFocused();
  // It fits the screen, with nothing past the edge.
  const box = (await dialog.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(12);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width - 12);
  expect(box.y).toBeGreaterThanOrEqual(12);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height - 12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  for (const control of [dialog.getByRole('button', { name: 'Close' }), dialog.getByRole('link', { name: 'Play now' })]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('the news bar above it stays as it was', async ({ page }) => {
  await page.clock.setFixedTime(inside);
  await page.goto('/');
  await expect(page.locator(popup)).toBeVisible();
  const bar = page.locator('aside[aria-label="Announcement"]');
  await expect(bar.locator('.announce__text').first()).toHaveText('Our new product, Aldente Tab, is out. It added 8% more orders in the peak hour.');
  await expect(bar.locator('a')).toHaveAttribute('href', '/tab');
});

test('"Play now" and the picture both open the game', async ({ page }) => {
  await page.clock.setFixedTime(inside);
  await page.goto('/');
  await page.locator(popup).getByRole('link', { name: 'Play now' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page).toHaveTitle('Order Up: Night Shift');

  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/pricing');
  await page.locator(`${popup} img`).click();
  await expect(page).toHaveURL(/\/play$/);
});

test('it closes from its button, from Escape and from a click beside it, and the page is back', async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(inside);
  const dialog = page.locator(popup);
  const closers = [
    () => dialog.getByRole('button', { name: 'Close' }).click(),
    () => page.keyboard.press('Escape'),
    () => page.mouse.click(6, 6),
  ];
  await page.goto('/pricing');
  for (const close of closers) {
    await expect(dialog).toBeVisible();
    await close();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: /Book a (live )?demo/ }).first()).toBeVisible();
    // A new visit for the next way of closing.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
  }
});

test('it shows once per visit: the next pages stay clear, a new visit sees it again', async ({ page, context }) => {
  await page.clock.setFixedTime(inside);
  await page.goto('/');
  const dialog = page.locator(popup);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  for (const route of ['/pricing', '/']) {
    await page.goto(route);
    await settle(page);
    await expect(dialog, route).toBeHidden();
  }
  // Another tab opened by hand is another visit.
  const next = await context.newPage();
  await next.clock.setFixedTime(inside);
  await next.goto('/pricing');
  await expect(next.locator(popup)).toBeVisible();
});

test('it never covers the booking page', async ({ page }) => {
  await page.clock.setFixedTime(inside);
  await page.goto('/demo');
  await settle(page);
  await expect(page.locator(popup)).toBeHidden();
  // The visit has not used it up: the next page shows it.
  await page.goto('/');
  await expect(page.locator(popup)).toBeVisible();
});

for (const [when, moment] of [
  ['before its first moment', new Date(from - 1000)],
  ['from its last moment, with no new deploy', new Date(until)],
  ['long after', new Date(until + 90 * 86_400_000)],
] as const) {
  test(`${when} nothing pops up`, async ({ page }) => {
    await page.clock.setFixedTime(moment);
    await page.goto('/');
    await settle(page);
    await expect(page.locator(popup)).toBeHidden();
    // Its picture was never fetched either.
    expect(await page.locator(`${popup} img`).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(false);
  });
}

test.describe('on a first visit, with the cookie question still open', () => {
  test.use({ consent: false });

  test('the popup comes first and the cookie choice is still there after it', async ({ page }) => {
    await page.clock.setFixedTime(inside);
    await page.goto('/');
    const dialog = page.locator(popup);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.getByRole('button', { name: 'Reject all' })).toBeHidden();
  });
});

test('the open popup has no serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(inside);
  await page.goto('/pricing');
  await expect(page.locator(popup)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
  expect(serious).toEqual([]);
});

test('the popup runs under the production Content-Security-Policy', async ({ page }) => {
  await page.clock.setFixedTime(inside);
  const refused = await underProductionHeaders(page);
  await page.goto('/pricing');
  await expect(page.locator(popup)).toBeVisible();
  expect(await refused()).toEqual([]);
});
