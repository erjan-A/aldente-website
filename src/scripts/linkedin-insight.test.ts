// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LINKEDIN } from '../data/analytics';
import { ALL, CONSENT_KEY, NONE, makeConsent } from '../lib/consent';
import { loadInsightTag, trackDemoConversion } from './linkedin-insight';

const scripts = () => document.querySelectorAll(`script[src="${LINKEDIN.script}"]`);
const allowMarketing = (allowed: boolean) =>
  localStorage.setItem(CONSENT_KEY, JSON.stringify(makeConsent(allowed ? ALL : NONE, Date.now())));

describe('LinkedIn Insight Tag', () => {
  beforeEach(() => {
    localStorage.clear();
    scripts().forEach((s) => s.remove());
    delete window.lintrk;
    delete window._linkedin_partner_id;
    delete window._linkedin_data_partner_ids;
  });

  it('uses the account’s partner ID, script and demo conversion', () => {
    expect(LINKEDIN).toEqual({
      partnerId: '10055058',
      script: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
      conversionId: 32303322,
    });
  });

  it('loads nothing until the visitor allows marketing cookies', () => {
    expect(loadInsightTag('aldenteai.com')).toBe(false);
    allowMarketing(false);
    expect(loadInsightTag('aldenteai.com')).toBe(false);
    expect(scripts()).toHaveLength(0);
    expect(window.lintrk).toBeUndefined();
  });

  it('loads nothing off the production site, even with consent', () => {
    allowMarketing(true);
    expect(loadInsightTag('localhost')).toBe(false);
    expect(scripts()).toHaveLength(0);
  });

  it('with consent on the production site: runs LinkedIn’s snippet once', () => {
    allowMarketing(true);
    expect(loadInsightTag('aldenteai.com')).toBe(true);
    expect(loadInsightTag('www.aldenteai.com')).toBe(false);
    expect(scripts()).toHaveLength(1);
    expect((scripts()[0] as HTMLScriptElement).async).toBe(true);
    expect(window._linkedin_partner_id).toBe('10055058');
    expect(window._linkedin_data_partner_ids).toEqual(['10055058']);
    expect(typeof window.lintrk).toBe('function');
  });

  it('loads as soon as the visitor accepts on the page, not when they reject', () => {
    const { happyDOM } = window as unknown as { happyDOM: { setURL: (url: string) => void } };
    happyDOM.setURL('https://aldenteai.com/demo');
    try {
      window.dispatchEvent(new CustomEvent('consentchange', { detail: makeConsent(NONE, Date.now()) }));
      expect(scripts()).toHaveLength(0);
      allowMarketing(true);
      window.dispatchEvent(new CustomEvent('consentchange', { detail: makeConsent(ALL, Date.now()) }));
      expect(scripts()).toHaveLength(1);
    } finally {
      happyDOM.setURL('http://localhost:3000/');
    }
  });

  it('queues the demo conversion until LinkedIn’s script arrives', () => {
    allowMarketing(true);
    loadInsightTag('aldenteai.com');
    trackDemoConversion();
    expect((window.lintrk as unknown as { q: unknown[] }).q).toEqual([['track', { conversion_id: 32303322 }]]);
  });

  it('sends no conversion when the tag never loaded', () => {
    expect(() => trackDemoConversion()).not.toThrow();
    window.lintrk = vi.fn<NonNullable<Window["lintrk"]>>();
    trackDemoConversion();
    expect(window.lintrk).toHaveBeenCalledWith('track', { conversion_id: 32303322 });
  });
});
