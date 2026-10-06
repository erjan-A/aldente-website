// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './scroll-beats';
import { mount } from './test-utils';

const flush = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function place(top: number, height: number) {
  const el = document.querySelector('scroll-beats')!;
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top, height, bottom: top + height } as DOMRect);
}

describe('<scroll-beats>', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    // The page's CSS decides whether the stage pins; here it does.
    mount('<scroll-beats data-beats="3" data-beat="3"><div style="position: sticky">stage</div></scroll-beats>');
  });

  it('starts with nothing revealed before the stage is reached', async () => {
    place(400, 2000);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('0');
  });

  it('reveals beats as the pinned stage scrolls', async () => {
    place(-560, 2000); // progress 0.47
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('2');

    place(-1200, 2000);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('3');
  });

  it('follows the page instead when the stage does not pin (short screens)', async () => {
    mount('<scroll-beats data-beats="3" data-beat="3"><div>stage</div></scroll-beats>');
    place(200, 2000); // flow progress 0.2; pinned it would still be 0
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('1');
  });

  it('can show the first beat from the start', async () => {
    mount('<scroll-beats data-beats="3" data-beat="3" data-start="0"><div style="position: sticky">stage</div></scroll-beats>');
    place(400, 2000);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('1');
  });

  it('shows every beat when motion is reduced', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
    mount('<scroll-beats data-beats="3" data-beat="3"><div>stage</div></scroll-beats>');
    place(400, 2000);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(document.querySelector('scroll-beats')!.getAttribute('data-beat')).toBe('3');
  });
});
