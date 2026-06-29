import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lonLatToNormalized } from '@/lib/coordinate-normalization';

const {
  getDbMock,
  ensureSortedCrimesTableMock,
  isMockDataEnabledMock,
  getDataPathMock,
  existsSyncMock,
  queryCrimeCountMock,
  queryCrimesInRangeMock,
} = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  ensureSortedCrimesTableMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
  getDataPathMock: vi.fn(),
  existsSyncMock: vi.fn(),
  queryCrimeCountMock: vi.fn(),
  queryCrimesInRangeMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
  isMockDataEnabled: isMockDataEnabledMock,
  getDataPath: getDataPathMock,
}));

vi.mock('@/lib/queries', () => ({
  queryCrimeCount: queryCrimeCountMock,
  queryCrimesInRange: queryCrimesInRangeMock,
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
}));

import { GET, buildBufferedRange, parseCsvFilterParam } from '@/app/api/crimes/range/route';

const makeRequest = (query: string) => new Request(`http://localhost/api/crimes/range?${query}`);

describe('/api/crimes/range GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getDbMock.mockReset();
    ensureSortedCrimesTableMock.mockReset();
    isMockDataEnabledMock.mockReset();
    getDataPathMock.mockReset();
    existsSyncMock.mockReset();
    queryCrimeCountMock.mockReset();
    queryCrimesInRangeMock.mockReset();

    isMockDataEnabledMock.mockReturnValue(false);
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');
    getDataPathMock.mockReturnValue('/tmp/crimes.csv');
    existsSyncMock.mockReturnValue(true);
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

  it('returns exact paged rows with cursor metadata', async () => {
    let capturedSql = '';
    let capturedParams: unknown[] = [];

    getDbMock.mockResolvedValue({
      all: vi.fn((sql: string, ...args: unknown[]) => {
        capturedSql = sql;
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        capturedParams = args.slice(0, -1);
        callback(null, [
          {
            crime_row_id: 1,
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
          {
            crime_row_id: 2,
            timestamp: 1600,
            type: 'ASSAULT',
            lat: 41.81,
            lon: -87.61,
            x: 24,
            z: -9,
            iucr: '1310',
            district: '2',
            year: 2001,
          },
        ]);
      }),
    });

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=1&crimeTypes=THEFT,%20BATTERY&districts=1,2'));

    expect(response.status).toBe(200);
    expect(ensureSortedCrimesTableMock).toHaveBeenCalledTimes(1);
    expect(capturedSql).toContain('row_number() OVER');
    expect(capturedSql).toContain('crime_row_id');
    expect(capturedSql).toContain('ORDER BY timestamp, crime_row_id');
    expect(capturedParams).toEqual(expect.arrayContaining([1000, 2000, 'THEFT', 'BATTERY', '1', '2', 2]));

    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: '1',
      timestamp: 1500,
      type: 'THEFT',
      district: '1',
    });
    expect(body.meta).toMatchObject({
      viewport: { start: 1000, end: 2000 },
      pageSize: 1,
      returned: 1,
      hasMore: true,
      requiresNarrowing: false,
      sampled: false,
      sampleStride: 1,
    });
    expect(body.meta.nextCursor).toBe('1500:1');
  });

  it('returns sampled rows and prompts narrowing for over-broad exact ranges', async () => {
    queryCrimeCountMock.mockResolvedValue(100);
    queryCrimesInRangeMock.mockResolvedValue([
      { timestamp: 1500, type: 'THEFT', lat: 41.8, lon: -87.6, x: 25, z: -10, iucr: '0820', district: '1', year: 2001 },
      { timestamp: 1600, type: 'ASSAULT', lat: 41.81, lon: -87.61, x: 24, z: -9, iucr: '1310', district: '2', year: 2001 },
    ]);

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=40000000&pageSize=10'));

    expect(response.status).toBe(200);
    expect(queryCrimeCountMock).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ crimeTypes: undefined, districts: undefined })
    );
    expect(queryCrimesInRangeMock).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ sampleStride: 10, limit: 10 })
    );

    const body = await response.json();
    expect(body.meta).toMatchObject({
      requiresNarrowing: true,
      sampled: true,
      sampleStride: 10,
      totalMatches: 100,
      returned: 2,
      hasMore: false,
    });
    expect(body.data).toHaveLength(2);
  });

  it('returns mock responses with coordinate parity', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=8'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.meta).toMatchObject({
      isMock: true,
      pageSize: 8,
      returned: 8,
      sampled: false,
      sampleStride: 1,
      hasMore: true,
      requiresNarrowing: false,
    });

    expect(body.data.length).toBeLessThanOrEqual(8);
    expect(body.meta.nextCursor).toEqual(expect.any(String));
    for (const record of body.data) {
      expect(typeof record.x).toBe('number');
      expect(typeof record.z).toBe('number');
      const expected = lonLatToNormalized(record.lon, record.lat);
      expect(record.x).toBeCloseTo(expected.x, 6);
      expect(record.z).toBeCloseTo(expected.z, 6);
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
