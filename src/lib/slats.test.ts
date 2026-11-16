import { describe, expect, it } from 'vitest';
import { SLAT, glintZone, slatGrid } from './slats';

describe('slatGrid', () => {
  it('keeps the slat and its gap on the 4px grid', () => {
    for (const n of [SLAT.width, SLAT.height, SLAT.gap]) expect(n % 4).toBe(0);
  });

  it('covers the whole band and centres the wall, so the cut slats at both edges match', () => {
    for (const [width, height] of [[390, 520], [1440, 620], [1024, 480], [2560, 700]] as const) {
      const grid = slatGrid(width, height);
      const [cellW, cellH] = grid.cell;
      expect(cellW).toBe(SLAT.width + SLAT.gap);
      expect(cellH).toBe(SLAT.height + SLAT.gap);
      expect(grid.cols * cellW).toBeGreaterThanOrEqual(width);
      expect(grid.rows * cellH).toBeGreaterThanOrEqual(height);
      const [x, y] = grid.origin;
      expect(x).toBeLessThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(0);
      // The same overhang on the left as on the right (the gap after the last slat is not drawn).
      expect(Math.abs(-x - (grid.cols * cellW - SLAT.gap - width + x))).toBeLessThanOrEqual(1);
    }
  });

  it('never returns an empty wall for a band that has not been laid out yet', () => {
    expect(slatGrid(0, 0)).toMatchObject({ cols: 1, rows: 1 });
  });
});

describe('glintZone', () => {
  it('keeps the light crests off the text: right of it on wide screens, below it on phones', () => {
    expect(glintZone(1440)).toEqual({ axis: 'x', from: 0.42, to: 0.72 });
    expect(glintZone(720)).toEqual({ axis: 'x', from: 0.42, to: 0.72 });
    expect(glintZone(390)).toEqual({ axis: 'y', from: 0.6, to: 0.82 });
  });
});
