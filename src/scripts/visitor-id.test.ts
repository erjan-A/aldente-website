// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { RB2B } from '../data/analytics';
import { loadVisitorId } from './visitor-id';

describe('RB2B visitor identification', () => {
  it('loads the account’s script on the production site only, and only once', () => {
    const scripts = () => document.querySelectorAll(`script[src="${RB2B.script}"]`);
    expect(RB2B.script).toBe('https://ddwl4m2hdecbv.cloudfront.net/b/1N5W0HJLDLO5/1N5W0HJLDLO5.js.gz');
    expect(loadVisitorId('localhost')).toBe(false);
    expect(scripts()).toHaveLength(0);
    expect(loadVisitorId('aldenteai.com')).toBe(true);
    expect(loadVisitorId('www.aldenteai.com')).toBe(false);
    expect(scripts()).toHaveLength(1);
  });
});
