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
import { ALGORITHM_OPTIONS } from './algorithm-options';
import { TimeslicingAlgosStrategyStats } from './TimeslicingAlgosStrategyStats';
import {
  resolveTimeslicingAlgosSelection,
  serializeTimeslicingAlgosSelection,
  type TimeslicingAlgosSelection,
} from './mode-selection';
import { TimeslicingAlgosInteractionControls } from './TimeslicingAlgosInteractionControls';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

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

  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const baseDomainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const baseDomainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const { data: crimes, meta, isLoading, error } = useCrimeData({
    startEpoch: baseDomainStartSec,
    endEpoch: baseDomainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));

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

    const timelineDomainStartSec = meta?.buffer?.applied.start ?? baseDomainStartSec;
    const timelineDomainEndSec = meta?.buffer?.applied.end ?? baseDomainEndSec;

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
      minTimestampSec: timelineDomainStartSec,
      maxTimestampSec: timelineDomainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore
      .getState()
      .computeMaps(timestamps, [timelineDomainStartSec, timelineDomainEndSec], { binningMode: selectedStrategy });
  }, [baseDomainEndSec, baseDomainStartSec, crimes, meta?.buffer?.applied.end, meta?.buffer?.applied.start, selectedStrategy]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) return 'Loading...';
    if (!crimes.length) return 'No data';

    const total = meta?.totalMatches ?? crimes.length;
    const returned = meta?.returned ?? crimes.length;
    const details: string[] = [];
    const bufferDays = meta?.buffer?.days ?? 0;

    if (returned !== total) details.push(`showing ${returned.toLocaleString()}`);
    if (bufferDays > 0) details.push(`buffered +/-${bufferDays}d`);

    return details.length > 0
      ? `${total.toLocaleString()} crimes (${details.join(', ')})`
      : `${total.toLocaleString()} crimes`;
  }, [crimes.length, isLoading, meta]);

  const dataDomainLabel = useMemo(() => {
    const minLabel = new Date(baseDomainStartSec * 1000).toLocaleDateString();
    const maxLabel = new Date(baseDomainEndSec * 1000).toLocaleDateString();
    return `${minLabel} - ${maxLabel}`;
  }, [baseDomainEndSec, baseDomainStartSec]);

  const selectionRangeLabel = useMemo(() => {
    if (!selectedTimeRange) return null;
    const [start, end] = [
      Math.min(selectedTimeRange[0], selectedTimeRange[1]),
      Math.max(selectedTimeRange[0], selectedTimeRange[1]),
    ];
    return `${new Date(start * 1000).toLocaleDateString()} - ${new Date(end * 1000).toLocaleDateString()}`;
  }, [selectedTimeRange]);

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
            {selectionRangeLabel ? (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                Selection: {selectionRangeLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <TimeslicingAlgosInteractionControls
              selectedStrategy={selectedStrategy}
              selectedTimeScale={selectedTimeScale}
              onStrategyChange={handleStrategyChange}
              onTimeScaleChange={handleTimeScaleChange}
            />

            <TimeslicingAlgosStrategyStats
              timestamps={crimes.map((crime) => crime.timestamp)}
              domain={[baseDomainStartSec, baseDomainEndSec]}
              selectedStrategy={selectedStrategy}
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
            ) : timelineWidth > 0 ? (
              <DualTimeline
                detailRangeOverride={selectedTimeRange ? undefined : [baseDomainStartSec, baseDomainEndSec]}
                detailRenderMode="auto"
                disableAutoBurstSlices={true}
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
