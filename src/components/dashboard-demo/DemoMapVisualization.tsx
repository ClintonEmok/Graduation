"use client";

import { useState } from 'react';
import { Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MapVisualization from '@/components/map/MapVisualization';
import { DemoStatsMapOverlay } from '@/components/dashboard-demo/DemoStatsMapOverlay';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoAdaptiveStore } from '@/store/useDashboardDemoAdaptiveStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

interface DemoMapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
}

export function DemoMapVisualization({
  stkdeResponse = null,
  stkdeSelectedHotspotId = null,
}: DemoMapVisualizationProps) {
  const [showStkde, setShowStkde] = useState(true);
  const storeStkdeResponse = useDashboardDemoAnalysisStore((state) => state.stkdeResponse);
  const storeSelectedHotspotId = useDashboardDemoAnalysisStore((state) => state.selectedHotspotId);

  return (
    <div className="relative h-full w-full">
      <MapVisualization
        stkdeResponse={stkdeResponse ?? storeStkdeResponse}
        stkdeSelectedHotspotId={stkdeSelectedHotspotId ?? storeSelectedHotspotId}
        stkdeVisibleOverride={showStkde}
        statsOverlay={<DemoStatsMapOverlay />}
        filterStoreOverride={useDashboardDemoFilterStore}
        coordinationStoreOverride={useDashboardDemoCoordinationStore}
        adaptiveStoreOverride={useDashboardDemoAdaptiveStore}
        mapLayerStoreOverride={useDashboardDemoMapLayerStore}
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
    </div>
  );
}
