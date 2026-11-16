import { describe, expect, it } from 'vitest';
import { nextTabIndex } from './tabs';

describe('nextTabIndex', () => {
  it('moves forward and wraps', () => {
    expect(nextTabIndex(0, 'ArrowDown', 4)).toBe(1);
    expect(nextTabIndex(3, 'ArrowDown', 4)).toBe(0);
    expect(nextTabIndex(1, 'ArrowRight', 4)).toBe(2);
  });

  it('moves backward and wraps', () => {
    expect(nextTabIndex(0, 'ArrowUp', 4)).toBe(3);
    expect(nextTabIndex(2, 'ArrowLeft', 4)).toBe(1);
  });

  it('jumps to the ends', () => {
    expect(nextTabIndex(2, 'Home', 4)).toBe(0);
    expect(nextTabIndex(1, 'End', 4)).toBe(3);
  });

  it('in a row of tabs, leaves Up and Down alone', () => {
    expect(nextTabIndex(0, 'ArrowDown', 4, 'row')).toBeNull();
    expect(nextTabIndex(0, 'ArrowUp', 4, 'row')).toBeNull();
    expect(nextTabIndex(0, 'ArrowRight', 4, 'row')).toBe(1);
    expect(nextTabIndex(0, 'ArrowLeft', 4, 'row')).toBe(3);
  });

  it('ignores other keys', () => {
    expect(nextTabIndex(2, 'Enter', 4)).toBeNull();
  });
});
