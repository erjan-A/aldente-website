// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import './playbook-explorer';
import { mount } from './test-utils';

const pb = (id: string, team: string, title: string, trigger: string) =>
  JSON.stringify({
    id,
    team,
    title,
    say: `Say ${title}`,
    trigger,
    condition: `If ${title}`,
    action: `Do ${title}`,
    destination: `#${id}`,
    result: `Result ${title}`,
  }).replace(/"/g, '&quot;');

const fixture = `
<playbook-explorer>
  <div role="group">
    <button type="button" data-filter="All" aria-pressed="true">All</button>
    <button type="button" data-filter="HR" aria-pressed="false">HR</button>
    <button type="button" data-filter="Operations" aria-pressed="false">Operations</button>
  </div>
  <ul>
    <li data-team="HR"><button type="button" data-playbook="${pb('clock', 'HR', 'Clock-outs', 'After closing')}" aria-pressed="true">Clock-outs</button></li>
    <li data-team="Operations"><button type="button" data-playbook="${pb('queue', 'Operations', 'Queues', 'A queue forms')}" aria-pressed="false">Queues</button></li>
    <li data-team="Operations"><button type="button" data-playbook="${pb('monday', 'Operations', 'Monday', 'Every Monday')}" aria-pressed="false">Monday</button></li>
  </ul>
  <div data-graph data-run>
    <span data-graph-title>Clock-outs</span>
    <span data-graph-say>Say Clock-outs</span>
    <span data-graph-step="when">After closing</span>
    <span data-graph-step="if">If Clock-outs</span>
    <span data-graph-step="then">Do Clock-outs</span>
    <span data-graph-step="send">#clock</span>
    <span data-graph-result>Result Clock-outs</span>
  </div>
</playbook-explorer>`;

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as unknown as T;
const visibleTeams = () =>
  [...document.querySelectorAll<HTMLLIElement>('li[data-team]')].filter((li) => !li.hidden).map((li) => li.dataset.team);

describe('<playbook-explorer>', () => {
  beforeEach(() => {
    mount(fixture);
  });

  it('filters the list by team', () => {
    q<HTMLButtonElement>('[data-filter="Operations"]').click();
    expect(visibleTeams()).toEqual(['Operations', 'Operations']);
    expect(q('[data-filter="Operations"]').getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-filter="All"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('selects the first visible Playbook when the current one is filtered out', () => {
    q<HTMLButtonElement>('[data-filter="Operations"]').click();
    expect(q('[data-graph-title]').textContent).toBe('Queues');
    expect(q('[data-graph-step="when"]').textContent).toBe('A queue forms');
  });

  it('shows the chosen Playbook in the graph', () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-playbook]');
    buttons[2]!.click();
    expect(q('[data-graph-title]').textContent).toBe('Monday');
    expect(q('[data-graph-say]').textContent).toBe('Say Monday');
    expect(q('[data-graph-step="send"]').textContent).toBe('#monday');
    expect(q('[data-graph-result]').textContent).toBe('Result Monday');
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
  });

  it('restarts the graph animation on every selection', () => {
    document.querySelectorAll<HTMLButtonElement>('[data-playbook]')[1]!.click();
    expect(q('[data-graph]').hasAttribute('data-run')).toBe(true);
  });

  it('shows everything again for All', () => {
    q<HTMLButtonElement>('[data-filter="HR"]').click();
    q<HTMLButtonElement>('[data-filter="All"]').click();
    expect(visibleTeams()).toEqual(['HR', 'Operations', 'Operations']);
  });
});
