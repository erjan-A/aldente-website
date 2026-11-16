import { EVENTS } from '../data/analytics';
import { formatCount, formatMoney, readCostInput, wrongOrderCost, type CostInput } from '../lib/cost';
import { track } from './analytics';
import { define } from './define';

/**
 * The home page's calculator: what wrong orders cost, from four numbers the visitor can change.
 * Markup: number inputs named after CostInput's fields and outputs marked
 * data-out="wrong | refunds | saved | perLocation". The page ships the example's result, so the section reads
 * without this script. A number outside a field's range (or an empty field) is computed with the nearest valid
 * value, and that value is written back when the visitor leaves the field, so the result always matches what
 * the fields show. The first change is counted once as "Calculator used".
 */
export class CostCalculator extends HTMLElement {
  private used = false;

  connectedCallback(): void {
    this.addEventListener('input', this.onInput);
    this.addEventListener('change', this.onChange);
  }

  disconnectedCallback(): void {
    this.removeEventListener('input', this.onInput);
    this.removeEventListener('change', this.onChange);
  }

  private read(): CostInput {
    const value = (name: keyof CostInput) => this.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    return readCostInput({
      locations: value('locations'),
      ordersPerDay: value('ordersPerDay'),
      averageCheck: value('averageCheck'),
      errorRate: value('errorRate'),
    });
  }

  private onInput = (): void => {
    const result = wrongOrderCost(this.read());
    this.out('wrong', formatCount(result.wrongPerDay));
    this.out('refunds', formatMoney(result.refundsPerYear));
    this.out('saved', formatMoney(result.savedPerYear));
    this.out('perLocation', formatMoney(result.savedPerLocation));
    if (this.used) return;
    this.used = true;
    track(EVENTS.calculator, { path: location.pathname });
  };

  /** Leaving a field: show the number the result was computed with. */
  private onChange = (event: Event): void => {
    const field = event.target as HTMLInputElement | null;
    const name = field?.name as keyof CostInput | undefined;
    if (!field || !name) return;
    const valid = this.read()[name];
    if (valid !== undefined && field.value !== String(valid)) field.value = String(valid);
  };

  private out(name: string, text: string): void {
    const el = this.querySelector(`[data-out="${name}"]`);
    if (el) el.textContent = text;
  }
}

define('cost-calculator', CostCalculator);
