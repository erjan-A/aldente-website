import { nextTabIndex } from '../lib/tabs';
import { define } from './define';

/** Hover intent: a pointer must rest this long before a menu opens, and may stray this long before it closes. */
export const OPEN_DELAY = 120;
export const CLOSE_DELAY = 200;

const TRIGGER = 'button[aria-controls]';

/**
 * Header dropdowns, following the disclosure pattern. Each `button[aria-controls]` shows the panel it names;
 * CSS shows a panel while its button has aria-expanded="true", so the markup never changes size.
 * One menu is open at a time. A click toggles it; a mouse resting on it opens it after OPEN_DELAY and
 * leaving closes it again, unless a click pinned it open. Escape (focus returns to the button), a click
 * outside, following a link and focus leaving the menu all close it. ArrowDown on a button opens its menu
 * at the first link; the arrow keys, Home and End move between the links.
 */
export class NavMenu extends HTMLElement {
  private current: HTMLButtonElement | null = null;
  /** Opened by a click or a key, so the pointer leaving does not close it. */
  private pinned = false;
  private timer = 0;
  private groups: HTMLElement[] = [];

  connectedCallback(): void {
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    this.addEventListener('focusout', this.onFocusOut);
    this.groups = [...this.querySelectorAll<HTMLButtonElement>(TRIGGER)].map((trigger) => this.groupOf(trigger));
    for (const group of this.groups) {
      group.addEventListener('pointerenter', this.onPointerEnter);
      group.addEventListener('pointerleave', this.onPointerLeave);
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);
    this.removeEventListener('focusout', this.onFocusOut);
    for (const group of this.groups) {
      group.removeEventListener('pointerenter', this.onPointerEnter);
      group.removeEventListener('pointerleave', this.onPointerLeave);
    }
    this.setOpen(null);
  }

  /** The element holding a button and its panel: hovering anywhere in it keeps the menu open. */
  private groupOf(trigger: HTMLButtonElement): HTMLElement {
    return trigger.parentElement ?? trigger;
  }

  private links(trigger: HTMLButtonElement): HTMLAnchorElement[] {
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    return panel ? [...panel.querySelectorAll<HTMLAnchorElement>('a[href]')] : [];
  }

  private setOpen(trigger: HTMLButtonElement | null, pinned = true): void {
    window.clearTimeout(this.timer);
    if (this.current && this.current !== trigger) this.current.setAttribute('aria-expanded', 'false');
    this.current = trigger;
    this.pinned = pinned;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', this.onDocumentClick);
      document.addEventListener('keydown', this.onDocumentKeydown);
    } else {
      document.removeEventListener('click', this.onDocumentClick);
      document.removeEventListener('keydown', this.onDocumentKeydown);
    }
  }

  private onClick = (event: Event): void => {
    const target = event.target as Element;
    const trigger = target.closest<HTMLButtonElement>(TRIGGER);
    if (trigger && this.contains(trigger)) {
      // A click on a menu the pointer just opened keeps it open (and pins it).
      if (trigger === this.current && !this.pinned) this.setOpen(trigger);
      else this.setOpen(trigger === this.current ? null : trigger);
    } else if (target.closest('a')) {
      this.setOpen(null);
    }
  };

  private onDocumentClick = (event: Event): void => {
    if (this.current && !this.groupOf(this.current).contains(event.target as Node)) this.setOpen(null);
  };

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.current) return;
    const trigger = this.current;
    const active = document.activeElement;
    this.setOpen(null);
    // Focus goes back to the button when it was in the menu (or nowhere), never away from the rest of the page.
    if (!active || active === document.body || this.groupOf(trigger).contains(active)) trigger.focus();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const target = event.target as Element;
    const trigger = target.closest<HTMLButtonElement>(TRIGGER);
    if (trigger && event.key === 'ArrowDown') {
      event.preventDefault();
      this.setOpen(trigger);
      this.links(trigger)[0]?.focus();
      return;
    }
    if (!this.current || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const links = this.links(this.current);
    const index = links.indexOf(target as HTMLAnchorElement);
    if (index < 0) return;
    const next = nextTabIndex(index, event.key, links.length);
    if (next === null) return;
    event.preventDefault();
    links[next]?.focus();
  };

  private onFocusOut = (event: FocusEvent): void => {
    // A null relatedTarget is a click on something that takes no focus; the document click handles that.
    const next = event.relatedTarget;
    if (this.current && next instanceof Node && !this.groupOf(this.current).contains(next)) this.setOpen(null);
  };

  private onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    const trigger = (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(TRIGGER);
    window.clearTimeout(this.timer);
    if (!trigger || trigger === this.current) return;
    // Moving from one open menu to the next switches at once; a first open waits for intent.
    if (this.current) this.setOpen(trigger, false);
    else this.timer = window.setTimeout(() => this.setOpen(trigger, false), OPEN_DELAY);
  };

  private onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(this.timer);
    if (this.current && !this.pinned) this.timer = window.setTimeout(() => this.setOpen(null), CLOSE_DELAY);
  };
}

define('nav-menu', NavMenu);
