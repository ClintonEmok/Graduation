import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryCrimesInRangeMock, buildFullPopulationStkdeInputsMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
  buildFullPopulationStkdeInputsMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));

vi.mock('@/lib/stkde/full-population-pipeline', () => ({
  buildFullPopulationStkdeInputs: buildFullPopulationStkdeInputsMock,
}));

import { POST } from '@/app/api/stkde/hotspots/route';

describe('/api/stkde/hotspots POST', () => {
  beforeEach(() => {
    queryCrimesInRangeMock.mockReset();
    buildFullPopulationStkdeInputsMock.mockReset();
    process.env.STKDE_QA_FULL_POP_ENABLED = 'true';
  });

  it('rejects malformed request payload', async () => {
    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: { startEpochSec: 1000 } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/domain/);
  });

  it('defaults to sampled mode when computeMode is omitted', async () => {
    queryCrimesInRangeMock.mockResolvedValue([
      { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_011_000, type: 'THEFT', lat: 41.8805, lon: -87.631, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 1_700_012_000, type: 'BATTERY', lat: 41.8795, lon: -87.632, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
    ]);

    const payload = {
      domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
      filters: {},
      params: {
        spatialBandwidthMeters: 50,
        temporalBandwidthHours: 500,
        gridCellMeters: 50,
        topK: 500,
        minSupport: 0,
        timeWindowHours: 500,
      },
      limits: {
        maxEvents: 200000,
        maxGridCells: 999999,
      },
    };

    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contracts.scoreVersion).toBe('stkde-v1');
    expect(body.meta.computeMs).toBeTypeOf('number');
    expect(body.meta.requestedComputeMode).toBe('sampled');
    expect(body.meta.effectiveComputeMode).toBe('sampled');
    expect(body.meta.clampsApplied.length).toBeGreaterThan(0);
    expect(body.hotspots.length).toBeGreaterThan(0);
    expect(body.hotspots[0]).toMatchObject({
      id: expect.any(String),
      centroidLng: expect.any(Number),
      centroidLat: expect.any(Number),
      intensityScore: expect.any(Number),
      supportCount: expect.any(Number),
      peakStartEpochSec: expect.any(Number),
      peakEndEpochSec: expect.any(Number),
      radiusMeters: expect.any(Number),
    });

    expect(queryCrimesInRangeMock).toHaveBeenCalledWith(
      1_700_000_000,
      1_700_086_400,
      expect.objectContaining({
        limit: 50000,
      }),
    );
    expect(buildFullPopulationStkdeInputsMock).not.toHaveBeenCalled();
  });

  it('uses full-population aggregate pipeline when requested by /stkde caller', async () => {
    buildFullPopulationStkdeInputsMock.mockResolvedValue({
      grid: {
        bbox: [-87.94, 41.64, -87.52, 42.03],
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
      },
      cellSupport: new Float64Array([6, 0, 0, 2]),
      cellTemporalBuckets: new Map([
        [0, [{ bucketStartEpochSec: 1_700_010_000, count: 6 }]],
        [3, [{ bucketStartEpochSec: 1_700_050_000, count: 2 }]],
      ]),
      eventCount: 8,
      stats: {
        scannedRows: 8,
        aggregatedCells: 2,
        queryMs: 15,
        chunks: 1,
      },
    });

    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        computeMode: 'full-population',
        callerIntent: 'stkde',
        domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
        filters: {},
        params: {
          spatialBandwidthMeters: 750,
          temporalBandwidthHours: 24,
          gridCellMeters: 500,
          topK: 12,
          minSupport: 1,
          timeWindowHours: 24,
        },
        limits: {
          maxEvents: 50000,
          maxGridCells: 12000,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.requestedComputeMode).toBe('full-population');
    expect(body.meta.effectiveComputeMode).toBe('full-population');
    expect(body.meta.fullPopulationStats).toEqual({ scannedRows: 8, aggregatedCells: 2, queryMs: 15 });
    expect(queryCrimesInRangeMock).not.toHaveBeenCalled();
    expect(buildFullPopulationStkdeInputsMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to sampled mode when full-population span exceeds guardrail', async () => {
    queryCrimesInRangeMock.mockResolvedValue([
      { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
    ]);

    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        computeMode: 'full-population',
        callerIntent: 'stkde',
        domain: { startEpochSec: 1_600_000_000, endEpochSec: 1_700_000_000 },
        filters: {},
        params: {
          spatialBandwidthMeters: 750,
          temporalBandwidthHours: 24,
          gridCellMeters: 500,
          topK: 12,
          minSupport: 1,
          timeWindowHours: 24,
        },
        limits: {
          maxEvents: 50000,
          maxGridCells: 12000,
        },
        guardrails: {
          fullPopulationMaxSpanDays: 1,
          fullPopulationTimeoutMs: 20_000,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.requestedComputeMode).toBe('full-population');
    expect(body.meta.effectiveComputeMode).toBe('sampled');
    expect(body.meta.fallbackApplied).toContain('full-pop-span-cap');
    expect(buildFullPopulationStkdeInputsMock).not.toHaveBeenCalled();
    expect(queryCrimesInRangeMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to sampled mode when full-population aggregation times out', async () => {
    buildFullPopulationStkdeInputsMock.mockRejectedValue(new Error('full-pop-timeout'));
    queryCrimesInRangeMock.mockResolvedValue([
      { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
    ]);

    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        computeMode: 'full-population',
        callerIntent: 'stkde',
        domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
        filters: {},
        params: {
          spatialBandwidthMeters: 750,
          temporalBandwidthHours: 24,
          gridCellMeters: 500,
          topK: 12,
          minSupport: 1,
          timeWindowHours: 24,
        },
        limits: {
          maxEvents: 50000,
          maxGridCells: 12000,
        },
        guardrails: {
          fullPopulationMaxSpanDays: 180,
          fullPopulationTimeoutMs: 3456,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.requestedComputeMode).toBe('full-population');
    expect(body.meta.effectiveComputeMode).toBe('sampled');
    expect(body.meta.fallbackApplied).toContain('full-pop-timeout');
    expect(body.meta.fullPopulationStats).toEqual({
      scannedRows: 0,
      aggregatedCells: 0,
      queryMs: 3456,
    });
    expect(queryCrimesInRangeMock).toHaveBeenCalledTimes(1);
  });
});
