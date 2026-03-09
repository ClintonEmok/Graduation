import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureSortedCrimesTableMock,
  getDbMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  ensureSortedCrimesTableMock: vi.fn(),
  getDbMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('./db', () => ({
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
  getDb: getDbMock,
  isMockDataEnabled: isMockDataEnabledMock,
}));

import { buildNormalizedSqlExpression, CHICAGO_BOUNDS, lonLatToNormalized } from './coordinate-normalization';
import { queryCrimesInRange } from './queries';

describe('queries normalization parity', () => {
  beforeEach(() => {
    ensureSortedCrimesTableMock.mockReset();
    getDbMock.mockReset();
    isMockDataEnabledMock.mockReset();
  });

  it('keeps mock range records aligned with the shared normalization helper', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const records = await queryCrimesInRange(1000, 2000, {
      limit: 5,
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '11'],
    });

    expect(records).toHaveLength(5);
    for (const record of records) {
      expect(record.lon).toBeGreaterThanOrEqual(CHICAGO_BOUNDS.minLon);
      expect(record.lon).toBeLessThanOrEqual(CHICAGO_BOUNDS.maxLon);
      expect(record.lat).toBeGreaterThanOrEqual(CHICAGO_BOUNDS.minLat);
      expect(record.lat).toBeLessThanOrEqual(CHICAGO_BOUNDS.maxLat);

      const normalized = lonLatToNormalized(record.lon, record.lat);
      expect(record.x).toBeCloseTo(normalized.x, 6);
      expect(record.z).toBeCloseTo(normalized.z, 6);
    }
  });

  it('uses shared Chicago bounds in the SQL-backed range projection', async () => {
    isMockDataEnabledMock.mockReturnValue(false);
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');

    let capturedQuery = '';
    getDbMock.mockResolvedValue({
      all: vi.fn((query: string, callback: (err: Error | null, rows: unknown[]) => void) => {
        capturedQuery = query;
        callback(null, []);
      }),
    });

    await queryCrimesInRange(1000, 2000, { limit: 10, sampleStride: 1 });

    expect(capturedQuery).toContain(buildNormalizedSqlExpression('"Longitude"', 'lon'));
    expect(capturedQuery).toContain(buildNormalizedSqlExpression('"Latitude"', 'lat'));
    expect(capturedQuery).toContain(String(CHICAGO_BOUNDS.minLon));
    expect(capturedQuery).toContain(String(CHICAGO_BOUNDS.minLat));
  });
});
