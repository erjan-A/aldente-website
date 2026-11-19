import { expect, test as base } from '@playwright/test';
import { PROMO } from '../../src/data/promo';
import { CONSENT_KEY, NONE, makeConsent } from '../../src/lib/consent';
import { PROMO_SEEN_KEY } from '../../src/lib/promo';

/**
 * Pages open with the cookie question already answered, so the banner never covers what a
 * test clicks. Use `test.use({ consent: false })` to see a first visit.
 *
 * Pages also open as a visit that has already seen the promo popup (PromoPopup), so no test depends on
 * today's date. Use `test.use({ promo: true })` to meet it, with `page.clock.setFixedTime` to pick the day.
 */
export const test = base.extend<{ consent: boolean; promo: boolean }>({
  consent: [true, { option: true }],
  promo: [false, { option: true }],
  page: async ({ page, consent, promo }, use) => {
    if (!promo) await page.addInitScript(seenPromo, [PROMO_SEEN_KEY, PROMO?.id ?? ''] as const);
    // Keep runs offline and fast: when a test opens the demo page's scheduler, Calendly's requests fail
    // and the page stays on "Loading available times…", which is all the tests check.
    await page.route(/calendly\.com/, (route) => route.abort());
    if (consent) {
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
        CONSENT_KEY,
        JSON.stringify(makeConsent(NONE, Date.now())),
      ] as const);
    }
    await use(page);
  },
});

/** Marks the visit as one that has already seen the promo popup. For `page.addInitScript`. */
export function seenPromo([key, id]: readonly [string, string]): void {
  try {
    window.sessionStorage.setItem(key, id);
  } catch {
    // A page without storage (about:blank) has no popup either.
  }
}

export const PROMO_SEEN = [PROMO_SEEN_KEY, PROMO?.id ?? ''] as const;

export { expect };
