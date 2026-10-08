/**
 * Cookieless visit counting with Umami Cloud: no cookies, nothing written to the browser, no personal
 * data, an anonymous visit ID instead. The script loads on the production hosts only, so local
 * development, previews and the shared artifact send nothing.
 */
export const ANALYTICS = {
  domain: 'aldenteai.com',
  script: 'https://cloud.umami.is/script.js',
  /** Where the script sends visits and events. Set on the script tag, so it always matches the CSP's connect-src. */
  endpoint: 'https://gateway.umami.is',
  /** The site in Umami Cloud. Not a secret: it appears in every page. */
  websiteId: 'd299bc9e-64f9-4a33-89c8-70683b9e3de7',
  hosts: ['aldenteai.com', 'www.aldenteai.com'],
} as const;

/** Funnel events, as they appear in Umami (Events; usable as steps in Goals and Funnels). */
export const EVENTS = {
  /** A click on any link to /demo or #schedule. Props: label, section, path, plan. */
  cta: 'CTA click',
  /** The demo page opened. Props: plan. */
  demoView: 'Demo view',
  /** The visitor picked a day and time in Calendly's scheduler (before confirming). Props: plan. */
  timeSelected: 'Time selected',
  /** Calendly reported a booking. Props: plan. */
  booked: 'Demo booked',
} as const;
