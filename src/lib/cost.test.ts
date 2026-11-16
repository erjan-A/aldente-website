import { describe, expect, it } from 'vitest';
import { COST_DEFAULTS, formatCount, formatMoney, readCostInput, wrongOrderCost } from './cost';

describe('wrongOrderCost', () => {
  it('matches the customer result: one location, about 200 orders, 7% wrong, a $17 check', () => {
    const result = wrongOrderCost({ locations: 1, ordersPerDay: 200, averageCheck: 17, errorRate: 7 });
    expect(result.wrongPerDay).toBeCloseTo(14);
    expect(result.refundsPerYear).toBeCloseTo(14 * 365 * 17);
    // 87% fewer wrong orders: about 12 a day, the "$74K+ saved a year" on the site.
    expect(Math.round(result.savedPerYear / 1000)).toBe(76);
    expect(formatMoney(result.savedPerYear)).toBe('$76K');
  });

  it('scales with the number of locations', () => {
    const one = wrongOrderCost({ ...COST_DEFAULTS, locations: 1 });
    const fifty = wrongOrderCost({ ...COST_DEFAULTS, locations: 50 });
    expect(fifty.refundsPerYear).toBeCloseTo(one.refundsPerYear * 50);
  });
});

describe('readCostInput', () => {
  it('keeps numbers inside their bounds and falls back to the example for anything else', () => {
    expect(readCostInput({ locations: '120', ordersPerDay: '350.5', averageCheck: '21', errorRate: '4' })).toEqual({
      locations: 120,
      ordersPerDay: 350.5,
      averageCheck: 21,
      errorRate: 4,
    });
    expect(readCostInput({ locations: '-3', ordersPerDay: '', averageCheck: 'abc', errorRate: '95' })).toEqual({
      locations: 1,
      ordersPerDay: COST_DEFAULTS.ordersPerDay,
      averageCheck: COST_DEFAULTS.averageCheck,
      errorRate: 30,
    });
  });
});

describe('formatting', () => {
  it('rounds money the way a headline figure is read', () => {
    expect(formatMoney(950)).toBe('$950');
    expect(formatMoney(74_460)).toBe('$74K');
    expect(formatMoney(1_420_000)).toBe('$1.4M');
    expect(formatMoney(2_000_000)).toBe('$2M');
    // One decimal up to $100M, so $10.4M refunded and $9.1M saved do not read as $10M and $9.1M.
    expect(formatMoney(31_600_000)).toBe('$31.6M');
    expect(formatMoney(10_440_000)).toBe('$10.4M');
    expect(formatMoney(10_000_000)).toBe('$10M');
    expect(formatMoney(131_600_000)).toBe('$132M');
  });

  it('groups thousands in order counts', () => {
    expect(formatCount(262.5)).toBe('263');
    expect(formatCount(1050)).toBe('1,050');
  });
});

describe('edge cases found before release', () => {
  it('never prints "$1000K": just under a million rounds up to $1M', () => {
    expect(formatMoney(999_901)).toBe('$1M');
    expect(formatMoney(999_499)).toBe('$999K');
    expect(formatMoney(1_000_000)).toBe('$1M');
  });
});
