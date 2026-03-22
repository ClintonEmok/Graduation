/**
 * Pure aggregation functions for crime statistics.
 * All functions are deterministic and have no side effects.
 */
import type { CrimeRecord } from '@/types/crime';

/**
 * Aggregate crime counts by district.
 * Missing/null districts are counted as 'Unknown'.
 */
export function aggregateByDistrict(crimes: CrimeRecord[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const crime of crimes) {
    const district = crime.district || 'Unknown';
    result.set(district, (result.get(district) || 0) + 1);
  }
  return result;
}

/**
 * Aggregate crime counts by type.
 * Missing/null types are counted as 'Unknown'.
 */
export function aggregateByType(crimes: CrimeRecord[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const crime of crimes) {
    const type = crime.type || 'Unknown';
    result.set(type, (result.get(type) || 0) + 1);
  }
  return result;
}

/**
 * Aggregate crime counts by hour of day (0-23).
 * Returns array where index 0 = 12AM (hour 0), index 23 = 11PM.
 */
export function aggregateByHour(crimes: CrimeRecord[]): number[] {
  const result = new Array(24).fill(0);
  for (const crime of crimes) {
    const date = new Date(crime.timestamp * 1000);
    const hour = date.getHours();
    result[hour]++;
  }
  return result;
}

/**
 * Aggregate crime counts by day of week (0-6).
 * Returns array where index 0 = Sunday, 1 = Monday, etc.
 */
export function aggregateByDayOfWeek(crimes: CrimeRecord[]): number[] {
  const result = new Array(7).fill(0);
  for (const crime of crimes) {
    const date = new Date(crime.timestamp * 1000);
    const day = date.getDay();
    result[day]++;
  }
  return result;
}

/**
 * Aggregate crime counts by month (0-11).
 * Returns array where index 0 = January, 11 = December.
 */
export function aggregateByMonth(crimes: CrimeRecord[]): number[] {
  const result = new Array(12).fill(0);
  for (const crime of crimes) {
    const date = new Date(crime.timestamp * 1000);
    const month = date.getMonth();
    result[month]++;
  }
  return result;
}

/**
 * Convert a Map to a sorted array of { name, count } entries.
 * Sorted by count descending.
 */
export function sortByCountDescending<K>(
  map: Map<K, number>
): Array<{ name: string; count: number }> {
  const entries = Array.from(map.entries());
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([key, count]) => ({
    name: String(key),
    count,
  }));
}

/**
 * Calculate percentages from counts.
 */
export function toPercentages(
  items: Array<{ name: string; count: number }>
): Array<{ name: string; count: number; percentage: number }> {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return items.map(item => ({ ...item, percentage: 0 }));
  return items.map(item => ({
    ...item,
    percentage: Math.round((item.count / total) * 1000) / 10,
  }));
}

/**
 * Get top N items from an array.
 */
export function topN<T extends { count: number }>(
  items: T[],
  n: number
): T[] {
  return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}

/**
 * Find the peak hour (hour with most crimes).
 */
export function findPeakHour(hourly: number[]): { hour: number; count: number } {
  let maxHour = 0;
  let maxCount = hourly[0] || 0;
  for (let i = 1; i < hourly.length; i++) {
    if (hourly[i] > maxCount) {
      maxHour = i;
      maxCount = hourly[i];
    }
  }
  return { hour: maxHour, count: maxCount };
}

/**
 * Find the peak day (day with most crimes).
 */
export function findPeakDay(
  daily: number[]
): { day: number; count: number; label: string } {
  let maxDay = 0;
  let maxCount = daily[0] || 0;
  for (let i = 1; i < daily.length; i++) {
    if (daily[i] > maxCount) {
      maxDay = i;
      maxCount = daily[i];
    }
  }
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { day: maxDay, count: maxCount, label: dayLabels[maxDay] };
}

/**
 * Full stats aggregation result.
 */
export interface NeighborhoodStats {
  total: number;
  byDistrict: Array<{ name: string; count: number; percentage: number }>;
  byType: Array<{ name: string; count: number; percentage: number }>;
  byHour: number[];
  byDayOfWeek: number[];
  byMonth: number[];
  peakHour: { hour: number; count: number };
  peakDay: { day: number; count: number; label: string };
}

/**
 * Aggregate all stats from crime records.
 */
export function aggregateStats(crimes: CrimeRecord[]): NeighborhoodStats {
  const total = crimes.length;
  
  const byDistrictMap = aggregateByDistrict(crimes);
  const byDistrictSorted = sortByCountDescending(byDistrictMap);
  const byDistrict = toPercentages(byDistrictSorted);
  
  const byTypeMap = aggregateByType(crimes);
  const byTypeSorted = sortByCountDescending(byTypeMap);
  const byType = toPercentages(byTypeSorted);
  
  const byHour = aggregateByHour(crimes);
  const byDayOfWeek = aggregateByDayOfWeek(crimes);
  const byMonth = aggregateByMonth(crimes);
  
  return {
    total,
    byDistrict,
    byType,
    byHour,
    byDayOfWeek,
    byMonth,
    peakHour: findPeakHour(byHour),
    peakDay: findPeakDay(byDayOfWeek),
  };
}
