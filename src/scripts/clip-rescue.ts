/**
 * More chances for a clip that fails to load. Safari (on a Mac and on an iPhone) plays a video only from byte
 * ranges, and some hosts answer a range request with the whole file. Each failure moves the clip one step on:
 *
 * 1. The clip worker (public/clip-sw.js) is turned on. It fetches the file whole and answers the ranges itself,
 *    so the same address now plays. This needs nothing from the host.
 * 2. The file is fetched whole and played from memory. This needs `media-src blob:` in the host's
 *    Content-Security-Policy.
 * 3. The clip becomes its still: the source and the controls go and the poster stays, so the visitor sees the
 *    product picture and never a broken player. The element then carries data-still.
 *
 * `ready` tells the caller, after step 1 or 2, that the clip can be played.
 */
/**
 * True when play() failed because the browser refuses to autoplay (a phone in low-power mode). A start that
 * was only cut short, because the clip left the screen or its view while it was still loading, is not a
 * refusal: the browser reports that one as an AbortError, and the clip simply plays the next time.
 */
export function autoplayRefused(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'NotAllowedError';
}

/** How long a new worker gets to take control of the page before the next step is tried. */
const WORKER_WAIT = 4000;

/** Turns the clip worker on. True once it controls this page's requests. */
async function workerTakesOver(): Promise<boolean> {
  const workers = navigator.serviceWorker;
  if (!workers) return false;
  try {
    await workers.register('/clip-sw.js');
    if (workers.controller) return true;
    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), WORKER_WAIT);
      workers.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(timer);
          resolve(true);
        },
        { once: true },
      );
    });
  } catch {
    return false;
  }
}

export function rescueClip(video: HTMLVideoElement, ready: () => void): void {
  let source = '';
  let step = 0;
  const still = (): void => {
    video.removeAttribute('src');
    video.controls = false;
    video.removeAttribute('tabindex');
    video.setAttribute('data-still', '');
    video.load();
  };
  const fromMemory = async (): Promise<void> => {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(String(response.status));
      video.src = URL.createObjectURL(new Blob([await response.blob()], { type: 'video/mp4' }));
      video.load();
      ready();
    } catch {
      still();
    }
  };
  const onError = (): void => {
    if (video.hasAttribute('data-still')) return;
    step += 1;
    if (step === 1) {
      // The address the page gave the clip: later steps fetch it, whatever the element holds by then.
      source = video.getAttribute('src') ?? video.currentSrc;
      void workerTakesOver().then((on) => {
        if (!on) {
          step = 2;
          return fromMemory();
        }
        video.load();
        ready();
      });
    } else if (step === 2) void fromMemory();
    else still();
  };
  video.addEventListener('error', onError);
  // A clip can fail before this script runs (the hero clip loads with the page): that error is not heard again.
  if (video.error) onError();
}
