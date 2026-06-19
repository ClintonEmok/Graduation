import { beforeEach, describe, expect, test, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  recordBatchReaderFromMock: vi.fn(),
  mockTable: null as {
    numRows: number;
    getChild: (name: string) => { toArray: () => unknown[] } | undefined;
  } | null,
}));

vi.mock('apache-arrow', () => ({
  RecordBatchReader: {
    from: hoisted.recordBatchReaderFromMock,
  },
  Table: vi.fn(function TableMock() {
    return hoisted.mockTable;
  }),
}));

import { useTimelineDataStore } from './useTimelineDataStore';

beforeEach(() => {
  vi.restoreAllMocks();
  hoisted.mockTable = null;
  useTimelineDataStore.setState({
    data: [],
    columns: null,
    overviewBins: [],
    overviewBinsDomain: null,
    overviewBinsFilter: { crimeTypes: [], districts: [] },
    crimeTypes: [],
    minX: null,
    maxX: null,
    minZ: null,
    maxZ: null,
    minTimestampSec: null,
    maxTimestampSec: null,
    isLoading: false,
    isMock: false,
    dataCount: null,
    mode: 'summary',
    lastSummaryFilters: { crimeTypes: [], districts: [] },
  });
});

describe('useTimelineDataStore.loadRealData', () => {
  test('hydrates the timestamp column from the timestamp field in the Arrow stream', async () => {
    hoisted.mockTable = {
      numRows: 2,
      getChild: (name: string) => {
        if (name === 'timestamp') {
          return { toArray: () => [1_700_000_000, 1_700_086_400] };
        }

        if (name === 'x') {
          return { toArray: () => [10, 20] };
        }

        if (name === 'z') {
          return { toArray: () => [30, 40] };
        }

        if (name === 'primary_type' || name === 'type') {
          return { toArray: () => ['THEFT', 'ASSAULT'] };
        }

        if (name === 'district') {
          return { toArray: () => ['1', '2'] };
        }

        if (name === 'block') {
          return { toArray: () => ['A', 'B'] };
        }

        if (name === 'lat' || name === 'lon') {
          return { toArray: () => [41.8, -87.6] };
        }

        return undefined;
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({ minTime: 1_700_000_000, maxTime: 1_700_086_400, count: 2, isMock: false }),
        } as Response;
      }

      if (url.endsWith('/api/crime/stream')) {
        return {
          ok: true,
          body: {},
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    hoisted.recordBatchReaderFromMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield {};
      },
    });

    await useTimelineDataStore.getState().loadRealData();

    const { columns, minTimestampSec, maxTimestampSec, isMock, dataCount, mode } = useTimelineDataStore.getState();

    expect(columns?.timestampSec).toEqual(new Float64Array([1_700_000_000, 1_700_086_400]));
    expect(columns?.timestamp).toEqual(new Float32Array([0, 100]));
    expect(minTimestampSec).toBe(1_700_000_000);
    expect(maxTimestampSec).toBe(1_700_086_400);
    expect(isMock).toBe(false);
    expect(dataCount).toBe(2);
    expect(mode).toBe('detail');
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/meta');
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/stream');
  });

  test('supports capped dashboard demo loads without fetching metadata', async () => {
    hoisted.mockTable = {
      numRows: 2,
      getChild: (name: string) => {
        if (name === 'timestamp') {
          return { toArray: () => [1_700_000_000, 1_700_086_400] };
        }

        if (name === 'x') {
          return { toArray: () => [10, 20] };
        }

        if (name === 'z') {
          return { toArray: () => [30, 40] };
        }

        if (name === 'primary_type' || name === 'type') {
          return { toArray: () => ['THEFT', 'ASSAULT'] };
        }

        if (name === 'district') {
          return { toArray: () => ['1', '2'] };
        }

        if (name === 'block') {
          return { toArray: () => ['A', 'B'] };
        }

        if (name === 'lat' || name === 'lon') {
          return { toArray: () => [41.8, -87.6] };
        }

        return undefined;
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/stream?maxRows=2')) {
        return {
          ok: true,
          body: {},
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    hoisted.recordBatchReaderFromMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield {};
      },
    });

    await useTimelineDataStore.getState().loadRealData({ maxRows: 2 });

    const { columns, minTimestampSec, maxTimestampSec, isMock, dataCount } = useTimelineDataStore.getState();

    expect(columns?.timestampSec).toEqual(new Float64Array([1_700_000_000, 1_700_086_400]));
    expect(minTimestampSec).toBe(1_700_000_000);
    expect(maxTimestampSec).toBe(1_700_086_400);
    expect(isMock).toBe(false);
    expect(dataCount).toBe(2);
    expect(fetchMock).not.toHaveBeenCalledWith('/api/crime/meta');
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/stream?maxRows=2');
  });
});

