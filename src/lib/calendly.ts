/** Calendly's inline scheduler on the demo page: the embed URL and the messages it posts back. */

export const CALENDLY_ORIGIN = 'https://calendly.com';

/** The iframe follows Calendly's own height within these bounds (px). */
export const CALENDLY_HEIGHT = { min: 560, max: 1400 } as const;

export interface EmbedOptions {
  /** The page's hostname; Calendly checks it against the embed. */
  hostname: string;
  /** The plan from the demo page's ?plan=, passed on as utm_content ('general' without one). */
  plan?: string;
  /**
   * The visitor accepted marketing cookies on this site, so Calendly's own cookie banner can be hidden.
   * Without that choice, Calendly keeps its banner and asks for itself.
   */
  consented?: boolean;
  /** Campaign tags the visitor arrived with (see `incomingUtm`). They win over the site's defaults. */
  utm?: Partial<Record<UtmKey, string>>;
}

/** Campaign tags a link to the demo page may carry. utm_content is kept for the plan. */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

/**
 * The campaign tags from the demo page's own query string (?utm_source=linkedin&utm_campaign=q4), so a
 * booking keeps the source the visitor came from. Empty values are dropped and long ones cut to 100 characters.
 */
export function incomingUtm(search: string): Partial<Record<UtmKey, string>> {
  const query = new URLSearchParams(search);
  const utm: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const value = query.get(key)?.trim().slice(0, 100);
    if (value) utm[key] = value;
  }
  return utm;
}

/**
 * The scheduler URL. Event and landing-page details are hidden (the page already gives them), the
 * colours match the dark card (background = --surface, text = --ink, buttons = the logo orange), and the
 * UTM tags tell sales where the booking came from: the visitor's own campaign tags when the demo link
 * carried them, the website otherwise, and always the plan as utm_content.
 */
export function calendlyEmbedUrl(base: string, { hostname, plan, consented = false, utm = {} }: EmbedOptions): string {
  const params = new URLSearchParams({
    hide_event_type_details: '1',
    hide_landing_page_details: '1',
    background_color: '181818',
    text_color: 'f1f1f1',
    primary_color: 'e05634',
    embed_domain: hostname,
    embed_type: 'Inline',
    utm_source: 'aldenteai.com',
    utm_medium: 'website',
    utm_campaign: 'demo',
    utm_content: plan || 'general',
  });
  for (const key of UTM_KEYS) {
    const value = utm[key];
    if (value) params.set(key, value);
  }
  if (consented) params.set('hide_gdpr_banner', '1');
  return `${base}?${params}`;
}

export interface CalendlyMessage {
  event: string;
  payload: Record<string, unknown>;
}

/** A Calendly postMessage ({ event: 'calendly.…', payload }), or null for anything else or from another origin. */
export function calendlyMessage(origin: string, data: unknown): CalendlyMessage | null {
  if (origin !== CALENDLY_ORIGIN || !data || typeof data !== 'object') return null;
  const { event, payload } = data as { event?: unknown; payload?: unknown };
  if (typeof event !== 'string' || !event.startsWith('calendly.')) return null;
  return { event, payload: payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {} };
}

/**
 * True once a message means Calendly has drawn the scheduler. Its first messages report a page a few
 * pixels tall while its own spinner shows, so the page keeps its skeleton until real content arrives.
 */
export function calendlyShowsContent({ event, payload }: CalendlyMessage): boolean {
  if (event !== 'calendly.page_height') return true;
  return Number.parseFloat(String(payload.height ?? '')) >= 100;
}

/** The iframe height for a calendly.page_height payload ('1100px'), clamped; null when it can't be read. */
export function calendlyHeight(value: unknown): number | null {
  const px = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(px)) return null;
  return Math.round(Math.min(CALENDLY_HEIGHT.max, Math.max(CALENDLY_HEIGHT.min, px)));
}
