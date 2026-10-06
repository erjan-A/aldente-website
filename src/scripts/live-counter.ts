import { parseStats, tickInterval, valueAt, type CounterModel } from '../lib/counter';
import { formatNumber } from '../lib/format';
import { define, prefersReducedMotion } from './define';

/**
 * Running total of verified orders. Starts from the modelled base in its data
 * attributes; when `data-endpoint` is set, rebases on the live figure it returns.
 */
export class LiveCounter extends HTMLElement {
  private timer: number | undefined;
  private model: CounterModel = { base: 0, baseTime: 0, perDay: 0 };

  connectedCallback(): void {
    this.model = {
      base: Number(this.dataset.base ?? 0),
      baseTime: Date.parse(this.dataset.baseTime ?? '') || Date.now(),
      perDay: Number(this.dataset.perDay ?? 0),
    };
    this.render();
    if (!prefersReducedMotion()) {
      this.timer = window.setInterval(() => this.render(), tickInterval(this.model));
    }
    const endpoint = this.dataset.endpoint;
    if (endpoint) void this.sync(endpoint);
  }

  disconnectedCallback(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private async sync(endpoint: string): Promise<void> {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const stats = parseStats(await response.json());
      if (!stats) return;
      this.model = { ...this.model, base: stats.ordersVerified, baseTime: Date.now() };
      this.render();
    } catch {
      // Keep counting from the model.
    }
  }

  private render(): void {
    this.textContent = formatNumber(valueAt(this.model, Date.now()));
  }
}

define('live-counter', LiveCounter);
