import AxeBuilder from '@axe-core/playwright';
import { underProductionHeaders } from './csp';
import { expect, test } from './fixtures';

// The sticky booking button (BookDemo): in the bottom right corner of every page but the booking page.
// It opens Calendly's calendar in a panel over the page; Calendly is asked for nothing before that.
const sticky = 'book-demo a[data-book]';
const panel = 'book-demo dialog';

test('a booking button stays in the bottom right corner while the page scrolls', async ({ page }) => {
  await page.goto('/pricing');
  const button = page.locator(sticky);
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Book a live demo');
  await expect(button).toHaveAttribute('href', '/demo');
  const view = page.viewportSize()!;
  const corner = async () => {
    const box = (await button.boundingBox())!;
    return { right: view.width - (box.x + box.width), bottom: view.height - (box.y + box.height), height: box.height };
  };
  const before = await corner();
  expect(before.height).toBeGreaterThanOrEqual(44);
  expect(before.right).toBeGreaterThanOrEqual(12);
  expect(before.right).toBeLessThanOrEqual(32);
  expect(before.bottom).toBeGreaterThanOrEqual(12);
  expect(before.bottom).toBeLessThanOrEqual(32);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(button).toBeVisible();
  expect(await corner()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('it opens Calendly’s calendar in a panel, without leaving the page', async ({ page, browserName }) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (/calendly\.com/.test(request.url())) asked.push(request.url());
  });
  const refused = await underProductionHeaders(page);
  await page.goto('/pricing');
  const button = page.locator(sticky);
  await expect(button).toBeVisible();
  await page.waitForLoadState('networkidle');
  // Calendly hears nothing of a visitor who has not asked for the calendar.
  expect(asked).toEqual([]);
  await expect(page.locator(`${panel} iframe`)).toHaveCount(0);

  await button.click();
  const dialog = page.locator(panel);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(dialog).toHaveAccessibleName('Pick a time');
  await expect(dialog.getByText('A 30-minute demo with our team')).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveAttribute('src', /^https:\/\/calendly\.com\/aldenteai\/30min\?/);
  await expect(dialog.getByRole('status')).toHaveText('Loading available times…');
  expect(await refused()).toEqual([]);

  // It fits the screen and stands in the corner the button stood in, once it has risen into place.
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
  const view = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(11);
  expect(box.y).toBeGreaterThanOrEqual(11);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width - 11);
  expect(view.height - (box.y + box.height)).toBeLessThanOrEqual(25);
  expect(view.height - (box.y + box.height)).toBeGreaterThanOrEqual(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const close = dialog.getByRole('button', { name: 'Close' });
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // Focus rests on the panel; Tab reaches Close. (Safari's Tab stops at buttons only with Option held.)
  await expect(dialog).toBeFocused();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(close).toBeFocused();

  const results = await new AxeBuilder({ page }).include('book-demo').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  // Escape closes it and the keyboard is back on the button.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();

  // Open again: the same calendar, not a second one.
  await button.click();
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await close.click();
  await expect(dialog).toBeHidden();
});

test('a click that asks for a new tab or window is left to the browser: the link opens the booking page', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator(sticky)).toBeVisible();
  for (const key of ['metaKey', 'ctrlKey', 'shiftKey'] as const) {
    // The page says whether it kept the click for itself; the test then stops the browser from opening a tab.
    const kept = await page.evaluate(
      ([selector, modifier]) =>
        new Promise<boolean>((resolve) => {
          window.addEventListener(
            'click',
            (event) => {
              resolve(event.defaultPrevented);
              event.preventDefault();
            },
            { once: true },
          );
          document.querySelector(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, [modifier]: true }));
        }),
      [sticky, key] as const,
    );
    expect(kept, key).toBe(false);
    await expect(page.locator(panel)).toBeHidden();
  }
});

test('it steps aside for the closing band, which holds the same action, and for the footer', async ({ page }) => {
  await page.goto('/pricing');
  const button = page.locator(sticky);
  await expect(button).toBeVisible();
  await page.locator('.cta').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('.cta')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(button).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(button).toBeHidden();
  // Nothing covers the footer's last row.
  await page.locator('.footer__legal button, .footer__legal a').last().click({ trial: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(button).toBeVisible();
});

test('the booking page has the calendar on the page, so no button', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('#schedule iframe')).toHaveCount(1);
  await expect(page.locator('book-demo')).toHaveCount(0);
});

test('the home page keeps its own booking buttons clear of it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(sticky)).toBeVisible();
  await page.locator('.hero').getByRole('link', { name: 'Book a live demo' }).click({ trial: true });
  await page.locator('.hero').getByRole('link', { name: 'Watch it work' }).click({ trial: true });
});

test.describe('on a first visit', () => {
  test.use({ consent: false });

  test('it waits for the cookie question, which stands in the same corner', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('cookie-consent')).toBeVisible();
    await expect(page.locator(sticky)).toBeHidden();
    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.locator('cookie-consent')).toBeHidden();
    await expect(page.locator(sticky)).toBeVisible();
  });
});
