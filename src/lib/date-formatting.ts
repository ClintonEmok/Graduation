/**
 * Date/time formatting utilities by resolution level
 */
import { format } from 'date-fns';

export type DateResolution = 'hour' | 'day' | 'week' | 'month' | 'year';

/** Format a date based on the given resolution level */
export function formatDateByResolution(date: Date, resolution: DateResolution): string {
  switch (resolution) {
    case 'hour':
      return format(date, 'HH:mm');
    case 'day':
      return format(date, 'MMM d');
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM yyyy');
    case 'year':
      return format(date, 'yyyy');
    default:
      return format(date, 'MMM d');
  }
}

/** Format milliseconds as human-readable duration */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}