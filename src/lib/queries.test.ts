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
import { buildCrimeCountQuery, buildCrimesInRangeQuery } from './queries/index';
import { queryCrimeCount, queryCrimesInRange } from './queries';

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
    let capturedArgs: unknown[] = [];
    getDbMock.mockResolvedValue({
      all: vi.fn((query: string, ...args: unknown[]) => {
        capturedQuery = query;
        capturedArgs = args;
        const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void;
        callback(null, []);
      }),
    });

    await queryCrimesInRange(1000, 2000, { limit: 10, sampleStride: 1 });

    expect(capturedQuery).toContain(buildNormalizedSqlExpression('"Longitude"', 'lon'));
    expect(capturedQuery).toContain(buildNormalizedSqlExpression('"Latitude"', 'lat'));
    expect(capturedQuery).toContain(String(CHICAGO_BOUNDS.minLon));
    expect(capturedQuery).toContain(String(CHICAGO_BOUNDS.minLat));
    expect(capturedArgs.slice(0, -1)).toEqual([1000, 2000, 10]);
  });
});

describe('hot-path query parameterization', () => {
  it('builds crimes-in-range SQL with placeholder-aligned params for combined filters', () => {
    const built = buildCrimesInRangeQuery('crimes_sorted', 1000, 2000, {
      limit: 25,
      sampleStride: 3,
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
    });

    expect(built.sql).toContain('EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?');
    expect(built.sql).toContain('"Primary Type" IN (?, ?)');
    expect(built.sql).toContain('"District" IN (?, ?)');
    expect(built.sql).toContain('WHERE ((rn - 1) % ?) = 0');
    expect(built.sql).toContain('LIMIT ?');
    expect(built.params).toEqual([1000, 2000, 'THEFT', 'BATTERY', '1', '2', 3, 25]);
  });

  it('builds crime-count SQL with ordered params when optional filters are combined', () => {
    const built = buildCrimeCountQuery('crimes_sorted', 3000, 4000, {
      crimeTypes: ['ROBBERY'],
      districts: ['7', '8'],
    });

    expect(built.sql).toContain('COUNT(*) as count');
    expect(built.sql).toContain('"Primary Type" IN (?)');
    expect(built.sql).toContain('"District" IN (?, ?)');
    expect(built.params).toEqual([3000, 4000, 'ROBBERY', '7', '8']);
  });

  it('executes count queries with builder-provided params', async () => {
    isMockDataEnabledMock.mockReturnValue(false);
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');

    let capturedArgs: unknown[] = [];
    getDbMock.mockResolvedValue({
      all: vi.fn((_query: string, ...args: unknown[]) => {
        capturedArgs = args;
        const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void;
        callback(null, [{ count: 42 }]);
      }),
    });

    await expect(
      queryCrimeCount(5000, 6000, {
        crimeTypes: ['THEFT'],
        districts: ['12'],
      })
    ).resolves.toBe(42);

    expect(capturedArgs.slice(0, -1)).toEqual([5000, 6000, 'THEFT', '12']);
  });
});
