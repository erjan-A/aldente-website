import type { Page } from '@playwright/test';
import { securityHeaders } from '../../deploy/headers';

/**
 * Serves every page of the local site with the production security headers
 * (deploy/nginx/snippets/aldente-headers.conf): the preview server doesn't send them. Call it before
 * `page.goto`. It returns a function that gives everything the policy has refused so far.
 */
export async function underProductionHeaders(page: Page): Promise<() => Promise<string[]>> {
  const headers = Object.fromEntries(Object.entries(securityHeaders()).map(([k, v]) => [k.toLowerCase(), v]));
  await page.route(
    (url) => url.hostname === 'localhost',
    async (r) => {
      if (r.request().resourceType() !== 'document') return r.fallback();
      const response = await r.fetch();
      await r.fulfill({ response, headers: { ...response.headers(), ...headers } });
    },
  );
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) consoleErrors.push(m.text());
  });
  return async () => [...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)), ...consoleErrors];
}
