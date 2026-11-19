/** The days a promo popup shows: from its first moment up to, not including, its last. ISO dates. */
export interface PromoWindow {
  from: string;
  until: string;
}

/** Session storage: the id of the promo this visit has already seen (see src/scripts/promo-popup.ts). */
export const PROMO_SEEN_KEY = 'aldente-promo';

/** True while the promo's window is open. A date that cannot be read keeps it off. */
export function promoActive({ from, until }: PromoWindow, now: number): boolean {
  return now >= Date.parse(from) && now < Date.parse(until);
}
