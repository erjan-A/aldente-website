import { progressFor, revealedAt } from '../lib/beats';
import { define, prefersReducedMotion } from './define';

/**
 * Reveals a stage beat by beat as the visitor scrolls: sets `data-beat` to how many
 * of `data-beats` are showing, for CSS to act on. The first child is the stage. When the
 * page's CSS makes it sticky inside a tall wrapper, the stage is "pinned" and progress
 * follows the scroll through the wrapper; otherwise the stage scrolls with the page.
 * `data-start` and `data-end` set the first and last thresholds (defaults 0.1 and 0.7).
 * Markup ships with every beat showing, so the page reads fully without JavaScript.
 */
export class ScrollBeats extends HTMLElement {
  private frame = 0;

  connectedCallback(): void {
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.schedule, { passive: true });
    this.schedule();
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
    const count = Number(this.dataset.beats ?? 1);
    if (prefersReducedMotion()) {
      this.setAttribute('data-beat', String(count));
      return;
    }
    const stage = this.firstElementChild;
    const pinned = stage !== null && getComputedStyle(stage).position === 'sticky';
    const progress = progressFor(this.getBoundingClientRect(), window.innerHeight, pinned ? 'pinned' : 'flow');
    const start = Number(this.dataset.start ?? 0.1);
    const end = Number(this.dataset.end ?? 0.7);
    this.setAttribute('data-beat', String(revealedAt(progress, count, start, end)));
  }
}

define('scroll-beats', ScrollBeats);
