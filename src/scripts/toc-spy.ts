import { activeStep } from '../lib/story';
import { define } from './define';

/**
 * Marks the contents link of the section being read (aria-current="location"), so a long document shows
 * where you are. The current section is the last one whose heading has passed a line `data-anchor` (a
 * fraction of the viewport height, 0.3 by default) from the top. Wraps a list of `a[href^="#"]` links.
 */
export class TocSpy extends HTMLElement {
  private frame = 0;

  connectedCallback(): void {
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.schedule, { passive: true });
    this.update();
  }

  disconnectedCallback(): void {
    window.removeEventListener('scroll', this.schedule);
    window.removeEventListener('resize', this.schedule);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  update(): void {
    const links = [...this.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const targets = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
    if (targets.some((target) => !target)) return;
    const index = activeStep(
      targets.map((target) => target!.getBoundingClientRect()),
      window.innerHeight,
      Number(this.dataset.anchor ?? 0.3),
    );
    links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
}

define('toc-spy', TocSpy);
