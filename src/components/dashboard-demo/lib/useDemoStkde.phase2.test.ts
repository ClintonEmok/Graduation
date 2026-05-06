import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoStkde } from './useDemoStkde';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useSliceStore } from '@/store/useSliceStore';

type HookSnapshot = ReturnType<typeof useDemoStkde>;

const DEBOUNCE_MS = 150;

const HookProbe = ({ onUpdate }: { onUpdate: (snapshot: HookSnapshot) => void }) => {
  const snapshot = useDemoStkde();

  useEffect(() => {
    onUpdate(snapshot);
  }, [onUpdate, snapshot]);

  return null;
};

describe('useDemoStkde', () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  let latestSnapshot: HookSnapshot | null = null;

  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const mountHarness = async () => {
    latestSnapshot = null;
    const onUpdate = (snapshot: HookSnapshot) => {
      latestSnapshot = snapshot;
    };

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookProbe, { onUpdate }));
      await flushMicrotasks();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useSliceStore.getState().clearSlices();
    useDashboardDemoAnalysisStore.getState().resetAnalysis();
    useDashboardDemoAnalysisStore.getState().setSelectedDistricts(['1']);
  });

  afterEach(() => {
    renderer?.unmount();
    renderer = null;
    latestSnapshot = null;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('debounces slice/time changes and keeps the newest STKDE response', async () => {
    const pendingRequests: Array<{
      signal: AbortSignal;
      body: {
        filters: { slices?: Array<{ id: string; startEpochSec: number; endEpochSec: number }> };
        domain: { startEpochSec: number; endEpochSec: number };
      };
      resolve: (payload: { ok: boolean; json: () => Promise<unknown> }) => void;
    }> = [];

    const fetchMock = vi.fn((_input, init) =>
      new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve, reject) => {
        const signal = init?.signal as AbortSignal;
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          filters: { slices?: Array<{ id: string; startEpochSec: number; endEpochSec: number }> };
          domain: { startEpochSec: number; endEpochSec: number };
        };

        pendingRequests.push({
          signal,
          body,
          resolve,
        });

        signal?.addEventListener(
          'abort',
          () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          },
          { once: true }
        );
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    useDashboardDemoAnalysisStore.getState().setTimeRange(1_700_000_000, 1_700_086_400);
    useSliceStore.getState().addSlice({ time: 40, name: 'Window A' });
    const initialSliceId = useSliceStore.getState().slices[0]?.id;
    expect(initialSliceId).toBeDefined();

    await mountHarness();

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestSnapshot?.isLoading).toBe(true);
    expect(pendingRequests[0]?.body.filters.slices).toHaveLength(1);
    expect(pendingRequests[0]?.body.domain.startEpochSec).toBe(1_700_000_000);

    await act(async () => {
      useSliceStore.getState().updateSlice(initialSliceId as string, { time: 58 });
      useDashboardDemoAnalysisStore.getState().setTimeRange(1_700_086_400, 1_700_172_800);
      useSliceStore.getState().updateSlice(initialSliceId as string, { time: 62 });
    });

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS - 1);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pendingRequests[0].signal.aborted).toBe(true);
    expect(pendingRequests[1].body.domain).toEqual({
      startEpochSec: 1_700_086_400,
      endEpochSec: 1_700_172_800,
    });
    expect(pendingRequests[1].body.filters.slices).toHaveLength(1);

    const stalePayload = {
      meta: {
        eventCount: 1,
        computeMs: 10,
        truncated: false,
        requestedComputeMode: 'sampled',
        effectiveComputeMode: 'sampled',
        fallbackApplied: null,
        clampsApplied: [],
      },
      heatmap: {
        cells: [],
        maxIntensity: 0,
      },
      hotspots: [],
      contracts: {
        scoreVersion: 'stkde-v1',
      },
      sliceResults: {},
    };
    const freshPayload = {
      meta: {
        eventCount: 2,
        computeMs: 12,
        truncated: false,
        requestedComputeMode: 'sampled',
        effectiveComputeMode: 'sampled',
        fallbackApplied: null,
        clampsApplied: [],
      },
      heatmap: {
        cells: [
          { lng: -87.63, lat: 41.88, intensity: 1, support: 2 },
        ],
        maxIntensity: 1,
      },
      hotspots: [
        {
          id: 'hs-1',
          centroidLng: -87.63,
          centroidLat: 41.88,
          intensityScore: 1,
          supportCount: 2,
          peakStartEpochSec: 1_700_086_400,
          peakEndEpochSec: 1_700_172_800,
          radiusMeters: 750,
        },
      ],
      contracts: {
        scoreVersion: 'stkde-v1',
      },
      sliceResults: {
        [initialSliceId as string]: {
          meta: {
            eventCount: 2,
            computeMs: 3,
            truncated: false,
            requestedComputeMode: 'sampled',
            effectiveComputeMode: 'sampled',
            fallbackApplied: null,
            clampsApplied: [],
          },
          heatmap: {
            cells: [
              { lng: -87.63, lat: 41.88, intensity: 1, support: 2 },
            ],
            maxIntensity: 1,
          },
          hotspots: [],
          contracts: {
            scoreVersion: 'stkde-v1',
          },
        },
      },
    };

    await act(async () => {
      pendingRequests[0].resolve({
        ok: true,
        json: async () => stalePayload,
      });
      await flushMicrotasks();
    });

    expect(useDashboardDemoAnalysisStore.getState().stkdeResponse).toBeNull();
    expect(latestSnapshot?.isLoading).toBe(true);

    await act(async () => {
      pendingRequests[1].resolve({
        ok: true,
        json: async () => freshPayload,
      });
      await flushMicrotasks();
    });

    expect(useDashboardDemoAnalysisStore.getState().stkdeResponse?.meta.eventCount).toBe(2);
    expect(useDashboardDemoAnalysisStore.getState().stkdeResponse?.sliceResults[initialSliceId as string].meta.eventCount).toBe(2);
    expect(latestSnapshot?.isLoading).toBe(false);
    expect(latestSnapshot?.response?.meta.eventCount).toBe(2);
  });
});
