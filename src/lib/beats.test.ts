import { describe, expect, it } from 'vitest';
import { progressFor, revealedAt } from './beats';

describe('progressFor', () => {
  describe('pinned: a tall wrapper with a sticky stage', () => {
    it('is 0 until the wrapper reaches the top of the viewport', () => {
      expect(progressFor({ top: 300, height: 2000 }, 800, 'pinned')).toBe(0);
    });

    it('runs from 0 to 1 while the stage is pinned', () => {
      expect(progressFor({ top: -600, height: 2000 }, 800, 'pinned')).toBe(0.5);
      expect(progressFor({ top: -1200, height: 2000 }, 800, 'pinned')).toBe(1);
    });

    it('stays at 1 after the wrapper has passed', () => {
      expect(progressFor({ top: -5000, height: 2000 }, 800, 'pinned')).toBe(1);
    });
  });

  describe('flow: the stage scrolls normally', () => {
    it('starts once the top crosses three quarters of the viewport', () => {
      expect(progressFor({ top: 600, height: 1000 }, 800, 'flow')).toBe(0);
      expect(progressFor({ top: 100, height: 1000 }, 800, 'flow')).toBe(0.5);
    });

    it('is clamped to 1', () => {
      expect(progressFor({ top: -2000, height: 1000 }, 800, 'flow')).toBe(1);
    });
  });
});

describe('revealedAt', () => {
  it('reveals nothing before the first threshold', () => {
    expect(revealedAt(0, 3)).toBe(0);
    expect(revealedAt(0.05, 3)).toBe(0);
  });

  it('reveals beats at evenly spaced thresholds', () => {
    expect(revealedAt(0.1, 3)).toBe(1);
    expect(revealedAt(0.42, 3)).toBe(2);
    expect(revealedAt(0.75, 3)).toBe(3);
  });

  it('never exceeds the beat count', () => {
    expect(revealedAt(1, 3)).toBe(3);
  });

  it('handles a single beat', () => {
    expect(revealedAt(0.2, 1)).toBe(1);
    expect(revealedAt(0, 1)).toBe(0);
  });
});
