/**
 * A popup that greets the visitor for a few days and then stops by itself (PromoPopup, in the layout).
 * The visitor's own clock decides (src/scripts/promo-popup.ts), so nothing has to be deployed when it ends.
 * Set to null once it is over: the pages then ship without it.
 *
 * Kept apart from site.ts so the browser tests, which run outside the build, can read the same dates.
 *
 * Now: the game at /play. Owner, 2026-11-19: a popup when someone enters the site, for three days; the news
 * bar stays as it is. The days run from the launch through Sunday 22 November, to the end of that day on the
 * US west coast.
 */
export const PROMO: {
  /** Remembered per visit (session storage), so the popup shows once in it. Change it for a new promo. */
  id: string;
  href: string;
  /** The dialog's name, for screen readers. The picture says the same in its own lettering. */
  label: string;
  line: string;
  cta: string;
  /** Pages the popup never covers. */
  skip: readonly string[];
  from: string;
  until: string;
} | null = {
  id: 'order-up-night-shift',
  href: '/play',
  label: 'Order Up: Night Shift, a free game by Aldente AI',
  line: 'One late shift, five orders, a kitchen rank at the end.',
  cta: 'Play now',
  skip: ['/demo'],
  from: '2026-11-19T00:00:00Z',
  until: '2026-11-23T08:00:00Z',
};
