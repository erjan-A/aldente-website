/**
 * Roving focus for a tab list: returns the next index, or null for keys it doesn't handle.
 * In a 'row' of tabs only Left and Right move; Up and Down stay with the page, so it still scrolls.
 */
export function nextTabIndex(current: number, key: string, count: number, layout: 'any' | 'row' = 'any'): number | null {
  if (layout === 'row' && (key === 'ArrowDown' || key === 'ArrowUp')) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowUp':
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
