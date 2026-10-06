// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOOP_TARGETS, PAUSE_MARGIN, pauseOffscreen } from './offscreen-pause';
import { mount } from './test-utils';

type Entry = { isIntersecting: boolean; target: Element };
const observers: FakeObserver[] = [];

class FakeObserver {
  observed: Element[] = [];
  disconnect = vi.fn();
  constructor(
    public callback: (entries: Entry[]) => void,
    public options?: IntersectionObserverInit,
  ) {
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
}

describe('pauseOffscreen', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    observers.length = 0;
    mount(`
      <main>
        <section id="hero"><div data-loop id="cards"></div></section>
        <section id="products"><section id="nested"></section></section>
      </main>
      <footer><section id="outside"></section></footer>`);
  });

  it('watches every section in main and every marked loop, with a margin so motion resumes before it is seen', () => {
    pauseOffscreen();
    const ids = observers[0]!.observed.map((el) => el.id);
    expect(ids).toEqual(['hero', 'cards', 'products', 'nested']);
    expect(observers[0]!.options?.rootMargin).toBe(PAUSE_MARGIN);
    expect(LOOP_TARGETS).toBe('main section, main [data-loop]');
  });

  it('pauses what leaves the screen and resumes it on the way back', () => {
    pauseOffscreen();
    const products = document.getElementById('products')!;
    const hero = document.getElementById('hero')!;
    const { callback } = observers[0]!;

    callback([
      { isIntersecting: true, target: hero },
      { isIntersecting: false, target: products },
    ]);
    expect(hero.hasAttribute('data-paused')).toBe(false);
    expect(products.hasAttribute('data-paused')).toBe(true);

    callback([{ isIntersecting: true, target: products }]);
    expect(products.hasAttribute('data-paused')).toBe(false);
  });

  it('leaves everything running where IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(pauseOffscreen()).toBeNull();
    expect(document.querySelector('[data-paused]')).toBeNull();
  });
});
