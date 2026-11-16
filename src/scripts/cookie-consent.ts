import { ALL, CONSENT_KEY, NONE, makeConsent, readConsent, type Choices, type Consent } from '../lib/consent';
import { define } from './define';

const CATEGORIES = ['marketing'] as const;

/**
 * Cookie banner and settings. It shows until the visitor chooses, and "Reject all" is as
 * easy as "Accept all". The choice lands on <html data-consent-marketing="granted|denied">
 * and in a `consentchange` event, so optional tags can wait for it.
 * Any `[data-cookie-settings]` control on the page reopens the settings.
 */
export class CookieConsent extends HTMLElement {
  private consent: Consent | null = null;
  private opener: HTMLElement | null = null;

  connectedCallback(): void {
    this.consent = readConsent(read(), Date.now());
    if (this.consent) this.apply(this.consent);
    else this.open(false);
    this.addEventListener('click', this.onClick);
    document.addEventListener('click', this.onPageClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    document.removeEventListener('click', this.onPageClick);
  }

  private get settings(): HTMLElement | null {
    return this.querySelector('[data-consent-settings]');
  }

  private onClick = (event: Event): void => {
    const action = (event.target as Element).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (action === 'accept') this.save(ALL);
    else if (action === 'reject') this.save(NONE);
    else if (action === 'settings') {
      this.showSettings(true);
      // The Settings button hides once the panel is open, so move focus into the panel.
      this.querySelector<HTMLElement>('input:not([disabled])')?.focus();
    } else if (action === 'save') this.save(this.readChoices());
  };

  private onPageClick = (event: Event): void => {
    const opener = (event.target as Element).closest<HTMLElement>('[data-cookie-settings]');
    if (!opener) return;
    event.preventDefault();
    this.opener = opener;
    this.open(true);
    this.querySelector<HTMLElement>('input:not([disabled]), button')?.focus();
  };

  private open(withSettings: boolean): void {
    this.hidden = false;
    this.showSettings(withSettings);
  }

  private showSettings(show: boolean): void {
    if (this.settings) this.settings.hidden = !show;
    this.querySelector('[data-consent="settings"]')?.setAttribute('aria-expanded', String(show));
    const save = this.querySelector<HTMLElement>('[data-consent="save"]');
    if (save) save.hidden = !show;
    if (!show) return;
    for (const name of CATEGORIES) {
      const box = this.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (box) box.checked = this.consent?.[name] ?? false;
    }
  }

  private readChoices(): Choices {
    const checked = (name: (typeof CATEGORIES)[number]) => Boolean(this.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.checked);
    return { marketing: checked('marketing') };
  }

  private save(choices: Choices): void {
    this.consent = makeConsent(choices, Date.now());
    write(JSON.stringify(this.consent));
    this.apply(this.consent);
    window.dispatchEvent(new CustomEvent('consentchange', { detail: this.consent }));
    this.hidden = true;
    this.opener?.focus();
    this.opener = null;
  }

  private apply(consent: Consent): void {
    for (const name of CATEGORIES) {
      document.documentElement.setAttribute(`data-consent-${name}`, consent[name] ? 'granted' : 'denied');
    }
  }
}

// Storage can be blocked (private modes, strict settings); the banner still works for the visit.
function read(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function write(value: string): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Nothing to keep; the visitor will be asked again next time.
  }
}

define('cookie-consent', CookieConsent);
