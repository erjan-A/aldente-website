const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return integer.format(Math.floor(value));
}
