// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rescueClip } from './clip-rescue';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function clip(): HTMLVideoElement {
  document.body.innerHTML = '<video src="/media/tab.mp4" poster="/poster.webp" muted loop playsinline></video>';
  return document.querySelector('video')!;
}

describe('rescueClip', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('loads a clip that failed once more, whole, from memory, and says when it is ready', async () => {
    const video = clip();
    const load = vi.spyOn(video, 'load').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) })));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clip');
    const ready = vi.fn();
    rescueClip(video, ready);
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/media/tab.mp4'));
    expect(video.getAttribute('src')).toBe('blob:clip');
    expect(load).toHaveBeenCalled();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('shows the still when the clip cannot be loaded at all: no source, no controls, the poster stays', async () => {
    const video = clip();
    video.controls = true;
    vi.spyOn(video, 'load').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    const ready = vi.fn();
    rescueClip(video, ready);
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.getAttribute('poster')).toBe('/poster.webp');
    expect(video.hasAttribute('data-still')).toBe(true);
    expect(ready).not.toHaveBeenCalled();
  });

  it('tries once: a second failure, from memory too, ends on the still', async () => {
    const video = clip();
    vi.spyOn(video, 'load').mockImplementation(() => {});
    const get = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) }));
    vi.stubGlobal('fetch', get);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clip');
    rescueClip(video, () => {});
    video.dispatchEvent(new Event('error'));
    await settle();
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(get).toHaveBeenCalledTimes(1);
    expect(video.hasAttribute('data-still')).toBe(true);
  });
});
