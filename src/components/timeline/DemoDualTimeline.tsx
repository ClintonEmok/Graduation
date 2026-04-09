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

  const authoredWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, warpDomain, Math.max(96, slices.length * 8 || 0)),
    [slices, warpDomain]
  );

  const warpOverlayBandsOverride = useMemo(
    () =>
      slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          const [normalizedStart, normalizedEnd] =
            slice.type === 'range' && slice.range
              ? [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])]
              : [Math.max(0, slice.time - (slice.isBurst ? 2.5 : 1.5)), Math.min(100, slice.time + (slice.isBurst ? 2.5 : 1.5))];

          const startSec = normalizedToEpochSeconds(normalizedStart, warpDomain[0], warpDomain[1]);
          const endSec = normalizedToEpochSeconds(normalizedEnd, warpDomain[0], warpDomain[1]);

          return {
            id: slice.id,
            startSec: Math.min(startSec, endSec),
            endSec: Math.max(startSec, endSec),
            isDebugPreview: false,
          };
        })
        .filter((band) => Number.isFinite(band.startSec) && Number.isFinite(band.endSec) && band.endSec > band.startSec),
    [slices, warpDomain]
  );

  return (
    <DualTimeline
      {...props}
      disableAutoBurstSlices={disableAutoBurstSlices}
      tickLabelStrategy={tickLabelStrategy}
      timeStoreOverride={timeStore}
      filterStoreOverride={filterStore}
      coordinationStoreOverride={coordinationStore}
      timeslicingModeStoreOverride={timeslicingModeStore}
      sliceDomainStoreOverride={useDashboardDemoSliceStore}
      timeScaleModeOverride={timeScaleMode}
      warpFactorOverride={warpFactor}
      adaptiveWarpMapOverride={authoredWarpMap}
      adaptiveWarpDomainOverride={warpDomain}
      warpOverlayBandsOverride={warpOverlayBandsOverride}
    />
  );
}
