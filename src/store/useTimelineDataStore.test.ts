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
    overviewTimestampSec: [],
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

    const { columns, minTimestampSec, maxTimestampSec, isMock, dataCount } = useTimelineDataStore.getState();

    expect(columns?.timestampSec).toEqual(new Float64Array([1_700_000_000, 1_700_086_400]));
    expect(columns?.timestamp).toEqual(new Float32Array([0, 100]));
    expect(minTimestampSec).toBe(1_700_000_000);
    expect(maxTimestampSec).toBe(1_700_086_400);
    expect(isMock).toBe(false);
    expect(dataCount).toBe(2);
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

  test('loads summary data without fetching the full stream', async () => {
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

      if (url.endsWith('/api/crime/overview?maxPoints=5')) {
        return {
          ok: true,
          json: async () => ({ timestampsSec: [1_700_000_000, 1_700_043_200, 1_700_086_400] }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await useTimelineDataStore.getState().loadSummaryData({ maxPoints: 5 });

    const { columns, overviewTimestampSec, minTimestampSec, maxTimestampSec, crimeTypes, dataCount } =
      useTimelineDataStore.getState();

    expect(columns).toBeNull();
    expect(overviewTimestampSec).toEqual([1_700_000_000, 1_700_043_200, 1_700_086_400]);
    expect(minTimestampSec).toBe(1_700_000_000);
    expect(maxTimestampSec).toBe(1_700_086_400);
    expect(crimeTypes).toEqual(['ASSAULT', 'THEFT']);
    expect(dataCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/meta');
    expect(fetchMock).toHaveBeenCalledWith('/api/crime/overview?maxPoints=5');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/crime/stream');
  });
});
