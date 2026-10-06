import { describe, expect, it } from 'vitest';
import { retina } from './images';

describe('retina', () => {
  it('asks for a 2x copy of a raster image drawn at a fixed size', () => {
    expect(retina({ format: 'png' })).toEqual([2]);
    expect(retina({ format: 'jpg' })).toEqual([2]);
  });

  it('leaves SVG alone, since it is sharp at any density', () => {
    expect(retina({ format: 'svg' })).toBeUndefined();
  });
});
