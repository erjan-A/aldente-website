import { describe, expect, it } from 'vitest';
import { EMBER_COLORS } from './ember-palette';

const channel = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
};

describe('the hero glow’s colours', () => {
  it('are the burning orange of the orange surface: none sinks into red-brown', () => {
    // The surface's deep stop is #a92a0a. A darker shade reads as dark red, which the owner turned down (2026-11-17).
    for (const color of EMBER_COLORS) expect(luminance(color), color).toBeGreaterThanOrEqual(luminance('#a92a0a'));
  });

  it('have a wide range, so the glow is seen at a glance', () => {
    const all = EMBER_COLORS.map(luminance);
    expect(Math.max(...all) / Math.min(...all)).toBeGreaterThan(2);
  });

  it('are all orange: more red than green, more green than blue', () => {
    for (const color of EMBER_COLORS) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      expect(r! > g! && g! > b!, color).toBe(true);
      // Orange, not red: green is at least a quarter of red.
      expect(g! / r!, color).toBeGreaterThanOrEqual(0.25);
    }
  });
});
