import { describe, expect, test } from 'vitest';
import { computeStkdeFromCrimes } from './compute';
import type { CrimeRecord } from '@/types/crime';
import { validateAndNormalizeStkdeRequest } from './contracts';

const validation = validateAndNormalizeStkdeRequest({
  domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
  filters: {},
  params: {
    spatialBandwidthMeters: 800,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 5,
    minSupport: 1,
    timeWindowHours: 12,
  },
  limits: {
    maxEvents: 1000,
    maxGridCells: 4000,
  },
});

if (!validation.ok || !validation.request) {
  throw new Error('test setup failed');
}

const request = validation.request;

const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_011_000, type: 'THEFT', lat: 41.8805, lon: -87.631, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_012_000, type: 'BATTERY', lat: 41.8795, lon: -87.632, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
  { timestamp: 1_700_050_000, type: 'ROBBERY', lat: 41.75, lon: -87.67, x: 0, z: 0, district: '6', year: 2023, iucr: '0320' },
];

describe('computeStkdeFromCrimes', () => {
  test('returns deterministic hotspot IDs and scores for identical input', () => {
    const run1 = computeStkdeFromCrimes(request, baseCrimes).response;
    const run2 = computeStkdeFromCrimes(request, baseCrimes).response;

    expect(run1.hotspots.map((hotspot) => hotspot.id)).toEqual(run2.hotspots.map((hotspot) => hotspot.id));
    expect(run1.hotspots.map((hotspot) => hotspot.intensityScore)).toEqual(run2.hotspots.map((hotspot) => hotspot.intensityScore));
    expect(run1.heatmap.cells).toEqual(run2.heatmap.cells);
  });

  test('honors event limits and reports truncation metadata', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      timestamp: 1_700_010_000 + index,
      type: 'THEFT',
      lat: 41.88,
      lon: -87.63,
      x: 0,
      z: 0,
      district: '1',
      year: 2023,
      iucr: '0820',
    })) satisfies CrimeRecord[];

    const limited = {
      ...request,
      limits: {
        ...request.limits,
        maxEvents: 5,
      },
    };

    const result = computeStkdeFromCrimes(limited, many).response;
    expect(result.meta.eventCount).toBe(5);
    expect(result.meta.truncated).toBe(true);
    expect(result.meta.fallbackApplied).toMatch(/event-cap/);
  });
});
