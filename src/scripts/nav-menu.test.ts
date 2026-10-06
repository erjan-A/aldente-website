// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOSE_DELAY, OPEN_DELAY } from './nav-menu';
import { mount } from './test-utils';

describe('<nav-menu>', () => {
  beforeEach(() => {
    mount(`
      <nav-menu>
        <ul>
          <li id="product">
            <button type="button" aria-expanded="false" aria-controls="menu-product">Product</button>
            <div id="menu-product"><a href="/aldo">Aldo</a><a href="/order-verification">Aldente Verify</a><a href="/analytics">Aldente Vision</a></div>
          </li>
          <li id="solutions">
            <button type="button" aria-expanded="false" aria-controls="menu-solutions">Solutions</button>
            <div id="menu-solutions"><a href="/solutions/hr">HR</a></div>
          </li>
          <li><a id="pricing" href="/pricing">Pricing</a></li>
        </ul>
      </nav-menu>
      <p id="outside" tabindex="-1">Page</p>`);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  const trigger = (name: 'product' | 'solutions') => document.querySelector<HTMLButtonElement>(`#${name} button`)!;
  const expanded = (name: 'product' | 'solutions') => trigger(name).getAttribute('aria-expanded');
  const key = (target: Element, name: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  const pointer = (name: string, target: Element, pointerType = 'mouse') => target.dispatchEvent(new PointerEvent(name, { pointerType }));

  it('opens and closes a menu on click', () => {
    trigger('product').click();
    expect(expanded('product')).toBe('true');
    trigger('product').click();
    expect(expanded('product')).toBe('false');
  });

  it('keeps one menu open at a time', () => {
    trigger('product').click();
    trigger('solutions').click();
    expect(expanded('product')).toBe('false');
    expect(expanded('solutions')).toBe('true');
  });

  it('closes on a click outside, but not on a click inside its panel', () => {
    trigger('product').click();
    document.getElementById('menu-product')!.click();
    expect(expanded('product')).toBe('true');
    document.getElementById('outside')!.click();
    expect(expanded('product')).toBe('false');
  });

  it('closes after following a link', () => {
    trigger('product').click();
    document.querySelector<HTMLAnchorElement>('#menu-product a')!.click();
    expect(expanded('product')).toBe('false');
  });

  it('closes on Escape and returns focus to the button', () => {
    trigger('product').click();
    const link = document.querySelector<HTMLAnchorElement>('#menu-product a')!;
    link.focus();
    key(link, 'Escape');
    expect(expanded('product')).toBe('false');
    expect(document.activeElement).toBe(trigger('product'));
  });

  it('leaves focus elsewhere on the page where it is when Escape closes a menu', () => {
    trigger('product').click();
    const outside = document.getElementById('outside')!;
    outside.focus();
    key(outside, 'Escape');
    expect(expanded('product')).toBe('false');
    expect(document.activeElement).toBe(outside);
  });

  it('closes when focus leaves the menu, not when it moves into the panel', () => {
    trigger('product').click();
    const link = document.querySelector<HTMLAnchorElement>('#menu-product a')!;
    trigger('product').dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
    expect(expanded('product')).toBe('true');
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.getElementById('pricing') }));
    expect(expanded('product')).toBe('false');
  });

  it('opens at the first link on ArrowDown and moves between links with the arrow keys', () => {
    key(trigger('product'), 'ArrowDown');
    expect(expanded('product')).toBe('true');
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#menu-product a')];
    expect(document.activeElement).toBe(links[0]);
    key(links[0], 'ArrowUp');
    expect(document.activeElement).toBe(links[2]);
    key(links[2], 'Home');
    expect(document.activeElement).toBe(links[0]);
  });

  it('opens on mouse hover after a short delay and closes when the pointer leaves', () => {
    vi.useFakeTimers();
    const group = document.getElementById('product')!;
    pointer('pointerenter', group);
    expect(expanded('product')).toBe('false');
    vi.advanceTimersByTime(OPEN_DELAY);
    expect(expanded('product')).toBe('true');
    pointer('pointerleave', group);
    vi.advanceTimersByTime(CLOSE_DELAY - 1);
    expect(expanded('product')).toBe('true');
    pointer('pointerenter', group);
    vi.advanceTimersByTime(CLOSE_DELAY);
    expect(expanded('product')).toBe('true');
    pointer('pointerleave', group);
    vi.advanceTimersByTime(CLOSE_DELAY);
    expect(expanded('product')).toBe('false');
  });

  it('ignores a pointer that passes through quickly, and touch hovers', () => {
    vi.useFakeTimers();
    const group = document.getElementById('product')!;
    pointer('pointerenter', group);
    pointer('pointerleave', group);
    vi.advanceTimersByTime(OPEN_DELAY * 2);
    expect(expanded('product')).toBe('false');
    pointer('pointerenter', group, 'touch');
    vi.advanceTimersByTime(OPEN_DELAY * 2);
    expect(expanded('product')).toBe('false');
  });

  it('switches straight to the next menu on hover, and a click pins a hovered menu open', () => {
    vi.useFakeTimers();
    pointer('pointerenter', document.getElementById('product')!);
    vi.advanceTimersByTime(OPEN_DELAY);
    pointer('pointerleave', document.getElementById('product')!);
    pointer('pointerenter', document.getElementById('solutions')!);
    expect(expanded('solutions')).toBe('true');
    expect(expanded('product')).toBe('false');
    trigger('solutions').click();
    expect(expanded('solutions')).toBe('true');
    pointer('pointerleave', document.getElementById('solutions')!);
    vi.advanceTimersByTime(CLOSE_DELAY * 2);
    expect(expanded('solutions')).toBe('true');
  });
});
