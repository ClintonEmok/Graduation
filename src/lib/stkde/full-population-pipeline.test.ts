import { beforeEach, describe, expect, test, vi } from 'vitest';

const { getDbMock, ensureSortedCrimesTableMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  ensureSortedCrimesTableMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
}));

import { buildFullPopulationStkdeInputs } from './full-population-pipeline';
import { validateAndNormalizeStkdeRequest } from './contracts';

const validation = validateAndNormalizeStkdeRequest({
  computeMode: 'full-population',
  callerIntent: 'stkde',
  domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
  filters: {},
  params: {
    spatialBandwidthMeters: 800,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 5,
    minSupport: 1,
    timeWindowHours: 12,
  },
  limits: {
    maxEvents: 1000,
    maxGridCells: 4000,
  },
  guardrails: {
    fullPopulationMaxSpanDays: 90,
    fullPopulationTimeoutMs: 5000,
  },
});

if (!validation.ok || !validation.request) {
  throw new Error('test setup failed');
}

const request = validation.request;

describe('buildFullPopulationStkdeInputs', () => {
  beforeEach(() => {
    getDbMock.mockReset();
    ensureSortedCrimesTableMock.mockReset();
  });

  test('builds aggregate inputs from chunked SQL pages', async () => {
    const allMock = vi
      .fn()
      .mockImplementationOnce((_sql: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        callback(null, [{ count: 9 }]);
      })
      .mockImplementationOnce((_sql: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        callback(null, [
          { row_idx: 1, col_idx: 1, bucket_start: 1_700_010_000, bucket_count: 4 },
          { row_idx: 1, col_idx: 1, bucket_start: 1_700_020_000, bucket_count: 3 },
        ]);
      })
      .mockImplementationOnce((_sql: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        callback(null, [{ row_idx: 0, col_idx: 0, bucket_start: 1_700_040_000, bucket_count: 2 }]);
      });

    getDbMock.mockResolvedValue({ all: allMock });
    ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');

    const inputs = await buildFullPopulationStkdeInputs(request, { chunkSize: 2 });

    expect(inputs.stats.scannedRows).toBe(9);
    expect(inputs.eventCount).toBe(9);
    expect(inputs.stats.chunks).toBe(2);
    expect(inputs.stats.aggregatedCells).toBe(2);
    expect(Array.from(inputs.cellSupport).reduce((sum, value) => sum + value, 0)).toBe(9);

    const supportAt11 = inputs.cellSupport[inputs.grid.cols + 1];
    expect(supportAt11).toBe(7);
    const supportAt00 = inputs.cellSupport[0];
    expect(supportAt00).toBe(2);

    expect(allMock).toHaveBeenCalledTimes(3);
    const firstSql = allMock.mock.calls[0]?.[0];
    const aggregateSql = allMock.mock.calls[1]?.[0];
    expect(String(firstSql)).toMatch(/SELECT COUNT\(\*\) as count/);
    expect(String(aggregateSql)).toMatch(/GROUP BY 1, 2, 3/);
    expect(String(aggregateSql)).not.toMatch(/SELECT\s+EXTRACT\(EPOCH FROM "Date"\) as timestamp,\s+"Primary Type"/);
  });
});
