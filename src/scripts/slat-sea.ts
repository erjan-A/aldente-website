import { define, prefersReducedMotion } from './define';
import type { SlatWall } from './slat-sea-gl';

/**
 * The decorative layer behind the closing band: a wall of small slats that rolls like a sea (slat-sea-gl.ts).
 * Its code loads only when the band comes near the screen, and the motion stops while the band is off screen.
 * With reduced motion it draws one still wall. If WebGL is missing or the wall fails to start, the band keeps
 * its plain orange ground.
 */
export class SlatSea extends HTMLElement {
  private observer: IntersectionObserver | null = null;
  private layer: HTMLElement | null = null;
  private wall: SlatWall | null = null;
  private connected = false;
  private near = false;
  /** A start that failed (no WebGL, a shader the device rejects) is not tried again on the next scroll. */
  private failed = false;

  connectedCallback(): void {
    this.connected = true;
    if (typeof IntersectionObserver !== 'function') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        this.near = entries[entries.length - 1]?.isIntersecting ?? false;
        if (this.wall) this.wall.run(this.near);
        else if (this.near && !this.failed) void this.start();
      },
      { rootMargin: '300px 0px' },
    );
    this.observer.observe(this);
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.observer?.disconnect();
    this.observer = null;
    this.clear();
  }

  private clear(): void {
    this.wall?.dispose();
    this.wall = null;
    this.layer?.remove();
    this.layer = null;
  }

  private async start(): Promise<void> {
    if (!this.connected || this.layer) return;
    const layer = document.createElement('div');
    layer.className = 'slats__layer';
    this.append(layer);
    this.layer = layer;
    try {
      const { mountSlats } = await import('./slat-sea-gl');
      if (!this.connected || this.layer !== layer) return;
      const still = prefersReducedMotion();
      this.wall = mountSlats(layer, { still });
      if (!still) this.wall.run(this.near);
      requestAnimationFrame(() => layer.classList.add('is-on'));
    } catch {
      this.failed = true;
      if (this.layer === layer) this.clear();
    }
  }
}

define('slat-sea', SlatSea);
