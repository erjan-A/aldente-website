// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_KEY, makeConsent } from '../lib/consent';
import './cookie-consent';
import { mount } from './test-utils';

const fixture = `
<cookie-consent hidden>
  <section>
    <div data-consent-settings hidden>
      <input type="checkbox" name="marketing" />
    </div>
    <button type="button" data-consent="reject">Reject all</button>
    <button type="button" data-consent="accept">Accept all</button>
    <button type="button" data-consent="settings" aria-expanded="false">Settings</button>
    <button type="button" data-consent="save" hidden>Save choices</button>
  </section>
</cookie-consent>
<button type="button" data-cookie-settings>Cookie settings</button>`;

const banner = () => document.querySelector<HTMLElement>('cookie-consent')!;
const click = (selector: string) => document.querySelector<HTMLElement>(selector)!.click();
const stored = () => JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null');
const html = document.documentElement;

describe('<cookie-consent>', () => {
  beforeEach(() => {
    localStorage.clear();
    delete html.dataset.consentMarketing;
  });

  it('asks on the first visit', () => {
    mount(fixture);
    expect(banner().hidden).toBe(false);
  });

  it('stays out of the way once the visitor has chosen', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(makeConsent({ marketing: false }, Date.now())));
    mount(fixture);
    expect(banner().hidden).toBe(true);
    expect(html.dataset.consentMarketing).toBe('denied');
    // Visit counting is cookieless and not a choice, so there is no analytics flag.
    expect(html.dataset.consentAnalytics).toBeUndefined();
  });

  it('rejects everything optional in one click', () => {
    mount(fixture);
    click('[data-consent="reject"]');
    expect(banner().hidden).toBe(true);
    expect(stored()).toMatchObject({ marketing: false });
    expect(html.dataset.consentMarketing).toBe('denied');
  });

  it('accepts everything in one click and tells the page', () => {
    const listener = vi.fn();
    window.addEventListener('consentchange', listener);
    mount(fixture);
    click('[data-consent="accept"]');
    expect(stored()).toMatchObject({ marketing: true });
    expect(html.dataset.consentMarketing).toBe('granted');
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ marketing: true });
    window.removeEventListener('consentchange', listener);
  });

  it('saves a choice per category from the settings', () => {
    mount(fixture);
    click('[data-consent="settings"]');
    expect(document.querySelector<HTMLElement>('[data-consent-settings]')!.hidden).toBe(false);
    expect(document.querySelector('[data-consent="settings"]')!.getAttribute('aria-expanded')).toBe('true');
    document.querySelector<HTMLInputElement>('[name="marketing"]')!.checked = true;
    click('[data-consent="save"]');
    expect(stored()).toMatchObject({ marketing: true });
    expect(banner().hidden).toBe(true);
  });

  it('reopens the settings from anywhere on the page, showing the current choice', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(makeConsent({ marketing: true }, Date.now())));
    mount(fixture);
    click('[data-cookie-settings]');
    expect(banner().hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('[data-consent-settings]')!.hidden).toBe(false);
    expect(document.querySelector<HTMLInputElement>('[name="marketing"]')!.checked).toBe(true);
  });
});
