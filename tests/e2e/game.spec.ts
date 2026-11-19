import type { BrowserContext, Page } from '@playwright/test';
import { ANALYTICS } from '../../src/data/analytics';
import { underProductionHeaders } from './csp';
import { expect, test } from './fixtures';

// Order Up: Night Shift at /play (English) and /play/ru (Russian). The pages are the game's own documents
// (tools/game/sync.mjs); these tests hold what the site promises about them.

interface Game {
  cur: { ctx: { win(): void } } | null;
  startShift(): void;
  next(): void;
}

/** Plays today's shift to its report through the game's own test handle: each order is won, then the next one opens. */
async function playShift(page: Page) {
  await page.evaluate(() => (window as unknown as { __ou: Game }).__ou.startShift());
  const share = page.locator('[data-a="share"]');
  for (let i = 0; i < 20 && !(await share.isVisible()); i++) {
    await page.evaluate(() => {
      const ou = (window as unknown as { __ou: Game }).__ou;
      if (ou.cur) ou.cur.ctx.win();
    });
    await page.waitForTimeout(350);
    await page.evaluate(() => (window as unknown as { __ou: Game }).__ou.next()).catch(() => undefined);
    await page.waitForTimeout(350);
  }
  await expect(share).toBeVisible();
}

const EDITIONS = [
  { route: '/play', lang: 'en', title: 'Order Up: Night Shift', font: 'Anton' },
  { route: '/play/ru', lang: 'ru', title: 'Order Up: Ночная смена', font: 'Sofia Sans Extra Condensed' },
] as const;

for (const edition of EDITIONS) {
  test(`${edition.route} is the game’s own page: one document, in its language, without the site’s header`, async ({ page, request }) => {
    const html = await (await request.get(edition.route)).text();
    expect(html.match(/<!doctype html>/gi)).toHaveLength(1);
    await page.goto(`${edition.route}#nosplash`);
    await expect(page).toHaveTitle(edition.title);
    await expect(page.locator('html')).toHaveAttribute('lang', edition.lang);
    await expect(page.locator('.header, aside[aria-label="Announcement"]')).toHaveCount(0);
    await expect(page.locator('#view')).not.toBeEmpty();
  });

  test(`${edition.route} plays under the production Content-Security-Policy, to the share card`, async ({ page }) => {
    test.setTimeout(60_000);
    const refused = await underProductionHeaders(page);
    await page.goto(`${edition.route}#nosplash`);
    await page.waitForFunction(() => !!(window as unknown as { __ou?: unknown }).__ou);
    // Its fonts come from /play/fonts and load.
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
    expect(loaded).toContain(edition.font);
    // A whole shift, then the share box: the card is a picture the page has just drawn.
    await playShift(page);
    await page.locator('[data-a="share"]').click();
    const card = page.locator('.sh-card');
    await expect(card).toBeVisible();
    await expect.poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect(await refused()).toEqual([]);
  });
}

for (const [route, label] of [
  ['/play', 'Shift #'],
  ['/play/ru', 'Смена №'],
] as const) {
  test(`${route} counts its shifts from the launch: 19 November 2026 is shift 1`, async ({ page }) => {
    const home = async (day: Date) => {
      await page.clock.setFixedTime(day);
      await page.goto(`${route}#nosplash`);
      await page.waitForFunction(() => !!(window as unknown as { __ou?: unknown }).__ou);
      await page.evaluate(() => (window as unknown as { __ou: { home(): void } }).__ou.home());
      return page.locator('.h-pill');
    };
    await expect(await home(new Date(2026, 10, 19, 12))).toContainText(`${label}1`);
    await expect(await home(new Date(2026, 10, 20, 12))).toContainText(`${label}2`);
  });
}

test('the loading screen shows the game’s art from /play', async ({ page }) => {
  const art = page.waitForResponse((r) => /\/play\/splash-(4x5|9x16)\.webp$/.test(r.url()));
  await page.goto('/play');
  expect((await art).status()).toBe(200);
});

test('off the production hosts the game sends no visits anywhere', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).hostname !== 'localhost') outside.push(r.url());
  });
  await page.goto('/play#nosplash');
  await page.waitForFunction(() => !!(window as unknown as { __ou?: unknown }).__ou);
  await page.waitForTimeout(300);
  expect(outside.filter((url) => !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
});

