// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureOverviewBinsTableMock,
  readOverviewBinsMock,
  getDataPathMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  ensureOverviewBinsTableMock: vi.fn(),
  readOverviewBinsMock: vi.fn(),
  getDataPathMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    ensureOverviewBinsTable: ensureOverviewBinsTableMock,
    readOverviewBins: readOverviewBinsMock,
    getDataPath: getDataPathMock,
    isMockDataEnabled: isMockDataEnabledMock,
  };
});

import { existsSync } from 'fs';
import { GET } from '@/app/api/crime/overview/route';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

const mockedExistsSync = vi.mocked(existsSync);

const makeRequest = (query: string) =>
  new Request(`http://localhost/api/crime/overview?${query}`);

describe('/api/crime/overview GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ensureOverviewBinsTableMock.mockReset();
    readOverviewBinsMock.mockReset();
    getDataPathMock.mockReset();
    isMockDataEnabledMock.mockReset();
    mockedExistsSync.mockReset();
    isMockDataEnabledMock.mockReturnValue(false);
    getDataPathMock.mockReturnValue('/tmp/some/dataset.csv');
    mockedExistsSync.mockReturnValue(true);
    ensureOverviewBinsTableMock.mockResolvedValue('crime_overview_bins_medium');
  });

  it('returns server-binned counts with explicit domain metadata and no timestampsSec', async () => {
    readOverviewBinsMock.mockResolvedValue({
      domain: {
        startEpoch: 1_700_000_000,
        endEpoch: 1_700_086_400,
        binCount: 200,
        binSizeSec: 432,
      },
      bins: [
        { binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_000_432, count: 5 },
        { binIndex: 1, startEpoch: 1_700_000_432, endEpoch: 1_700_000_864, count: 12 },
        { binIndex: 2, startEpoch: 1_700_000_864, endEpoch: 1_700_001_296, count: 0 },
      ],
      filter: { crimeTypes: [], districts: [] },
      fingerprint: 'mtime:1700000000000:size:2355941663',
      builtAt: '2026-06-19T00:00:00.000Z',
    });

    const response = await GET(makeRequest('maxPoints=5'));
    expect(response.status).toBe(200);
    const body = await response.json();

    // The legacy `timestampsSec` field must no longer be present.
    expect(body).not.toHaveProperty('timestampsSec');

    expect(body.domain).toEqual({
      startEpoch: 1_700_000_000,
      endEpoch: 1_700_086_400,
      binCount: 200,
      binSizeSec: 432,
    });
    expect(body.bins).toHaveLength(3);
    expect(body.bins[0]).toEqual({
      binIndex: 0,
      startEpoch: 1_700_000_000,
      endEpoch: 1_700_000_432,
      count: 5,
    });
    expect(body.fingerprint).toBe('mtime:1700000000000:size:2355941663');
    expect(body.filter).toEqual({ crimeTypes: [], districts: [] });

    expect(ensureOverviewBinsTableMock).toHaveBeenCalledTimes(1);
    expect(readOverviewBinsMock).toHaveBeenCalledWith({ crimeTypes: [], districts: [] });
  });

  it('passes parsed crime-type and district filters to the persisted read', async () => {
    readOverviewBinsMock.mockResolvedValue({
      domain: { startEpoch: 0, endEpoch: 1, binCount: 1, binSizeSec: 1 },
      bins: [],
      filter: { crimeTypes: ['THEFT'], districts: ['1'] },
      fingerprint: 'mtime:0:size:0',
      builtAt: '',
    });

    const response = await GET(makeRequest('crimeTypes=THEFT,%20BATTERY,,&districts=1,%202'));
    expect(response.status).toBe(200);
    expect(readOverviewBinsMock).toHaveBeenCalledWith({
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
    });
  });

  it('only varies when crime-type or district filters change (does not consume viewport params)', async () => {
    readOverviewBinsMock.mockResolvedValue({
      domain: { startEpoch: 0, endEpoch: 1, binCount: 1, binSizeSec: 1 },
      bins: [],
      filter: { crimeTypes: [], districts: [] },
      fingerprint: 'mtime:0:size:0',
      builtAt: '',
    });

    await GET(makeRequest('minLat=41.6&maxLat=42.1&minLon=-87.9&maxLon=-87.5'));
    await GET(makeRequest('minLat=41.7&maxLat=42.0&minLon=-87.85&maxLon=-87.55'));

    // Viewport params must NOT influence the persisted read; both calls
    // resolve to the same empty-filter read.
    expect(readOverviewBinsMock).toHaveBeenNthCalledWith(1, { crimeTypes: [], districts: [] });
    expect(readOverviewBinsMock).toHaveBeenNthCalledWith(2, { crimeTypes: [], districts: [] });
  });

  it('reuses the persisted overview bins table on repeat requests', async () => {
    readOverviewBinsMock.mockResolvedValue({
      domain: { startEpoch: 0, endEpoch: 1, binCount: 1, binSizeSec: 1 },
      bins: [],
      filter: { crimeTypes: [], districts: [] },
      fingerprint: 'mtime:0:size:0',
      builtAt: '',
    });

    await GET(makeRequest(''));
    await GET(makeRequest(''));
    await GET(makeRequest(''));

    expect(ensureOverviewBinsTableMock).toHaveBeenCalledTimes(3);
    expect(readOverviewBinsMock).toHaveBeenCalledTimes(3);
  });

  it('serves the mock fallback with X-Data-Warning when the database is disabled', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const response = await GET(makeRequest(''));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('database disabled');

    const body = await response.json();
    expect(body.isMock).toBe(true);
    expect(body).not.toHaveProperty('timestampsSec');
    expect(body).toHaveProperty('domain');
    expect(body).toHaveProperty('bins');

    expect(ensureOverviewBinsTableMock).not.toHaveBeenCalled();
    expect(readOverviewBinsMock).not.toHaveBeenCalled();
  });

  it('serves the mock fallback with X-Data-Warning when the dataset file is missing', async () => {
    mockedExistsSync.mockReturnValue(false);

    const response = await GET(makeRequest(''));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('dataset file not found');

    const body = await response.json();
    expect(body.isMock).toBe(true);
    expect(ensureOverviewBinsTableMock).not.toHaveBeenCalled();
  });

  it('serves the mock fallback with X-Data-Warning when the persisted read fails', async () => {
    readOverviewBinsMock.mockResolvedValue(null);

    const response = await GET(makeRequest(''));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('overview unavailable');

    const body = await response.json();
    expect(body.isMock).toBe(true);
  });
});
