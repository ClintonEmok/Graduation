"use client";

import { useEffect, useMemo } from "react";
import { DualTimeline } from "@/components/timeline/DualTimeline";
import { useCrimeData } from "@/hooks/useCrimeData";
import { useViewportStore } from "@/lib/stores/viewportStore";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useDataStore } from "@/store/useDataStore";
import { useFilterStore } from "@/store/useFilterStore";
import { useTimeStore } from "@/store/useTimeStore";
import { useWarpSliceStore } from "@/store/useWarpSliceStore";
import {
  buildSliceAuthoredWarpMap,
  remapSelectionPercentToDomainPercent,
} from "./lib/route-orchestration";

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

export default function TimelineTest3DPage() {
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const warpSlices = useWarpSliceStore((state) => state.slices);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const hasValidAdaptiveDomain =
    mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;

  const domainStartSec = hasValidAdaptiveDomain
    ? mapDomain[0]
    : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain
    ? mapDomain[1]
    : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const { data: crimes, meta: crimeMeta, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

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

    useDataStore.setState({
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
      .computeMaps(timestamps, [domainStartSec, domainEndSec]);
  }, [crimes, domainEndSec, domainStartSec]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    const returned = crimeMeta?.returned ?? crimes.length;
    const total = crimeMeta?.totalMatches ?? returned;
    if (total === 0) return "No data";
    return `${total.toLocaleString()} crimes`;
  }, [crimeMeta, crimes.length, isLoading]);

  const [selectionStart, selectionEnd] = useMemo<[number, number]>(() => {
    if (
      selectedTimeRange &&
      Number.isFinite(selectedTimeRange[0]) &&
      Number.isFinite(selectedTimeRange[1])
    ) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (end > start) {
        return [start, end];
      }
    }
    const fallbackStart = Math.min(viewportStart, viewportEnd);
    const fallbackEnd = Math.max(viewportStart, viewportEnd);
    return fallbackEnd > fallbackStart
      ? [fallbackStart, fallbackEnd]
      : [domainStartSec, domainEndSec];
  }, [domainEndSec, domainStartSec, selectedTimeRange, viewportEnd, viewportStart]);

  const authoredWarpMap = useMemo(() => {
    if (timeScaleMode !== "adaptive" || warpSource !== "slice-authored") {
      return null;
    }

    const remappedSlices = warpSlices.map((slice) => ({
      ...slice,
      range: [
        remapSelectionPercentToDomainPercent(
          slice.range[0],
          [selectionStart, selectionEnd],
          [domainStartSec, domainEndSec]
        ),
        remapSelectionPercentToDomainPercent(
          slice.range[1],
          [selectionStart, selectionEnd],
          [domainStartSec, domainEndSec]
        ),
      ] as [number, number],
    }));

    return buildSliceAuthoredWarpMap(
      remappedSlices,
      [domainStartSec, domainEndSec],
      Math.max(96, densityMap?.length || 0)
    );
  }, [
    densityMap?.length,
    domainEndSec,
    domainStartSec,
    selectionEnd,
    selectionStart,
    timeScaleMode,
    warpSlices,
    warpSource,
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timeline Test 3D</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Dedicated 3D route foundation with route-local orchestration helpers.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-5 text-sm text-slate-300">
          <div className="flex flex-wrap items-center gap-6">
            <span>
              Data: <strong className="text-slate-100">{dataSummaryLabel}</strong>
            </span>
            <span>
              Range:{" "}
              <strong className="text-slate-100">
                {new Date(domainStartSec * 1000).toLocaleDateString()} -{" "}
                {new Date(domainEndSec * 1000).toLocaleDateString()}
              </strong>
            </span>
          </div>
        </section>

        <section className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-slate-400">
              Loading crime data...
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-red-400">
              Error loading data: {error.message}
            </div>
          ) : (
            <DualTimeline
              adaptiveWarpMapOverride={
                warpSource === "slice-authored" ? authoredWarpMap : undefined
              }
              adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
              detailRangeOverride={[selectionStart, selectionEnd]}
              disableAutoBurstSlices={true}
            />
          )}
        </section>
      </div>
    </main>
  );
}
