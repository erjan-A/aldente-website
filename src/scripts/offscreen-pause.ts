/**
 * Pauses CSS animations nobody can see. Every section in <main>, and any element marked
 * `data-loop` (looping parts inside a tall section, such as the hero cards and the logo strip),
 * gets `data-paused` while it is off screen; the `[data-paused]` rule in global.css then holds its
 * animations. They resume, from where they stopped, a little before they scroll back into view.
 * Loaded once from BaseLayout. Nothing changes with reduced motion, where no animation runs.
 */
export const LOOP_TARGETS = 'main section, main [data-loop]';

/** How far outside the viewport a section still counts as on screen. */
export const PAUSE_MARGIN = '200px 0px';

export function pauseOffscreen(root: ParentNode = document): IntersectionObserver | null {
  if (typeof IntersectionObserver !== 'function') return null;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
    },
    { rootMargin: PAUSE_MARGIN },
  );
  root.querySelectorAll(LOOP_TARGETS).forEach((el) => observer.observe(el));
  return observer;
}

pauseOffscreen();
