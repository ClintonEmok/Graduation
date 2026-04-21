/**
 * Formatting utilities for duration, numbers, and percentages
 */

/** Format milliseconds as human-readable interval string */
export function formatInterval(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes % 60} min`;
  if (minutes > 0) return `${minutes} min ${seconds % 60} sec`;
  return `${seconds} sec`;
}

/** Format a number with thousands separator */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** Format a percentage value (0-1) as percentage string */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}