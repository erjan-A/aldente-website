import { describe, expect, it } from 'vitest';
import { ALL, CONSENT_MAX_AGE, CONSENT_VERSION, NONE, makeConsent, readConsent } from './consent';

const NOW = Date.parse('2026-10-05T12:00:00Z');
const stored = (value: unknown) => JSON.stringify(value);

describe('makeConsent', () => {
  it('stamps the choice with the time and version', () => {
    expect(makeConsent({ marketing: false }, NOW)).toEqual({ marketing: false, at: NOW, version: CONSENT_VERSION });
  });

  it('offers all-or-nothing presets', () => {
    expect(ALL).toEqual({ marketing: true });
    expect(NONE).toEqual({ marketing: false });
  });

  it('has no analytics category: visit counting is cookieless and needs no choice', () => {
    expect(makeConsent(ALL, NOW)).not.toHaveProperty('analytics');
    expect(CONSENT_VERSION).toBeGreaterThanOrEqual(2);
  });
});

describe('readConsent', () => {
  it('returns a stored choice that is still current', () => {
    const consent = makeConsent(NONE, NOW - 1000);
    expect(readConsent(stored(consent), NOW)).toEqual(consent);
  });

  it('asks again once the choice is older than the maximum age', () => {
    expect(readConsent(stored(makeConsent(ALL, NOW - CONSENT_MAX_AGE - 1)), NOW)).toBeNull();
  });

  it('asks again after the categories changed (older versions)', () => {
    expect(readConsent(stored({ analytics: false, marketing: true, at: NOW, version: 1 }), NOW)).toBeNull();
  });

  it('ignores missing, unreadable, outdated or malformed records', () => {
    expect(readConsent(null, NOW)).toBeNull();
    expect(readConsent('{oops', NOW)).toBeNull();
    expect(readConsent('null', NOW)).toBeNull();
    expect(readConsent(stored({ ...makeConsent(ALL, NOW), version: CONSENT_VERSION - 1 }), NOW)).toBeNull();
    expect(readConsent(stored({ marketing: 'yes', at: NOW, version: CONSENT_VERSION }), NOW)).toBeNull();
    expect(readConsent(stored({ marketing: true, version: CONSENT_VERSION }), NOW)).toBeNull();
  });
});
