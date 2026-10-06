import { define } from './define';

/**
 * Mobile menu: a disclosure button that controls the menu it names (aria-controls). While open it sets
 * `data-menu-open` on <html> (CSS locks the page scroll with it). Escape (focus returns to the button),
 * following a link, a tap outside the menu's `[data-menu-panel]` (the backdrop, or the bar around the button)
 * and focus leaving the element all close it.
 */
export class SiteNav extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener('click', this.onClick);
    this.addEventListener('focusout', this.onFocusOut);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('focusout', this.onFocusOut);
    if (this.isOpen) this.setOpen(false);
  }

  private get button(): HTMLButtonElement | null {
    return this.querySelector('button[aria-controls]');
  }

  private get menu(): HTMLElement | null {
    return document.getElementById(this.button?.getAttribute('aria-controls') ?? '');
  }

  /** The part of the menu that holds the links; a tap anywhere else closes it. Defaults to the whole menu. */
  private get panel(): HTMLElement | null {
    return this.menu?.querySelector<HTMLElement>('[data-menu-panel]') ?? this.menu;
  }

  private get isOpen(): boolean {
    return this.button?.getAttribute('aria-expanded') === 'true';
  }

  private setOpen(open: boolean): void {
    const { button, menu } = this;
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.documentElement.toggleAttribute('data-menu-open', open);
    if (open) {
      document.addEventListener('keydown', this.onKeydown);
      document.addEventListener('click', this.onDocumentClick);
    } else {
      document.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('click', this.onDocumentClick);
    }
  }

  private onClick = (event: Event): void => {
    const target = event.target as Element;
    if (target.closest('button[aria-controls]')) {
      this.setOpen(!this.isOpen);
    } else if (target.closest('a')) {
      this.setOpen(false);
    }
  };

  private onDocumentClick = (event: Event): void => {
    const target = event.target as Node;
    if (this.panel?.contains(target) || this.button?.contains(target)) return;
    this.setOpen(false);
  };

  private onFocusOut = (event: FocusEvent): void => {
    // A null relatedTarget is a tap on something that takes no focus; the document click handles taps.
    const next = event.relatedTarget;
    if (this.isOpen && next instanceof Node && !this.contains(next) && !this.menu?.contains(next)) this.setOpen(false);
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    this.setOpen(false);
    this.button?.focus();
  };
}

define('site-nav', SiteNav);
