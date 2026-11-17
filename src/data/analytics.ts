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

const RB2B_KEY = '1N5W0HJLDLO5';

/** RB2B visitor identification (see src/scripts/visitor-id.ts). The key is not a secret: it appears in every page. */
export const RB2B = {
  script: `https://ddwl4m2hdecbv.cloudfront.net/b/${RB2B_KEY}/${RB2B_KEY}.js.gz`,
} as const;

/**
 * LinkedIn Insight Tag (see src/scripts/linkedin-insight.ts): ad measurement, loaded for every visitor who has
 * not rejected marketing cookies. The conversion is "demo booked". None of these are secrets: they appear in every page.
 */
export const LINKEDIN = {
  partnerId: '10055058',
  script: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
  conversionId: 32303322,
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
  /** A click on a product in the home page's contents list. Props: label, path. */
  tocClick: 'TOC click',
  /** The visitor switched the home hero's view. Props: view. */
  heroView: 'Hero view',
  /** The longer product clip was opened ("Watch it work"). Props: path. */
  videoPlay: 'Video play',
  /** The visitor changed a number in the cost calculator, once per page view. Props: path. */
  calculator: 'Calculator used',
} as const;
