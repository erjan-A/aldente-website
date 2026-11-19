import { describe, expect, it } from 'vitest';
import { PROMO_SEEN_KEY, promoActive } from './promo';

const promo = { from: '2026-11-19T00:00:00Z', until: '2026-11-23T08:00:00Z' };
const at = (iso: string) => Date.parse(iso);

describe('promoActive', () => {
  it('is on from its first moment', () => {
    expect(promoActive(promo, at('2026-11-18T23:59:59Z'))).toBe(false);
    expect(promoActive(promo, at('2026-11-19T00:00:00Z'))).toBe(true);
    expect(promoActive(promo, at('2026-11-21T12:00:00Z'))).toBe(true);
  });

  it('switches off by itself at its end', () => {
    expect(promoActive(promo, at('2026-11-23T07:59:59Z'))).toBe(true);
    expect(promoActive(promo, at('2026-11-23T08:00:00Z'))).toBe(false);
    expect(promoActive(promo, at('2027-01-01T00:00:00Z'))).toBe(false);
  });

  it('remembers a visit under a name of its own', () => {
    expect(PROMO_SEEN_KEY).toBe('aldente-promo');
  });

  it('stays off when a date cannot be read', () => {
    expect(promoActive({ from: 'soon', until: promo.until }, at('2026-11-21T12:00:00Z'))).toBe(false);
    expect(promoActive({ from: promo.from, until: '' }, at('2026-11-21T12:00:00Z'))).toBe(false);
  });
});
