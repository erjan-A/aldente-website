/**
 * Cookieless visit counting with Plausible Analytics: no cookies, nothing stored in the browser, no
 * personal data, aggregated totals only. The script loads on the production hosts only, so local
 * development, previews and the shared artifact send nothing.
 */
export const ANALYTICS = {
  domain: 'aldenteai.com',
  script: 'https://plausible.io/js/script.js',
  hosts: ['aldenteai.com', 'www.aldenteai.com'],
} as const;

/** Funnel events, as they appear in Plausible (Goals → Custom event). */
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
