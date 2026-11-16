// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queued } from './analytics';
import './media-tabs';
import { mount } from './test-utils';

const fixture = `
<media-tabs data-track="Hero view">
  <div id="p-verify" role="tabpanel" aria-labelledby="t-verify">Verify view</div>
  <div id="p-dispute" role="tabpanel" aria-labelledby="t-dispute" hidden>Dispute view</div>
  <div id="p-tab" role="tabpanel" aria-labelledby="t-tab" hidden>Tab view</div>
  <div role="tablist" aria-label="Products">
    <button id="t-verify" role="tab" aria-selected="true" aria-controls="p-verify">Verify</button>
    <button id="t-dispute" role="tab" aria-selected="false" aria-controls="p-dispute" tabindex="-1">Dispute</button>
    <button id="t-tab" role="tab" aria-selected="false" aria-controls="p-tab" tabindex="-1">Tab</button>
  </div>
</media-tabs>`;

const tab = (id: string) => document.getElementById(`t-${id}`) as HTMLButtonElement;
const panel = (id: string) => document.getElementById(`p-${id}`)!;
const shown = () => ['verify', 'dispute', 'tab'].filter((id) => !panel(id).hidden);

describe('<media-tabs>', () => {
  beforeEach(() => {
    queued.length = 0;
    mount(fixture);
  });

  afterEach(() => document.body.replaceChildren());

  it('shows the view of the tab that was clicked, one at a time', () => {
    tab('dispute').click();
    expect(shown()).toEqual(['dispute']);
    expect(tab('dispute').getAttribute('aria-selected')).toBe('true');
    expect(tab('verify').getAttribute('aria-selected')).toBe('false');
    expect(tab('dispute').tabIndex).toBe(0);
    expect(tab('verify').tabIndex).toBe(-1);
  });

  it('moves with the arrow keys, Home and End, and wraps', () => {
    const press = (from: string, key: string) => tab(from).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    press('verify', 'ArrowRight');
    expect(shown()).toEqual(['dispute']);
    expect(document.activeElement).toBe(tab('dispute'));
    press('dispute', 'End');
    expect(shown()).toEqual(['tab']);
    press('tab', 'ArrowRight');
    expect(shown()).toEqual(['verify']);
    press('verify', 'ArrowLeft');
    expect(shown()).toEqual(['tab']);
    press('tab', 'Home');
    expect(shown()).toEqual(['verify']);
  });

  it('counts a view the visitor chose, not the one already showing', () => {
    tab('verify').click();
    expect(queued).toEqual([]);
    tab('tab').click();
    expect(queued).toEqual([['Hero view', { view: 'Tab' }]]);
  });

  describe('autoplay (data-autoplay, in ms)', () => {
    const autoplay = fixture.replace('<media-tabs', '<media-tabs data-autoplay="7000"');
    const reducedMotion = (reduce: boolean) =>
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reduce } as MediaQueryList);

    beforeEach(() => vi.useFakeTimers());

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('plays the views one after another and wraps, without counting them as picks', () => {
      reducedMotion(false);
      mount(autoplay);
      expect(document.querySelector('media-tabs')!.hasAttribute('data-playing')).toBe(true);
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['dispute']);
      vi.advanceTimersByTime(14000);
      expect(shown()).toEqual(['verify']);
      expect(queued).toEqual([]);
      expect(document.activeElement).not.toBe(tab('verify'));
    });

    it('stops for good once the visitor picks a view', () => {
      reducedMotion(false);
      mount(autoplay);
      tab('tab').click();
      expect(document.querySelector('media-tabs')!.hasAttribute('data-playing')).toBe(false);
      vi.advanceTimersByTime(30000);
      expect(shown()).toEqual(['tab']);
    });

    it('waits while the pointer or the keyboard is on the panel', () => {
      reducedMotion(false);
      mount(autoplay);
      const host = document.querySelector('media-tabs')!;
      host.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(20000);
      expect(shown()).toEqual(['verify']);
      host.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['dispute']);
    });

    it('while the pointer is on the panel the same view plays again, in step with its clip and its tab', () => {
      reducedMotion(false);
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      const host = document.querySelector('media-tabs')!;
      const video = document.querySelector('video')!;
      host.dispatchEvent(new Event('pointerenter'));
      // Held: the clip and the tab's progress keep running, so nothing is marked as waiting.
      expect(host.hasAttribute('data-waiting')).toBe(false);
      video.currentTime = 6.9;
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['verify']);
      expect(video.currentTime).toBe(0);
      expect(play).toHaveBeenCalledTimes(2);
      expect(host.hasAttribute('data-playing')).toBe(true);
    });

    it('off screen the time left is kept, so a view ends together with its clip', () => {
      reducedMotion(false);
      let seen: (entries: { isIntersecting: boolean }[]) => void = () => {};
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: typeof seen) {
            seen = callback;
          }
          observe(): void {}
          disconnect(): void {}
        },
      );
      mount(autoplay);
      const host = document.querySelector('media-tabs')!;
      vi.advanceTimersByTime(3000);
      seen([{ isIntersecting: false }]);
      expect(host.hasAttribute('data-waiting')).toBe(true);
      vi.advanceTimersByTime(20000);
      expect(shown()).toEqual(['verify']);
      seen([{ isIntersecting: true }]);
      expect(host.hasAttribute('data-waiting')).toBe(false);
      vi.advanceTimersByTime(3999);
      expect(shown()).toEqual(['verify']);
      vi.advanceTimersByTime(1);
      expect(shown()).toEqual(['dispute']);
      vi.unstubAllGlobals();
    });

    it('holds the view while the keyboard is on the panel, too', () => {
      reducedMotion(false);
      mount(autoplay);
      const host = document.querySelector('media-tabs')!;
      host.dispatchEvent(new Event('focusin'));
      vi.advanceTimersByTime(20000);
      expect(shown()).toEqual(['verify']);
      host.dispatchEvent(new Event('focusout'));
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['dispute']);
    });

    it('lets the visitor stop the clip: a click or Space pauses it and ends the rotation; again, and it plays', () => {
      reducedMotion(false);
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
      const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      const host = document.querySelector('media-tabs')!;
      const video = document.querySelector('video')!;
      expect(video.tabIndex).toBe(0);
      // happy-dom has no real playback: the clip counts as playing until it is paused.
      let paused = false;
      Object.defineProperty(video, 'paused', { get: () => paused });
      pause.mockImplementation(() => {
        paused = true;
      });
      play.mockImplementation(async () => {
        paused = false;
      });
      video.click();
      expect(paused).toBe(true);
      expect(host.hasAttribute('data-playing')).toBe(false);
      vi.advanceTimersByTime(30000);
      expect(shown()).toEqual(['verify']);
      expect(paused).toBe(true);
      video.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(paused).toBe(false);
    });

    it('leaves Up and Down to the page: the tabs are a row, so only Left, Right, Home and End move them', () => {
      reducedMotion(false);
      mount(autoplay);
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      tab('verify').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(shown()).toEqual(['verify']);
    });

    it('with reduced motion: a clip the visitor started stops when its view is left', () => {
      reducedMotion(true);
      const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      tab('dispute').click();
      expect(pause.mock.contexts).toContain(document.querySelector('video'));
    });

    it('gives each view its own length when it has one', () => {
      reducedMotion(false);
      mount(autoplay.replace('id="p-verify"', 'id="p-verify" data-duration="12000"'));
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['verify']);
      vi.advanceTimersByTime(5000);
      expect(shown()).toEqual(['dispute']);
      vi.advanceTimersByTime(7000);
      expect(shown()).toEqual(['tab']);
    });

    it('plays only the showing view’s video, from its start, and takes the controls away', () => {
      reducedMotion(false);
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
      const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
      mount(
        autoplay
          .replace('Verify view', '<video controls src="/media/verify.mp4"></video>')
          .replace('Dispute view', '<video controls src="/media/dispute.mp4"></video>'),
      );
      const [verify, dispute] = [...document.querySelectorAll('video')];
      expect(verify!.controls).toBe(false);
      expect(play.mock.contexts).toEqual([verify]);
      dispute!.currentTime = 4;
      vi.advanceTimersByTime(7000);
      expect(play.mock.contexts.at(-1)).toBe(dispute);
      expect(dispute!.currentTime).toBe(0);
      expect(pause.mock.contexts).toContain(verify);
    });

    it('gives a clip its controls back only when the browser refuses to autoplay, not when a start is cut short', async () => {
      reducedMotion(false);
      vi.useRealTimers();
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
      play.mockRejectedValue(new DOMException('interrupted by a call to pause()', 'AbortError'));
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelector('video')!.controls).toBe(false);
      play.mockRejectedValue(new DOMException('play() refused', 'NotAllowedError'));
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelector('video')!.controls).toBe(true);
    });

    it('with reduced motion: nothing plays by itself and the videos keep their controls', () => {
      reducedMotion(true);
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
      mount(autoplay.replace('Verify view', '<video controls src="/media/verify.mp4"></video>'));
      expect(play).not.toHaveBeenCalled();
      expect(document.querySelector('video')!.controls).toBe(true);
    });

    it('does not play with reduced motion', () => {
      reducedMotion(true);
      mount(autoplay);
      expect(document.querySelector('media-tabs')!.hasAttribute('data-playing')).toBe(false);
      vi.advanceTimersByTime(30000);
      expect(shown()).toEqual(['verify']);
    });
  });
});
