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

describe('useCrimeData', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup?.();
    cleanup = null;
  });

  it('applies default 30-day buffering and forwards API meta fields', async () => {
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
          buffer: { days: 30, applied: { start: 975715200, end: 980985600 } },
          returned: 1,
          limit: 50000,
          totalMatches: 1,
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 978307200,
      endEpoch: 978393600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('startEpoch=978307200');
    expect(String(fetchMock.mock.calls[0][0])).toContain('endEpoch=978393600');
    expect(String(fetchMock.mock.calls[0][0])).toContain('bufferDays=30');
    expect(result.bufferedRange).toEqual({ start: 975715200, end: 980985600 });
    expect(result.meta?.buffer?.days).toBe(30);
    expect(result.meta?.returned).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('uses custom bufferDays and optional filters without double buffering', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          viewport: { start: 2000, end: 3000 },
          buffer: { days: 2, applied: { start: -170800, end: 175800 } },
          returned: 0,
          limit: 10,
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 2000,
      endEpoch: 3000,
      bufferDays: 2,
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
      limit: 10,
    });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('startEpoch=2000');
    expect(calledUrl).toContain('endEpoch=3000');
    expect(calledUrl).toContain('bufferDays=2');
    expect(calledUrl).toContain('crimeTypes=THEFT%2CBATTERY');
    expect(calledUrl).toContain('districts=1%2C2');
    expect(calledUrl).toContain('limit=10');
    expect(result.bufferedRange).toEqual({ start: -170800, end: 175800 });
  });

  it('keeps query key stable and avoids refetch on equivalent rerender', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: { returned: 0, limit: 50000 } }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const options: UseCrimeDataOptions = {
      startEpoch: 1000,
      endEpoch: 2000,
      bufferDays: 1,
      crimeTypes: ['THEFT'],
      districts: ['3'],
    };

    await harness.renderAndWait(options);
    await harness.renderAndWait({ ...options });

    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it('treats 404 range responses as explicit errors (no silent empty fallback)', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await harness.renderAndWait({
      startEpoch: 978307200,
      endEpoch: 978393600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('HTTP error: 404');
    expect(result.data).toEqual([]);
  });
});
