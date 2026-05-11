import { describe, expect, it, vi } from 'vitest';
import {
  allocateSlices,
  computeSpatialBBinned,
  fetchBurstBins,
  resolveBurstMetricValue,
} from './burst-detection';

describe('computeSpatialBBinned', () => {
  const clusteredPoints = [
    { x: 0, z: 0 },
    { x: 0.1, z: 0.1 },
    { x: 0.2, z: 0.2 },
    { x: 0.3, z: 0.3 },
  ];

  it('keeps the balanced composite from collapsing when surprise is tiny', () => {
    const score = computeSpatialBBinned(clusteredPoints, clusteredPoints);

    expect(score).toBeCloseTo(0.25, 5);
  });

  it('supports ann, entropy, and js divergence formulas', () => {
    const baselinePoints = [
      { x: 0, z: 0 },
      { x: 18, z: 18 },
      { x: -18, z: -18 },
      { x: 24, z: -24 },
      { x: -24, z: 24 },
      { x: 30, z: 0 },
      { x: 0, z: 30 },
    ];

    const annScore = computeSpatialBBinned(clusteredPoints, baselinePoints, 'ann');
    const entropyScore = computeSpatialBBinned(clusteredPoints, clusteredPoints, 'entropy');
    const jsScore = computeSpatialBBinned(clusteredPoints, clusteredPoints, 'js-divergence');

    expect(annScore).toBeGreaterThan(0.9);
    expect(entropyScore).toBeCloseTo(1, 5);
    expect(jsScore).toBeCloseTo(0, 5);
  });

  it('reacts to a different baseline with js divergence', () => {
    const points = [
      { x: 0, z: 0 },
      { x: 0.1, z: 0.1 },
      { x: 0.2, z: 0.2 },
      { x: 0.3, z: 0.3 },
    ];

    const baselinePoints = [
      { x: 0, z: 0 },
      { x: 18, z: 18 },
      { x: -18, z: -18 },
      { x: 24, z: -24 },
      { x: -24, z: 24 },
      { x: 30, z: 0 },
      { x: 0, z: 30 },
    ];

    const score = computeSpatialBBinned(points, baselinePoints, 'js-divergence');

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('burst metric selection', () => {
  const bins = [
    { startEpoch: 0, endEpoch: 10, recordCount: 12, temporalB: 0.9, spatialB: 0.1, combinedB: 0.5 },
    { startEpoch: 10, endEpoch: 20, recordCount: 8, temporalB: 0.1, spatialB: 0.9, combinedB: 0.5 },
  ];

  it('resolves the requested metric from each burst bin', () => {
    expect(resolveBurstMetricValue(bins[0], 'temporal')).toBe(0.9);
    expect(resolveBurstMetricValue(bins[0], 'spatial')).toBe(0.1);
    expect(resolveBurstMetricValue(bins[0], 'combined')).toBe(0.5);
  });

  it('allocates slices according to the selected burst metric', () => {
    expect(allocateSlices(bins, 6, 'temporal')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 5 },
      { sourceBinIndex: 1, slicesAllocated: 1 },
    ]);

    expect(allocateSlices(bins, 6, 'spatial')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 1 },
      { sourceBinIndex: 1, slicesAllocated: 5 },
    ]);

    expect(allocateSlices(bins, 6, 'combined')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 3 },
      { sourceBinIndex: 1, slicesAllocated: 3 },
    ]);
  });
});

describe('fetchBurstBins', () => {
  it('fetches and preserves burst bins across multiple partitions', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(String(input));
      const body = (await request.clone().json()) as { partitions?: Array<{ startEpoch: number }> };

      return {
        ok: true,
        json: async () => ({
          bins: body.partitions?.map((partition) => ({
            startEpoch: partition.startEpoch,
            endEpoch: partition.startEpoch + 10,
            recordCount: 4,
            temporalB: 0.2,
            spatialB: 0.3,
            combinedB: 0.25,
          })) ?? [],
          targetSliceCount: (body.partitions?.length ?? 0) * 6,
          totalB: 0.75,
        }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchBurstBins({
      partitions: [
        { startEpoch: 0, endEpoch: 10 },
        { startEpoch: 10, endEpoch: 20 },
        { startEpoch: 20, endEpoch: 30 },
      ],
      granularity: 'daily',
      spatialFormula: 'balanced',
    });

    expect(result.bins).toHaveLength(3);
    expect(result.bins.map((bin) => bin.startEpoch)).toEqual([0, 10, 20]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('compacts oversized partition scans before requesting', async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          bins: Array.from({ length: 7 }, (_, index) => ({
            startEpoch: index * 10,
            endEpoch: index * 10 + 10,
            recordCount: 4,
            temporalB: 0.2,
            spatialB: 0.3,
            combinedB: 0.25,
          })),
          targetSliceCount: 42,
          totalB: 0.75,
        }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchBurstBins({
      partitions: Array.from({ length: 13 }, (_, index) => ({
        startEpoch: index * 10,
        endEpoch: index * 10 + 10,
      })),
      granularity: 'daily',
      spatialFormula: 'balanced',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.bins).toHaveLength(7);
  });
});
