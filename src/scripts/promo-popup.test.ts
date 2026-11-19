// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queued } from './analytics';
import { PROMO_SEEN_KEY } from '../lib/promo';
import './promo-popup';
import { mount } from './test-utils';

const fixture = `
<promo-popup data-id="order-up" data-from="2026-11-19T00:00:00Z" data-until="2026-11-23T08:00:00Z" data-skip="/demo" data-delay="800">
  <dialog aria-label="Order Up: Night Shift, a free game by Aldente AI" tabindex="-1">
    <button type="button" data-promo-close>Close</button>
    <a id="art" href="#game" data-promo-play tabindex="-1" aria-hidden="true"><img src="/art.webp" alt="" /></a>
    <p><span>One late shift, five orders.</span> <a id="play" href="#game" data-promo-play>Play <b>now</b></a></p>
  </dialog>
</promo-popup>`;

const dialog = () => document.querySelector('dialog')!;
const enter = async (path: string, when: string) => {
  vi.setSystemTime(new Date(when));
  window.history.replaceState(null, '', path);
  mount(fixture);
  await vi.advanceTimersByTimeAsync(800);
};

describe('<promo-popup>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    queued.length = 0;
    sessionStorage.clear();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens a moment after the visitor enters, inside its days, and counts the view', async () => {
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    window.history.replaceState(null, '', '/');
    mount(fixture);
    await vi.advanceTimersByTimeAsync(700);
    expect(dialog().open).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(dialog().open).toBe(true);
    expect(queued).toEqual([['Game banner view', { path: '/' }]]);
    // Focus is on the dialog itself: nothing is armed for a stray Enter.
    expect(document.activeElement).toBe(dialog());
  });

  it('switches off by itself: closed before its first moment and from its last', async () => {
    await enter('/', '2026-11-18T23:59:59Z');
    expect(dialog().open).toBe(false);
    await enter('/', '2026-11-23T08:00:00Z');
    expect(dialog().open).toBe(false);
    await enter('/', '2027-03-01T00:00:00Z');
    expect(dialog().open).toBe(false);
    expect(queued).toEqual([]);
  });

  it('shows once per visit: the next page of the same visit stays clear', async () => {
    await enter('/', '2026-11-20T10:00:00Z');
    expect(dialog().open).toBe(true);
    expect(sessionStorage.getItem(PROMO_SEEN_KEY)).toBe('order-up');
    await enter('/pricing', '2026-11-20T10:01:00Z');
    expect(dialog().open).toBe(false);
    // A new visit (a new tab) starts clean.
    sessionStorage.clear();
    await enter('/pricing', '2026-11-21T09:00:00Z');
    expect(dialog().open).toBe(true);
  });

  it('never covers the booking page, and does not use up the visit there', async () => {
    await enter('/demo', '2026-11-20T10:00:00Z');
    expect(dialog().open).toBe(false);
    expect(sessionStorage.getItem(PROMO_SEEN_KEY)).toBeNull();
    await enter('/demo.html', '2026-11-20T10:00:00Z');
    expect(dialog().open).toBe(false);
  });

  it('waits its turn when another dialog is open', async () => {
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    window.history.replaceState(null, '', '/');
    mount(`<dialog id="other" open></dialog>${fixture}`);
    await vi.advanceTimersByTimeAsync(800);
    expect(document.querySelector<HTMLDialogElement>('promo-popup dialog')!.open).toBe(false);
    expect(sessionStorage.getItem(PROMO_SEEN_KEY)).toBeNull();
  });

  it('closes from its button and from its backdrop', async () => {
    await enter('/', '2026-11-20T10:00:00Z');
    document.querySelector<HTMLElement>('[data-promo-close]')!.click();
    expect(dialog().open).toBe(false);

    sessionStorage.clear();
    await enter('/', '2026-11-20T10:05:00Z');
    expect(dialog().open).toBe(true);
    dialog().click();
    expect(dialog().open).toBe(false);
  });

  it('counts a click on the picture or the button and lets the link open the game', async () => {
    await enter('/', '2026-11-20T10:00:00Z');
    queued.length = 0;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('#play b')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(queued).toEqual([['Game banner click', { path: '/' }]]);
    document.querySelector('#art img')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(queued).toHaveLength(2);
  });

  it('stays closed, and breaks nothing, when the browser gives no storage', async () => {
    // A browser with storage switched off throws on the very mention of it.
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    await enter('/', '2026-11-20T10:00:00Z');
    // Without a place to remember the visit it would come back on every page.
    expect(dialog().open).toBe(false);
  });
});
