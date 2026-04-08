import type { CrimeRecord } from '@/types/crime';

export interface SpatialSummaryInput {
  crimes: ArrayLike<CrimeRecord>;
  hotspotPrecisionDegrees?: number;
}

export interface SpatialHotspotSummary {
  key: string;
  centroidLat: number;
  centroidLon: number;
  supportCount: number;
  density: number;
  dominantCrimeType: string;
}

export interface SpatialSummaryAvailable {
  status: 'available';
  totalEvents: number;
  hotspots: SpatialHotspotSummary[];
  summary: string;
}

export interface SpatialSummaryMissing {
  status: 'missing';
  notice: string;
}

export type SpatialSummaryResult = SpatialSummaryAvailable | SpatialSummaryMissing;

interface HotspotAccumulator {
  latSum: number;
  lonSum: number;
  count: number;
  typeCounts: Map<string, number>;
}

const DEFAULT_PRECISION_DEGREES = 0.02;

const formatCrimeType = (type: string): string => {
  const normalized = type.trim().toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
};

const resolveDominantCrimeType = (typeCounts: Map<string, number>): string => {
  const entries = Array.from(typeCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return entries[0]?.[0] ?? 'Unknown';
};

const createHotspotKey = (lat: number, lon: number, precision: number): string => {
  const latBucket = Math.floor(lat / precision);
  const lonBucket = Math.floor(lon / precision);
  return `${latBucket}:${lonBucket}`;
};

export const buildSpatialSummary = (input: SpatialSummaryInput): SpatialSummaryResult => {
  const precision = Number.isFinite(input.hotspotPrecisionDegrees)
    ? Math.max(0.0001, input.hotspotPrecisionDegrees ?? DEFAULT_PRECISION_DEGREES)
    : DEFAULT_PRECISION_DEGREES;

  const validCrimes = Array.from(input.crimes).filter(
    (crime) => Number.isFinite(crime.lat) && Number.isFinite(crime.lon),
  );

  if (validCrimes.length === 0) {
    return {
      status: 'missing',
      notice: 'Spatial diagnostics missing: no geolocated events available.',
    };
  }

  const hotspots = new Map<string, HotspotAccumulator>();
  for (const crime of validCrimes) {
    const key = createHotspotKey(crime.lat, crime.lon, precision);
    const accumulator = hotspots.get(key) ?? {
      latSum: 0,
      lonSum: 0,
      count: 0,
      typeCounts: new Map<string, number>(),
    };

    accumulator.latSum += crime.lat;
    accumulator.lonSum += crime.lon;
    accumulator.count += 1;
    const type = formatCrimeType(crime.type);
    accumulator.typeCounts.set(type, (accumulator.typeCounts.get(type) ?? 0) + 1);

    hotspots.set(key, accumulator);
  }

  const totalEvents = validCrimes.length;
  const hotspotSummaries: SpatialHotspotSummary[] = Array.from(hotspots.entries())
    .map(([key, accumulator]) => ({
      key,
      centroidLat: Number((accumulator.latSum / accumulator.count).toFixed(6)),
      centroidLon: Number((accumulator.lonSum / accumulator.count).toFixed(6)),
      supportCount: accumulator.count,
      density: Number((accumulator.count / totalEvents).toFixed(4)),
      dominantCrimeType: resolveDominantCrimeType(accumulator.typeCounts),
    }))
    .sort((a, b) => {
      if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
      if (b.density !== a.density) return b.density - a.density;
      if (a.dominantCrimeType !== b.dominantCrimeType) {
        return a.dominantCrimeType.localeCompare(b.dominantCrimeType);
      }
      return a.key.localeCompare(b.key);
    })
    .slice(0, 3);

  const summary = hotspotSummaries
    .map((hotspot, index) => {
      const densityPercent = (hotspot.density * 100).toFixed(1);
      return `#${index + 1} ${hotspot.dominantCrimeType} (${hotspot.supportCount} events, ${densityPercent}%)`;
    })
    .join('; ');

  return {
    status: 'available',
    totalEvents,
    hotspots: hotspotSummaries,
    summary,
  };
};
