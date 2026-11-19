import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { underProductionHeaders } from './csp';
import { PROMO_SEEN, seenPromo } from './fixtures';
import { ROUTES } from './routes';

// Keep runs offline and fast: Calendly’s scheduler never loads in tests. The promo popup has its own checks
// (promo.spec.ts): here every page is met without it, whatever today's date.
test.beforeEach(async ({ page }) => {
  await page.route(/calendly\.com/, (route) => route.abort());
  await page.addInitScript(seenPromo, PROMO_SEEN);
});

for (const route of ROUTES) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    // Check the settled design: with reduced motion, entrance and loop animations are off.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(', ')}`,
      );
    expect(serious).toEqual([]);
  });
}

// Every page runs under the production security headers (deploy/nginx/snippets/aldente-headers.conf): the
// preview server doesn't send them, so each page response gets them here, and any CSP violation fails.
for (const route of ROUTES) {
  test(`${route} runs under the production Content-Security-Policy`, async ({ page }) => {
    const refused = await underProductionHeaders(page);
    await page.goto(route);
    // Scroll through, so lazy images and scroll-driven scripts run under the policy too.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    expect(await refused()).toEqual([]);
  });
}

test('no page scrolls sideways', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

test('every internal link resolves', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'Links are the same on every device.');
  const seen = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route);
    const hrefs = await page.$$eval('a[href^="/"]', (links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    hrefs.forEach((href) => seen.add(href.split('#')[0]!.split('?')[0]!));
  }
  for (const href of seen) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test('stays within the performance budget', async ({ isMobile }) => {
  test.skip(isMobile, 'The budget is checked once against the build output.');
  const dir = join(process.cwd(), 'dist', '_astro');
  const files = readdirSync(dir);
  const size = (list: string[]) => list.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
  const gz = (ext: string) => size(files.filter((f) => f.endsWith(ext)));

  // The two background effects are chunks of their own, loaded after the page and only where they show: the
  // hero's glow (hero-ember.ts, with Paper Shaders) and the closing band's slat wall (slat-sea-gl.ts). Each
  // has its own budget, and every page's own scripts keep theirs.
  const glow = (f: string) => /^hero-ember\.[\w-]+\.js$/.test(f);
  const wall = (f: string) => /^slat-sea-gl\.[\w-]+\.js$/.test(f);
  const scripts = files.filter((f) => f.endsWith('.js'));
  expect(scripts.filter(glow), 'the glow is one separate chunk').toHaveLength(1);
  expect(scripts.filter(wall), 'the slat wall is one separate chunk').toHaveLength(1);
  expect(size(scripts.filter((f) => !glow(f) && !wall(f))), 'page JavaScript, gzipped').toBeLessThan(20_000);
  expect(size(scripts.filter(glow)), 'hero glow, gzipped').toBeLessThan(12_000);
  expect(size(scripts.filter(wall)), 'slat wall, gzipped').toBeLessThan(4_000);
  expect(gz('.css'), 'all CSS, gzipped').toBeLessThan(40_000);

  const heavyImages = files.filter((f) => /\.(webp|avif|jpe?g|png)$/.test(f)).filter((f) => statSync(join(dir, f)).size > 250_000);
  expect(heavyImages).toEqual([]);
});
