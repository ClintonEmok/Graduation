import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryCrimesInRangeMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));

import { POST } from '@/app/api/stkde/hotspots/route';

describe('/api/stkde/hotspots POST', () => {
  beforeEach(() => {
    queryCrimesInRangeMock.mockReset();
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

  it('clamps unsafe params and returns deterministic hotspot payload', async () => {
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
    expect(body.meta.fallbackApplied).toMatch(/clamps:/);
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
  });
});
