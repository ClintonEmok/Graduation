import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrimeData } from '@/hooks/useCrimeData';
import type { UseCrimeDataOptions, UseCrimeDataResult } from '@/types/crime';

type UpdateHandler = (result: UseCrimeDataResult) => void;

const HookProbe = ({ options, onUpdate }: { options: UseCrimeDataOptions; onUpdate: UpdateHandler }) => {
  const result = useCrimeData(options);

  useEffect(() => {
    onUpdate(result);
  }, [onUpdate, result]);

  return null;
};

const createRenderer = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  let currentOptions: UseCrimeDataOptions = {
    startEpoch: 0,
    endEpoch: 1,
  };

  let pendingResolve: ((result: UseCrimeDataResult) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const onUpdate: UpdateHandler = (result) => {
    if (!pendingResolve) return;
    if (result.isLoading || result.isFetching) return;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingResolve(result);
    pendingResolve = null;
    pendingReject = null;
  };

  const App = () =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(HookProbe, {
        options: currentOptions,
        onUpdate,
      })
    );

  const renderer = TestRenderer.create(React.createElement(App));

  const renderAndWait = async (options: UseCrimeDataOptions): Promise<UseCrimeDataResult> => {
    currentOptions = options;
    const done = new Promise<UseCrimeDataResult>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      timeoutId = setTimeout(() => {
        pendingResolve = null;
        pendingReject = null;
        reject(new Error('Timed out waiting for settled hook result'));
      }, 3000);
    });

    await act(async () => {
      renderer.update(React.createElement(App));
      await Promise.resolve();
    });

    return await done;
  };

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingReject) {
      pendingReject(new Error('Renderer cleaned up before result settled'));
      pendingReject = null;
      pendingResolve = null;
    }
    renderer.unmount();
    queryClient.clear();
  };

  return { renderAndWait, cleanup };
};

describe('useCrimeData (Phase 81 Wave 3 paged contract)', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup?.();
    cleanup = null;
  });

  it('issues a single first-page request with the exact range, filters, and pageSize', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            timestamp: 978307200,
            lat: 41.88,
            lon: -87.63,
            x: 17.5,
            z: 6,
            type: 'THEFT',
            district: '1',
            year: 2001,
            iucr: '0820',
          },
        ],
        meta: {
          viewport: { start: 978307200, end: 978393600 },
          returned: 1,
          limit: 5000,
          pageSize: 5000,
          hasMore: false,
          nextCursor: null,
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 978307200,
      endEpoch: 978393600,
      crimeTypes: ['THEFT'],
      districts: ['1'],
      pageSize: 5000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('startEpoch=978307200');
    expect(url).toContain('endEpoch=978393600');
    expect(url).toContain('pageSize=5000');
    expect(url).toContain('crimeTypes=THEFT');
    expect(url).toContain('districts=1');
    // The new exact contract does not include bufferDays in the URL.
    expect(url).not.toContain('bufferDays=');
    expect(result.data).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.requiresNarrowing).toBeNull();
  });

  it('forwards the optional target string to the API', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: { returned: 0, limit: 5000, pageSize: 5000, hasMore: false, nextCursor: null },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await harness.renderAndWait({
      startEpoch: 1000,
      endEpoch: 2000,
      target: 'slice-abc-123',
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('target=slice-abc-123');
  });

  it('surfaces hasMore and nextCursor from the server response', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ timestamp: 1100, type: 'THEFT', lat: 41.8, lon: -87.6, x: 1, z: 1, iucr: '0', district: '1', year: 2025 }],
        meta: {
          returned: 1,
          limit: 1,
          pageSize: 1,
          hasMore: true,
          nextCursor: 'v1.Z2JjZA==',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 1000,
      endEpoch: 2000,
      pageSize: 1,
    });

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('v1.Z2JjZA==');
  });

  it('surfaces requiresNarrowing as a flag without throwing', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          returned: 0,
          limit: 50000,
          pageSize: 999999,
          hasMore: false,
          nextCursor: null,
          requiresNarrowing: {
            reason: 'page-size-too-large',
            maxRangeSec: 90 * 86400,
            requestedRangeSec: 1000,
            maxPageSize: 50000,
            requestedPageSize: 999999,
            message: 'pageSize too large',
          },
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 1000,
      endEpoch: 2000,
      pageSize: 999999,
    });

    expect(result.requiresNarrowing).toMatchObject({
      reason: 'page-size-too-large',
      maxPageSize: 50000,
      requestedPageSize: 999999,
    });
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('fetchNextPage calls the API with the nextCursor and appends rows', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const cursor = 'v1.next';
    const page2Rows = [
      { timestamp: 2100, type: 'THEFT', lat: 41.8, lon: -87.6, x: 1, z: 1, iucr: '0', district: '1', year: 2025 },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ timestamp: 1100, type: 'THEFT', lat: 41.8, lon: -87.6, x: 1, z: 1, iucr: '0', district: '1', year: 2025 }],
          meta: { returned: 1, limit: 1, pageSize: 1, hasMore: true, nextCursor: cursor },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: page2Rows,
          meta: { returned: 1, limit: 1, pageSize: 1, hasMore: false, nextCursor: null },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 1000,
      endEpoch: 2000,
      pageSize: 1,
    });

    expect(result.hasMore).toBe(true);
    expect(result.data).toHaveLength(1);

    let fetchedNext: Awaited<ReturnType<typeof result.fetchNextPage>> = null;
    await act(async () => {
      fetchedNext = await result.fetchNextPage();
    });

    expect(fetchedNext).not.toBeNull();
    expect(fetchedNext).toEqual(page2Rows);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = String(fetchMock.mock.calls[1][0]);
    expect(secondUrl).toContain(`cursor=${encodeURIComponent(cursor)}`);
  });

  it('fetchNextPage returns null when there is no more data', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ timestamp: 1100, type: 'THEFT', lat: 41.8, lon: -87.6, x: 1, z: 1, iucr: '0', district: '1', year: 2025 }],
        meta: { returned: 1, limit: 5000, pageSize: 5000, hasMore: false, nextCursor: null },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 1000,
      endEpoch: 2000,
    });

    let fetchedNext: Awaited<ReturnType<typeof result.fetchNextPage>> = null;
    await act(async () => {
      fetchedNext = await result.fetchNextPage();
    });
    expect(fetchedNext).toBeNull();
  });

  it('skips fetch when epoch range is invalid to avoid 400 errors', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 5000,
      endEpoch: 5000,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.hasMore).toBe(false);
    expect(result.requiresNarrowing).toBeNull();
  });

  it('propagates API failures through query error state', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 978307200,
      endEpoch: 978393600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('HTTP error: 500');
    expect(result.data).toEqual([]);
  });

  it('wraps fetch TypeError with request context', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 978307200,
      endEpoch: 978393600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('Network error while fetching crimes from /api/crimes/range?');
    expect(result.error?.message).toContain('startEpoch=978307200');
    expect(result.error?.message).toContain('endEpoch=978393600');
  });
});
