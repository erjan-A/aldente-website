// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { queued } from './analytics';
import './cost-calculator';
import { mount } from './test-utils';

const fixture = `
<cost-calculator>
  <input name="locations" type="number" value="25" />
  <input name="ordersPerDay" type="number" value="200" />
  <input name="averageCheck" type="number" value="17" />
  <input name="errorRate" type="number" value="7" />
  <output data-out="wrong">350</output>
  <output data-out="refunds">$2.2M</output>
  <output data-out="saved">$1.9M</output>
  <output data-out="perLocation">$76K</output>
</cost-calculator>`;

const out = (name: string) => document.querySelector(`[data-out="${name}"]`)!.textContent;

function type(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('<cost-calculator>', () => {
  beforeEach(() => {
    queued.length = 0;
    window.history.replaceState(null, '', '/');
    mount(fixture);
  });

  it('recomputes the three results as a number changes', () => {
    type('locations', '1');
    expect(out('wrong')).toBe('14');
    expect(out('refunds')).toBe('$87K');
    expect(out('saved')).toBe('$76K');
  });

  it('shows what one location saves, whatever the number of locations', () => {
    type('locations', '120');
    expect(out('saved')).toBe('$9.1M');
    expect(out('perLocation')).toBe('$76K');
  });

  it('puts the number it computed with back in the field when the visitor leaves it', () => {
    const field = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
    type('locations', '99999');
    field('locations').dispatchEvent(new Event('change', { bubbles: true }));
    expect(field('locations').value).toBe('5000');
    type('errorRate', '');
    field('errorRate').dispatchEvent(new Event('change', { bubbles: true }));
    expect(field('errorRate').value).toBe('7');
    type('averageCheck', '-5');
    field('averageCheck').dispatchEvent(new Event('change', { bubbles: true }));
    expect(field('averageCheck').value).toBe('1');
  });

  it('keeps a usable result while a field is empty or out of range', () => {
    type('locations', '');
    expect(out('wrong')).toBe('350');
    type('errorRate', '400');
    expect(out('wrong')).toBe('1,500');
  });

  it('counts the first change only', () => {
    type('locations', '10');
    type('locations', '100');
    expect(queued).toEqual([['Calculator used', { path: '/' }]]);
  });
});
