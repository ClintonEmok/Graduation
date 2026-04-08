"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';
import { STKDE_RESPONSE_SIZE_LIMIT_BYTES, type StkdeResponse } from '@/lib/stkde/contracts';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useStkdeStore } from '@/store/useStkdeStore';
import type { TimeSlice } from '@/store/slice-domain/types';
import { projectHotspots, type StkdeWorkerHotspot, type StkdeWorkerOutput } from '@/workers/stkdeHotspot.worker';

const DEFAULT_LIMITS = {
  maxEvents: 50000,
  maxGridCells: 12000,
} as const;

const DEFAULT_GUARDRAILS = {
  fullPopulationMaxSpanDays: 12000,
  fullPopulationTimeoutMs: 20000,
} as const;

const WORKER_TIMEOUT_MS = 8000;

const toSliceRangeSec = (slice: TimeSlice): [number, number] => {
  if (slice.type === 'range' && slice.range) {
    const start = Math.min(slice.range[0], slice.range[1]);
    const end = Math.max(slice.range[0], slice.range[1]);
    return [Math.floor(start / 1000), Math.floor(end / 1000)];
  }
  const timeSec = Math.floor(slice.time / 1000);
  return [timeSec, timeSec];
};

const buildSliceSignature = (sliceIds: string[]) => sliceIds.join('|');

export const selectAppliedGeneratedSlices = (slices: TimeSlice[]) =>
  slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible);

const sanitizeResponseSize = (response: StkdeResponse): StkdeResponse => {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(response)).length;
  if (payloadBytes <= STKDE_RESPONSE_SIZE_LIMIT_BYTES) {
    return response;
  }

  return {
    ...response,
    meta: {
      ...response.meta,
      truncated: true,
      fallbackApplied: response.meta.fallbackApplied
        ? `${response.meta.fallbackApplied},client-response-size-guard`
        : 'client-response-size-guard',
    },
    heatmap: {
      ...response.heatmap,
      cells: [...response.heatmap.cells]
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 8000),
    },
  };
};

const projectHotspotsWithWorker = async (hotspots: StkdeWorkerHotspot[]) => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return hotspots;
  }

  const requestId = Date.now();
  const runFallback = () =>
    projectHotspots({
      requestId,
      hotspots,
      filters: {
        minIntensity: 0,
        minSupport: 0,
        temporalWindow: null,
        spatialBbox: null,
      },
    }).rows;

  try {
    const worker = new Worker(new URL('../../../workers/stkdeHotspot.worker.ts', import.meta.url));
    const rows = await new Promise<StkdeWorkerOutput['rows']>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error('worker-timeout'));
      }, WORKER_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        worker.removeEventListener('messageerror', handleMessageError);
      };

      const handleMessage = (event: MessageEvent<StkdeWorkerOutput>) => {
        if (event.data.requestId !== requestId) return;
        cleanup();
        worker.terminate();
        resolve(event.data.rows);
      };

      const handleError = () => {
        cleanup();
        worker.terminate();
        reject(new Error('worker-error'));
      };

      const handleMessageError = () => {
        cleanup();
        worker.terminate();
        reject(new Error('worker-message-error'));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.addEventListener('messageerror', handleMessageError);
      worker.postMessage({
        requestId,
        hotspots,
        filters: {
          minIntensity: 0,
          minSupport: 0,
          temporalWindow: null,
          spatialBbox: null,
        },
      });
    });
    return rows;
  } catch {
    return runFallback();
  }
};

