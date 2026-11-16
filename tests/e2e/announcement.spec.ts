import { expect, test } from './fixtures';
import { ROUTES } from './routes';

const bar = 'aside[aria-label="Announcement"]';

test('every page opens with the Tab announcement above the header', async ({ page }) => {
  // Fourteen pages in a row: the bar is in the first bytes of each, so the test does not wait for clips to load.
  test.setTimeout(90_000);
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const announcement = page.locator(bar);
    await expect(announcement.locator('.announce__text').first(), route).toContainText('Aldente Tab, is out');
    await expect(announcement.getByRole('link', { name: 'Learn more' }), route).toHaveAttribute('href', '/tab');
    const [barBox, headerBox] = await Promise.all([announcement.boundingBox(), page.locator('.header').boundingBox()]);
    expect(barBox!.y, route).toBe(0);
    expect(headerBox!.y, route).toBe(barBox!.height);
  }
});

test('the announcement is one line; on a phone the news runs past and "Learn more" stays in place', async ({ page, isMobile }) => {
  await page.goto('/');
  const announcement = page.locator(bar);
  expect((await announcement.boundingBox())!.height).toBe(40);
  const link = announcement.getByRole('link', { name: 'Learn more' });
  await expect(link).toBeVisible();
  const run = announcement.locator('.announce__text').first();
  const animation = await run.evaluate((el) => getComputedStyle(el).animationName);
  if (isMobile) {
    expect(animation).toBe('announce-run');
    // The link does not move while the text runs.
    const before = (await link.boundingBox())!.x;
    await page.waitForTimeout(400);
    expect((await link.boundingBox())!.x).toBe(before);
    // The whole bar is still the link's target.
    await announcement.click({ position: { x: 24, y: 20 } });
    await expect(page).toHaveURL(/\/tab$/);
  } else {
    expect(animation).toBe('none');
  }
});

test('the announcement scrolls away and the header stays', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await expect(page.locator(bar)).not.toBeInViewport();
  await expect.poll(async () => (await page.locator('.header').boundingBox())!.y).toBe(0);
});

test('the mobile menu opens right under the header while the announcement shows', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The menu sheet exists on phones only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const [menu, header] = await Promise.all([page.locator('#mobile-menu').boundingBox(), page.locator('.header').boundingBox()]);
  // The sheet's top is rounded to a whole pixel.
  expect(Math.abs(menu!.y - (header!.y + header!.height))).toBeLessThan(1);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#mobile-menu')).toBeHidden();
});

test('the announcement link shows a focus ring you can see on the orange bar', async ({ page }) => {
  await page.goto('/');
  const link = page.locator(bar).getByRole('link', { name: 'Learn more' });
  await link.focus();
  // The whole bar is the link's target, so the ring is drawn on the bar.
  const ring = await link.evaluate((el) => {
    const aside = el.closest('aside')!;
    const style = getComputedStyle(aside);
    return { visible: el.matches(':focus-visible'), style: style.outlineStyle, width: style.outlineWidth, ring: style.outlineColor, ink: style.color, ground: style.backgroundColor };
  });
  expect(ring.visible).toBe(true);
  expect(ring.style).toBe('solid');
  expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2);
  // The ring takes the bar's ink, never the accent the bar itself is painted in.
  expect(ring.ring).toBe(ring.ink);
  expect(ring.ring).not.toBe(ring.ground);
});

test('the announcement says the same on every screen: the news and its number', async ({ page }) => {
  for (const width of [360, 820, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const announcement = page.locator(bar);
    await expect(announcement.locator('.announce__text').first(), `${width}px`).toHaveText('Our new product, Aldente Tab, is out. It added 8% more orders in the peak hour.');
    await expect(announcement.locator('.announce__text').first(), `${width}px`).toBeVisible();
    // Still one line, with the link beside it and nothing past the screen's edge.
    expect((await announcement.boundingBox())!.height, `${width}px`).toBe(40);
    const link = (await announcement.getByRole('link', { name: 'Learn more' }).boundingBox())!;
    expect(link.x + link.width, `${width}px`).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${width}px`).toBeLessThanOrEqual(0);
  }
});

test('the announcement is orange on every page, the home page too', async ({ page }) => {
  for (const route of ['/', '/pricing']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const same = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('i'));
      probe.style.backgroundColor = 'var(--accent)';
      const accent = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(document.querySelector('aside[aria-label="Announcement"]')!).backgroundColor === accent;
    });
    expect(same, route).toBe(true);
  }
});
