import { ANALYTICS, EVENTS } from '../data/analytics';
import { ctaProps, sectionName, shouldLoad, type EventProps } from '../lib/analytics';

/**
 * Cookieless analytics (Plausible). Loaded once from BaseLayout. Events queue in window.plausible until
 * the script arrives, and the script is added only on the production hosts. Nothing here sets cookies
 * or touches browser storage.
 *
 * Track from another script with `track(name, props)`, or without importing:
 *   window.dispatchEvent(new CustomEvent('aldente:track', { detail: { name, props } }))
 */
type Plausible = ((event: string, options?: { props?: EventProps }) => void) & { q?: unknown[][] };

export interface TrackDetail {
  name: string;
  props?: EventProps;
}

declare global {
  interface Window {
    plausible?: Plausible;
  }
  interface WindowEventMap {
    'aldente:track': CustomEvent<TrackDetail>;
  }
}

window.plausible ??= Object.assign((...args: unknown[]) => (window.plausible!.q ??= []).push(args), { q: [] as unknown[][] });

/** Sends a custom event (queued until Plausible loads; dropped off the production hosts). */
export function track(name: string, props?: EventProps): void {
  window.plausible?.(name, props ? { props } : undefined);
}

/** Adds Plausible's script when the page runs on the production site. Returns whether it did. */
export function loadAnalytics(hostname = location.hostname): boolean {
  if (!shouldLoad(hostname) || document.querySelector(`script[src="${ANALYTICS.script}"]`)) return false;
  const script = document.createElement('script');
  script.defer = true;
  script.src = ANALYTICS.script;
  script.dataset.domain = ANALYTICS.domain;
  document.head.append(script);
  return true;
}

function sectionOf(link: Element): string {
  const region = link.closest('section, header, footer');
  if (!region) return sectionName(null);
  const heading = region.querySelector('h1, h2, h3');
  return sectionName({
    tag: region.tagName,
    label: region.getAttribute('aria-label'),
    headingId: region.getAttribute('aria-labelledby') || heading?.id,
    id: region.id,
    heading: heading?.textContent,
  });
}

/** "CTA click" for every link that leads to booking, with where it sat and which plan it asked for. */
function onClick(event: MouseEvent): void {
  const link = (event.target as Element | null)?.closest?.('a[href]');
  if (!link) return;
  const props = ctaProps({
    text: link.textContent ?? '',
    href: link.getAttribute('href') ?? '',
    section: sectionOf(link),
    path: location.pathname,
    base: location.href,
  });
  if (props) track(EVENTS.cta, props);
}

window.addEventListener('aldente:track', (event) => track(event.detail.name, event.detail.props));
document.addEventListener('click', onClick, { capture: true });
loadAnalytics();
