// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './scroll-story';
import { mount } from './test-utils';

const fixture = `
<scroll-story data-step="0">
  <div data-story-visual></div>
  <ol>
    <li data-story-step>One</li>
    <li data-story-step>Two</li>
    <li data-story-step>Three</li>
  </ol>
</scroll-story>`;

function placeSteps(tops: number[]) {
  document.querySelectorAll<HTMLElement>('[data-story-step]').forEach((el, i) => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: tops[i]!, bottom: tops[i]! + 400 } as DOMRect);
  });
}

const flush = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

describe('<scroll-story>', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 1000);
    mount(fixture);
  });

  it('marks the step under the anchor line on scroll', async () => {
    placeSteps([-600, 200, 900]);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    const story = document.querySelector('scroll-story')!;
    expect(story.getAttribute('data-step')).toBe('1');
    const steps = document.querySelectorAll('[data-story-step]');
    expect(steps[1]!.getAttribute('aria-current')).toBe('step');
    expect(steps[0]!.hasAttribute('aria-current')).toBe(false);
  });

  it('on stacked layouts, measures from below the sticky visual that covers the top of the screen', async () => {
    const visual = document.querySelector<HTMLElement>('[data-story-visual]')!;
    const list = document.querySelector<HTMLElement>('ol')!;
    // Visual above the steps (same column), covering the top 600px of a 1000px screen: line at 700.
    vi.spyOn(visual, 'getBoundingClientRect').mockReturnValue({ top: 80, bottom: 600, left: 20, right: 370 } as DOMRect);
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: -600, bottom: 1300, left: 20, right: 370 } as DOMRect);
    placeSteps([-600, 200, 650]);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-story')!.getAttribute('data-step')).toBe('2');
    placeSteps([-600, 200, 720]);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-story')!.getAttribute('data-step')).toBe('1');
  });

  it('ignores a visual beside the steps (desktop)', async () => {
    const visual = document.querySelector<HTMLElement>('[data-story-visual]')!;
    const list = document.querySelector<HTMLElement>('ol')!;
    vi.spyOn(visual, 'getBoundingClientRect').mockReturnValue({ top: 140, bottom: 860, left: 700, right: 1360 } as DOMRect);
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: -600, bottom: 1300, left: 80, right: 620 } as DOMRect);
    placeSteps([-600, 200, 540]);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-story')!.getAttribute('data-step')).toBe('2');
  });

  it('publishes where the sticky visual ends as --story-cover, so step text can stick right under it', async () => {
    const visual = document.querySelector<HTMLElement>('[data-story-visual]')!;
    visual.style.position = 'sticky';
    visual.style.top = '80px';
    Object.defineProperty(visual, 'offsetHeight', { configurable: true, value: 360 });
    window.dispatchEvent(new Event('resize'));
    await flush();
    expect(document.querySelector<HTMLElement>('scroll-story')!.style.getPropertyValue('--story-cover')).toBe('440px');
  });

  it('advances as the next step crosses the line', async () => {
    placeSteps([-1200, -400, 300]);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-story')!.getAttribute('data-step')).toBe('2');
  });
});
