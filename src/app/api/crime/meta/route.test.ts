// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDatasetMetaTableMock,
  readDatasetMetadataMock,
  getDataPathMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  ensureDatasetMetaTableMock: vi.fn(),
  readDatasetMetadataMock: vi.fn(),
  getDataPathMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    ensureDatasetMetaTable: ensureDatasetMetaTableMock,
    readDatasetMetadata: readDatasetMetadataMock,
    getDataPath: getDataPathMock,
    isMockDataEnabled: isMockDataEnabledMock,
  };
});

import { existsSync } from 'fs';
import { GET } from '@/app/api/crime/meta/route';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

const mockedExistsSync = vi.mocked(existsSync);

describe('/api/crime/meta GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ensureDatasetMetaTableMock.mockReset();
    readDatasetMetadataMock.mockReset();
    getDataPathMock.mockReset();
    isMockDataEnabledMock.mockReset();
    mockedExistsSync.mockReset();
    isMockDataEnabledMock.mockReturnValue(false);
    getDataPathMock.mockReturnValue('/tmp/some/dataset.csv');
    mockedExistsSync.mockReturnValue(true);
    ensureDatasetMetaTableMock.mockResolvedValue('crime_dataset_meta');
  });

  it('returns the persisted metadata shape without exposing read_csv_auto or scan fields', async () => {
    readDatasetMetadataMock.mockResolvedValue({
      minTime: 1_700_000_000,
      maxTime: 1_700_086_400,
      minLat: 41.6,
      maxLat: 42.1,
      minLon: -87.9,
      maxLon: -87.5,
      count: 8_500_000,
      yearMin: 2001,
      yearMax: 2026,
      crimeTypes: ['ASSAULT', 'BATTERY', 'THEFT'],
      fingerprint: 'mtime:1700000000000:size:2355941663',
      builtAt: '2026-06-19T00:00:00.000Z',
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      minTime: 1_700_000_000,
      maxTime: 1_700_086_400,
      minLat: 41.6,
      maxLat: 42.1,
      minLon: -87.9,
      maxLon: -87.5,
      count: 8_500_000,
      crimeTypes: ['ASSAULT', 'BATTERY', 'THEFT'],
      yearRange: { min: 2001, max: 2026 },
      fingerprint: 'mtime:1700000000000:size:2355941663',
      builtAt: '2026-06-19T00:00:00.000Z',
    });

    // Backward-compat: every locked field is still present.
    expect(body).toHaveProperty('minTime');
    expect(body).toHaveProperty('maxTime');
    expect(body).toHaveProperty('minLat');
    expect(body).toHaveProperty('maxLat');
    expect(body).toHaveProperty('minLon');
    expect(body).toHaveProperty('maxLon');
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('crimeTypes');
    expect(body).toHaveProperty('yearRange');
    expect(body.yearRange).toHaveProperty('min');
    expect(body.yearRange).toHaveProperty('max');

    // The persisted read path was used exactly once.
    expect(ensureDatasetMetaTableMock).toHaveBeenCalledTimes(1);
    expect(readDatasetMetadataMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the persisted metadata table on repeat requests (no rebuild on second call)', async () => {
    readDatasetMetadataMock.mockResolvedValue({
      minTime: 1_700_000_000,
      maxTime: 1_700_086_400,
      minLat: 41.6,
      maxLat: 42.1,
      minLon: -87.9,
      maxLon: -87.5,
      count: 1,
      yearMin: 2024,
      yearMax: 2024,
      crimeTypes: ['THEFT'],
      fingerprint: 'mtime:0:size:0',
      builtAt: '2026-06-19T00:00:00.000Z',
    });

    await GET();
    await GET();
    await GET();

    // Each request still calls the bootstrap function, but the function
    // returns synchronously because the persisted table is reused; the
    // critical invariant is that we never re-scan the CSV or do per-request
    // aggregates.
    expect(ensureDatasetMetaTableMock).toHaveBeenCalledTimes(3);
    expect(readDatasetMetadataMock).toHaveBeenCalledTimes(3);
  });

  it('serves the mock fallback with X-Data-Warning when the database is disabled', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('database disabled');

    const body = await response.json();
    expect(body.isMock).toBe(true);
    expect(body).toHaveProperty('minTime');
    expect(body).toHaveProperty('crimeTypes');

    // No persisted-table reads when mock fallback fires.
    expect(ensureDatasetMetaTableMock).not.toHaveBeenCalled();
    expect(readDatasetMetadataMock).not.toHaveBeenCalled();
  });

  it('serves the mock fallback with X-Data-Warning when the dataset file is missing', async () => {
    mockedExistsSync.mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('dataset file not found');

    const body = await response.json();
    expect(body.isMock).toBe(true);
    expect(ensureDatasetMetaTableMock).not.toHaveBeenCalled();
  });

  it('serves the mock fallback with X-Data-Warning when the persisted read fails', async () => {
    readDatasetMetadataMock.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('metadata unavailable');

    const body = await response.json();
    expect(body.isMock).toBe(true);
  });
});
