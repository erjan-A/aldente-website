// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from './test-utils';

const calls: { host: HTMLElement; still: boolean }[] = [];
const runs: boolean[] = [];
let disposed = 0;
let fail = false;

vi.mock('./slat-sea-gl', () => ({
  mountSlats: (host: HTMLElement, options: { still: boolean }) => {
    if (fail) throw new Error('no webgl');
    calls.push({ host, still: options.still });
    return { run: (on: boolean) => runs.push(on), dispose: () => disposed++ };
  },
}));

/** A stand-in observer: the test decides when the band is near the screen. */
let report: (visible: boolean) => void = () => {};
let margin: string | undefined;
class FakeObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    margin = options?.rootMargin;
    report = (visible) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe(): void {}
  disconnect(): void {}
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const sea = () => document.querySelector<HTMLElement>('slat-sea')!;
const fixture = '<section class="cta"><slat-sea aria-hidden="true"></slat-sea><h2>See it on your orders.</h2></section>';

describe('<slat-sea>', () => {
  beforeEach(async () => {
    calls.length = 0;
    runs.length = 0;
    disposed = 0;
    fail = false;
    report = () => {};
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    await import('./slat-sea');
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('loads nothing until the band comes near the screen', async () => {
    mount(fixture);
    await settle();
    expect(calls).toHaveLength(0);
    expect(sea().children).toHaveLength(0);
    // It starts a little before the band scrolls in, so the wall is already there.
    expect(margin).toBe('300px 0px');
  });

  it('draws the slats into its own layer once the band is near, and runs them', async () => {
    mount(fixture);
    report(true);
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.host.classList.contains('slats__layer')).toBe(true);
    expect(calls[0]!.host.parentElement).toBe(sea());
    expect(calls[0]!.still).toBe(false);
    expect(runs).toEqual([true]);
  });

  it('pauses off screen and picks up again, without drawing a second wall', async () => {
    mount(fixture);
    report(true);
    await settle();
    report(false);
    report(true);
    await settle();
    expect(calls).toHaveLength(1);
    expect(runs).toEqual([true, false, true]);
  });

  it('draws one still frame when the visitor prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    mount(fixture);
    report(true);
    await settle();
    expect(calls[0]!.still).toBe(true);
    expect(runs).toEqual([]);
  });

  it('leaves the band on its plain ground when the slats cannot start', async () => {
    fail = true;
    mount(fixture);
    report(true);
    await settle();
    expect(sea().children).toHaveLength(0);
  });

  it('stops and removes its layer when the element leaves the page', async () => {
    mount(fixture);
    report(true);
    await settle();
    const element = sea();
    element.remove();
    expect(disposed).toBe(1);
    expect(element.children).toHaveLength(0);
  });
});
