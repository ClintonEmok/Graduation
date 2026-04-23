"use client";

import { useState } from 'react';
import { Layers3 } from 'lucide-react';
import MapVisualization from '@/components/map/MapVisualization';
import { DemoStatsMapOverlay } from '@/components/dashboard-demo/DemoStatsMapOverlay';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoAdaptiveStore } from '@/store/useDashboardDemoAdaptiveStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import { useDashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';
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
  const selectionStory = useDashboardDemoSelectionStory();

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-40 max-w-sm rounded-md border border-slate-700 bg-slate-950/85 px-3 py-2 text-[10px] text-slate-100 shadow-sm backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Map story</p>
        <p className="mt-1">Window: {selectionStory.activeWindowLabel}</p>
        <p className="mt-1">Linked: {selectionStory.linkedHighlightLabel}</p>
        <p className="mt-1 text-slate-400">{selectionStory.explanationLabel}</p>
      </div>

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

      <button
        type="button"
        onClick={() => setShowStkde((current) => !current)}
        aria-label={showStkde ? 'Hide STKDE overlay' : 'Show STKDE overlay'}
        title={showStkde ? 'Hide STKDE overlay' : 'Show STKDE overlay'}
        className={`absolute right-4 top-14 z-40 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] transition-colors ${
          showStkde
            ? 'border-rose-400/50 bg-rose-500/15 text-rose-100'
            : 'border-slate-700 bg-slate-950/80 text-slate-400 hover:text-slate-200'
        }`}
      >
        <Layers3 className="size-3.5" />
        {showStkde ? 'Hide STKDE' : 'Show STKDE'}
      </button>
    </div>
  );
}
