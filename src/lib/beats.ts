export interface Box {
  top: number;
  height: number;
}

export type ScrollMode = 'pinned' | 'flow';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * How far the visitor has scrolled through a stage, from 0 to 1.
 * - pinned: a tall wrapper holds a sticky stage; progress runs while it is pinned.
 * - flow: the stage scrolls normally; progress starts when its top crosses 75% of the viewport.
 */
export function progressFor(box: Box, viewportHeight: number, mode: ScrollMode): number {
  const travel = box.height - viewportHeight;
  if (mode === 'pinned' && travel > 0) return clamp01(-box.top / travel);
  return clamp01((viewportHeight * 0.75 - box.top) / box.height);
}

/** Number of beats revealed at a given progress; thresholds are evenly spaced from `start` to `end`. */
export function revealedAt(progress: number, count: number, start = 0.1, end = 0.7): number {
  if (progress < start) return 0;
  if (count <= 1) return count;
  const step = (end - start) / (count - 1);
  return Math.min(count, Math.floor((progress - start) / step + 1e-9) + 1);
}
