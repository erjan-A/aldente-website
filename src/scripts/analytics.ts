import { ANALYTICS, EVENTS } from '../data/analytics';
import { ctaProps, sectionName, shouldLoad, type EventProps } from '../lib/analytics';

/**
 * Cookieless analytics (Umami). Loaded once from BaseLayout. Events wait in `queued` until Umami's script
 * arrives, and the script is added only on the production hosts. Nothing here sets cookies or writes to
 * browser storage (Umami's script only reads its own opt-out key, "umami.disabled").
 *
 * Track from another script with `track(name, props)`, or without importing:
 *   window.dispatchEvent(new CustomEvent('aldente:track', { detail: { name, props } }))
 */
interface Umami {
  track: (event: string, data?: EventProps) => unknown;
}

export interface TrackDetail {
  name: string;
  props?: EventProps;
}

declare global {
  interface Window {
    /** Set by Umami's script. Don't stub it before the script runs: Umami keeps an existing window.umami. */
    umami?: Umami;
  }
  interface WindowEventMap {
    'aldente:track': CustomEvent<TrackDetail>;
  }
}

/** Events tracked before Umami's script loaded, oldest first. Off the production hosts they stay here. */
export const queued: [name: string, props: EventProps | undefined][] = [];

/** Sends a custom event (queued until Umami loads; never sent off the production hosts). */
export function track(name: string, props?: EventProps): void {
  if (window.umami) window.umami.track(name, props);
  else queued.push([name, props]);
}

function flush(): void {
  if (!window.umami) return;
  for (const [name, props] of queued.splice(0)) window.umami.track(name, props);
}

/** Adds Umami's script when the page runs on the production site. Returns whether it did. */
export function loadAnalytics(hostname = location.hostname): boolean {
  if (!shouldLoad(hostname) || document.querySelector(`script[src="${ANALYTICS.script}"]`)) return false;
  const script = document.createElement('script');
  script.defer = true;
  script.src = ANALYTICS.script;
  script.dataset.websiteId = ANALYTICS.websiteId;
  script.dataset.hostUrl = ANALYTICS.endpoint;
  script.dataset.domains = ANALYTICS.hosts.join(',');
  script.addEventListener('load', flush, { once: true });
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
