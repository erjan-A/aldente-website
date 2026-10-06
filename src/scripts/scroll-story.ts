import { activeStep } from '../lib/story';
import { define } from './define';

/**
 * Sets `data-step` to the index of the step text under the anchor line, so CSS can
 * drive the sticky visual. The anchor defaults to 55% of the viewport height. When the
 * `[data-story-visual]` sits above the steps (stacked layouts on phones) and covers the top
 * of the screen, the line moves below it, so a step turns current once it can be read.
 * It also publishes where that sticky visual ends (its CSS `top` plus its height) as
 * `--story-cover`, so CSS can stick each step's text right under it.
 */
export class ScrollStory extends HTMLElement {
  private frame = 0;

  connectedCallback(): void {
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    // Web fonts can change the visual's height once loaded.
    window.addEventListener('load', this.onResize, { once: true });
    this.measure();
    this.schedule();
  }

  disconnectedCallback(): void {
    window.removeEventListener('scroll', this.schedule);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('load', this.onResize);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private onResize = (): void => {
    this.measure();
    this.schedule();
  };

  /** Where the sticky visual ends on screen once it is stuck. Layout-dependent, so only on load and resize. */
  private measure(): void {
    const visual = this.querySelector<HTMLElement>('[data-story-visual]');
    if (!visual) return;
    const top = parseFloat(getComputedStyle(visual).top) || 0;
    this.style.setProperty('--story-cover', `${Math.round(top + visual.offsetHeight)}px`);
  }

  private schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  update(): void {
    const steps = [...this.querySelectorAll<HTMLElement>('[data-story-step]')];
    const anchor = Number(this.dataset.anchor ?? 0.55);
    const index = activeStep(
      steps.map((step) => step.getBoundingClientRect()),
      window.innerHeight,
      anchor,
      this.coveredTop(steps[0]?.parentElement),
    );
    this.setAttribute('data-step', String(index));
    steps.forEach((step, i) => {
      if (i === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  /** Bottom edge of the visual when it shares the steps' column (stacked above them), else 0. */
  private coveredTop(list: Element | null | undefined): number {
    const visual = this.querySelector('[data-story-visual]');
    if (!visual || !list) return 0;
    const v = visual.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    const sameColumn = v.left < l.right && v.right > l.left;
    return sameColumn ? Math.max(0, v.bottom) : 0;
  }
}

define('scroll-story', ScrollStory);
