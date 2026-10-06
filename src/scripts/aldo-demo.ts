import { nextTabIndex } from '../lib/tabs';
import { define, prefersReducedMotion } from './define';

/**
 * Tabbed walkthrough of Aldo in Slack. Each tab carries `data-channel`; selecting it
 * shows its panel and moves the Slack window to that channel.
 *
 * With `data-autoplay="5000"` it steps to the next tab every 5 seconds and loops, while
 * on screen. It pauses under the mouse or keyboard focus, stops for good once the visitor
 * picks a tab, never moves focus, and stays still for reduced motion. `data-autoplay-state`
 * (playing | paused) drives the progress bar on the active tab.
 */
export class AldoDemo extends HTMLElement {
  private timer: number | undefined;
  private remaining = 0;
  private startedAt = 0;
  private stopped = false;
  private holds = new Set<string>();
  private observer: IntersectionObserver | undefined;

  connectedCallback(): void {
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    this.startAutoplay();
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);
    this.removeEventListener('pointerenter', this.onPointerEnter);
    this.removeEventListener('pointerleave', this.onPointerLeave);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
  }

  private get interval(): number {
    return Number(this.dataset.autoplay) || 0;
  }

  private startAutoplay(): void {
    if (!this.interval || prefersReducedMotion()) return;
    this.style.setProperty('--autoplay', `${this.interval}ms`);
    this.remaining = this.interval;
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    if (typeof IntersectionObserver === 'function') {
      // Off screen until the observer says otherwise.
      this.hold('offscreen');
      // On screen = overlapping the middle band of the viewport, which works however tall the demo is (phones).
      this.observer = new IntersectionObserver(
        (entries) => (entries.some((entry) => entry.isIntersecting) ? this.release('offscreen') : this.hold('offscreen')),
        { rootMargin: '-30% 0px -30% 0px' },
      );
      this.observer.observe(this);
    } else {
      this.play();
    }
  }

  private play(): void {
    if (this.stopped || this.holds.size) return;
    this.setAttribute('data-autoplay-state', 'playing');
    if (this.timer !== undefined) return;
    this.startedAt = Date.now();
    this.timer = window.setTimeout(this.advance, this.remaining);
  }

  private hold(reason: string): void {
    if (this.stopped) return;
    if (!this.holds.size && this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
    }
    this.holds.add(reason);
    this.setAttribute('data-autoplay-state', 'paused');
  }

  private release(reason: string): void {
    if (this.holds.delete(reason)) this.play();
  }

  private stop(): void {
    this.stopped = true;
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.removeAttribute('data-autoplay-state');
  }

  private advance = (): void => {
    this.timer = undefined;
    const tabs = this.tabs;
    const current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    this.select((current + 1) % tabs.length);
    this.reveal(tabs[(current + 1) % tabs.length]);
    this.remaining = this.interval;
    this.play();
  };

  /** Keep the chosen tab visible when the tab bar scrolls sideways (phones), without moving the page. */
  private reveal(tab: HTMLElement | undefined): void {
    const bar = tab?.parentElement;
    if (!tab || !bar || bar.scrollWidth <= bar.clientWidth || typeof bar.scrollTo !== 'function') return;
    bar.scrollTo({ left: tab.offsetLeft - 8, behavior: 'smooth' });
  }

  private onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') this.hold('hover');
  };

  private onPointerLeave = (): void => this.release('hover');

  private onFocusIn = (): void => this.hold('focus');

  private onFocusOut = (event: FocusEvent): void => {
    if (!this.contains(event.relatedTarget as Node | null)) this.release('focus');
  };

  private get tabs(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  }

  private onClick = (event: Event): void => {
    const target = event.target as Element;
    // Buttons inside a panel can move the story on, e.g. "Send this every Monday" → Assign.
    const goto = target.closest<HTMLElement>('[data-goto]')?.dataset.goto;
    if (goto) {
      this.stop();
      const index = this.tabs.findIndex((t) => t.id.endsWith(`-${goto}`));
      if (index >= 0) {
        this.select(index);
        this.tabs[index]!.focus();
      }
      return;
    }
    const tab = target.closest<HTMLButtonElement>('[role="tab"]');
    if (!tab) return;
    this.stop();
    this.select(this.tabs.indexOf(tab));
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const tabs = this.tabs;
    const current = tabs.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    const next = nextTabIndex(current, event.key, tabs.length);
    if (next === null) return;
    event.preventDefault();
    this.stop();
    this.select(next);
    tabs[next]!.focus();
  };

  select(index: number): void {
    const tabs = this.tabs;
    const chosen = tabs[index];
    if (!chosen) return;

    for (const tab of tabs) {
      const selected = tab === chosen;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !selected;
    }

    const channel = chosen.dataset.channel;
    if (!channel) return;
    this.querySelectorAll('[data-slack-channel]').forEach((el) => (el.textContent = channel));
    this.querySelectorAll('[data-slack-composer]').forEach((el) => (el.textContent = `Message #${channel}`));
    this.querySelectorAll<HTMLElement>('[data-channel-link]').forEach((link) => {
      if (link.dataset.channelLink === channel) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}

define('aldo-demo', AldoDemo);
