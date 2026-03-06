import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  queryCrimesInRangeMock,
  queryCrimeCountMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
  queryCrimeCountMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
  queryCrimeCount: queryCrimeCountMock,
}));

vi.mock('@/lib/db', () => ({
  isMockDataEnabled: isMockDataEnabledMock,
}));

import { GET, buildBufferedRange, parseCsvFilterParam } from '@/app/api/crimes/range/route';

const makeRequest = (query: string) => new Request(`http://localhost/api/crimes/range?${query}`);

describe('/api/crimes/range GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryCrimesInRangeMock.mockReset();
    queryCrimeCountMock.mockReset();
    isMockDataEnabledMock.mockReset();
    isMockDataEnabledMock.mockReturnValue(false);
  });

  it('validates required parameters', async () => {
    const response = await GET(makeRequest('startEpoch=1000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('startEpoch and endEpoch'),
    });
  });

  it('validates integer epoch parameters', async () => {
    const response = await GET(makeRequest('startEpoch=abc&endEpoch=2000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('must be valid integers'),
    });
  });

  it('validates start before end', async () => {
    const response = await GET(makeRequest('startEpoch=2000&endEpoch=1000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('startEpoch must be less than endEpoch'),
    });
  });

  it('parses filters and returns buffer metadata contract', async () => {
    queryCrimeCountMock.mockResolvedValue(120);
    queryCrimesInRangeMock.mockResolvedValue([
      {
        timestamp: 1500,
        type: 'THEFT',
        lat: 41.8,
        lon: -87.6,
        x: 25,
        z: -10,
        iucr: '0820',
        district: '1',
        year: 2001,
      },
    ]);

    const response = await GET(
      makeRequest(
        'startEpoch=1000&endEpoch=2000&bufferDays=2&limit=10&crimeTypes=THEFT,%20BATTERY,,&districts=1,%202'
      )
    );

    expect(response.status).toBe(200);
    expect(queryCrimeCountMock).toHaveBeenCalledWith(-171800, 174800, {
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
    });
    expect(queryCrimesInRangeMock).toHaveBeenCalledWith(-171800, 174800, {
      limit: 10,
      sampleStride: 12,
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
    });

    const body = await response.json();
    expect(body.meta).toMatchObject({
      viewport: { start: 1000, end: 2000 },
      buffer: { days: 2, applied: { start: -171800, end: 174800 } },
      returned: 1,
      limit: 10,
      totalMatches: 120,
      sampled: true,
      sampleStride: 12,
    });
  });

  it('returns non-sampled metadata when total matches fit limit', async () => {
    queryCrimeCountMock.mockResolvedValue(3);
    queryCrimesInRangeMock.mockResolvedValue([]);

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&limit=10'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.sampled).toBe(false);
    expect(body.meta.sampleStride).toBe(1);
    expect(queryCrimesInRangeMock).toHaveBeenCalledWith(
      1000 - 30 * 86400,
      2000 + 30 * 86400,
      expect.objectContaining({ sampleStride: 1 })
    );
  });

  it('returns mock response with coordinate parity and mock metadata', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&bufferDays=1&limit=8'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.meta).toMatchObject({
      isMock: true,
      buffer: { days: 1, applied: { start: -85400, end: 88400 } },
      sampled: false,
      sampleStride: 1,
    });

    expect(body.data.length).toBeLessThanOrEqual(8);
    for (const record of body.data) {
      expect(typeof record.x).toBe('number');
      expect(typeof record.z).toBe('number');
      const expectedX = ((record.lon + 87.9) / 0.4) * 100 - 50;
      const expectedZ = ((record.lat - 41.6) / 0.5) * 100 - 50;
      expect(record.x).toBeCloseTo(expectedX, 6);
      expect(record.z).toBeCloseTo(expectedZ, 6);
    }
  });

  it('exposes pure helpers for deterministic parsing and buffering', () => {
    expect(parseCsvFilterParam(null)).toBeUndefined();
    expect(parseCsvFilterParam('THEFT, BATTERY,,')).toEqual(['THEFT', 'BATTERY']);
    expect(buildBufferedRange(1000, 2000, 3)).toEqual({
      bufferSeconds: 259200,
      bufferedStart: -258200,
      bufferedEnd: 261200,
    });
  });
});
