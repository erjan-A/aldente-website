/**
 * What wrong orders cost a chain, and what Aldente Verify takes off that. The model is the one in the customer
 * result's footnote: a wrong order is refunded in full. The reduction is the one measured at that location.
 */
export interface CostInput {
  locations: number;
  /** Delivery and drive-thru orders a day, per location. */
  ordersPerDay: number;
  /** Average check, in dollars. */
  averageCheck: number;
  /** Share of orders that go out wrong, in percent. */
  errorRate: number;
}

/** A mid-sized example: the error rate and the check are the customer result's (7% of about 200 orders, $17). */
export const COST_DEFAULTS: CostInput = { locations: 25, ordersPerDay: 200, averageCheck: 17, errorRate: 7 };

/** Bounds for each input, so a typo cannot produce a silly figure. */
export const COST_LIMITS: Record<keyof CostInput, readonly [min: number, max: number]> = {
  locations: [1, 5000],
  ordersPerDay: [1, 5000],
  averageCheck: [1, 500],
  errorRate: [0.1, 30],
};

/** Wrong orders fell by 87% at the measured location. */
export const VERIFY_REDUCTION = 0.87;

export interface CostResult {
  wrongPerDay: number;
  refundsPerYear: number;
  savedPerYear: number;
  /** What one location saves a year: the figure a buyer can check against their own store. */
  savedPerLocation: number;
}

const clamp = (value: number, [min, max]: readonly [number, number], fallback: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Reads raw field values (anything a number input can hold) into a valid input. */
export function readCostInput(raw: Partial<Record<keyof CostInput, unknown>>): CostInput {
  const read = (key: keyof CostInput) => clamp(Number.parseFloat(String(raw[key] ?? '')), COST_LIMITS[key], COST_DEFAULTS[key]);
  return { locations: read('locations'), ordersPerDay: read('ordersPerDay'), averageCheck: read('averageCheck'), errorRate: read('errorRate') };
}

export function wrongOrderCost(input: CostInput): CostResult {
  const wrongPerDay = input.locations * input.ordersPerDay * (input.errorRate / 100);
  const refundsPerYear = wrongPerDay * 365 * input.averageCheck;
  const savedPerYear = refundsPerYear * VERIFY_REDUCTION;
  return { wrongPerDay, refundsPerYear, savedPerYear, savedPerLocation: savedPerYear / input.locations };
}

/** "$1.4M", "$10.4M", "$132M", "$74K", "$950": money rounded the way a headline figure is read. */
export function formatMoney(dollars: number): string {
  // A thousand millions is written as billions.
  if (dollars >= 999_500_000) return `$${(dollars / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  // 999,500 and up rounds to a million, so it is written as one.
  if (dollars >= 999_500) return `$${(dollars / 1_000_000).toFixed(dollars >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}K`;
  return `$${Math.round(dollars)}`;
}

/** "262", "1,050": a count of orders. */
export const formatCount = (count: number): string => Math.round(count).toLocaleString('en-US');
