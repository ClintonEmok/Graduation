"use client";

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMeasure } from '@/hooks/useMeasure';
import { useCrimeData } from '@/hooks/useCrimeData';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { ACTIVE_ALGORITHM_OPTIONS, ALGORITHM_OPTIONS } from './algorithm-options';
import {
  parseTimeslicingAlgosModeIntent,
  resolveTimeslicingAlgosEffectiveMode,
  type TimeslicingAlgosModeIntent,
} from './mode-intent';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

export function TimeslicingAlgosRouteShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();

  const requestedMode = searchParams.get('mode');
  const selectedModeIntent = parseTimeslicingAlgosModeIntent(requestedMode);
  const effectiveMode = resolveTimeslicingAlgosEffectiveMode(pathname, selectedModeIntent);

  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const domainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const { data: crimes, meta, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));

  const setModeIntent = (nextMode: TimeslicingAlgosModeIntent) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('mode', nextMode);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (requestedMode !== null) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('mode', selectedModeIntent);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, requestedMode, router, searchParams, selectedModeIntent]);

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
      minTimestampSec: domainStartSec,
      maxTimestampSec: domainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: effectiveMode });
  }, [crimes, domainEndSec, domainStartSec, effectiveMode]);

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
              {new Date(domainStartSec * 1000).toLocaleDateString()} - {new Date(domainEndSec * 1000).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" data-testid="algo-mode-controls">
            {ACTIVE_ALGORITHM_OPTIONS.map((option) => {
              const modeIntent = option.modeIntent as TimeslicingAlgosModeIntent;
              const isActive = selectedModeIntent === modeIntent;
              return (
                <button
                  key={option.algorithmId}
                  type="button"
                  onClick={() => setModeIntent(modeIntent)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
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
                detailRangeOverride={[domainStartSec, domainEndSec]}
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
