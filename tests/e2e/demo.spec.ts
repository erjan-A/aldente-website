import { ALL, CONSENT_KEY, makeConsent } from '../../src/lib/consent';
import { expect, test } from './fixtures';

const CALENDLY = 'https://calendly.com/aldenteai/30min';

test.describe('demo booking', () => {
  test('embeds Calendly’s scheduler straight away, with a way around it', async ({ page }) => {
    await page.goto('/demo');
    const schedule = page.locator('#schedule');
    await expect(schedule.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
    await expect(page.locator('main input, main select, main textarea')).toHaveCount(0);

    // No button to press: the scheduler loads with the page, behind a skeleton until Calendly has drawn it.
    await expect(schedule.getByRole('link', { name: 'Show available times' })).toHaveCount(0);
    const calendar = page.locator('iframe[title="Book a time with Aldente on Calendly"]');
    await expect(calendar).toHaveAttribute('src', /^https:\/\/calendly\.com\/aldenteai\/30min\?/);
    await expect(schedule.getByRole('status')).toHaveText('Loading available times…');
    // Calendly asks for its own cookies unless the visitor accepted marketing cookies here.
    expect(new URL((await calendar.getAttribute('src'))!).searchParams.has('hide_gdpr_banner')).toBe(false);

    // The way around it sits above the calendar.
    await expect(page.getByRole('link', { name: 'open it on Calendly' })).toHaveAttribute('href', CALENDLY);
    await expect(page.locator('main').getByRole('link', { name: 'support@aldenteai.com' }).first()).toHaveAttribute(
      'href',
      'mailto:support@aldenteai.com',
    );
    // Every email address on the page is the support inbox.
    for (const href of await page.locator('a[href^="mailto:"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^mailto:support@aldenteai\.com/);
    }
  });

  test('passes the plan to Calendly', async ({ page }) => {
    await page.goto('/demo?plan=vision');
    const src = await page.locator('#schedule iframe').getAttribute('src');
    const params = new URL(src!).searchParams;
    expect(params.get('utm_content')).toBe('vision');
    expect(params.get('utm_source')).toBe('aldenteai.com');
  });

  test('keeps the campaign a visitor arrived with', async ({ page }) => {
    await page.goto('/demo?plan=verification&utm_source=linkedin&utm_campaign=q4');
    const params = new URL((await page.locator('#schedule iframe').getAttribute('src'))!).searchParams;
    expect(params.get('utm_source')).toBe('linkedin');
    expect(params.get('utm_campaign')).toBe('q4');
    expect(params.get('utm_content')).toBe('verification');
  });

  test('keeps the plan heading in two tones, with "See" on the product’s line', async ({ page }) => {
    await page.goto('/demo?plan=vision');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText('See Aldente Vision on your cameras.');
    await expect(h1.locator('span')).toHaveText('on your cameras.');
    // "See" never sits alone on the first line.
    const firstLine = await h1.evaluate((el) => {
      const range = document.createRange();
      range.setStart(el.firstChild!, 0);
      range.setEnd(el.firstChild!, 3);
      const see = range.getBoundingClientRect();
      range.setStart(el.firstChild!, 4);
      range.setEnd(el.firstChild!, 11);
      return Math.abs(range.getBoundingClientRect().top - see.top) < 2;
    });
    expect(firstLine).toBe(true);
  });

  test('puts the calendar first on phones and beside the intro on desktop', async ({ page, isMobile }) => {
    await page.goto('/demo');
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
    const card = await page.locator('#schedule').boundingBox();
    const quote = await page.locator('.demo__quote').boundingBox();
    const viewport = page.viewportSize()!;
    expect(card!.y).toBeLessThan(viewport.height);
    if (isMobile) {
      expect(card!.y).toBeGreaterThan(heading!.y);
      expect(quote!.y).toBeGreaterThan(card!.y + card!.height);
    } else {
      expect(card!.x).toBeGreaterThan(heading!.x + heading!.width - 1);
      expect(card!.y + card!.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('explains that Aldo comes with both products when the visitor asks for it', async ({ page }) => {
    await page.goto('/demo?plan=starter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get Aldo with Aldente Verify or Vision.');
    await expect(page.getByText('Aldo comes with both products.')).toBeVisible();
  });

  test('has no call agenda, and no over-promises', async ({ page }) => {
    await page.goto('/demo?plan=verification');
    await expect(page.getByRole('heading', { name: 'On the call' })).toHaveCount(0);
    await expect(page.getByText(/trained on|sample of your menu/i)).toHaveCount(0);
  });
});

test.describe('demo booking with marketing cookies accepted', () => {
  test.use({ consent: false });

  test('lets Calendly skip its own cookie question', async ({ page }) => {
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
      CONSENT_KEY,
      JSON.stringify(makeConsent(ALL, Date.now())),
    ] as const);
    await page.goto('/demo');
    const src = await page.locator('#schedule iframe').getAttribute('src');
    expect(new URL(src!).searchParams.get('hide_gdpr_banner')).toBe('1');
  });
});
