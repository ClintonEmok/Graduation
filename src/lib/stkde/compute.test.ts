import { describe, expect, test } from 'vitest';
import { computeStkdeFromAggregates, computeStkdeFromCrimes } from './compute';
import type { CrimeRecord } from '@/types/crime';
import { validateAndNormalizeStkdeRequest } from './contracts';
import type { FullPopulationStkdeInputs } from './full-population-pipeline';

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

const findClosestHotspot = (
  hotspots: Array<{ centroidLat: number; centroidLng: number; intensityScore: number }>,
  lat: number,
  lng: number,
) =>
  hotspots.reduce((closest, hotspot) => {
    const closestDistance = Math.hypot(closest.centroidLat - lat, closest.centroidLng - lng);
    const hotspotDistance = Math.hypot(hotspot.centroidLat - lat, hotspot.centroidLng - lng);
    return hotspotDistance < closestDistance ? hotspot : closest;
  });

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

  test('computes deterministic output from aggregated full-population inputs', () => {
    const grid = {
      bbox: request.filters.bbox ?? [-87.94, 41.64, -87.52, 42.03],
      minLng: (request.filters.bbox ?? [-87.94, 41.64, -87.52, 42.03])[0],
      minLat: (request.filters.bbox ?? [-87.94, 41.64, -87.52, 42.03])[1],
      maxLng: (request.filters.bbox ?? [-87.94, 41.64, -87.52, 42.03])[2],
      maxLat: (request.filters.bbox ?? [-87.94, 41.64, -87.52, 42.03])[3],
      meanLat: 41.835,
      rows: 2,
      cols: 2,
      latCellDegrees: 0.195,
      lonCellDegrees: 0.21,
      coarsenFactor: 1,
    };
    const cellSupport = new Float64Array([10, 0, 4, 2]);
    const cellTemporalBuckets = new Map([
      [0, [{ bucketStartEpochSec: 1_700_010_000, count: 5 }, { bucketStartEpochSec: 1_700_020_000, count: 5 }]],
      [2, [{ bucketStartEpochSec: 1_700_050_000, count: 4 }]],
      [3, [{ bucketStartEpochSec: 1_700_060_000, count: 2 }]],
    ]);

    const inputs: FullPopulationStkdeInputs = {
      grid,
      cellSupport,
      cellTemporalBuckets,
      eventCount: 16,
      stats: {
        scannedRows: 16,
        aggregatedCells: 3,
        queryMs: 12,
        chunks: 1,
      },
    };

    const result = computeStkdeFromAggregates(request, inputs, {
      requestedComputeMode: 'full-population',
      effectiveComputeMode: 'full-population',
      fullPopulationStats: {
        scannedRows: inputs.stats.scannedRows,
        aggregatedCells: inputs.stats.aggregatedCells,
        queryMs: inputs.stats.queryMs,
      },
    }).response;

    expect(result.meta.requestedComputeMode).toBe('full-population');
    expect(result.meta.effectiveComputeMode).toBe('full-population');
    expect(result.meta.fullPopulationStats).toEqual({
      scannedRows: 16,
      aggregatedCells: 3,
      queryMs: 12,
    });
    expect(result.meta.eventCount).toBe(16);
    expect(result.hotspots.length).toBeGreaterThan(0);
    expect(result.heatmap.cells.length).toBeGreaterThan(0);
  });

  test('uses temporal bandwidth to favor burstier cells in sampled mode', () => {
    const focusedValidation = validateAndNormalizeStkdeRequest({
      domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_604_800 },
      filters: {},
      params: {
        spatialBandwidthMeters: 100,
        temporalBandwidthHours: 1,
        gridCellMeters: 100,
        topK: 10,
        minSupport: 1,
        timeWindowHours: 12,
      },
      limits: {
        maxEvents: 1000,
        maxGridCells: 4000,
      },
    });

    if (!focusedValidation.ok || !focusedValidation.request) {
      throw new Error('focused test setup failed');
    }

    const clusteredPoint = { lat: 41.88, lon: -87.63 };
    const diffusePoint = { lat: 41.80, lon: -87.70 };
    const clusteredAndDiffuseCrimes: CrimeRecord[] = [
      { timestamp: 1_700_010_000, type: 'THEFT', ...clusteredPoint, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_010_600, type: 'THEFT', ...clusteredPoint, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_011_200, type: 'THEFT', ...clusteredPoint, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_011_800, type: 'THEFT', ...clusteredPoint, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_010_000, type: 'BATTERY', ...diffusePoint, x: 0, z: 0, district: '6', year: 2023, iucr: '0460' },
      { timestamp: 1_700_096_400, type: 'BATTERY', ...diffusePoint, x: 0, z: 0, district: '6', year: 2023, iucr: '0460' },
      { timestamp: 1_700_269_200, type: 'BATTERY', ...diffusePoint, x: 0, z: 0, district: '6', year: 2023, iucr: '0460' },
      { timestamp: 1_700_528_400, type: 'BATTERY', ...diffusePoint, x: 0, z: 0, district: '6', year: 2023, iucr: '0460' },
    ];

    const narrowRequest = focusedValidation.request;
    const wideRequest = {
      ...narrowRequest,
      params: {
        ...narrowRequest.params,
        temporalBandwidthHours: 168,
      },
    };

    const narrow = computeStkdeFromCrimes(narrowRequest, clusteredAndDiffuseCrimes).response;
    const wide = computeStkdeFromCrimes(wideRequest, clusteredAndDiffuseCrimes).response;

    const narrowClustered = findClosestHotspot(narrow.hotspots, clusteredPoint.lat, clusteredPoint.lon);
    const narrowDiffuse = findClosestHotspot(narrow.hotspots, diffusePoint.lat, diffusePoint.lon);
    const wideClustered = findClosestHotspot(wide.hotspots, clusteredPoint.lat, clusteredPoint.lon);
    const wideDiffuse = findClosestHotspot(wide.hotspots, diffusePoint.lat, diffusePoint.lon);

    expect(narrowClustered.intensityScore).toBeGreaterThan(narrowDiffuse.intensityScore);
    expect(wideClustered.intensityScore - wideDiffuse.intensityScore).toBeLessThan(
      narrowClustered.intensityScore - narrowDiffuse.intensityScore,
    );
  });

  test('uses temporal bandwidth to favor burstier cells in full-population mode', () => {
    const aggregateValidation = validateAndNormalizeStkdeRequest({
      domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_604_800 },
      filters: {},
      params: {
        spatialBandwidthMeters: 100,
        temporalBandwidthHours: 1,
        gridCellMeters: 100,
        topK: 10,
        minSupport: 1,
        timeWindowHours: 12,
      },
      limits: {
        maxEvents: 1000,
        maxGridCells: 4000,
      },
    });

    if (!aggregateValidation.ok || !aggregateValidation.request) {
      throw new Error('aggregate temporal setup failed');
    }

    const aggregateRequest = aggregateValidation.request;
    const grid = {
      bbox: [-87.94, 41.64, -87.52, 42.03] as [number, number, number, number],
      minLng: -87.94,
      minLat: 41.64,
      maxLng: -87.52,
      maxLat: 42.03,
      meanLat: 41.835,
      rows: 2,
      cols: 2,
      latCellDegrees: 0.195,
      lonCellDegrees: 0.21,
      coarsenFactor: 1,
    };

    const inputs: FullPopulationStkdeInputs = {
      grid,
      cellSupport: new Float64Array([4, 4, 0, 0]),
      cellTemporalBuckets: new Map([
        [0, [
          { bucketStartEpochSec: 1_700_010_000, count: 2 },
          { bucketStartEpochSec: 1_700_013_600, count: 2 },
        ]],
        [1, [
          { bucketStartEpochSec: 1_700_010_000, count: 1 },
          { bucketStartEpochSec: 1_700_182_800, count: 1 },
          { bucketStartEpochSec: 1_700_355_600, count: 1 },
          { bucketStartEpochSec: 1_700_528_400, count: 1 },
        ]],
      ]),
      eventCount: 8,
      stats: {
        scannedRows: 8,
        aggregatedCells: 2,
        queryMs: 5,
        chunks: 1,
      },
    };

    const narrow = computeStkdeFromAggregates(aggregateRequest, inputs).response;
    const wide = computeStkdeFromAggregates(
      {
        ...aggregateRequest,
        params: {
          ...aggregateRequest.params,
          temporalBandwidthHours: 168,
        },
      },
      inputs,
    ).response;

    expect(narrow.hotspots[0]?.centroidLng).toBeLessThan(narrow.hotspots[1]?.centroidLng ?? Infinity);
    expect((wide.hotspots[0]?.intensityScore ?? 0) - (wide.hotspots[1]?.intensityScore ?? 0)).toBeLessThan(
      (narrow.hotspots[0]?.intensityScore ?? 0) - (narrow.hotspots[1]?.intensityScore ?? 0),
    );
  });
});
