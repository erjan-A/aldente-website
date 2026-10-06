export const DAY_MS = 86_400_000;

/**
 * A running total that grows at an average daily rate from a known base.
 * Used until the live stats endpoint is connected; then `parseStats` supplies the base.
 */
export interface CounterModel {
  base: number;
  /** Epoch milliseconds at which `base` was true. */
  baseTime: number;
  perDay: number;
}

export interface Stats {
  ordersVerified: number;
  locations?: number;
}

export function valueAt(model: CounterModel, now: number): number {
  const elapsed = Math.max(0, now - model.baseTime);
  return Math.floor(model.base + (model.perDay * elapsed) / DAY_MS);
}

/** Milliseconds between visible increments, kept between 250 ms and 5 s. */
export function tickInterval(model: CounterModel): number {
  if (model.perDay <= 0) return 5000;
  return Math.min(5000, Math.max(250, Math.round(DAY_MS / model.perDay)));
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function parseStats(payload: unknown): Stats | null {
  if (!payload || typeof payload !== 'object') return null;
  const { ordersVerified, locations } = payload as Record<string, unknown>;
  if (!isCount(ordersVerified)) return null;
  const stats: Stats = { ordersVerified };
  if (isCount(locations)) stats.locations = locations;
  return stats;
}
