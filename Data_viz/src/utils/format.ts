/**
 * Format currency values
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage values (0-1 range to 0-100%)
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
