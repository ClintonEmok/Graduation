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
    />
  );
}