describe('useTimelineDataStore.loadSummaryData', () => {
  test('stores bins from the server-binned overview contract', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({
            minTime: 1_700_000_000,
            maxTime: 1_700_086_400,
            count: 2,
            isMock: false,
            crimeTypes: ['ASSAULT', 'THEFT'],
          }),
        } as Response;
      }

      if (url.includes('/api/crime/overview')) {
        return {
          ok: true,
          json: async () => ({
            domain: {
              startEpoch: 1_700_000_000,
              endEpoch: 1_700_086_400,
              binCount: 3,
              binSizeSec: 28_800,
            },
            bins: [
              { binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_028_800, count: 1 },
              { binIndex: 1, startEpoch: 1_700_028_800, endEpoch: 1_700_057_600, count: 1 },
              { binIndex: 2, startEpoch: 1_700_057_600, endEpoch: 1_700_086_400, count: 0 },
            ],
            filter: { crimeTypes: [], districts: [] },
            fingerprint: 'mtime:0:size:0',
            builtAt: '2026-06-19T00:00:00.000Z',
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    const { columns, overviewBins, overviewBinsDomain, mode, lastSummaryFilters, minTimestampSec, maxTimestampSec, crimeTypes, dataCount } =
      useTimelineDataStore.getState();

    expect(columns).toBeNull();
    expect(mode).toBe('summary');
    expect(lastSummaryFilters).toEqual({ crimeTypes: [], districts: [] });
    expect(overviewBins).toHaveLength(3);
    expect(overviewBins[0]).toEqual({
      binIndex: 0,
      startEpoch: 1_700_000_000,
      endEpoch: 1_700_028_800,
      count: 1,
    });
    expect(overviewBinsDomain).toEqual({
      startEpoch: 1_700_000_000,
      endEpoch: 1_700_086_400,
      binCount: 3,
      binSizeSec: 28_800,
    });
    expect(minTimestampSec).toBe(1_700_000_000);
    expect(maxTimestampSec).toBe(1_700_086_400);
    expect(crimeTypes).toEqual(['ASSAULT', 'THEFT']);
    expect(dataCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/meta');
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/overview?maxPoints=5');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/crime/stream');
  });

  test('D-02: crime-type filter changes trigger a new overview request with new query params', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({
            minTime: 1_700_000_000,
            maxTime: 1_700_086_400,
            count: 2,
            isMock: false,
            crimeTypes: ['ASSAULT', 'THEFT'],
          }),
        } as Response;
      }

      if (url.includes('/api/crime/overview')) {
        return {
          ok: true,
          json: async () => ({
            domain: {
              startEpoch: 1_700_000_000,
              endEpoch: 1_700_086_400,
              binCount: 3,
              binSizeSec: 28_800,
            },
            bins: [
              { binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_028_800, count: 1 },
            ],
            filter: { crimeTypes: [], districts: [] },
            fingerprint: 'mtime:0:size:0',
            builtAt: '2026-06-19T00:00:00.000Z',
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    // Initial load with no filters
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    // Re-invoke with a crime-type filter; should fire a NEW request
    await useTimelineDataStore.getState().loadSummaryData({
      maxPoints: 5,
      filters: { crimeTypes: ['THEFT'] },
    });

    // Re-invoke with both filters; should fire ANOTHER new request
    await useTimelineDataStore.getState().loadSummaryData({
      maxPoints: 5,
      filters: { crimeTypes: ['THEFT'], districts: ['1', '7'] },
    });

    const { lastSummaryFilters, overviewBinsFilter } = useTimelineDataStore.getState();

    expect(lastSummaryFilters).toEqual({ crimeTypes: ['THEFT'], districts: ['1', '7'] });
    expect(overviewBinsFilter).toEqual({ crimeTypes: [], districts: [] });

    const overviewCalls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/api/crime/overview'));
    expect(overviewCalls).toHaveLength(3);
    expect(overviewCalls[0]).toBe('/api/crime/overview?maxPoints=5');
    expect(overviewCalls[1]).toBe('/api/crime/overview?maxPoints=5&crimeTypes=THEFT');
    expect(overviewCalls[2]).toBe('/api/crime/overview?maxPoints=5&crimeTypes=THEFT&districts=1%2C7');
  });

  test('D-02: a re-invocation with the same filters does not fire a redundant request', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({
            minTime: 1_700_000_000,
            maxTime: 1_700_086_400,
            count: 2,
            isMock: false,
            crimeTypes: ['ASSAULT', 'THEFT'],
          }),
        } as Response;
      }

      if (url.includes('/api/crime/overview')) {
        return {
          ok: true,
          json: async () => ({
            domain: {
              startEpoch: 1_700_000_000,
              endEpoch: 1_700_086_400,
              binCount: 1,
              binSizeSec: 86_400,
            },
            bins: [
              { binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_086_400, count: 1 },
            ],
            filter: { crimeTypes: ['THEFT'], districts: [] },
            fingerprint: 'mtime:0:size:0',
            builtAt: '2026-06-19T00:00:00.000Z',
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const filters: { crimeTypes: string[] } = { crimeTypes: ['THEFT'] };
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5, filters });
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5, filters });
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5, filters });

    const overviewCalls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/api/crime/overview'));
    expect(overviewCalls).toHaveLength(1);
  });

  test('D-02: viewport-only changes do NOT alter overview-bin fetch parameters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({
            minTime: 1_700_000_000,
            maxTime: 1_700_086_400,
            count: 2,
            isMock: false,
            crimeTypes: ['ASSAULT', 'THEFT'],
          }),
        } as Response;
      }

      if (url.includes('/api/crime/overview')) {
        return {
          ok: true,
          json: async () => ({
            domain: {
              startEpoch: 1_700_000_000,
              endEpoch: 1_700_086_400,
              binCount: 1,
              binSizeSec: 86_400,
            },
            bins: [
              { binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_086_400, count: 1 },
            ],
            filter: { crimeTypes: [], districts: [] },
            fingerprint: 'mtime:0:size:0',
            builtAt: '2026-06-19T00:00:00.000Z',
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    // Initial load with no filters
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    // Simulate a viewport change (would be expressed as a re-invocation
    // without changing filter inputs). The new contract explicitly drops
    // viewport from the summary request inputs, so the call should be a
    // short-circuit and NOT issue a new fetch.
    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    const overviewCalls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/api/crime/overview'));
    expect(overviewCalls).toHaveLength(1);
    expect(overviewCalls[0]).toBe('/api/crime/overview?maxPoints=5');
    // The fetch URL must NOT carry any viewport field
    expect(overviewCalls[0]).not.toMatch(/viewport|bounds|spatial/);
  });

  test('D-05: summary-first path leaves columns null and mode = summary', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({
            minTime: 1_700_000_000,
            maxTime: 1_700_086_400,
            count: 2,
            isMock: false,
            crimeTypes: ['ASSAULT', 'THEFT'],
          }),
        } as Response;
      }
      if (url.includes('/api/crime/overview')) {
        return {
          ok: true,
          json: async () => ({
            domain: { startEpoch: 1_700_000_000, endEpoch: 1_700_086_400, binCount: 1, binSizeSec: 86_400 },
            bins: [{ binIndex: 0, startEpoch: 1_700_000_000, endEpoch: 1_700_086_400, count: 1 }],
            filter: { crimeTypes: [], districts: [] },
            fingerprint: 'mtime:0:size:0',
            builtAt: '2026-06-19T00:00:00.000Z',
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    const { columns, mode } = useTimelineDataStore.getState();
    expect(columns).toBeNull();
    expect(mode).toBe('summary');
  });

  test('loadDetailOnIntent defers to loadRealData', async () => {
    hoisted.mockTable = {
      numRows: 1,
      getChild: (name: string) => {
        if (name === 'timestamp') return { toArray: () => [1_700_000_000] };
        if (name === 'x') return { toArray: () => [10] };
        if (name === 'z') return { toArray: () => [30] };
        if (name === 'primary_type' || name === 'type') return { toArray: () => ['THEFT'] };
        if (name === 'district') return { toArray: () => ['1'] };
        if (name === 'block') return { toArray: () => ['A'] };
        if (name === 'lat' || name === 'lon') return { toArray: () => [41.8] };
        return undefined;
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/crime/meta')) {
        return {
          ok: true,
          json: async () => ({ minTime: 1_700_000_000, maxTime: 1_700_000_000, count: 1, isMock: false }),
        } as Response;
      }
      if (url.endsWith('/api/crime/stream')) {
        return { ok: true, body: {} } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    hoisted.recordBatchReaderFromMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield {};
      },
    });

    await useTimelineDataStore.getState().loadDetailOnIntent();

    const { columns, mode } = useTimelineDataStore.getState();
    expect(columns).not.toBeNull();
    expect(mode).toBe('detail');
  });
});
