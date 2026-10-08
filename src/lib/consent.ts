/**
 * Cookie consent: which optional categories the visitor allowed, and when. Necessary storage (this choice)
 * is always on. Visit counting (Umami) is cookieless and stores nothing in the browser, so it is not a
 * category to choose: the only optional one is marketing, which lets Calendly's booking calendar on the
 * demo page set its own cookies without asking again (hide_gdpr_banner).
 */
export interface Choices {
  marketing: boolean;
}

export interface Consent extends Choices {
  /** When the visitor chose, in ms since the epoch. */
  at: number;
  version: number;
}

export const CONSENT_KEY = 'aldente-consent';
/** Bump when the categories change, so everyone is asked again. 2: the analytics category was removed. */
export const CONSENT_VERSION = 2;
/** Ask again after a year; EU regulators expect a stored choice to be renewed within 13 months. */
export const CONSENT_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

export const ALL: Choices = { marketing: true };
export const NONE: Choices = { marketing: false };

export function makeConsent(choices: Choices, now: number): Consent {
  return { marketing: choices.marketing, at: now, version: CONSENT_VERSION };
}

/** The stored choice, or null when there is none, it can't be read, it is from an older version, or it has expired. */
export function readConsent(raw: string | null, now: number): Consent | null {
  if (!raw) return null;
  let value: Partial<Consent>;
  try {
    value = JSON.parse(raw) as Partial<Consent>;
  } catch {
    return null;
  }
  if (!value || value.version !== CONSENT_VERSION || typeof value.at !== 'number') return null;
  if (typeof value.marketing !== 'boolean') return null;
  if (now - value.at > CONSENT_MAX_AGE) return null;
  return makeConsent({ marketing: value.marketing }, value.at);
}
