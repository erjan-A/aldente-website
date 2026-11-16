// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './loop-video';
import { mount } from './test-utils';

const fixture = '<loop-video><video src="/media/tab-walkthrough.mp4" muted loop playsinline controls></video></loop-video>';
const video = () => document.querySelector('video')!;

/** A stand-in observer: the test decides when the element is on screen. */
let report: (visible: boolean) => void = () => {};
class FakeObserver {
  constructor(callback: IntersectionObserverCallback) {
    report = (visible) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe(): void {}
  disconnect(): void {}
}

describe('<loop-video>', () => {
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    report = () => {};
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('plays the clip by itself while it is on screen and pauses it when it leaves', () => {
    mount(fixture);
    // It does the playing, so the clip loses its controls and stays muted.
    expect(video().hasAttribute('controls')).toBe(false);
    expect(video().muted).toBe(true);
    expect(play).not.toHaveBeenCalled();
    report(true);
    expect(play).toHaveBeenCalledTimes(1);
    report(false);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('shows the parts beside the clip at their moment: on from data-at, off again at data-until', () => {
    mount(`<loop-video>
      <video src="/media/tab-line.mp4" muted loop playsinline controls></video>
      <i id="filling" data-at="0" data-until="10.5"></i>
      <i id="item" data-at="2.5"></i>
      <i id="ready" data-at="10.5"></i>
      <i id="plain"></i>
    </loop-video>`);
    const on = () => ['filling', 'item', 'ready'].filter((id) => document.getElementById(id)!.classList.contains('is-on'));
    const at = (seconds: number) => {
      Object.defineProperty(video(), 'currentTime', { value: seconds, configurable: true });
      video().dispatchEvent(new Event('timeupdate'));
    };
    // It follows the clip from its first frame, so the page marks the host as live.
    expect(document.querySelector('loop-video')!.hasAttribute('data-live')).toBe(true);
    expect(on()).toEqual(['filling']);
    at(3);
    expect(on()).toEqual(['filling', 'item']);
    at(11);
    expect(on()).toEqual(['item', 'ready']);
    // The clip loops: back at the start, the parts go back with it.
    at(0.2);
    expect(on()).toEqual(['filling']);
    expect(document.getElementById('plain')!.classList.contains('is-on')).toBe(false);
  });

  it('with reduced motion the parts stay as the page ships them: the finished state', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    mount('<loop-video><video src="/media/tab-line.mp4" muted loop playsinline controls></video><i id="item" data-at="2.5"></i></loop-video>');
    expect(document.querySelector('loop-video')!.hasAttribute('data-live')).toBe(false);
    expect(document.getElementById('item')!.classList.contains('is-on')).toBe(false);
  });

  it('gives the controls back when the browser refuses to autoplay, and leaves the parts in their finished state', async () => {
    play.mockRejectedValue(new DOMException('play() refused', 'NotAllowedError'));
    mount('<loop-video><video src="/media/tab-line.mp4" muted loop playsinline controls></video><i id="item" data-at="2.5"></i></loop-video>');
    report(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(video().hasAttribute('controls')).toBe(true);
    expect(document.querySelector('loop-video')!.hasAttribute('data-live')).toBe(false);
  });

  it('keeps playing by itself when a start is cut short: scrolled past before the clip loaded, it plays the next time', async () => {
    // What a browser reports when pause() arrives before play() has finished loading the clip.
    play.mockRejectedValueOnce(new DOMException('interrupted by a call to pause()', 'AbortError'));
    mount(fixture);
    report(true);
    report(false);
    await Promise.resolve();
    await Promise.resolve();
    // Not a refusal: no controls come back, and the clip starts again when it is next on screen.
    expect(video().hasAttribute('controls')).toBe(false);
    report(true);
    expect(play).toHaveBeenCalledTimes(2);
    expect(video().hasAttribute('controls')).toBe(false);
  });

  it('pauses and resumes on a click or the space key; a paused clip plays again when it next comes on screen', () => {
    mount(fixture);
    report(true);
    expect(play).toHaveBeenCalledTimes(1);
    Object.defineProperty(video(), 'paused', { value: false, configurable: true });
    video().click();
    expect(pause).toHaveBeenCalledTimes(1);
    // Paused by the visitor: it stays paused while it is on screen.
    report(true);
    expect(play).toHaveBeenCalledTimes(1);
    Object.defineProperty(video(), 'paused', { value: true, configurable: true });
    video().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(play).toHaveBeenCalledTimes(2);
    // Paused again, then scrolled away and back: the loop carries on by itself.
    Object.defineProperty(video(), 'paused', { value: false, configurable: true });
    video().click();
    report(false);
    report(true);
    expect(play).toHaveBeenCalledTimes(3);
    expect(video().tabIndex).toBe(0);
  });

  it('never starts by itself with reduced motion: the clip keeps its controls and its poster', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    mount(fixture);
    report(true);
    expect(play).not.toHaveBeenCalled();
    expect(video().hasAttribute('controls')).toBe(true);
  });
});
