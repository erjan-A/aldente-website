import { expect, test as base } from '@playwright/test';
import { CONSENT_KEY, NONE, makeConsent } from '../../src/lib/consent';

/**
 * Pages open with the cookie question already answered, so the banner never covers what a
 * test clicks. Use `test.use({ consent: false })` to see a first visit.
 */
export const test = base.extend<{ consent: boolean }>({
  consent: [true, { option: true }],
  page: async ({ page, consent }, use) => {
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

export { expect };
