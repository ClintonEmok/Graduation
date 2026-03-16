"use client";

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMeasure } from '@/hooks/useMeasure';
import { useCrimeData } from '@/hooks/useCrimeData';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useFilterStore } from '@/store/useFilterStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { ALGORITHM_OPTIONS } from './algorithm-options';
import { AdaptiveBinDiagnosticsPanel } from './AdaptiveBinDiagnosticsPanel';
import { buildAdaptiveBinDiagnostics } from './adaptive-bin-diagnostics';
import { TimeslicingAlgosStrategyStats } from './TimeslicingAlgosStrategyStats';
import {
  resolveTimeslicingAlgosSelection,
  serializeTimeslicingAlgosSelection,
  type TimeslicingAlgosSelection,
} from './mode-selection';
import { TimeslicingAlgosInteractionControls } from './TimeslicingAlgosInteractionControls';
import { buildTimelineQaModel } from '@/components/timeline/qa/timeline-qa-model';
import { TimelineQaContextCard } from '@/components/timeline/qa/TimelineQaContextCard';
import {
  buildSelectionDetailDataset,
  selectionDetailLimit,
  type SelectionDetailFallbackReason,
} from './selection-detail-dataset';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

const selectionFallbackReasonLabel: Record<SelectionDetailFallbackReason, string> = {
  'selection-fetch-error': 'selection fetch failed',
  'selection-empty': 'selection returned no records',
  'selection-exceeded-safety-threshold': 'selection exceeded safety threshold',
};

export function TimeslicingAlgosRouteShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();

  const selection = useMemo(() => resolveTimeslicingAlgosSelection(searchParams), [searchParams]);
  const selectedStrategy = selection.strategy;
  const selectedTimeScale = selection.timescale;
  const setTimeScaleMode = useTimeStore((state) => state.setTimeScaleMode);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);

  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const countMap = useAdaptiveStore((state) => state.countMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const baseDomainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const baseDomainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const { data: crimes, meta, isLoading, error } = useCrimeData({
    startEpoch: baseDomainStartSec,
    endEpoch: baseDomainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (start !== end) {
        return [start, end] as [number, number];
      }
    }
    return [viewportStart, viewportEnd] as [number, number];
  }, [selectedTimeRange, viewportEnd, viewportStart]);

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));
  const contextTimestamps = useMemo(() => crimes.map((crime) => crime.timestamp), [crimes]);

  const {
    data: selectionCrimes,
    meta: selectionMeta,
    isLoading: isSelectionLoading,
    error: selectionError,
  } = useCrimeData({
    startEpoch: rangeStart,
    endEpoch: rangeEnd,
    bufferDays: 0,
    limit: selectionDetailLimit,
  });

  const selectionDetailDataset = useMemo(
    () =>
      buildSelectionDetailDataset({
        rangeStartSec: rangeStart,
        rangeEndSec: rangeEnd,
        selectionData: selectionCrimes,
        selectionMeta,
        selectionError,
        contextTimestamps,
      }),
    [contextTimestamps, rangeEnd, rangeStart, selectionCrimes, selectionError, selectionMeta],
  );

  const timestamps =
    selectionDetailDataset.diagnosticsSource === 'selection'
      ? selectionDetailDataset.diagnosticsTimestamps
      : contextTimestamps;
  const adaptiveDiagnosticsRows = useMemo(
    () => buildAdaptiveBinDiagnostics({
      selectedStrategy,
      domain: mapDomain,
      timestamps,
      countMap,
      densityMap,
      warpMap,
    }),
    [countMap, densityMap, mapDomain, selectedStrategy, timestamps, warpMap],
  );

  const setSelection = (nextSelection: TimeslicingAlgosSelection) => {
    const nextParams = serializeTimeslicingAlgosSelection(searchParams, nextSelection);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const nextParams = serializeTimeslicingAlgosSelection(searchParams, selection);
    if (nextParams.toString() === searchParams.toString()) {
      return;
    }
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, selection]);

  const handleStrategyChange = (strategy: TimeslicingAlgosSelection['strategy']) => {
    setSelection({
      strategy,
      timescale: selectedTimeScale,
    });
  };

  const handleTimeScaleChange = (timescale: TimeslicingAlgosSelection['timescale']) => {
    setSelection({
      strategy: selectedStrategy,
      timescale,
    });
  };

  useEffect(() => {
    setTimeScaleMode(selectedTimeScale);
    if (selectedTimeScale === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
  }, [selectedTimeScale, setTimeScaleMode, setWarpFactor, warpFactor]);

  useEffect(() => {
    if (!crimes || crimes.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    const timestamps = new Float32Array(crimes.length);
    const points = crimes.map((crime, index) => {
      minX = Math.min(minX, crime.x);
      maxX = Math.max(maxX, crime.x);
      minZ = Math.min(minZ, crime.z);
      maxZ = Math.max(maxZ, crime.z);
      timestamps[index] = crime.timestamp;

      return {
        id: `${crime.timestamp}-${index}`,
        timestamp: crime.timestamp,
        x: crime.x,
        y: 0,
        z: crime.z,
        type: crime.type,
      };
    });

    useTimelineDataStore.setState({
      data: points,
      columns: null,
      minTimestampSec: baseDomainStartSec,
      maxTimestampSec: baseDomainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore
      .getState()
      .computeMaps(timestamps, [baseDomainStartSec, baseDomainEndSec], { binningMode: selectedStrategy });
  }, [baseDomainEndSec, baseDomainStartSec, crimes, selectedStrategy]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) return 'Loading...';
    if (!crimes.length) return 'No data';

    const total = meta?.totalMatches ?? crimes.length;
    const returned = meta?.returned ?? crimes.length;
    const details: string[] = [];
    const bufferDays = meta?.buffer?.days ?? 0;
    const isMock = Boolean((meta as { isMock?: boolean } | undefined)?.isMock);

    if (returned !== total) details.push(`showing ${returned.toLocaleString()}`);
    if (bufferDays > 0) details.push(`buffered +/-${bufferDays}d`);
    if (isMock) details.push('demo data');

    return details.length > 0
      ? `${total.toLocaleString()} crimes (${details.join(', ')})`
      : `${total.toLocaleString()} crimes`;
  }, [crimes.length, isLoading, meta]);

  const dataDomainLabel = useMemo(() => {
    const minLabel = new Date(baseDomainStartSec * 1000).toLocaleDateString();
    const maxLabel = new Date(baseDomainEndSec * 1000).toLocaleDateString();
    return `${minLabel} - ${maxLabel}`;
  }, [baseDomainEndSec, baseDomainStartSec]);

  const detailRangeLabel = useMemo(() => {
    const [start, end] = [Math.min(rangeStart, rangeEnd), Math.max(rangeStart, rangeEnd)];
    return `${new Date(start * 1000).toLocaleDateString()} - ${new Date(end * 1000).toLocaleDateString()}`;
  }, [rangeEnd, rangeStart]);

  const selectionPopulationLabel = useMemo(() => {
    const populationState = selectionDetailDataset.selectionPopulation.fullPopulation
      ? 'full population'
      : 'sampled population';
    const returned = selectionDetailDataset.selectionPopulation.returnedCount.toLocaleString();
    const total = selectionDetailDataset.selectionPopulation.totalMatches.toLocaleString();
    const stride = selectionDetailDataset.selectionPopulation.sampleStride;
    const strideLabel = stride ? `, stride ${stride}` : '';
    return `${populationState}: ${returned}/${total}${strideLabel}`;
  }, [selectionDetailDataset.selectionPopulation]);

  const selectionRenderLabel = useMemo(() => {
    if (!selectionDetailDataset.renderDownsampled) {
      return `rendering all ${selectionDetailDataset.renderTimestamps.length.toLocaleString()} detail points`;
    }
    return `render downsampled (${selectionDetailDataset.renderTimestamps.length.toLocaleString()} points, every ${selectionDetailDataset.renderDownsampleStride}th)`;
  }, [
    selectionDetailDataset.renderDownsampleStride,
    selectionDetailDataset.renderDownsampled,
    selectionDetailDataset.renderTimestamps.length,
  ]);

  const selectionFallbackLabel = useMemo(() => {
    if (!selectionDetailDataset.fallbackToContextReason) {
      return 'selection dataset active';
    }
    return `using context fallback: ${selectionFallbackReasonLabel[selectionDetailDataset.fallbackToContextReason]}`;
  }, [selectionDetailDataset.fallbackToContextReason]);

  const fetchedDomainLabel = useMemo(() => {
    const fetchedStart = meta?.buffer?.applied.start ?? baseDomainStartSec;
    const fetchedEnd = meta?.buffer?.applied.end ?? baseDomainEndSec;
    return `${new Date(fetchedStart * 1000).toLocaleDateString()} - ${new Date(fetchedEnd * 1000).toLocaleDateString()}`;
  }, [baseDomainEndSec, baseDomainStartSec, meta?.buffer?.applied.end, meta?.buffer?.applied.start]);

  const fetchedDomainSec = useMemo(() => {
    const fetchedStart = meta?.buffer?.applied.start ?? baseDomainStartSec;
    const fetchedEnd = meta?.buffer?.applied.end ?? baseDomainEndSec;
    return [fetchedStart, fetchedEnd] as [number, number];
  }, [baseDomainEndSec, baseDomainStartSec, meta?.buffer?.applied.end, meta?.buffer?.applied.start]);

  const hasActiveSelection = useMemo(() => {
    if (!selectedTimeRange) return false;
    if (!Number.isFinite(selectedTimeRange[0]) || !Number.isFinite(selectedTimeRange[1])) return false;
    return selectedTimeRange[0] !== selectedTimeRange[1];
  }, [selectedTimeRange]);

  const timelineQaModel = useMemo(
    () =>
      buildTimelineQaModel({
        routeRole: 'timeslicing-algos',
        referenceDomainSec: [baseDomainStartSec, baseDomainEndSec],
        fetchedDomainSec,
        detailDomainSec: [rangeStart, rangeEnd],
        hasActiveSelection,
        strategyLabel: selectedStrategy,
        timescaleLabel: selectedTimeScale,
      }),
    [
      baseDomainEndSec,
      baseDomainStartSec,
      fetchedDomainSec,
      hasActiveSelection,
      rangeEnd,
      rangeStart,
      selectedStrategy,
      selectedTimeScale,
    ],
  );

  const hasEmptyData = !isLoading && !error && crimes.length === 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timeslicing Algos</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Compare core timeslicing behavior with timeline interaction. This route intentionally excludes suggestion review history and acceptance workflow orchestration.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-300">Data: <strong className="text-slate-100">{dataSummaryLabel}</strong></span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              Timeline: {dataDomainLabel}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              Fetched: {fetchedDomainLabel}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              Detail: {detailRangeLabel}
            </span>
            <span className="rounded-full border border-indigo-500/40 bg-indigo-950/40 px-2 py-0.5 text-[11px] text-indigo-100">
              Selection detail: {selectionPopulationLabel}
            </span>
            <span className="rounded-full border border-indigo-500/40 bg-indigo-950/40 px-2 py-0.5 text-[11px] text-indigo-100">
              Detail render: {selectionRenderLabel}
            </span>
            <span className="rounded-full border border-indigo-500/40 bg-indigo-950/40 px-2 py-0.5 text-[11px] text-indigo-100">
              {selectionFallbackLabel}
            </span>
            <span className="rounded-full border border-indigo-500/40 bg-indigo-950/40 px-2 py-0.5 text-[11px] text-indigo-100">
              Selection fetch: {isSelectionLoading ? 'loading' : selectionError ? 'error' : 'ready'} • limit {selectionDetailLimit.toLocaleString()} • buffer 0d
            </span>
          </div>

          <div className="mt-4">
            <TimelineQaContextCard model={timelineQaModel} />
          </div>

          <div className="mt-4">
            <TimeslicingAlgosInteractionControls
              selectedStrategy={selectedStrategy}
              selectedTimeScale={selectedTimeScale}
              onStrategyChange={handleStrategyChange}
              onTimeScaleChange={handleTimeScaleChange}
            />

            <TimeslicingAlgosStrategyStats
              timestamps={timestamps}
              domain={[baseDomainStartSec, baseDomainEndSec]}
              selectedStrategy={selectedStrategy}
            />

            <AdaptiveBinDiagnosticsPanel
              rows={adaptiveDiagnosticsRows}
              selectedStrategy={selectedStrategy}
              selectedTimeScale={selectedTimeScale}
              domain={mapDomain}
            />
          </div>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400" data-testid="algorithm-registry">
            {ALGORITHM_OPTIONS.map((option) => (
              <li key={option.algorithmId}>
                {option.label}: {option.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Timeline</h2>
          <div
            ref={timelineContainerRef}
            className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3"
            data-testid="timeslicing-algos-timeline"
          >
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Loading crime data...</div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center text-red-400">Error loading data: {error.message}</div>
            ) : hasEmptyData ? (
              <div
                className="flex h-40 flex-col items-center justify-center gap-2 text-slate-300"
                data-testid="timeslicing-algos-empty-data"
              >
                <p className="text-sm font-medium">No crime data returned for this timeline context.</p>
                <p className="text-xs text-slate-400">
                  Reference and diagnostics labels remain available for QA, but timeline bins are empty until data is returned.
                </p>
              </div>
            ) : timelineWidth > 0 ? (
              <DualTimeline
                detailRangeOverride={[rangeStart, rangeEnd]}
                detailPointsOverride={selectionDetailDataset.renderTimestamps}
                detailRenderMode="auto"
                disableAutoBurstSlices={true}
                tickLabelStrategy="span-aware"
              />
            ) : (
              <div className="h-40" />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
