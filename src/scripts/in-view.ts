import { define } from './define';

/** Adds `data-inview` the first time the element scrolls into view, for CSS-driven reveals. */
export class InView extends HTMLElement {
  private observer: IntersectionObserver | undefined;

  connectedCallback(): void {
    if (!('IntersectionObserver' in window)) {
      this.setAttribute('data-inview', '');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.setAttribute('data-inview', '');
        this.observer?.disconnect();
      },
      { threshold: Number(this.dataset.threshold ?? 0.25) },
    );
    this.observer.observe(this);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }
}

define('in-view', InView);
