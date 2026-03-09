export const CHICAGO_BOUNDS = {
  minLon: -87.9,
  maxLon: -87.5,
  minLat: 41.6,
  maxLat: 42.1,
} as const;

export function lonLatToNormalized(lon: number, lat: number): { x: number; z: number } {
  const { minLon, maxLon, minLat, maxLat } = CHICAGO_BOUNDS;
  const x = ((lon - minLon) / (maxLon - minLon)) * 100 - 50;
  const z = ((lat - minLat) / (maxLat - minLat)) * 100 - 50;

  return { x, z };
}

export function normalizedToLonLat(x: number, z: number): { lon: number; lat: number } {
  const { minLon, maxLon, minLat, maxLat } = CHICAGO_BOUNDS;
  const lon = minLon + ((x + 50) / 100) * (maxLon - minLon);
  const lat = minLat + ((z + 50) / 100) * (maxLat - minLat);

  return { lon, lat };
}
