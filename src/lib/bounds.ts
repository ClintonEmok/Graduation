/**
 * Geographic bounds calculation utilities
 */
import type { CrimeRecord } from '@/types/crime';

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Calculate padded geographic bounds from an array of crime records */
export function deriveBoundsFromCrimes(crimes: ArrayLike<CrimeRecord>): Bounds | undefined {
  const validCrimes = Array.from(crimes).filter(
    (crime) => Number.isFinite(crime.lat) && Number.isFinite(crime.lon)
  );

  if (validCrimes.length === 0) return undefined;

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  for (const crime of validCrimes) {
    minLat = Math.min(minLat, crime.lat);
    maxLat = Math.max(maxLat, crime.lat);
    minLon = Math.min(minLon, crime.lon);
    maxLon = Math.max(maxLon, crime.lon);
  }

  const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
  const lonPadding = Math.max((maxLon - minLon) * 0.1, 0.01);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding,
  };
}
