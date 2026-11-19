import type { CalendlyEmbed } from './calendly-embed';
import { define } from './define';

/**
 * The sticky booking button and the calendar it opens. The button is a link to the booking page; with this
 * script a plain click on it (or on any link marked `data-book`) opens Calendly's calendar in a dialog over
 * the page instead, and the scheduler loads only then: Calendly hears nothing of a visitor who never asks.
 * A click that asks for a new tab or window (Cmd, Ctrl, Shift, the middle button) keeps the link.
 *
 * The calendar stays loaded while the page is open, so closing and opening again keeps the visitor's place.
 * Closing: its button, Escape, a click on the backdrop; the keyboard goes back to the button that opened it.
 *
 * The button steps aside at the end of the page: from the first part listed in `data-yield` (a selector
 * list: the closing booking band, else the footer) to the bottom, the host has `data-away`, and the styles
 * fade the button out. Clicks are counted by analytics.ts as "CTA click" under the host's `data-section`.
 *
 * Markup: a link marked [data-book]; a <dialog tabindex="-1"> holding a <calendly-embed data-lazy> (its
 * script comes with Scheduler.astro) and a [data-book-close] button.
 */
export class BookDemo extends HTMLElement {
  private watcher: IntersectionObserver | undefined;

  connectedCallback(): void {
    document.addEventListener('click', this.onClick);
    // The end of the page starts where its first listed part does, and runs to the bottom.
    const end = document.querySelector(String(this.dataset.yield));
    if (!end) return;
    this.watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) this.toggleAttribute('data-away', entry.isIntersecting || entry.boundingClientRect.top < 0);
    });
    this.watcher.observe(end);
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onClick);
    this.watcher?.disconnect();
  }

  private onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    const dialog = this.querySelector('dialog');
    if (!dialog || !target?.closest) return;
    if (dialog.open) {
      // A click on the dialog itself is a click on its backdrop; the close button is inside it.
      if (target === dialog || target.closest('[data-book-close]')) dialog.close();
      return;
    }
    const opener = target.closest<HTMLElement>('[data-book]');
    // The visitor asked for a new tab or window, or the browser has no modal dialogs: the link does its work.
    if (!opener || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    event.preventDefault();
    // The browser returns the keyboard to what had focus when the dialog opened; Safari does not focus a link on a click.
    opener.focus();
    dialog.showModal();
    // Focus rests on the dialog: a screen reader hears its name, and no control is ringed.
    dialog.focus();
    this.querySelector<CalendlyEmbed>('calendly-embed')?.load?.();
  };
}

define('book-demo', BookDemo);
