import { EVENTS } from '../data/analytics';
import { calendlyEmbedUrl, calendlyHeight, calendlyMessage, calendlyShowsContent, incomingUtm } from '../lib/calendly';
import { CONSENT_KEY, readConsent } from '../lib/consent';
import { demoIntent } from '../lib/demo';
import { track } from './analytics';
import { define } from './define';

/** How long "Loading available times…" may show before the page offers Calendly's own page instead. */
export const SLOW_MS = 15_000;

type State = 'loading' | 'ready' | 'booked';

/**
 * Calendly's scheduler, embedded inline on the demo page. It loads as soon as the page does, with a quiet
 * calendar skeleton and "Loading available times…" until Calendly has drawn it; then the iframe follows
 * Calendly's height, and a booking swaps the card to a "You're booked" panel.
 * Calendly sets its own cookies and asks for consent inside the scheduler; a visitor who already accepted
 * marketing cookies on this site isn't asked again (hide_gdpr_banner).
 *
 * Markup: data-url (Calendly event URL); inside, [data-cal-stage] (skeleton), [data-cal-status] (live
 * region), [data-cal-slow], [data-cal-alt] and [data-cal-booked] (hidden panel).
 * The host's data-state is 'loading' | 'ready' | 'booked' for styling.
 */
export class CalendlyEmbed extends HTMLElement {
  private frame: HTMLIFrameElement | null = null;
  private slowTimer: ReturnType<typeof setTimeout> | undefined;
  private plan = 'general';

  connectedCallback(): void {
    this.plan = demoIntent(location.search).plan || 'general';
    window.addEventListener('message', this.onMessage);
    this.load();
  }

  disconnectedCallback(): void {
    window.removeEventListener('message', this.onMessage);
    clearTimeout(this.slowTimer);
  }

  /** Inserts Calendly's iframe once. */
  load(): void {
    if (this.frame || this.state === 'booked') return;
    const stage = this.child('stage');
    if (!stage || !this.dataset.url) return;
    const frame = document.createElement('iframe');
    frame.className = 'cal__frame';
    frame.title = 'Book a time with Aldente on Calendly';
    frame.src = calendlyEmbedUrl(this.dataset.url, {
      hostname: location.hostname,
      plan: this.plan,
      consented: readConsent(readStored(), Date.now())?.marketing === true,
      utm: incomingUtm(location.search),
    });
    this.frame = frame;
    this.state = 'loading';
    this.setStatus('Loading available times…');
    stage.append(frame);
    this.slowTimer = setTimeout(() => this.toggle('slow', true), SLOW_MS);
  }

  private get state(): State | '' {
    return (this.dataset.state as State | undefined) ?? '';
  }

  private set state(value: State) {
    this.dataset.state = value;
  }

  private child(name: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(`[data-cal-${name}]`);
  }

  private toggle(name: string, show: boolean): void {
    this.querySelectorAll<HTMLElement>(`[data-cal-${name}]`).forEach((el) => (el.hidden = !show));
  }

  private setStatus(text: string): void {
    const status = this.child('status');
    if (status) status.textContent = text;
  }

  private onMessage = (event: MessageEvent): void => {
    const message = calendlyMessage(event.origin, event.data);
    if (!message || !this.frame) return;
    if (this.state === 'loading' && calendlyShowsContent(message)) this.ready();
    if (message.event === 'calendly.page_height') {
      const height = calendlyHeight(message.payload.height);
      if (height) this.frame.style.height = `${height}px`;
    } else if (message.event === 'calendly.date_and_time_selected') {
      track(EVENTS.timeSelected, { plan: this.plan });
    } else if (message.event === 'calendly.event_scheduled') {
      this.booked();
    }
  };

  /** Calendly has drawn the scheduler: show it in place of the skeleton. */
  private ready(): void {
    clearTimeout(this.slowTimer);
    this.state = 'ready';
    this.setStatus('');
    this.toggle('slow', false);
    this.toggle('skeleton', false);
  }

  private booked(): void {
    track(EVENTS.booked, { plan: this.plan });
    this.state = 'booked';
    this.frame?.remove();
    this.toggle('stage', false);
    this.toggle('alt', false);
    this.toggle('booked', true);
    this.child('booked')?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
  }
}

// Storage can be blocked (private modes, strict settings); then Calendly asks for its own consent.
function readStored(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

define('calendly-embed', CalendlyEmbed);
