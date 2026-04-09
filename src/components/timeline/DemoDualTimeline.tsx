"use client";

import React, { useMemo } from 'react';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { buildDemoSliceAuthoredWarpMap } from '@/components/dashboard-demo/lib/demo-warp-map';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

type DemoDualTimelineProps = React.ComponentProps<typeof DualTimeline>;

export function DemoDualTimeline({
  disableAutoBurstSlices = true,
  tickLabelStrategy = 'span-aware',
  ...props
}: DemoDualTimelineProps) {
  const timeScaleMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const slices = useDashboardDemoSliceStore((state) => state.slices);
  const timeStore = useDashboardDemoTimeStore;
  const filterStore = useDashboardDemoFilterStore;
  const coordinationStore = useDashboardDemoCoordinationStore;
  const timeslicingModeStore = useDashboardDemoTimeslicingModeStore;
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const warpDomain = useMemo<[number, number]>(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
      return [minTimestampSec, maxTimestampSec];
    }

    return [0, 100];
  }, [maxTimestampSec, minTimestampSec]);

  const warpOverlayBands = useMemo(
    () =>
      slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          const center = slice.type === 'range' && slice.range
            ? [(slice.range[0] + slice.range[1]) / 2, Math.max(0.5, Math.abs(slice.range[1] - slice.range[0])) / 2]
            : [slice.time, slice.isBurst ? 2.5 : 1.5];
          const [centerValue, halfWidth] = center;
          const start = normalizedToEpochSeconds(Math.max(0, Math.min(100, centerValue - halfWidth)), warpDomain[0], warpDomain[1]);
          const end = normalizedToEpochSeconds(Math.max(0, Math.min(100, centerValue + halfWidth)), warpDomain[0], warpDomain[1]);
          return {
            id: slice.id,
            startSec: Math.min(start, end),
            endSec: Math.max(start, end),
            isDebugPreview: false,
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [slices, warpDomain]
  );

  const authoredWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, warpDomain, Math.max(96, slices.length * 8 || 0)),
    [slices, warpDomain]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Focused / adapted track</span>
        <span>Raw baseline underneath</span>
      </div>
      <DualTimeline
        {...props}
        disableAutoBurstSlices={disableAutoBurstSlices}
        tickLabelStrategy={tickLabelStrategy}
        timeStoreOverride={timeStore}
        filterStoreOverride={filterStore}
        coordinationStoreOverride={coordinationStore}
        timeslicingModeStoreOverride={timeslicingModeStore}
        sliceDomainStoreOverride={useDashboardDemoSliceStore}
        warpOverlayBandsOverride={warpOverlayBands}
        timeScaleModeOverride={timeScaleMode}
        warpFactorOverride={warpFactor}
        adaptiveWarpMapOverride={authoredWarpMap}
        adaptiveWarpDomainOverride={warpDomain}
        showWarpConnectors
        warpConnectorStyle="curved"
      />
    </div>
  );
}
