// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  isMockDataEnabledMock: vi.fn(),
  ensureSortedCrimesTableMock: vi.fn(),
  getDbMock: vi.fn(),
  getDataPathMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  isMockDataEnabled: hoisted.isMockDataEnabledMock,
  ensureSortedCrimesTable: hoisted.ensureSortedCrimesTableMock,
  getDb: hoisted.getDbMock,
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
    hoisted.ensureSortedCrimesTableMock.mockReset();
    hoisted.getDbMock.mockReset();
    hoisted.getDataPathMock.mockReset();
    hoisted.existsSyncMock.mockReset();

    hoisted.isMockDataEnabledMock.mockReturnValue(false);
    hoisted.ensureSortedCrimesTableMock.mockResolvedValue('crimes_sorted');
    hoisted.getDataPathMock.mockReturnValue('/tmp/crimes.csv');
    hoisted.existsSyncMock.mockReturnValue(true);
  });

  test('returns timestamps from persisted DuckDB table', async () => {
    let capturedSql = '';
    hoisted.getDbMock.mockResolvedValue({
      all: vi.fn((sql: string, callback: (err: Error | null, rows: unknown[]) => void) => {
        capturedSql = sql;
        callback(null, [
          { timestamp_sec: 1_700_000_000 },
          { timestamp_sec: 1_700_086_400 },
        ]);
      }),
    });

    const response = await GET(new Request('http://localhost/api/crime/overview?maxPoints=5'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      timestampsSec: [1_700_000_000, 1_700_086_400],
    });
    expect(hoisted.ensureSortedCrimesTableMock).toHaveBeenCalledTimes(1);
    expect(capturedSql).toContain('FROM crimes_sorted');
    expect(capturedSql).not.toContain('read_csv_auto');
    expect(capturedSql).toContain('NTILE(5)');
  });

  test('returns mock overview when dataset file is missing', async () => {
    hoisted.existsSyncMock.mockReturnValue(false);

    const response = await GET(new Request('http://localhost/api/crime/overview'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('dataset file not found');
    await expect(response.json()).resolves.toMatchObject({ timestampsSec: expect.any(Array) });
  });

  test('returns mock overview when DuckDB read fails', async () => {
    hoisted.getDbMock.mockResolvedValue({
      all: vi.fn((_sql: string, callback: (err: Error | null, rows: unknown[]) => void) => {
        callback(new Error('boom'), []);
      }),
    });

    const response = await GET(new Request('http://localhost/api/crime/overview'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('database unavailable');
    await expect(response.json()).resolves.toMatchObject({ timestampsSec: expect.any(Array) });
  });
});
