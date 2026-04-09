"use client";

import { useEffect, useState } from 'react';
import { Map, SquareStack } from 'lucide-react';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { DemoTimelinePanel } from '@/components/dashboard-demo/DemoTimelinePanel';
import { DashboardStkdePanel } from '@/components/stkde/DashboardStkdePanel';
import { WorkflowSkeleton } from '@/components/dashboard-demo/WorkflowSkeleton';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

type DemoViewport = 'map' | 'cube';

export function DashboardDemoShell() {
  const [activeViewport, setActiveViewport] = useState<DemoViewport>('map');
  const loadRealData = useTimelineDataStore((state) => state.loadRealData);

  useEffect(() => {
    void loadRealData();
  }, [loadRealData]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100"
      aria-label="Dashboard demo route"
      data-phase="workflow-isolation-dashboard-handoff-demo"
    >
      <div className="flex h-full min-w-0 flex-col pr-80">
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

          <div className="h-full w-full transition-opacity duration-200 ease-out">{activeViewport === 'map' ? <MapVisualization /> : <CubeVisualization />}</div>
        </section>

        <div className="shrink-0 border-t border-slate-800">
          <DemoTimelinePanel />
        </div>
      </div>

      <WorkflowSkeleton />

      <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur">
        <DashboardStkdePanel />
      </aside>
    </main>
  );
}
