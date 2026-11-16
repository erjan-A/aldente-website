import { EVENTS } from '../data/analytics';
import { track } from './analytics';
import { rescueClip } from './clip-rescue';
import { define } from './define';

/**
 * The longer product clip in a dialog. Any link marked `data-watch` on the page opens it and starts the video;
 * without this script the link opens the video file itself. Closing (the button, Escape, a click on the
 * backdrop) stops the video. Each opening is counted once as "Video play". When the video ends, focus moves
 * to the next step, the link marked `data-watch-next`. A video that fails to load is rescued like every clip
 * (clip-rescue.ts) and plays once it is ready, if the dialog is still open.
 *
 * Markup: a <dialog> holding a <video controls>, a [data-watch-close] button and a [data-watch-next] link.
 */
export class WatchDialog extends HTMLElement {
  private rescued = false;

  connectedCallback(): void {
    document.addEventListener('click', this.onPageClick);
    this.dialog?.addEventListener('close', this.onClose);
    this.dialog?.addEventListener('click', this.onDialogClick);
    this.video?.addEventListener('ended', this.onEnded);
    const { video } = this;
    if (video && !this.rescued) {
      this.rescued = true;
      rescueClip(video, () => {
        if (this.dialog?.open) void video.play?.()?.catch?.(() => {});
      });
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onPageClick);
    this.dialog?.removeEventListener('close', this.onClose);
    this.dialog?.removeEventListener('click', this.onDialogClick);
    this.video?.removeEventListener('ended', this.onEnded);
  }

  private get dialog(): HTMLDialogElement | null {
    return this.querySelector('dialog');
  }

  private get video(): HTMLVideoElement | null {
    return this.querySelector('video');
  }

  private onPageClick = (event: MouseEvent): void => {
    const opener = (event.target as Element | null)?.closest?.('[data-watch]');
    const { dialog } = this;
    if (!opener || !dialog || dialog.open) return;
    event.preventDefault();
    dialog.showModal();
    void this.video?.play?.()?.catch?.(() => {});
    track(EVENTS.videoPlay, { path: location.pathname });
  };

  /** A click on the dialog itself is a click on its backdrop; the close button is inside it. */
  private onDialogClick = (event: MouseEvent): void => {
    const target = event.target as Element;
    if (target === this.dialog || target.closest('[data-watch-close]')) this.dialog?.close();
  };

  private onEnded = (): void => {
    this.querySelector<HTMLElement>('[data-watch-next]')?.focus();
  };

  private onClose = (): void => {
    const { video } = this;
    if (!video) return;
    video.pause?.();
    video.currentTime = 0;
  };
}

define('watch-dialog', WatchDialog);