export function useDashboardStkde() {
  const abortRef = useRef<AbortController | null>(null);
  const lastAppliedSignatureRef = useRef<string>('');

  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => selectAppliedGeneratedSlices(state.slices))
  );

  const {
    scopeMode,
    params,
    runStatus,
    isStale,
    setScopeMode,
    setParams,
    markStale,
    startRun,
    finishRunSuccess,
    finishRunError,
    finishRunCancelled,
  } = useStkdeStore(
    useShallow((state) => ({
      scopeMode: state.scopeMode,
      params: state.params,
      runStatus: state.runStatus,
      isStale: state.isStale,
      setScopeMode: state.setScopeMode,
      setParams: state.setParams,
      markStale: state.markStale,
      startRun: state.startRun,
      finishRunSuccess: state.finishRunSuccess,
      finishRunError: state.finishRunError,
      finishRunCancelled: state.finishRunCancelled,
    }))
  );

  const scopeLabel = scopeMode === 'applied-slices' ? 'Applied Slices' : 'Full Viewport';
  const appliedSliceIds = useMemo(() => appliedSlices.map((slice) => slice.id).sort(), [appliedSlices]);
  const appliedSliceSignature = useMemo(() => buildSliceSignature(appliedSliceIds), [appliedSliceIds]);

  useEffect(() => {
    if (!lastAppliedSignatureRef.current) {
      lastAppliedSignatureRef.current = appliedSliceSignature;
      return;
    }

    if (appliedSliceSignature === lastAppliedSignatureRef.current) {
      return;
    }

    lastAppliedSignatureRef.current = appliedSliceSignature;

    if (runStatus === 'success' && !isStale) {
      markStale('applied-slices-updated');
    }
  }, [appliedSliceSignature, isStale, markStale, runStatus]);

  const runStkde = useCallback(async () => {
    const hasAppliedSlices = appliedSlices.length > 0;
    const shouldUseSliceScope = scopeMode === 'applied-slices' && hasAppliedSlices;

    let startEpochSec = viewportStart;
    let endEpochSec = viewportEnd;

    if (selectedTimeRange) {
      startEpochSec = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      endEpochSec = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
    }

    if (shouldUseSliceScope) {
      const ranges = appliedSlices.map(toSliceRangeSec);
      startEpochSec = Math.min(...ranges.map(([start]) => start));
      endEpochSec = Math.max(...ranges.map(([, end]) => end));
    }

    const bbox = selectedSpatialBounds
      ? [
          selectedSpatialBounds.minLon,
          selectedSpatialBounds.minLat,
          selectedSpatialBounds.maxLon,
          selectedSpatialBounds.maxLat,
        ]
      : [CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLon, CHICAGO_BOUNDS.maxLat];

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startRun();

    try {
      const result = await fetch('/api/stkde/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          computeMode: 'sampled',
          callerIntent: 'stkde',
          domain: {
            startEpochSec,
            endEpochSec,
          },
          filters: {
            bbox,
          },
          params,
          limits: DEFAULT_LIMITS,
          guardrails: DEFAULT_GUARDRAILS,
        }),
      });

      if (!result.ok) {
        const body = await result.json().catch(() => ({ error: `HTTP ${result.status}` }));
        throw new Error(body.error ?? `STKDE request failed (${result.status})`);
      }

      const response = sanitizeResponseSize((await result.json()) as StkdeResponse);
      const projectedRows = await projectHotspotsWithWorker(response.hotspots);
      finishRunSuccess({ ...response, hotspots: projectedRows });
    } catch (error) {
      if (controller.signal.aborted) {
        finishRunCancelled();
        return;
      }
      finishRunError(error instanceof Error ? error.message : 'Failed to run STKDE');
    }
  }, [
    appliedSlices,
    finishRunCancelled,
    finishRunError,
    finishRunSuccess,
    params,
    scopeMode,
    selectedSpatialBounds,
    selectedTimeRange,
    startRun,
    viewportEnd,
    viewportStart,
  ]);

  const cancelStkde = useCallback(() => {
    abortRef.current?.abort();
    finishRunCancelled();
  }, [finishRunCancelled]);

  return {
    runStkde,
    cancelStkde,
    setScopeMode,
    setParams,
    scopeLabel,
    scopeMode,
    runStatus,
  };
}
