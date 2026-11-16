import { ANALYTICS, LINKEDIN } from '../data/analytics';
import { shouldLoad } from '../lib/analytics';
import { CONSENT_KEY, readConsent, type Consent } from '../lib/consent';

/**
 * LinkedIn's Insight Tag snippet as a module (the CSP allows no inline scripts). It runs on the production
 * hosts only, and only once the visitor allows marketing cookies: on load when the choice is stored, or as
 * soon as they accept (banner, cookie settings, or the demo card's "Show available times").
 * LinkedIn's <noscript> pixel is left out: without JavaScript the site can't ask for consent.
 */
type Lintrk = ((action: string, data: Record<string, unknown>) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    lintrk?: Lintrk;
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

// Storage can be blocked (private modes, strict settings); then the tag waits for a choice made on the page.
function marketingAllowed(): boolean {
  try {
    return readConsent(localStorage.getItem(CONSENT_KEY), Date.now())?.marketing === true;
  } catch {
    return false;
  }
}

/** Runs LinkedIn's snippet once, when allowed. Returns whether it did. */
export function loadInsightTag(hostname = location.hostname, allowed = marketingAllowed()): boolean {
  if (!allowed || !shouldLoad(hostname, ANALYTICS.hosts) || document.querySelector(`script[src="${LINKEDIN.script}"]`)) return false;
  window._linkedin_partner_id = LINKEDIN.partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(LINKEDIN.partnerId);
  if (!window.lintrk) {
    const queue: Lintrk = (a, b) => queue.q!.push([a, b]);
    queue.q = [];
    window.lintrk = queue;
  }
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = LINKEDIN.script;
  const first = document.getElementsByTagName('script')[0];
  if (first?.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.append(script);
  return true;
}

/** The "demo booked" conversion. Call only after a completed booking; does nothing when the tag isn't loaded. */
export function trackDemoConversion(): void {
  window.lintrk?.('track', { conversion_id: LINKEDIN.conversionId });
}

window.addEventListener('consentchange', (event) => {
  if ((event as CustomEvent<Consent>).detail?.marketing) loadInsightTag(location.hostname, true);
});
loadInsightTag();
