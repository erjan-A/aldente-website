// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queued } from './analytics';
import './watch-dialog';
import { mount } from './test-utils';

const fixture = `
<a id="open" href="#watch" data-watch>Watch it <b>work</b></a>
<watch-dialog>
  <dialog aria-label="Aldente in one minute">
    <button type="button" data-watch-close>Close</button>
    <video controls src="/media/watch.mp4"></video>
    <a id="book" href="/demo" data-watch-next>Book a live demo</a>
  </dialog>
</watch-dialog>`;

const dialog = () => document.querySelector('dialog')!;
const video = () => document.querySelector('video')!;

describe('<watch-dialog>', () => {
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queued.length = 0;
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    window.history.replaceState(null, '', '/');
    mount(fixture);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('opens from any marked link, plays the clip and counts the play once', () => {
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('#open b')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(queued).toEqual([['Video play', { path: '/' }]]);
  });

  it('stops and rewinds the clip when it closes, from its button or its backdrop', () => {
    document.getElementById('open')!.click();
    video().currentTime = 12;
    document.querySelector<HTMLElement>('[data-watch-close]')!.click();
    expect(dialog().open).toBe(false);
    expect(pause).toHaveBeenCalled();
    expect(video().currentTime).toBe(0);

    document.getElementById('open')!.click();
    dialog().click();
    expect(dialog().open).toBe(false);
  });

  it('hands the visitor the booking when the video ends', () => {
    document.getElementById('open')!.click();
    video().dispatchEvent(new Event('ended'));
    expect(document.activeElement).toBe(document.getElementById('book'));
  });

  it('leaves other links alone', () => {
    mount(`<a id="other" href="#products">Products</a>${fixture}`);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('other')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(dialog().open).toBe(false);
  });
});
