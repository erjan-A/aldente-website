// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from './test-utils';

type Callback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
const observers: Array<{ callback: Callback; disconnect: ReturnType<typeof vi.fn> }> = [];

class FakeObserver {
  disconnect = vi.fn();
  constructor(public callback: Callback) {
    observers.push(this);
  }
  observe() {}
  unobserve() {}
}

await import('./in-view');

describe('<in-view>', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    observers.length = 0;
    mount(`<in-view><div>chart</div></in-view>`);
  });

  it('marks itself once it enters the viewport and stops observing', () => {
    const el = document.querySelector('in-view')!;
    expect(el.hasAttribute('data-inview')).toBe(false);
    observers[0]!.callback([{ isIntersecting: true, target: el }]);
    expect(el.hasAttribute('data-inview')).toBe(true);
    expect(observers[0]!.disconnect).toHaveBeenCalled();
  });

  it('ignores entries that are not intersecting', () => {
    const el = document.querySelector('in-view')!;
    observers[0]!.callback([{ isIntersecting: false, target: el }]);
    expect(el.hasAttribute('data-inview')).toBe(false);
  });
});
