// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './demo-intent';
import { mount } from './test-utils';

const fixture = `
<demo-intent>
  <h1 data-intent="title">See Aldo <span>on your restaurants.</span></h1>
  <p data-intent="lead">30 minutes.</p>
</demo-intent>`;

const visit = (path: string) => window.history.replaceState(null, '', path);
const queue = () => window.plausible!.q!;

describe('<demo-intent>', () => {
  beforeEach(() => {
    queue().length = 0;
  });
  afterEach(() => visit('/'));

  it('matches the heading to the plan the visitor picked', () => {
    visit('/demo?plan=starter');
    mount(fixture);
    // Product names stay on one line (a no-break space inside "Aldente Verify").
    expect(document.querySelector('[data-intent="title"]')!.textContent).toBe('Get Aldo with Aldente\u00a0Verify or Vision.');
    // Two tones, as on every page hero: the ending sits in a <span>.
    expect(document.querySelector('[data-intent="title"] span')!.textContent).toBe('with Aldente\u00a0Verify or Vision.');
    expect(document.querySelector('[data-intent="lead"]')!.textContent).toContain('Aldo comes with both products');
  });

  it('keeps the two-tone heading for every plan', () => {
    visit('/demo?plan=vision');
    mount(fixture);
    expect(document.querySelector('[data-intent="title"]')!.innerHTML).toBe('See Aldente&nbsp;Vision <span>on your cameras.</span>');
  });

  it('keeps the page as written without a plan', () => {
    visit('/demo');
    mount(fixture);
    expect(document.querySelector('[data-intent="title"]')!.innerHTML).toBe('See Aldo <span>on your restaurants.</span>');
  });

  it('counts the visit by plan', () => {
    visit('/demo?plan=vision');
    mount(fixture);
    visit('/demo?plan=rockets');
    mount(fixture);
    expect(queue()).toEqual([
      ['Demo view', { props: { plan: 'vision' } }],
      ['Demo view', { props: { plan: 'general' } }],
    ]);
  });
});
