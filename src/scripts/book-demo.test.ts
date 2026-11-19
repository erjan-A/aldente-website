// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queued } from './analytics';
import './book-demo';
import './calendly-embed';
import { mount } from './test-utils';

const fixture = `
<main><a id="other" href="/demo">Book a live demo</a></main>
<section id="band"></section>
<footer id="foot"></footer>
<book-demo data-yield="#band, #foot" data-section="sticky button">
  <a id="open" href="/demo" data-book>Book a live demo</a>
  <dialog aria-labelledby="book-title" tabindex="-1">
    <calendly-embed data-url="https://calendly.com/aldenteai/30min" data-lazy>
      <h2 id="book-title">Pick a time</h2>
      <button type="button" data-book-close>Close</button>
      <div data-cal-stage>
        <div data-cal-skeleton aria-hidden="true"></div>
        <p role="status" data-cal-status></p>
      </div>
      <div data-cal-booked hidden><h3 tabindex="-1">You’re booked.</h3></div>
    </calendly-embed>
  </dialog>
</book-demo>`;

const host = () => document.querySelector<HTMLElement>('book-demo')!;
const dialog = () => document.querySelector('dialog')!;
const frames = () => document.querySelectorAll('calendly-embed iframe');
/** Clicks, and says whether the page kept the click for itself. happy-dom never follows the link: the window stops it last. */
const click = (selector: string, init: MouseEventInit = {}): boolean => {
  let kept = false;
  window.addEventListener(
    'click',
    (event) => {
      kept = event.defaultPrevented;
      event.preventDefault();
    },
    { once: true },
  );
  document.querySelector(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  return kept;
};

/** Stands in for IntersectionObserver: the test says what is on screen. */
class Watcher {
  static last: Watcher | null = null;
  seen: Element[] = [];
  constructor(private report: (entries: { target: Element; isIntersecting: boolean; boundingClientRect: { top: number } }[]) => void) {
    Watcher.last = this;
  }
  observe(el: Element): void {
    this.seen.push(el);
  }
  disconnect(): void {
    this.seen = [];
  }
  /** `top`: where the part's top edge is, in pixels from the top of the screen. */
  show(el: Element, isIntersecting: boolean, top: number): void {
    this.report([{ target: el, isIntersecting, boundingClientRect: { top } }]);
  }
}

describe('<book-demo>', () => {
  // Offline: happy-dom must not fetch Calendly into the iframe.
  beforeAll(() => {
    const { settings } = (window as unknown as { happyDOM: { settings: { navigation: { disableChildFrameNavigation: boolean } } } })
      .happyDOM;
    settings.navigation.disableChildFrameNavigation = true;
  });

  beforeEach(() => {
    queued.length = 0;
    localStorage.clear();
    Watcher.last = null;
    vi.stubGlobal('IntersectionObserver', Watcher);
    window.history.replaceState(null, '', '/pricing');
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('asks Calendly for nothing until the visitor asks for the calendar', () => {
    mount(fixture);
    expect(dialog().open).toBe(false);
    expect(frames()).toHaveLength(0);
  });

  it('opens the calendar in place of leaving the page, and loads the scheduler then', () => {
    mount(fixture);
    expect(click('#open')).toBe(true);
    expect(dialog().open).toBe(true);
    expect(frames()).toHaveLength(1);
    const src = new URL(frames()[0]!.getAttribute('src')!);
    expect(src.origin + src.pathname).toBe('https://calendly.com/aldenteai/30min');
    expect(src.searchParams.get('utm_content')).toBe('general');
    // Focus rests on the dialog: a screen reader hears its name.
    expect(document.activeElement).toBe(dialog());
  });

  it('keeps the calendar it has loaded: closing and opening again asks Calendly once', () => {
    mount(fixture);
    click('#open');
    document.querySelector<HTMLElement>('[data-book-close]')!.click();
    expect(dialog().open).toBe(false);
    click('#open');
    expect(dialog().open).toBe(true);
    expect(frames()).toHaveLength(1);
  });

  it('closes from its button and from its backdrop, never from a click inside', () => {
    mount(fixture);
    click('#open');
    document.querySelector<HTMLElement>('#book-title')!.click();
    expect(dialog().open).toBe(true);
    dialog().click();
    expect(dialog().open).toBe(false);
  });

  it('leaves the link alone when the visitor asks for a new tab, and other booking links as they are', () => {
    mount(fixture);
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }]) {
      expect(click('#open', init)).toBe(false);
      expect(dialog().open).toBe(false);
    }
    expect(click('#other')).toBe(false);
    expect(dialog().open).toBe(false);
  });

  it('leaves the link alone in a browser without modal dialogs', () => {
    mount(fixture);
    (dialog() as unknown as { showModal: unknown }).showModal = undefined;
    expect(click('#open')).toBe(false);
    expect(frames()).toHaveLength(0);
  });

  it('steps aside from the closing booking band to the end of the page', () => {
    mount(fixture);
    const band = document.getElementById('band')!;
    // One part is watched: the first listed. Everything after it is the end of the page.
    expect(Watcher.last!.seen).toEqual([band]);
    expect(host().hasAttribute('data-away')).toBe(false);
    Watcher.last!.show(band, true, 700);
    expect(host().hasAttribute('data-away')).toBe(true);
    // The band has scrolled off the top: the footer fills the screen, and the button stays away.
    Watcher.last!.show(band, false, -400);
    expect(host().hasAttribute('data-away')).toBe(true);
    // Back up the page.
    Watcher.last!.show(band, false, 1200);
    expect(host().hasAttribute('data-away')).toBe(false);
  });

  it('on a page without the band, steps aside for the footer', () => {
    mount(fixture.replace('<section id="band"></section>', ''));
    expect(Watcher.last!.seen).toEqual([document.getElementById('foot')!]);
  });

  it('stops listening when it leaves the page', () => {
    mount(fixture);
    const gone = host();
    const watcher = Watcher.last!;
    gone.remove();
    expect(watcher.seen).toEqual([]);
    // A booking link met later is not its business any more.
    document.body.insertAdjacentHTML('beforeend', '<a id="late" href="/demo" data-book>Book a live demo</a>');
    expect(click('#late')).toBe(false);
    expect(gone.querySelector('dialog')!.open).toBe(false);
  });

  it('counts a booking made in the popup like any other', () => {
    mount(fixture);
    click('#open');
    window.dispatchEvent(new MessageEvent('message', { data: { event: 'calendly.event_scheduled', payload: {} }, origin: 'https://calendly.com' }));
    expect(queued).toContainEqual(['Demo booked', { plan: 'general' }]);
    expect(document.querySelector<HTMLElement>('[data-cal-booked]')!.hidden).toBe(false);
  });
});
