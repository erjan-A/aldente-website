/** One slat of the wall behind the closing band, in CSS pixels. Slat and gap sit on the 4px grid. */
export const SLAT = { width: 8, height: 24, gap: 4 } as const;

export interface SlatGrid {
  cols: number;
  rows: number;
  /** One slat plus its gap. */
  cell: [number, number];
  /** Where the first slat starts: at or left of / above the band's edge, so the wall is centred. */
  origin: [number, number];
}

/** The wall that covers a band of this size: whole slats, centred, cut the same at both edges. */
export function slatGrid(width: number, height: number): SlatGrid {
  const cell: [number, number] = [SLAT.width + SLAT.gap, SLAT.height + SLAT.gap];
  const cols = Math.max(1, Math.ceil((width + SLAT.gap) / cell[0]));
  const rows = Math.max(1, Math.ceil((height + SLAT.gap) / cell[1]));
  const overhang = (count: number, size: number, span: number) => Math.round((span - (count * size - SLAT.gap)) / 2);
  return { cols, rows, cell, origin: [overhang(cols, cell[0], width), overhang(rows, cell[1], height)] };
}

export interface GlintZone {
  /** The direction the light crests fade in along. */
  axis: 'x' | 'y';
  /** As a share of the band: none before `from`, full after `to`. */
  from: number;
  to: number;
}

/**
 * Where the light crests may show. The band's text is white, so light slats stay off it: right of the text
 * on wide screens, below it on phones. The darker slats run under everything.
 */
export function glintZone(width: number): GlintZone {
  return width >= 720 ? { axis: 'x', from: 0.42, to: 0.72 } : { axis: 'y', from: 0.6, to: 0.82 };
}
