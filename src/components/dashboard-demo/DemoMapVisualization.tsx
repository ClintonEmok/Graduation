"use client";

import { useMemo, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MapVisualization from '@/components/map/MapVisualization';
import { DemoStatsMapOverlay } from '@/components/dashboard-demo/DemoStatsMapOverlay';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

function resolveSliceEpochRange(
  slice: TimeSlice,
  minTimestampSec: number,
  maxTimestampSec: number,
): [number, number] {
  if (slice.startDateTimeMs !== undefined || slice.endDateTimeMs !== undefined) {
    const startMs = slice.startDateTimeMs ?? slice.endDateTimeMs ?? 0;
    const endMs = slice.endDateTimeMs ?? slice.startDateTimeMs ?? startMs;
    const start = startMs / 1000;
    const end = endMs / 1000;
    return start <= end ? [start, end] : [end, start];
  }

  if (slice.type === 'range' && slice.range) {
    const start = normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec);
    return start <= end ? [start, end] : [end, start];
  }

  const time = normalizedToEpochSeconds(slice.time, minTimestampSec, maxTimestampSec);
  return [time, time];
}

interface DemoMapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
}

export function DemoMapVisualization({
  stkdeResponse = null,
  stkdeSelectedHotspotId = null,
}: DemoMapVisualizationProps) {
  const [showStkde, setShowStkde] = useState(true);
  const heatmapVisible = useDashboardDemoMapLayerStore((state) => state.visibility.heatmap);
  const poiVisible = useDashboardDemoMapLayerStore((state) => state.visibility.poi);
  const toggleVisibility = useDashboardDemoMapLayerStore((state) => state.toggleVisibility);
  const storeStkdeResponse = useDashboardDemoCoordinationStore((state) => state.stkdeResponse);
  const storeSelectedHotspotId = useDashboardDemoCoordinationStore((state) => state.selectedHotspotId);

  const activeSliceIndex = useDashboardDemoCoordinationStore((s) => s.activeSliceIndex);
  const slices = useSliceDomainStore((s) => s.slices);
  const minTimestampSec = useTimelineDataStore((s) => s.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((s) => s.maxTimestampSec);

  const { sliceTimeRange, activeSliceLabel } = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return { sliceTimeRange: null, activeSliceLabel: null };
    }
    const visible = slices
      .filter((s) => s.isVisible && s.type === 'range')
      .sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0));
    const active = visible[activeSliceIndex];
    if (!active) return { sliceTimeRange: null, activeSliceLabel: null };

    const range = resolveSliceEpochRange(active, minTimestampSec, maxTimestampSec);
    const label = active.name || `Slice ${activeSliceIndex + 1}`;
    return { sliceTimeRange: range, activeSliceLabel: label };
  }, [activeSliceIndex, slices, minTimestampSec, maxTimestampSec]);

  return (
    <div className="relative h-full w-full">
      <MapVisualization
        stkdeResponse={stkdeResponse ?? storeStkdeResponse}
        stkdeSelectedHotspotId={stkdeSelectedHotspotId ?? storeSelectedHotspotId}
        stkdeVisibleOverride={showStkde}
        disableHeatmapOverlay
        statsOverlay={<DemoStatsMapOverlay />}
        filterStoreOverride={useDashboardDemoFilterStore}
        coordinationStoreOverride={useDashboardDemoCoordinationStore}
        mapLayerStoreOverride={useDashboardDemoMapLayerStore}
        sliceTimeRange={sliceTimeRange}
        activeSliceLabel={activeSliceLabel}
      />

      <Button
        type="button"
        onClick={() => setShowStkde((current) => !current)}
        aria-label={showStkde ? 'Hide STKDE overlay' : 'Show STKDE overlay'}
        title={showStkde ? 'Hide STKDE overlay' : 'Show STKDE overlay'}
        variant={showStkde ? 'destructive' : 'outline'}
        size="sm"
        className="absolute right-4 top-14 z-40 gap-2 rounded-full text-[11px]"
      >
        <Layers3 className="size-3.5" />
        {showStkde ? 'Hide STKDE' : 'Show STKDE'}
      </Button>

      <Button
        type="button"
        onClick={() => toggleVisibility('poi')}
        aria-label={poiVisible ? 'Hide POI overlay' : 'Show POI overlay'}
        title={poiVisible ? 'Hide POI overlay' : 'Show POI overlay'}
        variant={poiVisible ? 'destructive' : 'outline'}
        size="sm"
        className="absolute right-4 top-4 z-40 gap-2 rounded-full text-[11px]"
      >
        <Layers3 className="size-3.5" />
        {poiVisible ? 'Hide POIs' : 'Show POIs'}
      </Button>

      <Button
        type="button"
        onClick={() => toggleVisibility('heatmap')}
        aria-label={heatmapVisible ? 'Hide heatmap overlay' : 'Show heatmap overlay'}
        title={heatmapVisible ? 'Hide heatmap overlay' : 'Show heatmap overlay'}
        variant={heatmapVisible ? 'destructive' : 'outline'}
        size="sm"
        className="absolute right-4 top-24 z-40 gap-2 rounded-full text-[11px]"
      >
        <Layers3 className="size-3.5" />
        {heatmapVisible ? 'Hide Heatmap' : 'Show Heatmap'}
      </Button>
    </div>
  );
}
