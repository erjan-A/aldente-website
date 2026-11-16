import { nextTabIndex } from '../lib/tabs';
import { track } from './analytics';
import { rescueClip } from './clip-rescue';
import { define } from './define';

/**
 * Tabs that swap the view inside one media panel (the home hero: Verify, Dispute, Tab).
 * Markup: a [role="tablist"] of [role="tab"] buttons, each naming its [role="tabpanel"] with aria-controls.
 * The first view is in the HTML, so the panel works before this runs. Arrow keys, Home and End move between
 * tabs. With data-track, a view the visitor picks is counted under that event name.
 *
 * With data-autoplay (ms per view; a view's own data-duration wins) the views play one after another while the
 * panel is on screen, and the host carries data-playing (the tabs draw their progress with it). While the
 * pointer or the keyboard is on the panel the same view plays again instead of the next one. Off screen the
 * clip, the progress and the timer all hold (data-waiting) and carry on from the same moment. It stops for
 * good once the visitor picks a view, and never starts with reduced motion.
 *
 * A <video> inside a view plays only while its view shows and the panel is on screen, from its start each
 * time. The videos ship with `controls`, so they work without this script and with reduced motion; when the
 * script takes over the playing, it removes the controls. The visitor can still stop a clip: a click on it,
 * or Space or Enter while it has focus, pauses it and ends the rotation; the same again plays it.
 */
export class MediaTabs extends HTMLElement {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private motion = true;
  private observer: IntersectionObserver | undefined;
  private visible = true;
  private held = false;
  /** The visitor paused the clip: it stays paused until they play it or pick a view. */
  private paused = false;
  /** When the running timer started, and how much of the current view was left then. */
  private startedAt = 0;
  private remaining: number | undefined;

  connectedCallback(): void {
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    this.motion = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!this.motion) return;
    for (const video of this.querySelectorAll('video')) {
      video.controls = false;
      video.tabIndex = 0;
      video.addEventListener('click', () => this.toggle(video));
      video.addEventListener('keydown', (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        this.toggle(video);
      });
      rescueClip(video, () => this.playVideos());
    }
    if (!this.interval) {
      this.playVideos();
      return;
    }
    this.addEventListener('pointerenter', this.hold);
    this.addEventListener('pointerleave', this.release);
    this.addEventListener('focusin', this.hold);
    this.addEventListener('focusout', this.release);
    if (typeof IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver((entries) => {
        // The newest record decides: a batch can hold an older one that says the opposite.
        this.visible = entries[entries.length - 1]?.isIntersecting ?? false;
        this.playVideos();
        this.sync();
      });
      this.observer.observe(this);
    }
    this.setAttribute('data-playing', '');
    this.playVideos();
    this.sync();
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);
    this.observer?.disconnect();
    this.stop();
  }

  private get interval(): number {
    return Number(this.dataset.autoplay ?? 0);
  }

  private get tabs(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  }

  private get selected(): number {
    return this.tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  }

  /** Shows a view. `picked`: the visitor chose it (counted, and it ends autoplay). */
  select(index: number, { focus = false, picked = true } = {}): void {
    const { tabs } = this;
    const next = tabs[index];
    if (!next) return;
    const changed = next.getAttribute('aria-selected') !== 'true';
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !on;
    });
    if (focus) next.focus();
    this.paused = false;
    this.playVideos(true);
    this.remaining = undefined;
    if (!picked) {
      // The same view again: the tab's progress starts over with the clip.
      if (!changed && this.hasAttribute('data-playing')) {
        this.removeAttribute('data-playing');
        void this.offsetWidth;
        this.setAttribute('data-playing', '');
      }
      this.sync();
      return;
    }
    this.stop();
    if (changed && this.dataset.track) track(this.dataset.track, { view: next.textContent?.trim() ?? '' });
  }

  /** The current view's panel. */
  private get panel(): HTMLElement | null {
    return document.getElementById(this.tabs[this.selected]?.getAttribute('aria-controls') ?? '');
  }

  /** Plays the current view's video (from its start when the view just opened) and pauses the others. */
  private playVideos(restart = false): void {
    const current = this.panel;
    for (const video of this.querySelectorAll('video')) {
      const showing = current?.contains(video) ?? false;
      // Reduced motion: nothing starts by itself, but a clip the visitor started stops with its view.
      if (!this.motion) {
        if (!showing) video.pause?.();
        continue;
      }
      if (showing && this.visible && !this.paused && !video.hasAttribute('data-still')) {
        if (restart) video.currentTime = 0;
        // Autoplay refused (a phone in low-power mode): the clip gets its controls back. A clip that failed
        // to load is not refused: clip-rescue.ts takes it from there.
        void video.play?.()?.catch?.(() => {
          if (!video.error && !video.hasAttribute('data-still')) video.controls = true;
        });
      } else {
        video.pause?.();
      }
    }
  }

  /**
   * Runs the timer only while playing and on screen. It lasts as long as the current view; stopped part-way
   * (the panel left the screen), it keeps the time left, as the paused clip and the tab's progress do.
   */
  private sync(): void {
    if (this.timer !== undefined && this.remaining !== undefined) {
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    const playing = this.hasAttribute('data-playing');
    this.toggleAttribute('data-waiting', playing && !this.visible);
    if (!playing || !this.visible) return;
    this.remaining ??= Number(this.panel?.dataset.duration ?? 0) || this.interval;
    this.startedAt = Date.now();
    this.timer = setTimeout(this.advance, this.remaining);
  }

  /** The view ran its length: the next one, or the same one again while the visitor is on the panel. */
  private advance = (): void => {
    this.timer = undefined;
    const next = this.held ? this.selected : (this.selected + 1) % this.tabs.length;
    this.select(next, { picked: false });
  };

  /** Ends the autoplay. The videos still pause off screen, so the observer stays. */
  private stop(): void {
    this.removeAttribute('data-playing');
    this.sync();
  }

  /** The visitor's own pause and play. Pausing also ends the rotation, so the view stays. */
  private toggle(video: HTMLVideoElement): void {
    if (video.hasAttribute('data-still')) return;
    if (video.paused) {
      this.paused = false;
      void video.play?.()?.catch?.(() => {});
      return;
    }
    this.paused = true;
    video.pause?.();
    this.stop();
  }

  private hold = (): void => {
    this.held = true;
  };

  private release = (): void => {
    this.held = false;
  };

  private onClick = (event: Event): void => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (tab) this.select(this.tabs.indexOf(tab));
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (!tab) return;
    const index = nextTabIndex(this.tabs.indexOf(tab), event.key, this.tabs.length, 'row');
    if (index === null) return;
    event.preventDefault();
    this.select(index, { focus: true });
  };
}

define('media-tabs', MediaTabs);
