// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS } from '../data/analytics';
import { loadAnalytics, queued, track } from './analytics';
import { mount } from './test-utils';

const umamiScript = () => document.querySelector<HTMLScriptElement>(`script[src="${ANALYTICS.script}"]`);

/** Clicks a link without letting happy-dom navigate away. */
function clickLink(selector: string): void {
  const link = document.querySelector<HTMLAnchorElement>(selector)!;
  link.addEventListener('click', (event) => event.preventDefault(), { once: true });
  link.click();
}

describe('analytics', () => {
  // Offline: happy-dom must not fetch the Umami script the test adds.
  beforeAll(() => {
    const { settings } = (
      window as unknown as {
        happyDOM: { settings: { disableJavaScriptFileLoading: boolean; handleDisabledFileLoadingAsSuccess: boolean } };
      }
    ).happyDOM;
    settings.disableJavaScriptFileLoading = true;
    settings.handleDisabledFileLoadingAsSuccess = true;
  });

  beforeEach(() => {
    queued.length = 0;
    umamiScript()?.remove();
    window.history.replaceState(null, '', '/pricing');
  });

  afterEach(() => {
    delete window.umami;
  });

  it('queues events until Umami loads', () => {
    track('Demo view', { plan: 'vision' });
    track('Something');
    expect(queued).toEqual([
      ['Demo view', { plan: 'vision' }],
      ['Something', undefined],
    ]);
  });

  it('adds Umami only on the production site, sending to the host the CSP allows', () => {
    expect(loadAnalytics('localhost')).toBe(false);
    expect(loadAnalytics('aldente-site.vercel.app')).toBe(false);
    expect(umamiScript()).toBeNull();

    expect(loadAnalytics('aldenteai.com')).toBe(true);
    const script = umamiScript()!;
    expect(script.dataset.websiteId).toBe(ANALYTICS.websiteId);
    expect(script.dataset.hostUrl).toBe(ANALYTICS.endpoint);
    expect(script.dataset.domains).toBe('aldenteai.com,www.aldenteai.com');
    expect(script.defer).toBe(true);
    expect(loadAnalytics('www.aldenteai.com')).toBe(false); // once is enough
  });

  it('sends the queued events once Umami has loaded, then sends straight away', () => {
    track('Demo view', { plan: 'vision' });
    track('Something');
    window.umami = { track: vi.fn() };
    loadAnalytics('aldenteai.com');
    umamiScript()!.dispatchEvent(new Event('load'));
    track('Demo booked', { plan: 'starter' });
    expect(vi.mocked(window.umami.track).mock.calls).toEqual([
      ['Demo view', { plan: 'vision' }],
      ['Something', undefined],
      ['Demo booked', { plan: 'starter' }],
    ]);
    expect(queued).toEqual([]);
  });

  it('did not load itself on this test host', () => {
    expect(location.hostname).not.toBe('aldenteai.com');
    expect(document.querySelectorAll('script[src*="umami"]')).toHaveLength(0);
  });

  it('tracks events other scripts send without importing it', () => {
    window.dispatchEvent(new CustomEvent('aldente:track', { detail: { name: 'Demo booked', props: { plan: 'starter' } } }));
    expect(queued).toEqual([['Demo booked', { plan: 'starter' }]]);
  });

  it('counts clicks on links to the demo page by section and plan', () => {
    mount(`
      <header><a href="/demo">Book a demo</a></header>
      <section aria-label="Plans"><a href="/demo?plan=vision">Book a <b>demo</b></a></section>
      <section aria-labelledby="cta-title"><h2 id="cta-title">Ready?</h2><a href="/demo#schedule">Talk to us</a></section>
      <footer><a href="/pricing">Pricing</a></footer>`);
    clickLink('header a');
    clickLink('section[aria-label] a b');
    clickLink('section[aria-labelledby] a');
    clickLink('footer a');
    expect(queued).toEqual([
      ['CTA click', { label: 'Book a demo', section: 'header', path: '/pricing', plan: 'general' }],
      ['CTA click', { label: 'Book a demo', section: 'Plans', path: '/pricing', plan: 'vision' }],
      ['CTA click', { label: 'Talk to us', section: 'cta-title', path: '/pricing', plan: 'general' }],
    ]);
  });

  it('never touches cookies or storage', () => {
    localStorage.clear();
    sessionStorage.clear();
    track('Demo view', { plan: 'general' });
    mount('<a href="/demo">Book a demo</a>');
    clickLink('a');
    loadAnalytics('aldenteai.com');
    expect(document.cookie).toBe('');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
