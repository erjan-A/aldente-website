// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ANALYTICS } from '../data/analytics';
import { loadAnalytics, track } from './analytics';
import { mount } from './test-utils';

const queue = () => window.plausible!.q!;
const plausibleScript = () => document.querySelector(`script[src="${ANALYTICS.script}"]`);

/** Clicks a link without letting happy-dom navigate away. */
function clickLink(selector: string): void {
  const link = document.querySelector<HTMLAnchorElement>(selector)!;
  link.addEventListener('click', (event) => event.preventDefault(), { once: true });
  link.click();
}

describe('analytics', () => {
  // Offline: happy-dom must not fetch the Plausible script the test adds.
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
    queue().length = 0;
    plausibleScript()?.remove();
    window.history.replaceState(null, '', '/pricing');
  });

  it('queues events until Plausible loads', () => {
    track('Demo view', { plan: 'vision' });
    track('Something');
    expect(queue()).toEqual([
      ['Demo view', { props: { plan: 'vision' } }],
      ['Something', undefined],
    ]);
  });

  it('adds Plausible only on the production site', () => {
    expect(loadAnalytics('localhost')).toBe(false);
    expect(loadAnalytics('aldente-site.vercel.app')).toBe(false);
    expect(plausibleScript()).toBeNull();

    expect(loadAnalytics('aldenteai.com')).toBe(true);
    const script = plausibleScript() as HTMLScriptElement;
    expect(script.dataset.domain).toBe('aldenteai.com');
    expect(script.defer).toBe(true);
    expect(loadAnalytics('www.aldenteai.com')).toBe(false); // once is enough
  });

  it('did not load itself on this test host', () => {
    expect(location.hostname).not.toBe('aldenteai.com');
    expect(document.querySelectorAll('script[src*="plausible"]')).toHaveLength(0);
  });

  it('tracks events other scripts send without importing it', () => {
    window.dispatchEvent(new CustomEvent('aldente:track', { detail: { name: 'Demo booked', props: { plan: 'starter' } } }));
    expect(queue()).toEqual([['Demo booked', { props: { plan: 'starter' } }]]);
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
    expect(queue()).toEqual([
      ['CTA click', { props: { label: 'Book a demo', section: 'header', path: '/pricing', plan: 'general' } }],
      ['CTA click', { props: { label: 'Book a demo', section: 'Plans', path: '/pricing', plan: 'vision' } }],
      ['CTA click', { props: { label: 'Talk to us', section: 'cta-title', path: '/pricing', plan: 'general' } }],
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
