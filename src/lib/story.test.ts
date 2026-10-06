import { describe, expect, it } from 'vitest';
import { activeStep, anchorLine } from './story';

const rects = [
  { top: -500, bottom: -100 },
  { top: -100, bottom: 300 },
  { top: 300, bottom: 700 },
  { top: 700, bottom: 1100 },
];

describe('activeStep', () => {
  it('picks the step under the anchor line', () => {
    expect(activeStep(rects, 800)).toBe(2);
  });

  it('uses a custom anchor', () => {
    expect(activeStep(rects, 800, 0.2)).toBe(1);
  });

  it('keeps the first step before the story starts', () => {
    const below = rects.map((r) => ({ top: r.top + 2000, bottom: r.bottom + 2000 }));
    expect(activeStep(below, 800)).toBe(0);
  });

  it('keeps the last step after the story ends', () => {
    const above = rects.map((r) => ({ top: r.top - 3000, bottom: r.bottom - 3000 }));
    expect(activeStep(above, 800)).toBe(3);
  });

  it('returns 0 for no steps', () => {
    expect(activeStep([], 800)).toBe(0);
  });

  it('on phones, measures below a sticky visual that covers the top of the screen', () => {
    // Without the visual the line is at 440, behind it. With the visual over 0–600 it moves to 650,
    // so the step that has just come out from under the visual (top 620) is current.
    const steps = [
      { top: 300, bottom: 620 },
      { top: 620, bottom: 940 },
    ];
    expect(activeStep(steps, 800, 0.55)).toBe(0);
    expect(activeStep(steps, 800, 0.55, 600)).toBe(1);
  });
});

describe('anchorLine', () => {
  it('is the anchor fraction of the viewport', () => {
    expect(anchorLine(800, 0.5)).toBe(400);
  });

  it('moves a quarter of the way into the space left below a covering visual', () => {
    expect(anchorLine(800, 0.55, 600)).toBe(650);
  });

  it('never moves above the anchor fraction', () => {
    expect(anchorLine(800, 0.55, 100)).toBeCloseTo(440);
  });
});
