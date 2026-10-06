// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './site-nav';
import { mount } from './test-utils';

describe('<site-nav>', () => {
  beforeEach(() => {
    mount(`
      <header>
        <a id="logo" href="/">Home</a>
        <site-nav>
          <button type="button" aria-expanded="false" aria-controls="menu">Menu</button>
          <div id="menu" hidden>
            <div data-menu-panel>
              <p id="label">Product</p>
              <a href="#pricing">Pricing</a>
            </div>
          </div>
        </site-nav>
      </header>
      <main id="page">Page</main>`);
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.removeAttribute('data-menu-open');
  });

  const button = () => document.querySelector('button')!;
  const menu = () => document.getElementById('menu')!;
  const locked = () => document.documentElement.hasAttribute('data-menu-open');

  it('opens and closes the menu, locking the page scroll while open', () => {
    button().click();
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(menu().hidden).toBe(false);
    expect(locked()).toBe(true);
    button().click();
    expect(menu().hidden).toBe(true);
    expect(locked()).toBe(false);
  });

  it('closes on Escape and returns focus to the button', () => {
    button().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu().hidden).toBe(true);
    expect(document.activeElement).toBe(button());
  });

  it('closes after following a link', () => {
    button().click();
    menu().querySelector('a')!.click();
    expect(menu().hidden).toBe(true);
    expect(locked()).toBe(false);
  });

  it('closes on a tap on the backdrop or outside the menu, not on a tap inside the panel', () => {
    button().click();
    document.getElementById('label')!.click();
    expect(menu().hidden).toBe(false);
    menu().click();
    expect(menu().hidden).toBe(true);
    button().click();
    document.getElementById('page')!.click();
    expect(menu().hidden).toBe(true);
  });

  it('closes when focus leaves it', () => {
    button().click();
    const link = menu().querySelector('a')!;
    button().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
    expect(menu().hidden).toBe(false);
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.getElementById('logo') }));
    expect(menu().hidden).toBe(true);
  });

  it('stays open when a tap moves focus nowhere', () => {
    button().click();
    button().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(menu().hidden).toBe(false);
  });
});
