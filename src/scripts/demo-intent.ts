import { EVENTS } from '../data/analytics';
import { demoIntent, keepNames, titleParts } from '../lib/demo';
import { track } from './analytics';
import { define } from './define';

/**
 * Matches the demo page's heading and lead to the plan the visitor picked (?plan=…),
 * and counts the visit by plan. The server renders the general demo, so without a plan nothing changes.
 */
export class DemoIntentElement extends HTMLElement {
  connectedCallback(): void {
    const intent = demoIntent(globalThis.location?.search ?? '');
    track(EVENTS.demoView, { plan: intent.plan || 'general' });
    if (!intent.plan) return;
    // The heading keeps the two tones of every page hero: the claim, then the muted ending in a <span>.
    const { claim, muted } = titleParts(intent);
    this.querySelectorAll('[data-intent="title"]').forEach((el) => {
      const parts: (string | Node)[] = [keepNames(claim)];
      if (muted) {
        const span = document.createElement('span');
        span.textContent = keepNames(muted);
        parts.push(' ', span);
      }
      el.replaceChildren(...parts);
    });
    this.querySelectorAll('[data-intent="lead"]').forEach((el) => (el.textContent = keepNames(intent.lead)));
  }
}

define('demo-intent', DemoIntentElement);
