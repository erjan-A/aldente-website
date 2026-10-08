// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './aldo-demo';
import { mount } from './test-utils';

const fixture = `
<aldo-demo>
  <div role="tablist" aria-orientation="vertical">
    <button role="tab" id="t-ask" aria-controls="p-ask" aria-selected="true" tabindex="0" data-channel="ops-leads">Ask</button>
    <button role="tab" id="t-assign" aria-controls="p-assign" aria-selected="false" tabindex="-1" data-channel="hr-ops">Assign</button>
    <button role="tab" id="t-alert" aria-controls="p-alert" aria-selected="false" tabindex="-1" data-channel="district-west">Alert</button>
  </div>
  <a data-channel-link="ops-leads" aria-current="page">ops-leads</a>
  <a data-channel-link="hr-ops">hr-ops</a>
  <a data-channel-link="district-west">district-west</a>
  <span data-slack-channel>ops-leads</span>
  <span data-slack-composer>Message #ops-leads</span>
  <div role="tabpanel" id="p-ask" aria-labelledby="t-ask">ask <button type="button" data-goto="assign">Send this every Monday</button></div>
  <div role="tabpanel" id="p-assign" aria-labelledby="t-assign" hidden>
    assign <button type="button" data-confirm>Confirm</button>
    <p tabindex="-1" data-confirmed-focus>Playbook created</p>
  </div>
  <div role="tabpanel" id="p-alert" aria-labelledby="t-alert" hidden>alert</div>
</aldo-demo>`;

const tab = (id: string) => document.getElementById(id) as HTMLButtonElement;
const panel = (id: string) => document.getElementById(id) as HTMLElement;

describe('<aldo-demo>', () => {
  beforeEach(() => {
    mount(fixture);
  });

  it('switches tab, panel and Slack channel on click', () => {
    tab('t-assign').click();
    expect(tab('t-assign').getAttribute('aria-selected')).toBe('true');
    expect(tab('t-ask').getAttribute('aria-selected')).toBe('false');
    expect(tab('t-assign').tabIndex).toBe(0);
    expect(tab('t-ask').tabIndex).toBe(-1);
    expect(panel('p-assign').hidden).toBe(false);
    expect(panel('p-ask').hidden).toBe(true);
    expect(document.querySelector('[data-slack-channel]')!.textContent).toBe('hr-ops');
    expect(document.querySelector('[data-slack-composer]')!.textContent).toBe('Message #hr-ops');
    expect(document.querySelector('[data-channel-link="hr-ops"]')!.getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('[data-channel-link="ops-leads"]')!.hasAttribute('aria-current')).toBe(false);
  });

  it('follows in-panel buttons to another tab', () => {
    (document.querySelector('[data-goto="assign"]') as HTMLButtonElement).click();
    expect(tab('t-assign').getAttribute('aria-selected')).toBe('true');
    expect(panel('p-assign').hidden).toBe(false);
    expect(document.activeElement).toBe(tab('t-assign'));
  });

  it('locks a Playbook card on Confirm and moves focus to "Playbook created"', () => {
    tab('t-assign').click();
    (document.querySelector('[data-confirm]') as HTMLButtonElement).click();
    expect(panel('p-assign').hasAttribute('data-confirmed')).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-confirmed-focus]'));
    expect(tab('t-assign').getAttribute('aria-selected')).toBe('true');
  });

  it('moves selection with the arrow keys and Home/End', () => {
    tab('t-ask').focus();
    tab('t-ask').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(tab('t-assign').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('t-assign'));

    tab('t-assign').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(tab('t-alert').getAttribute('aria-selected')).toBe('true');

    tab('t-alert').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(tab('t-ask').getAttribute('aria-selected')).toBe('true');
  });
});

describe('<aldo-demo> autoplay', () => {
  let setVisible: (on: boolean) => void = () => {};
  const autoplay = () => mount(fixture.replace('<aldo-demo>', '<aldo-demo data-autoplay="5000">'));
  const selected = () => document.querySelector('[role="tab"][aria-selected="true"]')!.id;
  const demo = () => document.querySelector('aldo-demo')!;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          setVisible = (on) => callback([{ isIntersecting: on } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        observe() {}
        disconnect() {}
      },
    );
    autoplay();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until the demo is on screen', () => {
    vi.advanceTimersByTime(12000);
    expect(selected()).toBe('t-ask');
  });

  it('moves to the next tab every five seconds and loops', () => {
    setVisible(true);
    vi.advanceTimersByTime(4999);
    expect(selected()).toBe('t-ask');
    vi.advanceTimersByTime(1);
    expect(selected()).toBe('t-assign');
    expect(document.querySelector('[data-slack-channel]')!.textContent).toBe('hr-ops');
    vi.advanceTimersByTime(5000);
    expect(selected()).toBe('t-alert');
    vi.advanceTimersByTime(5000);
    expect(selected()).toBe('t-ask');
  });

  it('never takes focus when it advances', () => {
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);
    elsewhere.focus();
    setVisible(true);
    vi.advanceTimersByTime(5000);
    expect(document.activeElement).toBe(elsewhere);
  });

  it('stops for good once the visitor picks a tab', () => {
    setVisible(true);
    tab('t-alert').click();
    vi.advanceTimersByTime(20000);
    expect(selected()).toBe('t-alert');
    expect(demo().hasAttribute('data-autoplay-state')).toBe(false);
  });

  it('pauses under the mouse, then finishes the time that was left', () => {
    setVisible(true);
    vi.advanceTimersByTime(3000);
    demo().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    expect(demo().getAttribute('data-autoplay-state')).toBe('paused');
    vi.advanceTimersByTime(10000);
    expect(selected()).toBe('t-ask');
    demo().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(1999);
    expect(selected()).toBe('t-ask');
    vi.advanceTimersByTime(1);
    expect(selected()).toBe('t-assign');
  });

  it('pauses while scrolled out of view', () => {
    setVisible(true);
    vi.advanceTimersByTime(2000);
    setVisible(false);
    vi.advanceTimersByTime(10000);
    expect(selected()).toBe('t-ask');
  });

  it('stays still for visitors who prefer reduced motion', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
    autoplay();
    vi.advanceTimersByTime(12000);
    expect(selected()).toBe('t-ask');
    expect(demo().hasAttribute('data-autoplay-state')).toBe(false);
  });
});
