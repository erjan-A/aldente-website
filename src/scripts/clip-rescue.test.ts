// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rescueClip } from './clip-rescue';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function clip(): HTMLVideoElement {
  document.body.innerHTML = '<video src="/media/tab.mp4" poster="/poster.webp" muted loop playsinline></video>';
  return document.querySelector('video')!;
}

/** A stand-in for navigator.serviceWorker: `takeOver()` is the moment the worker starts to control the page. */
function workers(controlled = false) {
  const listeners: Array<() => void> = [];
  const fake = {
    controller: controlled ? {} : null,
    register: vi.fn(async () => ({})),
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    takeOver: () => {
      fake.controller = {};
      listeners.forEach((fn) => fn());
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', { value: fake, configurable: true });
  return fake;
}

describe('rescueClip', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    document.body.replaceChildren();
  });

  it('first asks the clip worker: once it controls the page, the same file is loaded again', async () => {
    const video = clip();
    const load = vi.spyOn(video, 'load').mockImplementation(() => {});
    const get = vi.fn();
    vi.stubGlobal('fetch', get);
    const fake = workers();
    const ready = vi.fn();
    rescueClip(video, ready);
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(fake.register).toHaveBeenCalledWith('/clip-sw.js');
    // Nothing happens until the worker is in charge of the page's requests.
    expect(load).not.toHaveBeenCalled();
    fake.takeOver();
    await settle();
    expect(video.getAttribute('src')).toBe('/media/tab.mp4');
    expect(load).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('rescues a clip that had already failed before the script ran', async () => {
    const video = clip();
    // The browser gave up on the file while the page's script was still loading: no error event is left to hear.
    Object.defineProperty(video, 'error', { value: { code: 4 }, configurable: true });
    const load = vi.spyOn(video, 'load').mockImplementation(() => {});
    workers(true);
    const ready = vi.fn();
    rescueClip(video, ready);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('after the worker comes memory, and after memory the still', async () => {
    const video = clip();
    vi.spyOn(video, 'load').mockImplementation(() => {});
    const get = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) }));
    vi.stubGlobal('fetch', get);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clip');
    workers(true);
    const ready = vi.fn();
    rescueClip(video, ready);
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
    video.dispatchEvent(new Event('error'));
    await settle();
    // The file is fetched under its own address, not the one the element holds by then.
    expect(get).toHaveBeenCalledWith(expect.stringContaining('/media/tab.mp4'));
    expect(video.getAttribute('src')).toBe('blob:clip');
    expect(ready).toHaveBeenCalledTimes(2);
    video.dispatchEvent(new Event('error'));
    await settle();
    expect(video.hasAttribute('data-still')).toBe(true);
  });

  it('does not wait for a worker that never takes over: it goes on to memory', async () => {
    vi.useFakeTimers();
    const video = clip();
    vi.spyOn(video, 'load').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) })));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clip');
    workers();
    rescueClip(video, () => {});
    video.dispatchEvent(new Event('error'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(video.getAttribute('src')).toBe('blob:clip');
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
