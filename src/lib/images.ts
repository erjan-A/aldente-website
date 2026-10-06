/** Pixel densities for an image drawn at a fixed size: a 2x copy for raster files, none for SVG (sharp at any density). */
export const retina = (src: { format: string }): number[] | undefined => (src.format === 'svg' ? undefined : [2]);
