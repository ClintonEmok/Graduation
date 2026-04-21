/**
 * Geographic bounds calculation utilities
 */
import type { CrimeRecord } from '@/types/crime';

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Calculate bounding box from an array of crime records */
export function deriveBoundsFromCrimes(crimes: CrimeRecord[]): Bounds | null {
  if (crimes.length === 0) return null;

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  for (const crime of crimes) {
    minX = Math.min(minX, crime.x);
    maxX = Math.max(maxX, crime.x);
    minZ = Math.min(minZ, crime.z);
    maxZ = Math.max(maxZ, crime.z);
    minLat = Math.min(minLat, crime.lat);
    maxLat = Math.max(maxLat, crime.lat);
    minLon = Math.min(minLon, crime.lon);
    maxLon = Math.max(maxLon, crime.lon);
  }

  return { minX, maxX, minZ, maxZ, minLat, maxLat, minLon, maxLon };
}