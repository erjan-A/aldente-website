import { autoplayRefused, rescueClip } from './clip-rescue';
import { define, prefersReducedMotion } from './define';

/**
 * A silent clip that plays by itself while it is on screen: wraps one <video muted loop playsinline controls>.
 * The script takes the controls away, starts the clip when a good part of it is visible and pauses it when it
 * scrolls away, so nothing plays (or downloads, with preload="none") out of sight.
 *
 * The visitor can stop it: a click on the clip, or Space or Enter while it has focus, pauses and resumes it.
 * A clip the visitor paused stays paused while it is on screen; when it next comes on screen it plays again.
 *
 * Parts beside the clip can follow it: an element inside the host with data-at="2.5" gets the class "is-on"
 * from second 2.5 of the clip, and with data-until="10.5" loses it again at 10.5. While the script follows
 * the clip the host carries data-live, so the styles know to hide what is not on yet.
 *
 * Without this script, with reduced motion, or when the browser refuses to autoplay (a phone in low-power
 * mode), the clip stays as the page ships it: a poster with controls, and the parts in their finished state.
 */
export class LoopVideo extends HTMLElement {
  private observer: IntersectionObserver | undefined;
  private stopped = false;

  connectedCallback(): void {
    const video = this.querySelector('video');
    if (!video || prefersReducedMotion() || typeof IntersectionObserver !== 'function') return;
    video.muted = true;
    video.removeAttribute('controls');
    video.tabIndex = 0;
    const unfollow = this.follow(video);
    let onScreen = false;
    // A clip that failed to load and was fetched again plays if it is still on screen.
    rescueClip(video, () => {
      if (onScreen && !this.stopped) void video.play()?.catch?.(() => {});
    });
    const toggle = () => {
      if (video.hasAttribute('data-still')) return;
      this.stopped = !video.paused;
      if (video.paused) void video.play()?.catch?.(() => {});
      else video.pause();
    };
    video.addEventListener('click', toggle);
    video.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      toggle();
    });
    this.observer = new IntersectionObserver(
      (entries) => {
        // The newest record decides: a batch can hold an older one that says the opposite.
        onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
        if (!onScreen) {
          this.stopped = false;
          return video.pause();
        }
        if (this.stopped || video.hasAttribute('data-still')) return;
        // Autoplay refused: hand the clip back as the page ships it, with its controls. A clip that failed to
        // load is not refused: clip-rescue.ts takes it from there.
        void video.play()?.catch?.((error: unknown) => {
          if (!autoplayRefused(error) || video.error || video.hasAttribute('data-still')) return;
          this.observer?.disconnect();
          video.removeEventListener('click', toggle);
          video.setAttribute('controls', '');
          unfollow();
        });
      },
      { threshold: Number(this.dataset.threshold ?? 0.35) },
    );
    this.observer.observe(this);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  /** Keeps the parts beside the clip in step with it. Returns the way back to the finished state. */
  private follow(video: HTMLVideoElement): () => void {
    const parts = [...this.querySelectorAll<HTMLElement>('[data-at]')].map((el) => ({
      el,
      from: Number(el.dataset.at),
      until: el.dataset.until === undefined ? Infinity : Number(el.dataset.until),
    }));
    if (parts.length === 0) return () => {};
    const sync = () => {
      const now = video.currentTime || 0;
      for (const part of parts) part.el.classList.toggle('is-on', now >= part.from && now < part.until);
    };
    this.dataset.live = '';
    video.addEventListener('timeupdate', sync);
    sync();
    return () => {
      video.removeEventListener('timeupdate', sync);
      delete this.dataset.live;
      for (const part of parts) part.el.classList.remove('is-on');
    };
  }
}

define('loop-video', LoopVideo);
