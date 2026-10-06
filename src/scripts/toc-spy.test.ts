// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import './toc-spy';
import type { TocSpy } from './toc-spy';
import { mount } from './test-utils';

const fixture = `
<toc-spy>
  <a href="#one">One</a>
  <a href="#two">Two</a>
  <a href="#three">Three</a>
</toc-spy>
<h2 id="one">One</h2>
<h2 id="two">Two</h2>
<h2 id="three">Three</h2>`;

/** Places each heading at a top offset (px from the top of the viewport). */
function place(tops: Record<string, number>): void {
  for (const [id, top] of Object.entries(tops)) {
    vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 30 } as DOMRect);
  }
}

const current = () => [...document.querySelectorAll('toc-spy a[aria-current]')].map((a) => a.textContent);
const spy = () => document.querySelector<TocSpy>('toc-spy')!;

describe('<toc-spy>', () => {
  afterEach(() => vi.restoreAllMocks());

  it('marks the first section before any heading has scrolled past the line', () => {
    mount(fixture);
    place({ one: 400, two: 1400, three: 2400 });
    spy().update();
    expect(current()).toEqual(['One']);
    expect(document.querySelector('toc-spy a')!.getAttribute('aria-current')).toBe('location');
  });

  it('follows the reader: the last heading above the line is current', () => {
    mount(fixture);
    place({ one: -900, two: 100, three: 1100 });
    spy().update();
    expect(current()).toEqual(['Two']);
    place({ one: -1900, two: -900, three: 120 });
    spy().update();
    expect(current()).toEqual(['Three']);
  });

  it('does nothing when a link points nowhere', () => {
    mount(`<toc-spy><a href="#missing">Missing</a></toc-spy>`);
    spy().update();
    expect(current()).toEqual([]);
  });
});
