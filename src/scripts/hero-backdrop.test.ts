// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from './test-utils';

const calls: { host: HTMLElement; still: boolean }[] = [];
const disposed: number[] = [];
let fail = false;

vi.mock('./hero-ember', () => ({
  mountEmber: (host: HTMLElement, options: { still: boolean }) => {
    if (fail) throw new Error('no webgl');
    calls.push({ host, still: options.still });
    return () => disposed.push(calls.length);
  },
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const backdrop = () => document.querySelector<HTMLElement>('hero-backdrop')!;
const fixture = '<section class="hero"><hero-backdrop aria-hidden="true"></hero-backdrop></section>';

describe('<hero-backdrop>', () => {
  beforeEach(async () => {
    calls.length = 0;
    disposed.length = 0;
    fail = false;
    await import('./hero-backdrop');
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('draws the ember glow into its own layer once the page has loaded', async () => {
    mount(fixture);
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.host.classList.contains('hb__layer')).toBe(true);
    expect(calls[0]!.host.parentElement).toBe(backdrop());
    expect(calls[0]!.still).toBe(false);
  });

  it('asks for one still frame when the visitor prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    mount(fixture);
    await settle();
    expect(calls[0]!.still).toBe(true);
  });

  it('leaves the hero on its plain ground when the glow cannot start', async () => {
    fail = true;
    mount(fixture);
    await settle();
    expect(backdrop().children).toHaveLength(0);
  });

  it('stops the glow and removes its layer when the element leaves the page', async () => {
    mount(fixture);
    await settle();
    const element = backdrop();
    element.remove();
    expect(disposed).toHaveLength(1);
    expect(element.children).toHaveLength(0);
  });
});
