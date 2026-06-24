// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  isMockDataEnabledMock: vi.fn(),
  readDatasetMetadataMock: vi.fn(),
  getDataPathMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  isMockDataEnabled: hoisted.isMockDataEnabledMock,
  readDatasetMetadata: hoisted.readDatasetMetadataMock,
  getDataPath: hoisted.getDataPathMock,
}));

vi.mock('fs', () => ({
  existsSync: hoisted.existsSyncMock,
}));

const { GET } = await import('./route');

describe('GET /api/crime/meta', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoisted.isMockDataEnabledMock.mockReset();
    hoisted.readDatasetMetadataMock.mockReset();
    hoisted.getDataPathMock.mockReset();
    hoisted.existsSyncMock.mockReset();

    hoisted.isMockDataEnabledMock.mockReturnValue(false);
    hoisted.getDataPathMock.mockReturnValue('/tmp/crimes.csv');
    hoisted.existsSyncMock.mockReturnValue(true);
  });

  test('returns persisted metadata when DuckDB is available', async () => {
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

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
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
  });

  test('returns mock metadata when dataset file is missing', async () => {
    hoisted.existsSyncMock.mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('dataset file not found');
    await expect(response.json()).resolves.toMatchObject({ isMock: true });
  });

  test('returns mock metadata when persisted read fails', async () => {
    hoisted.readDatasetMetadataMock.mockRejectedValue(new Error('boom'));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('database unavailable');
    await expect(response.json()).resolves.toMatchObject({ isMock: true });
  });
});
