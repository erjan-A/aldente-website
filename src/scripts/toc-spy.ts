import { activeStep } from '../lib/story';
import { define } from './define';

/**
 * Marks the contents link of the section being read (aria-current="location"), so a long document shows
 * where you are. The current section is the last one whose heading has passed a line `data-anchor` (a
 * fraction of the viewport height, 0.3 by default) from the top. Wraps a list of `a[href^="#"]` links.
 * Inside a `[data-toc-scroll]` row that scrolls sideways (the home contents list on phones), the current
 * link is also brought into view when it changes.
 */
export class TocSpy extends HTMLElement {
  private frame = 0;
  private current = -1;

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
    if (index === this.current) return;
    this.current = index;
    const row = links[index]?.closest<HTMLElement>('[data-toc-scroll]');
    if (row && row.scrollWidth > row.clientWidth) row.scrollTo({ left: links[index]!.offsetLeft - 16, behavior: 'smooth' });
  }
}

define('toc-spy', TocSpy);
