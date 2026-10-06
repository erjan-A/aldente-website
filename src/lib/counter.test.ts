import { describe, expect, it } from 'vitest';
import { DAY_MS, parseStats, tickInterval, valueAt, type CounterModel } from './counter';

const model: CounterModel = { base: 1_000_000, baseTime: Date.UTC(2026, 9, 1), perDay: 40_000 };

describe('valueAt', () => {
  it('returns the base at the base time', () => {
    expect(valueAt(model, model.baseTime)).toBe(1_000_000);
  });

  it('grows linearly with elapsed time', () => {
    expect(valueAt(model, model.baseTime + DAY_MS)).toBe(1_040_000);
    expect(valueAt(model, model.baseTime + DAY_MS / 2)).toBe(1_020_000);
  });

  it('never drops below the base for earlier clocks', () => {
    expect(valueAt(model, model.baseTime - DAY_MS)).toBe(1_000_000);
  });

  it('returns whole numbers', () => {
    expect(Number.isInteger(valueAt(model, model.baseTime + 12_345))).toBe(true);
  });
});

describe('tickInterval', () => {
  it('matches the average time between orders', () => {
    expect(tickInterval({ ...model, perDay: 86_400 })).toBe(1000);
  });

  it('is clamped so the counter neither floods nor stalls', () => {
    expect(tickInterval({ ...model, perDay: 10_000_000 })).toBe(250);
    expect(tickInterval({ ...model, perDay: 1 })).toBe(5000);
    expect(tickInterval({ ...model, perDay: 0 })).toBe(5000);
  });
});

describe('parseStats', () => {
  it('reads a valid stats payload', () => {
    expect(parseStats({ ordersVerified: 1_234_567, locations: 212 })).toEqual({ ordersVerified: 1_234_567, locations: 212 });
  });

  it('rejects malformed payloads', () => {
    expect(parseStats(null)).toBeNull();
    expect(parseStats({ ordersVerified: 'many' })).toBeNull();
    expect(parseStats({ ordersVerified: -1 })).toBeNull();
  });

  it('keeps optional fields optional', () => {
    expect(parseStats({ ordersVerified: 10 })).toEqual({ ordersVerified: 10 });
  });
});
