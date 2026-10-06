import { describe, expect, it } from 'vitest';
import { cleanText, ctaProps, isDemoHref, planFromHref, sectionName, shouldLoad } from './analytics';

const BASE = 'https://aldenteai.com/pricing';

describe('shouldLoad', () => {
  it('counts visits on the production site only', () => {
    expect(shouldLoad('aldenteai.com')).toBe(true);
    expect(shouldLoad('www.aldenteai.com')).toBe(true);
    expect(shouldLoad('WWW.AldenteAI.com')).toBe(true);
  });

  it('sends nothing from development, previews or shared copies', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '',
      'aldente-site.vercel.app',
      'claude.ai',
      'aldenteai.com.evil.example',
      'staging.aldenteai.com',
    ]) {
      expect(shouldLoad(host), host).toBe(false);
    }
  });
});

describe('planFromHref', () => {
  it('reads the plan the link asks for', () => {
    expect(planFromHref('/demo?plan=vision')).toBe('vision');
    expect(planFromHref('/demo?plan=enterprise#schedule')).toBe('enterprise');
    expect(planFromHref('https://aldenteai.com/demo?plan=starter')).toBe('starter');
  });

  it('counts links without a known plan as general', () => {
    expect(planFromHref('/demo')).toBe('general');
    expect(planFromHref('/demo?plan=rockets')).toBe('general');
    expect(planFromHref('#schedule')).toBe('general');
  });

  it('keeps the page’s plan for in-page links', () => {
    expect(planFromHref('#schedule', 'https://aldenteai.com/demo?plan=verification')).toBe('verification');
  });
});

describe('isDemoHref', () => {
  it('matches every way to the demo page and its scheduler', () => {
    for (const href of ['/demo', '/demo?plan=vision', '/demo#schedule', '#schedule', 'https://aldenteai.com/demo', 'demo.html']) {
      expect(isDemoHref(href, 'https://aldenteai.com/'), href).toBe(true);
    }
  });

  it('ignores other links', () => {
    for (const href of [
      '/pricing',
      '/demos',
      '/demo/extra',
      'https://calendly.com/aldenteai/30min',
      'https://evil.example/demo',
      'mailto:support@aldenteai.com',
      '#faq',
    ]) {
      expect(isDemoHref(href, BASE), href).toBe(false);
    }
  });
});

describe('sectionName', () => {
  it('prefers the section’s label, then its heading id', () => {
    expect(sectionName({ tag: 'SECTION', label: 'Plans', headingId: 'plans-title' })).toBe('Plans');
    expect(sectionName({ tag: 'SECTION', headingId: 'aldo-title', id: 'aldo' })).toBe('aldo-title');
    expect(sectionName({ tag: 'SECTION', id: 'analytics' })).toBe('analytics');
    expect(sectionName({ tag: 'SECTION', heading: '  Every order checked\n before it leaves the counter.  ' })).toBe(
      'Every order checked before it leaves the',
    );
  });

  it('names the header and footer', () => {
    expect(sectionName({ tag: 'HEADER', label: 'ignored' })).toBe('header');
    expect(sectionName({ tag: 'FOOTER' })).toBe('footer');
  });

  it('falls back to the page', () => {
    expect(sectionName(null)).toBe('page');
    expect(sectionName({ tag: 'SECTION' })).toBe('section');
  });
});

describe('ctaProps', () => {
  it('describes a click on a booking link', () => {
    expect(ctaProps({ text: ' Book a demo ', href: '/demo?plan=vision', section: 'Plans', path: '/pricing', base: BASE })).toEqual({
      label: 'Book a demo',
      section: 'Plans',
      path: '/pricing',
      plan: 'vision',
    });
  });

  it('skips links that don’t lead to booking', () => {
    expect(ctaProps({ text: 'Pricing', href: '/pricing', section: 'header', path: '/', base: BASE })).toBeNull();
  });

  it('names icon-only links', () => {
    expect(ctaProps({ text: '', href: '/demo', section: 'header', path: '/', base: BASE })?.label).toBe('link');
  });
});

describe('cleanText', () => {
  it('collapses whitespace and trims to length', () => {
    expect(cleanText('  a\n  b ')).toBe('a b');
    expect(cleanText('x'.repeat(80))).toHaveLength(60);
    expect(cleanText(null)).toBe('');
  });
});
