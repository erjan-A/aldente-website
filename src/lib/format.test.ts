import { describe, expect, it } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1048576)).toBe('1,048,576');
  });

  it('floors fractional values', () => {
    expect(formatNumber(999.99)).toBe('999');
  });
});
