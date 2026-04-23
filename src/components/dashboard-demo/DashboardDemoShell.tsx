"use client";

import { useEffect, useState } from 'react';
import { Map, SquareStack } from 'lucide-react';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { DemoTimelinePanel } from '@/components/dashboard-demo/DemoTimelinePanel';
import { WorkflowSkeleton } from '@/components/dashboard-demo/WorkflowSkeleton';
import { DashboardDemoRailTabs } from '@/components/dashboard-demo/DashboardDemoRailTabs';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { DemoMapVisualization } from '@/components/dashboard-demo/DemoMapVisualization';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useDashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';

type DemoViewport = 'map' | 'cube';

export function DashboardDemoShell() {
  const [activeViewport, setActiveViewport] = useState<DemoViewport>('map');
  const loadRealData = useTimelineDataStore((state) => state.loadRealData);
  const setViewport = useViewportStore((state) => state.setViewport);
  const selectionStory = useDashboardDemoSelectionStory();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadRealData();
      if (cancelled) return;

      const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        setViewport(minTimestampSec, maxTimestampSec);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRealData, setViewport]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100"
      aria-label="Phase 13 guided analysis workflow"
      data-phase="phase-13-guided-analysis-workflow"
    >
      <div className="flex h-full min-w-0 flex-col pr-80">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950/95 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Phase 13 · Guided workflow</div>
            <h1 className="mt-1 text-sm font-semibold tracking-tight text-slate-100">
              Orient → Find → Compare → Inspect → Explain → Apply
            </h1>
            <p className="mt-1 text-[11px] text-slate-400">
              Timeline first, map for where, cube for what relates to what.
            </p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-300">
            Shared dataset · one workflow · linked views
          </div>
        </header>

        <section className="relative min-h-0 flex-1 overflow-hidden bg-slate-950" aria-label="dashboard demo shared viewport">
          <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/80 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setActiveViewport('map')}
              aria-label="Show map viewport"
              title="Show map viewport"
              className={`inline-flex items-center justify-center rounded-full p-2 transition-colors ${
                activeViewport === 'map' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveViewport('cube')}
              aria-label="Show cube viewport"
              title="Show cube viewport"
              className={`inline-flex items-center justify-center rounded-full p-2 transition-colors ${
                activeViewport === 'cube' ? 'bg-violet-500/20 text-violet-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SquareStack className="size-3.5" />
            </button>
          </div>

          <div className="h-full w-full transition-opacity duration-200 ease-out">
            {activeViewport === 'map' ? (
              <DemoMapVisualization />
            ) : (
              <CubeVisualization selectionStory={selectionStory} />
            )}
          </div>
        </section>

        <div className="shrink-0 border-t border-slate-800">
          <DemoTimelinePanel />
        </div>
      </div>

      <WorkflowSkeleton />

      <DashboardDemoRailTabs />
    </main>
  );
}
