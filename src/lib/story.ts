export interface Band {
  top: number;
  bottom: number;
}

/**
 * The line steps are measured against, in px from the top of the viewport: `anchor` (a fraction)
 * of its height. When a sticky visual covers the top of the screen down to `coveredTop` (stacked
 * layouts on phones), the line moves a quarter of the way into the space left below it, so a step
 * becomes current once its text is in view rather than while it is still behind the visual.
 */
export function anchorLine(viewportHeight: number, anchor = 0.5, coveredTop = 0): number {
  const base = viewportHeight * anchor;
  if (coveredTop <= 0) return base;
  return Math.max(base, coveredTop + (viewportHeight - coveredTop) * 0.25);
}

/**
 * Index of the scroll-story step that sits under the anchor line (see `anchorLine`).
 * Before the first step it stays on the first; past the last it stays on the last.
 */
export function activeStep(steps: readonly Band[], viewportHeight: number, anchor = 0.5, coveredTop = 0): number {
  if (steps.length === 0) return 0;
  const line = anchorLine(viewportHeight, anchor, coveredTop);
  let current = 0;
  steps.forEach((band, i) => {
    if (band.top <= line) current = i;
  });
  return current;
}
