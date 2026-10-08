// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL, CONSENT_KEY, NONE, makeConsent } from '../lib/consent';
import { SLOW_MS } from './calendly-embed';
import { queued } from './analytics';
import type { CalendlyEmbed } from './calendly-embed';
import { mount } from './test-utils';

const URL_BASE = 'https://calendly.com/aldenteai/30min';

const fixture = `
<calendly-embed data-url="${URL_BASE}">
  <p data-cal-alt>Calendar not loading?</p>
  <div data-cal-stage>
    <div data-cal-skeleton aria-hidden="true"></div>
    <p role="status" aria-live="polite" data-cal-status></p>
    <p data-cal-slow hidden>Taking longer than usual?</p>
  </div>
  <div data-cal-booked hidden><h3 tabindex="-1">You’re booked.</h3></div>
</calendly-embed>`;

const host = () => document.querySelector<CalendlyEmbed>('calendly-embed')!;
const frame = () => document.querySelector<HTMLIFrameElement>('calendly-embed iframe');
const part = (name: string) => document.querySelector<HTMLElement>(`[data-cal-${name}]`)!;

function post(data: unknown, origin = 'https://calendly.com'): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

describe('<calendly-embed>', () => {
  // Offline: happy-dom must not fetch Calendly into the iframe.
  beforeAll(() => {
    const { settings } = (window as unknown as { happyDOM: { settings: { navigation: { disableChildFrameNavigation: boolean } } } })
      .happyDOM;
    settings.navigation.disableChildFrameNavigation = true;
  });

  beforeEach(() => {
    localStorage.clear();
    queued.length = 0;
    window.history.replaceState(null, '', '/demo');
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('loads the scheduler with the page, tagged with the plan', () => {
    window.history.replaceState(null, '', '/demo?plan=vision');
    mount(fixture);
    const src = frame()!.getAttribute('src')!;
    expect(src.startsWith(`${URL_BASE}?`)).toBe(true);
    const params = new URL(src).searchParams;
    expect(params.get('utm_content')).toBe('vision');
    expect(params.get('embed_domain')).toBe(location.hostname);
    expect(frame()!.title).toBe('Book a time with Aldente on Calendly');
    expect(part('status').textContent).toBe('Loading available times…');
    expect(host().dataset.state).toBe('loading');
  });

  it('loads it only once', () => {
    mount(fixture);
    host().load();
    expect(document.querySelectorAll('calendly-embed iframe')).toHaveLength(1);
  });

  it('keeps Calendly’s own cookie question unless marketing cookies were accepted here', () => {
    mount(fixture);
    expect(new URL(frame()!.getAttribute('src')!).searchParams.has('hide_gdpr_banner')).toBe(false);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(makeConsent(NONE, Date.now())));
    mount(fixture);
    expect(new URL(frame()!.getAttribute('src')!).searchParams.has('hide_gdpr_banner')).toBe(false);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(makeConsent(ALL, Date.now())));
    mount(fixture);
    expect(new URL(frame()!.getAttribute('src')!).searchParams.get('hide_gdpr_banner')).toBe('1');
  });

  it('passes the campaign the visitor arrived with to Calendly', () => {
    window.history.replaceState(null, '', '/demo?plan=verification&utm_source=linkedin&utm_campaign=q4');
    mount(fixture);
    const params = new URL(frame()!.getAttribute('src')!).searchParams;
    expect(params.get('utm_source')).toBe('linkedin');
    expect(params.get('utm_campaign')).toBe('q4');
    expect(params.get('utm_medium')).toBe('website');
    expect(params.get('utm_content')).toBe('verification');
  });

  it('counts a picked time in the funnel', () => {
    mount(fixture);
    post({ event: 'calendly.date_and_time_selected', payload: {} });
    expect(queued).toContainEqual(['Time selected', { plan: 'general' }]);
  });

  it('keeps the skeleton while Calendly shows its own spinner', () => {
    mount(fixture);
    post({ event: 'calendly.page_height', payload: { height: '26px' } });
    expect(host().dataset.state).toBe('loading');
    expect(part('status').textContent).toBe('Loading available times…');
    post({ event: 'calendly.event_type_viewed', payload: {} });
    expect(host().dataset.state).toBe('ready');
  });

  it('shows the scheduler once Calendly has drawn it, at Calendly’s height', () => {
    mount(fixture);
    post({ event: 'calendly.page_height', payload: { height: '1100px' } });
    expect(host().dataset.state).toBe('ready');
    expect(part('status').textContent).toBe('');
    expect(part('skeleton').hidden).toBe(true);
    expect(frame()!.style.height).toBe('1100px');
    post({ event: 'calendly.page_height', payload: { height: '26px' } });
    expect(frame()!.style.height).toBe('560px');
    post({ event: 'calendly.page_height', payload: { height: '5000px' } });
    expect(frame()!.style.height).toBe('1400px');
  });

  it('ignores messages from other origins', () => {
    mount(fixture);
    post({ event: 'calendly.page_height', payload: { height: '900px' } }, 'https://evil.example');
    post({ event: 'calendly.event_scheduled', payload: {} }, 'https://evil.example');
    expect(host().dataset.state).toBe('loading');
    expect(frame()!.style.height).toBe('');
    expect(part('booked').hidden).toBe(true);
  });

  it('swaps to the booked panel after a booking', () => {
    window.history.replaceState(null, '', '/demo?plan=enterprise');
    mount(fixture);
    post({ event: 'calendly.event_type_viewed', payload: {} });
    post({ event: 'calendly.event_scheduled', payload: { event: { uri: 'x' } } });
    expect(host().dataset.state).toBe('booked');
    expect(frame()).toBeNull();
    expect(part('stage').hidden).toBe(true);
    expect(part('alt').hidden).toBe(true);
    expect(part('booked').hidden).toBe(false);
    expect(document.activeElement?.textContent).toBe('You’re booked.');
    expect(queued).toContainEqual(['Demo booked', { plan: 'enterprise' }]);
  });

  it('offers Calendly’s own page when the scheduler is slow', () => {
    vi.useFakeTimers();
    mount(fixture);
    expect(part('slow').hidden).toBe(true);
    vi.advanceTimersByTime(SLOW_MS);
    expect(part('slow').hidden).toBe(false);
    post({ event: 'calendly.page_height', payload: { height: '700px' } });
    expect(part('slow').hidden).toBe(true);
  });
});
