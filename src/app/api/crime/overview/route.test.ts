// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  isMockDataEnabledMock: vi.fn(),
  readDatasetMetadataMock: vi.fn(),
  readOverviewBinsMock: vi.fn(),
  getDataPathMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  isMockDataEnabled: hoisted.isMockDataEnabledMock,
  readDatasetMetadata: hoisted.readDatasetMetadataMock,
  readOverviewBins: hoisted.readOverviewBinsMock,
  getDataPath: hoisted.getDataPathMock,
}));

vi.mock('fs', () => ({
  existsSync: hoisted.existsSyncMock,
}));

const { GET } = await import('./route');

describe('GET /api/crime/overview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoisted.isMockDataEnabledMock.mockReset();
    hoisted.readDatasetMetadataMock.mockReset();
    hoisted.readOverviewBinsMock.mockReset();
    hoisted.getDataPathMock.mockReset();
    hoisted.existsSyncMock.mockReset();

    hoisted.isMockDataEnabledMock.mockReturnValue(false);
    hoisted.readDatasetMetadataMock.mockResolvedValue({
      minTime: 1_700_000_000,
      maxTime: 1_700_086_400,
      minLat: 41.8,
      maxLat: 42.0,
      minLon: -87.8,
      maxLon: -87.5,
      count: 123,
      crimeTypes: ['ASSAULT', 'THEFT'],
      yearRange: { min: 2001, max: 2026 },
    });
    hoisted.readOverviewBinsMock.mockResolvedValue([
      { x0: 1_700_000_000, x1: 1_700_021_600, length: 1 },
      { x0: 1_700_043_200, x1: 1_700_064_800, length: 2 },
    ]);
    hoisted.getDataPathMock.mockReturnValue('/tmp/crimes.csv');
    hoisted.existsSyncMock.mockReturnValue(true);
  });

  test('returns bins from persisted DuckDB summary tables', async () => {
    const response = await GET(new Request('http://localhost/api/crime/overview?maxPoints=5'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      overviewBins: [
        { x0: 1_700_000_000, x1: 1_700_021_600, length: 1 },
        { x0: 1_700_043_200, x1: 1_700_064_800, length: 2 },
      ],
      timestampsSec: [1_700_010_800, 1_700_054_000],
      domain: { start: 1_700_000_000, end: 1_700_086_400 },
    });
    expect(hoisted.readDatasetMetadataMock).toHaveBeenCalledTimes(1);
    expect(hoisted.readOverviewBinsMock).toHaveBeenCalledWith(5);
  });

  test('returns mock overview when dataset file is missing', async () => {
    hoisted.existsSyncMock.mockReturnValue(false);

    const response = await GET(new Request('http://localhost/api/crime/overview'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('dataset file not found');
    await expect(response.json()).resolves.toMatchObject({ timestampsSec: expect.any(Array) });
  });

  test('returns mock overview when DuckDB read fails', async () => {
    hoisted.readOverviewBinsMock.mockRejectedValue(new Error('boom'));

    const response = await GET(new Request('http://localhost/api/crime/overview'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('database unavailable');
    await expect(response.json()).resolves.toMatchObject({ timestampsSec: expect.any(Array) });
  });
});
