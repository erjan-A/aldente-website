import { EVENTS } from '../data/analytics';
import { pagePath } from '../lib/paths';
import { PROMO_SEEN_KEY, promoActive } from '../lib/promo';
import { track } from './analytics';
import { define } from './define';

/** How long the picture may take to arrive before the popup opens without waiting for it. */
const ART_WAIT = 2500;

/**
 * A popup that greets the visitor for a few days and then stops by itself (PROMO in src/data/promo.ts).
 * The site is static, so the visitor's own clock decides: inside the window (`data-from`, `data-until`) the
 * dialog opens a moment after the page does (`data-delay`, ms); outside it nothing happens, with no deploy.
 *
 * It shows once per visit: the visit remembers the promo's `data-id` in session storage, so the next page
 * stays clear and a new visit sees it again. It never opens on the pages listed in `data-skip` (the booking
 * page), over another open dialog, or where the browser gives no storage to remember the visit in.
 * Closing: its button, Escape, a click on the backdrop. Counted: each showing, and each click through.
 * It opens with focus on the dialog itself: a screen reader hears its name, and no control is ringed or
 * armed for a stray Enter. Tab then reaches Close, then the action.
 *
 * Markup: a <dialog tabindex="-1"> holding a [data-promo-close] button and links marked [data-promo-play].
 */
export class PromoPopup extends HTMLElement {
  private timer: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    this.dialog?.addEventListener('click', this.onDialogClick);
    if (!this.due()) return;
    this.timer = setTimeout(() => void this.open(), Number(this.dataset.delay ?? 0));
  }

  disconnectedCallback(): void {
    clearTimeout(this.timer);
    this.dialog?.removeEventListener('click', this.onDialogClick);
  }

  private get dialog(): HTMLDialogElement | null {
    return this.querySelector('dialog');
  }

  /** Inside the promo's days, on a page it may cover, in a visit that has not seen it. */
  private due(): boolean {
    const { id, from, until, skip = '' } = this.dataset;
    if (!id || !from || !until || !promoActive({ from, until }, Date.now())) return false;
    if (skip.split(/\s+/).includes(pagePath(location.pathname))) return false;
    try {
      return sessionStorage.getItem(PROMO_SEEN_KEY) !== id;
    } catch {
      return false;
    }
  }

  private async open(): Promise<void> {
    const { dialog } = this;
    if (!dialog || dialog.open || document.querySelector('dialog[open]')) return;
    try {
      sessionStorage.setItem(PROMO_SEEN_KEY, this.dataset.id!);
    } catch {
      return;
    }
    await this.art();
    if (!this.isConnected || dialog.open || document.querySelector('dialog[open]')) return;
    dialog.showModal();
    dialog.focus();
    track(EVENTS.gameBannerView, { path: location.pathname });
  }

  /** The picture is fetched only now, and the popup waits for it: it never opens as an empty frame. */
  private art(): Promise<unknown> {
    const img = this.querySelector('img');
    if (!img || typeof img.decode !== 'function') return Promise.resolve();
    img.loading = 'eager';
    return Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, ART_WAIT))]);
  }

  /** A click on the dialog itself is a click on its backdrop; the close button and the links are inside it. */
  private onDialogClick = (event: MouseEvent): void => {
    const target = event.target as Element;
    if (target.closest('[data-promo-play]')) track(EVENTS.gameBanner, { path: location.pathname });
    else if (target === this.dialog || target.closest('[data-promo-close]')) this.dialog?.close();
  };
}

define('promo-popup', PromoPopup);