test.describe('which language opens', () => {
  test('an English browser stays on /play', async ({ page }) => {
    await page.goto('/play?utm_source=linkedin#nosplash');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe('/play?utm_source=linkedin');
  });

  test('/play?lang=ru opens the Russian game from any browser', async ({ page }) => {
    await page.goto('/play?lang=ru#nosplash');
    await expect(page).toHaveURL(/\/play\/ru#nosplash$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test.describe('a browser that asks for Russian', () => {
    test.use({ locale: 'ru-RU' });

    test('is sent to /play/ru, with its campaign tags and hash kept', async ({ page }) => {
      await page.goto('/play?utm_source=linkedin&utm_campaign=order-up#nosplash');
      await expect(page).toHaveURL(/\/play\/ru\?utm_source=linkedin&utm_campaign=order-up#nosplash$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page).toHaveTitle('Order Up: Ночная смена');
      // The English page is not left in the history: Back leaves the game.
      await page.goBack();
      expect(page.url()).toBe('about:blank');
    });

    test('can still ask for English with /play?lang=en, and is not sent away on the next visit', async ({ page }) => {
      await page.goto('/play?lang=en&utm_source=x#nosplash');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      // The choice leaves the address; the campaign tag stays.
      await expect(page).toHaveURL(/\/play\?utm_source=x#nosplash$/);
      await page.goto('/play#nosplash');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveURL(/\/play#nosplash$/);
    });
  });

  test.describe('a browser that lists Kazakh, then Russian, then English', () => {
    test.use({ locale: 'kk-KZ' });

    test('gets Russian: the first of the two languages the game speaks decides', async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, 'languages', { get: () => ['kk-KZ', 'ru', 'en-US'] }));
      await page.goto('/play#nosplash');
      await expect(page).toHaveURL(/\/play\/ru#nosplash$/);
    });

    test('stays on English when it lists neither', async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, 'languages', { get: () => ['kk-KZ'] }));
      await page.goto('/play#nosplash');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  });
});

test.describe('on aldenteai.com the game counts in the site’s Umami', () => {
  type Sent = [name: string, props: Record<string, unknown>];
  const sent = (page: Page) => page.evaluate(() => (window as unknown as { __sent?: Sent[] }).__sent ?? []);

  /** Opens the local build as https://aldenteai.com and stands in for Umami's script, which arrives after the game has started. */
  async function asProduction(context: BrowserContext, baseURL: string) {
    await context.route('https://aldenteai.com/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    });
    await context.route(`${ANALYTICS.script}*`, async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        contentType: 'text/javascript',
        body: 'window.umami = { track: function (name, props) { (window.__sent = window.__sent || []).push([name, props]); } };',
      });
    });
    await context.addInitScript((src) => {
      new MutationObserver((changes) => {
        for (const change of changes) {
          for (const node of change.addedNodes) {
            if (node instanceof HTMLScriptElement && node.src === src) (window as unknown as { __tag: DOMStringMap }).__tag = { ...node.dataset };
          }
        }
      }).observe(document, { childList: true, subtree: true });
    }, ANALYTICS.script);
  }

  test('the first events wait for Umami and are sent once; later ones go straight out', async ({ page, context, baseURL }) => {
    await asProduction(context, baseURL!);
    await page.goto('https://aldenteai.com/play#nosplash');
    await expect.poll(async () => (await sent(page)).map(([name]) => name)).toContain('Game open');
    // Umami's tag is the site's own: same site id, same endpoint, the production hosts only.
    expect(await page.evaluate(() => (window as unknown as { __tag: Record<string, string> }).__tag)).toEqual({
      websiteId: ANALYTICS.websiteId,
      hostUrl: ANALYTICS.endpoint,
      domains: ANALYTICS.hosts.join(','),
    });
    const first = (await sent(page)).find(([name]) => name === 'Game open')!;
    expect(first[1]).toMatchObject({ edition: 'night', ref: '' });
    // Umami is there now: the game sends the next event itself, and nothing is sent twice.
    await page.evaluate(() => (window as unknown as { __ou: Game }).__ou.startShift());
    await expect.poll(async () => (await sent(page)).map(([name]) => name)).toContain('Game shift start');
    const names = (await sent(page)).map(([name]) => name);
    expect(names.filter((name) => name === 'Game open')).toHaveLength(1);
    expect(names.filter((name) => name === 'Game shift start')).toHaveLength(1);
  });

  test.describe('for a visitor sent on to the Russian game', () => {
    test.use({ locale: 'ru-RU' });

    test('the open event still names the site they came from', async ({ page, context, baseURL }) => {
      await asProduction(context, baseURL!);
      await page.goto('https://aldenteai.com/play#nosplash', { referer: 'https://www.linkedin.com/feed/' });
      await expect(page).toHaveURL('https://aldenteai.com/play/ru#nosplash');
      await expect.poll(async () => (await sent(page)).map(([name]) => name)).toContain('Game open');
      const open = (await sent(page)).find(([name]) => name === 'Game open')!;
      expect(open[1]).toMatchObject({ edition: 'night-ru', ref: 'www.linkedin.com' });
    });
  });
});
