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
import {
  buildCrimeCountQuery,
  buildCrimesInRangeQuery,
  buildDensityBinsQuery,
  buildGlobalAdaptiveCacheQueries,
} from './queries/index';
import * as queriesFacade from './queries';
import { getOrCreateGlobalAdaptiveMaps, queryCrimeCount, queryCrimesInRange, queryDensityBins } from './queries';

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

describe('aggregation decomposition compatibility and safety', () => {
  beforeEach(() => {
    ensureSortedCrimesTableMock.mockReset();
    getDbMock.mockReset();
    isMockDataEnabledMock.mockReset();
  });

  it('keeps facade exports callable for API consumers', () => {
    expect(typeof queriesFacade.queryCrimesInRange).toBe('function');
    expect(typeof queriesFacade.queryCrimeCount).toBe('function');
    expect(typeof queriesFacade.queryDensityBins).toBe('function');
    expect(typeof queriesFacade.getOrCreateGlobalAdaptiveMaps).toBe('function');
    expect(typeof queriesFacade.buildCrimeCoordinateSelectColumns).toBe('function');
  });

  it('builds adaptive-cache persistence queries with bound values', () => {
    const built = buildGlobalAdaptiveCacheQueries('adaptive_global_cache', {
      cacheKey: "global:60:8' OR 1=1 --",
      binCount: 60,
      kernelWidth: 8,
      binningMode: 'uniform-time',
      domain: [10, 20],
      rowCount: 42,
      densityJson: '[0.1,0.2]',
      countJson: '[1,2]',
      burstJson: '[0.3,0.4]',
      warpJson: '[10,15]',
    });

    expect(built.readByKey.sql).toContain('WHERE cache_key = ?');
    expect(built.readByKey.sql).not.toContain("global:60:8' OR 1=1 --");
    expect(built.readByKey.params).toEqual(["global:60:8' OR 1=1 --"]);
    expect(built.insert.sql).toContain('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    expect(built.insert.params).toEqual([
      "global:60:8' OR 1=1 --",
      60,
      8,
      'uniform-time',
      10,
      20,
      42,
      '[0.1,0.2]',
      '[1,2]',
      '[0.3,0.4]',
      '[10,15]',
    ]);
  });

  it('uses mode-sensitive cache keys and defaults mode to uniform-time', async () => {
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');

    const all = vi.fn((query: string, ...args: unknown[]) => {
      const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void;
      if (query.includes('WHERE cache_key = ?')) {
        callback(null, [
          {
            domain_start: 10,
            domain_end: 20,
            row_count: 100,
            density_json: '[0.1,0.2]',
            count_json: null,
            burstiness_json: '[0.3,0.4]',
            warp_json: '[11,19]',
            binning_mode: null,
            generated_at: '2026-03-11T00:00:00.000Z',
          },
        ]);
        return;
      }
      callback(null, []);
    });
    const run = vi.fn((_query: string, ...args: unknown[]) => {
      const callback = args.at(-1) as (err: Error | null) => void;
      callback(null);
    });

    getDbMock.mockResolvedValue({ all, run });

    const result = await getOrCreateGlobalAdaptiveMaps(128, 2);
    const readCall = all.mock.calls.find(([query]) => (query as string).includes('WHERE cache_key = ?'));
    const params = (readCall?.slice(1, -1) ?? []) as unknown[];

    expect(params[0]).toBe('global:128:2:uniform-time');
    expect(result.binningMode).toBe('uniform-time');
    expect(result.countMap[0]).toBeCloseTo(0.1, 6);
    expect(result.countMap[1]).toBeCloseTo(0.2, 6);
  });

  it('returns stable map contract for explicit uniform-events mode', async () => {
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');

    const all = vi.fn((query: string, ...args: unknown[]) => {
      const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void;
      if (query.includes('WHERE cache_key = ?')) {
        callback(null, [
          {
            domain_start: 5,
            domain_end: 25,
            row_count: 8,
            density_json: '[0.5,0.25,0.0]',
            count_json: '[3,3,2]',
            burstiness_json: '[0.1,0.2,0.3]',
            warp_json: '[5,12,25]',
            binning_mode: 'uniform-events',
            generated_at: '2026-03-11T00:00:00.000Z',
          },
        ]);
        return;
      }
      callback(null, []);
    });
    const run = vi.fn((_query: string, ...args: unknown[]) => {
      const callback = args.at(-1) as (err: Error | null) => void;
      callback(null);
    });

    getDbMock.mockResolvedValue({ all, run });

    const result = await getOrCreateGlobalAdaptiveMaps(256, 4, 'uniform-events');
    const readCall = all.mock.calls.find(([query]) => (query as string).includes('WHERE cache_key = ?'));
    const params = (readCall?.slice(1, -1) ?? []) as unknown[];

    expect(params[0]).toBe('global:256:4:uniform-events');
    expect(result.binningMode).toBe('uniform-events');
    expect(result).toHaveProperty('densityMap');
    expect(result).toHaveProperty('countMap');
    expect(result).toHaveProperty('burstinessMap');
    expect(result).toHaveProperty('warpMap');
    expect(Array.from(result.countMap)).toEqual([3, 3, 2]);
  });

  it('clamps density resolutions and keeps epoch filters parameterized', () => {
    const built = buildDensityBinsQuery('crimes_sorted', 1000, 2000, -5, 25000, 0);

    expect(built.sql).toContain('EXTRACT(EPOCH FROM "Date") >= ?');
    expect(built.sql).toContain('EXTRACT(EPOCH FROM "Date") <= ?');
    expect(built.params).toEqual([1, 978307200, 1767225600, 978307200, 1000, 1, 1000, 2000, 1, 1000, 1, 1, 1000, 1]);
  });

  it('executes density-bin facade queries with builder params', async () => {
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');
    let capturedArgs: unknown[] = [];

    getDbMock.mockResolvedValue({
      all: vi.fn((_query: string, ...args: unknown[]) => {
        capturedArgs = args;
        const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void;
        callback(null, []);
      }),
    });

    await expect(queryDensityBins(1000, 2000, 50, 60, 70)).resolves.toEqual([]);
    expect(capturedArgs.slice(0, -1)).toEqual([
      50,
      978307200,
      1767225600,
      978307200,
      60,
      70,
      1000,
      2000,
      50,
      60,
      70,
      50,
      60,
      70,
    ]);
  });
});
