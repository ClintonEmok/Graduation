"use client";

import { useEffect, useMemo } from 'react';
import { CheckCircle2, Clock3, Layers3, TriangleAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useMeasure } from '@/hooks/useMeasure';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { BinningControls } from '@/components/binning/BinningControls';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useBinningStore } from '@/store/useBinningStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { SuggestionToolbar } from './components/SuggestionToolbar';
import { useFilterStore } from '@/store/useFilterStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { buildTimelineQaModel } from '@/components/timeline/qa/timeline-qa-model';
import { TimelineQaContextCard } from '@/components/timeline/qa/TimelineQaContextCard';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

export default function TimeslicingPage() {
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();

  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const domainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);
  const hasRealData = hasValidAdaptiveDomain || (minTimestampSec !== null && maxTimestampSec !== null);

  const { data: crimes, meta: crimeMeta, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (start !== end) {
        return [start, end];
      }
    }
    return [viewportStart, viewportEnd];
  }, [selectedTimeRange, viewportEnd, viewportStart]);

  const { data: selectionCrimes, isLoading: isSelectionLoading } = useCrimeData({
    startEpoch: rangeStart,
    endEpoch: rangeEnd,
    bufferDays: 0,
    limit: 50000,
  });

  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useTimeslicingModeStore((state) => state.generationError);
  const lastGeneratedMetadata = useTimeslicingModeStore((state) => state.lastGeneratedMetadata);
  const setGenerationInputs = useTimeslicingModeStore((state) => state.setGenerationInputs);
  const mergePendingGeneratedBins = useTimeslicingModeStore((state) => state.mergePendingGeneratedBins);
  const splitPendingGeneratedBin = useTimeslicingModeStore((state) => state.splitPendingGeneratedBin);
  const deletePendingGeneratedBin = useTimeslicingModeStore((state) => state.deletePendingGeneratedBin);

  const strategy = useBinningStore((state) => state.strategy);
  const selectedBinId = useBinningStore((state) => state.selectedBinId);
  const savedConfigurations = useBinningStore((state) => state.savedConfigurations);
  const bins = pendingGeneratedBins;

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));

  const dataStats = useMemo(() => {
    const returned = crimeMeta?.returned ?? crimes.length;
    const total = crimeMeta?.totalMatches ?? returned;
    const isMock = Boolean((crimeMeta as { isMock?: boolean } | null)?.isMock);
    return {
      count: total,
      returned,
      hasData: total > 0,
      sampled: Boolean(crimeMeta?.sampled),
      isMock,
    };
  }, [crimeMeta, crimes.length]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) return 'Loading…';
    if (!dataStats.hasData) return 'No data';

    const base = `${dataStats.count.toLocaleString()} crimes`;
    const details: string[] = [];
    const bufferDays = crimeMeta?.buffer?.days ?? 0;
    if (dataStats.sampled || dataStats.returned !== dataStats.count) {
      details.push(`showing ${dataStats.returned.toLocaleString()}`);
    }
    if (bufferDays > 0) {
      details.push(`buffered ±${bufferDays}d`);
    }
    if (dataStats.isMock) {
      details.push('demo data');
    }
    return details.length > 0 ? `${base} (${details.join(', ')})` : base;
  }, [crimeMeta, dataStats, isLoading]);

  useEffect(() => {
    if (!crimes || crimes.length === 0) return;

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
      minTimestampSec: domainStartSec,
      maxTimestampSec: domainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore
      .getState()
      .computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: 'uniform-events' });
  }, [crimes, domainEndSec, domainStartSec]);

  useEffect(() => {
    setGenerationInputs({
      timeWindow: {
        start: rangeStart * 1000,
        end: rangeEnd * 1000,
      },
    });
  }, [rangeEnd, rangeStart, setGenerationInputs]);

  const selectionTimestamps = useMemo(() => selectionCrimes.map((crime) => crime.timestamp), [selectionCrimes]);
  const selectionDetailPoints = useMemo(() => {
    const maxPoints = 4000;
    if (selectionTimestamps.length <= maxPoints) return selectionTimestamps;
    const step = Math.ceil(selectionTimestamps.length / maxPoints);
    return selectionTimestamps.filter((_, index) => index % step === 0);
  }, [selectionTimestamps]);

  const availableCrimeTypes = useMemo(
    () => Array.from(new Set(crimes.map((crime) => crime.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [crimes]
  );
  const availableNeighbourhoods = useMemo(
    () => Array.from(new Set(crimes.map((crime) => crime.district).filter((value): value is string => Boolean(value)))).sort(),
    [crimes]
  );

  const generationEvents = useMemo(
    () => selectionCrimes.map((crime) => ({ timestamp: crime.timestamp * 1000, type: crime.type, district: crime.district })),
    [selectionCrimes]
  );

  const workflowState = useMemo(() => {
    if (generationError) {
      return {
        label: 'Generation warning/error',
        description: generationError,
        icon: TriangleAlert,
        tone: 'text-red-300',
      };
    }
    if (generationStatus === 'generating') {
      return {
        label: 'Generating draft bins',
        description: 'The generator is creating draft bins from the selected crime type, neighbourhood, window, and granularity.',
        icon: Clock3,
        tone: 'text-amber-300',
      };
    }
    if (pendingGeneratedBins.length > 0) {
      return {
        label: 'Generated result pending review',
        description: 'Draft bins are visible on the timeline. Review them, then apply when they look right.',
        icon: Layers3,
        tone: 'text-violet-300',
      };
    }
    if (appliedSlices.length > 0) {
      return {
        label: 'Applied result active',
        description: 'The active slice set now comes from the last applied generated bins.',
        icon: CheckCircle2,
        tone: 'text-emerald-300',
      };
    }
    return {
      label: 'No generated result yet',
      description: 'Start by generating bins from your investigation intent. The first result will appear as a draft overlay.',
      icon: Clock3,
      tone: 'text-slate-300',
    };
  }, [appliedSlices.length, generationError, generationStatus, pendingGeneratedBins.length]);

  const fetchedDomainLabel = useMemo(() => {
    const fetchedStart = crimeMeta?.buffer?.applied.start ?? domainStartSec;
    const fetchedEnd = crimeMeta?.buffer?.applied.end ?? domainEndSec;
    return [fetchedStart, fetchedEnd] as [number, number];
  }, [crimeMeta?.buffer?.applied.end, crimeMeta?.buffer?.applied.start, domainEndSec, domainStartSec]);

  const timelineQaModel = useMemo(
    () =>
      buildTimelineQaModel({
        routeRole: 'timeslicing',
        referenceDomainSec: [domainStartSec, domainEndSec],
        fetchedDomainSec: fetchedDomainLabel,
        detailDomainSec: [rangeStart, rangeEnd],
        hasActiveSelection: Boolean(selectedTimeRange && selectedTimeRange[0] !== selectedTimeRange[1]),
      }),
    [domainEndSec, domainStartSec, fetchedDomainLabel, rangeEnd, rangeStart, selectedTimeRange],
  );

  const WorkflowIcon = workflowState.icon;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">User-Driven Timeslicing</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Generate bins from crime type, neighbourhood, time window, and granularity inputs. Review the draft result on the
            timeline, then apply it into the shared slice state.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <span>
                Data: <strong className="text-slate-100">{dataSummaryLabel}</strong>
              </span>
              {hasRealData && (
                <span>
                  Range:{' '}
                  <strong className="text-slate-100">
                    {new Date(domainStartSec * 1000).toLocaleDateString()} - {new Date(domainEndSec * 1000).toLocaleDateString()}
                  </strong>
                </span>
              )}
              {lastGeneratedMetadata && (
                <span>
                  Last generated: <strong className="text-slate-100">{lastGeneratedMetadata.binCount} bins / {lastGeneratedMetadata.eventCount} events</strong>
                </span>
              )}
            </div>

            <TimelineQaContextCard model={timelineQaModel} />

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <WorkflowIcon className={`mt-0.5 size-5 ${workflowState.tone}`} />
              <div>
                <div className={`text-sm font-medium ${workflowState.tone}`}>{workflowState.label}</div>
                <p className="mt-1 text-xs text-slate-400">{workflowState.description}</p>
              </div>
            </div>
          </div>
        </section>

        <BinningControls
          bins={bins}
          strategy={strategy}
          onStrategyChange={(nextStrategy) => useBinningStore.getState().setStrategy(nextStrategy)}
          onBinSelect={(binId) => useBinningStore.getState().selectBin(binId)}
          selectedBinId={selectedBinId}
          onMerge={mergePendingGeneratedBins}
          onSplit={splitPendingGeneratedBin}
          onDelete={(binId) => {
            deletePendingGeneratedBin(binId);
            if (selectedBinId === binId) {
              useBinningStore.getState().selectBin(null);
            }
          }}
          savedConfigs={savedConfigurations.map((config) => ({ id: config.id, name: config.name }))}
          onSaveConfig={(name) => useBinningStore.getState().saveConfiguration(name)}
          onLoadConfig={(id) => useBinningStore.getState().loadConfiguration(id)}
          generationData={generationEvents}
          generationDomain={[rangeStart * 1000, rangeEnd * 1000]}
          availableCrimeTypes={availableCrimeTypes}
          availableNeighbourhoods={availableNeighbourhoods}
        />

        <SuggestionToolbar applyDomain={[rangeStart * 1000, rangeEnd * 1000]} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Timeline review</h2>
              <p className="mt-1 text-xs text-slate-400">
                Draft bins appear immediately after generation. Applied slices remain visible as the active shared result.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-sm border border-amber-300/90 bg-amber-400/15" />
                Draft generated bin
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-sm border border-emerald-300/90 bg-emerald-400/15" />
                Applied slice
              </span>
            </div>
          </div>

          <div ref={timelineContainerRef} className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Loading crime data...</div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center text-red-400">Error loading data: {error.message}</div>
            ) : timelineWidth > 0 ? (
              <DualTimeline
                detailRangeOverride={[rangeStart, rangeEnd]}
                detailPointsOverride={selectionDetailPoints}
                detailRenderMode="auto"
                disableAutoBurstSlices={true}
                adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
                adaptiveWarpMapOverride={null}
                tickLabelStrategy="span-aware"
              />
            ) : (
              <div className="h-40" />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Selection timeline</h2>
              <p className="mt-1 text-xs text-slate-400">Focused review window for the currently selected time range.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              {new Date(rangeStart * 1000).toLocaleDateString()} - {new Date(rangeEnd * 1000).toLocaleDateString()}
            </span>
          </div>

          {isSelectionLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-xs text-slate-400">
              Loading selection timeline...
            </div>
          ) : selectionTimestamps.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-xs text-slate-500">
              No crimes in this selection range.
            </div>
          ) : (
            <div className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
              <DualTimeline
                domainOverride={[rangeStart, rangeEnd]}
                detailRangeOverride={[rangeStart, rangeEnd]}
                interactive={false}
                timestampSecondsOverride={selectionTimestamps}
                detailPointsOverride={selectionDetailPoints}
                disableAutoBurstSlices={true}
                adaptiveWarpDomainOverride={[rangeStart, rangeEnd]}
                adaptiveWarpMapOverride={null}
                tickLabelStrategy="span-aware"
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
