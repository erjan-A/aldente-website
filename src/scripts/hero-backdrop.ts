import { define, prefersReducedMotion } from './define';
import './hero-backdrop.css';

/**
 * The decorative layer behind the home hero: "Ember", a slow glow of orange shades behind the headline
 * (hero-ember.ts, drawn with Paper Shaders). Its code is a separate chunk that starts loading once the page is parsed, so the
 * headline and the footage never wait for it and the glow does not wait for them. With reduced motion it draws one still frame. If WebGL is missing or the
 * glow fails to start, the hero keeps its plain ground.
 */
export class HeroBackdrop extends HTMLElement {
  private dispose: (() => void) | null = null;
  private layer: HTMLElement | null = null;
  private connected = false;

  connectedCallback(): void {
    this.connected = true;
    // As soon as the page is parsed. The glow's code is a separate chunk fetched in the background, so the
    // headline never waits for it, and the glow does not wait for the clips and images to finish loading.
    if (document.readyState !== 'loading') void this.start();
    else document.addEventListener('DOMContentLoaded', () => void this.start(), { once: true });
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.clear();
  }

  private clear(): void {
    this.dispose?.();
    this.dispose = null;
    this.layer?.remove();
    this.layer = null;
  }

  private async start(): Promise<void> {
    if (!this.connected || this.layer) return;
    const layer = document.createElement('div');
    layer.className = 'hb__layer';
    this.append(layer);
    this.layer = layer;
    try {
      const { mountEmber } = await import('./hero-ember');
      if (!this.connected || this.layer !== layer) return;
      this.dispose = mountEmber(layer, { still: prefersReducedMotion() });
      requestAnimationFrame(() => layer.classList.add('is-on'));
    } catch {
      if (this.layer === layer) this.clear();
    }
  }
}

define('hero-backdrop', HeroBackdrop);
