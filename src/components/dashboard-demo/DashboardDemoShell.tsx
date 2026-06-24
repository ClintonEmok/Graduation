"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { Map, Box, Sparkles, Flame, Layers3, MapPin } from 'lucide-react';
import { DemoTimelinePanel } from '@/components/dashboard-demo/DemoTimelinePanel';
import { DashboardDemoRailTabs } from '@/components/dashboard-demo/DashboardDemoRailTabs';
import { Button } from '@/components/ui/button';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { DemoMapVisualization } from '@/components/dashboard-demo/DemoMapVisualization';
import { Demo3dSpatialView } from '@/components/dashboard-demo/Demo3dSpatialView';
import { useDemoStkde } from '@/components/dashboard-demo/lib/useDemoStkde';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { toast } from 'sonner';

type DemoViewport = 'map' | '3d';
const DEFAULT_TIME_RANGE: [number, number] = [0, 100];

function DemoStkdeTrigger() {
  useDemoStkde();
  return null;
}

export function DashboardDemoShell() {
  const [activeViewport, setActiveViewport] = useState<DemoViewport>('map');
  const [showStkde, setShowStkde] = useState(true);
  const loadSummaryData = useTimelineDataStore((state) => state.loadSummaryData);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const setViewport = useViewportStore((state) => state.setViewport);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const poiVisible = useDashboardDemoMapLayerStore((state) => state.visibility.poi);
  const heatmapVisible = useDashboardDemoMapLayerStore((state) => state.visibility.heatmap);
  const toggleLayer = useDashboardDemoMapLayerStore((state) => state.toggleVisibility);

  useEffect(() => {
    void (async () => {
      await loadSummaryData();
    })();
  }, [loadSummaryData]);

  useEffect(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    if (maxTimestampSec <= minTimestampSec) return;
    setViewport(minTimestampSec, maxTimestampSec);
  }, [maxTimestampSec, minTimestampSec, setViewport]);

  const appliedSliceCount = useSliceDomainStore(
    (s) => s.slices.filter((sl) => sl.source === 'generated-applied' && sl.type === 'range').length,
  );
  const autoSwitchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (appliedSliceCount === 0) {
      autoSwitchKeyRef.current = null;
      return;
    }

    const nextKey = lastAppliedAt === null
      ? `hydrated:${appliedSliceCount}`
      : `applied:${lastAppliedAt}`;

    if (autoSwitchKeyRef.current === nextKey) {
      return;
    }

    if (lastAppliedAt !== null || autoSwitchKeyRef.current === null) {
      setActiveViewport('3d');
      setActiveRailTab('inspect');
    }
    autoSwitchKeyRef.current = nextKey;
  }, [appliedSliceCount, lastAppliedAt, setActiveRailTab]);

  const [generateLoading, setGenerateLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    const [rangeStart, rangeEnd] = selectedTimeRange ?? useDashboardDemoCoordinationStore.getState().brushRange ?? DEFAULT_TIME_RANGE;
    if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) return;

    setGenerateLoading(true);
    const { useDashboardDemoTimeslicingModeStore } = await import('@/store/useDashboardDemoTimeslicingModeStore');

    try {
      const timeslicingStore = useDashboardDemoTimeslicingModeStore.getState();
      const windowStartMs = normalizedToEpochSeconds(rangeStart, minTimestampSec, maxTimestampSec) * 1000;
      const windowEndMs = normalizedToEpochSeconds(rangeEnd, minTimestampSec, maxTimestampSec) * 1000;

      timeslicingStore.setGenerationInputs({
        timeWindow: { start: windowStartMs, end: windowEndMs },
        granularity: timeslicingStore.generationInputs.granularity,
      });

      const success = await timeslicingStore.generateBurstDraftBinsFromWindows();
      if (!success) {
        toast.error('Generation failed', { description: 'Could not generate burst slices.' });
        setGenerateLoading(false);
        return;
      }

      setActiveRailTab('slices');
      toast.success('Slices ready', { description: 'Draft slices are ready for review in Slices.' });
    } catch {
      toast.error('Generation failed');
    }

    setGenerateLoading(false);
  }, [maxTimestampSec, minTimestampSec, selectedTimeRange, setActiveRailTab]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100"
      aria-label="dashboard demo workspace"
    >
      <DemoStkdeTrigger />
      <div className="flex h-full min-w-0 flex-col pr-80">
        <header className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Adaptive Space-Time Cube</span>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generateLoading || minTimestampSec === null}
              size="sm"
              className="gap-2"
            >
              <Sparkles className="size-3.5" />
              {generateLoading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </header>

        <section className="relative min-h-0 flex-1 overflow-hidden bg-slate-950" aria-label="dashboard demo shared viewport">
          <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/60 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              onClick={() => setActiveViewport('map')}
              aria-label="Show map viewport"
              title="Map"
              variant={activeViewport === 'map' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <Map className="size-3.5" />
            </Button>
            <Button
              type="button"
              onClick={() => setActiveViewport('3d')}
              aria-label="Show 3D viewport"
              title="3D"
              variant={activeViewport === '3d' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <Box className="size-3.5" />
            </Button>
            {activeViewport === 'map' ? (
              <>
                <div className="mx-1 h-5 w-px bg-slate-700/70" aria-hidden="true" />
                <Button
                  type="button"
                  onClick={() => toggleLayer('poi')}
                  aria-label={poiVisible ? 'Hide POIs' : 'Show POIs'}
                  title={poiVisible ? 'Hide POIs' : 'Show POIs'}
                  variant={poiVisible ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <MapPin className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowStkde((current) => !current)}
                  aria-label={showStkde ? 'Hide STKDE hotspots' : 'Show STKDE hotspots'}
                  title={showStkde ? 'Hide STKDE hotspots' : 'Show STKDE hotspots'}
                  variant={showStkde ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <Flame className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => toggleLayer('heatmap')}
                  aria-label={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
                  title={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
                  variant={heatmapVisible ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <Layers3 className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>

          <div className="h-full w-full transition-opacity duration-200 ease-out">
            {activeViewport === 'map' ? (
              <DemoMapVisualization stkdeVisible={showStkde} />
            ) : (
              <Demo3dSpatialView />
            )}
          </div>
        </section>

        <div className="shrink-0 border-t border-slate-800 bg-slate-900/65">
          <DemoTimelinePanel />
        </div>
      </div>

      <DashboardDemoRailTabs />
    </main>
  );
}
