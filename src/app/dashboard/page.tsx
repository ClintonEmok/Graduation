"use client";

import { useMemo, useState } from 'react';
import { Layers3, Map, Square3Stack3D } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';
import { DashboardStkdePanel } from '@/components/stkde/DashboardStkdePanel';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';

type DashboardViewport = 'map' | 'cube';

export default function DashboardPage() {
  const [activeViewport, setActiveViewport] = useState<DashboardViewport>('map');
  const lastAppliedAt = useTimeslicingModeStore((state) => state.lastAppliedAt);
  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const lastGeneratedMetadata = useTimeslicingModeStore((state) => state.lastGeneratedMetadata);

  const handoffLabel = useMemo(() => {
    if (!lastAppliedAt) {
      return 'Ready for applied state handoff';
    }

    return `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}`;
  }, [lastAppliedAt]);

  const mainViewport = (
    <section className="relative h-full min-h-0 overflow-hidden bg-slate-950">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-200 backdrop-blur">
        Map-first shared viewport
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 p-1 text-[11px] backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveViewport('map')}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${
            activeViewport === 'map' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Map className="size-3.5" />
          2D map
        </button>
        <button
          type="button"
          onClick={() => setActiveViewport('cube')}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${
            activeViewport === 'cube' ? 'bg-violet-500/20 text-violet-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Square3Stack3D className="size-3.5" />
          3D cube
        </button>
      </div>

      <div className="absolute left-4 bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-300 backdrop-blur">
        <Layers3 className="size-3.5 text-emerald-300" />
        <span>{handoffLabel}</span>
        <span className="text-slate-500">•</span>
        <span>{generationStatus === 'applied' ? 'Applied slices active' : 'Post-apply analysis ready'}</span>
        {lastGeneratedMetadata ? (
          <>
            <span className="text-slate-500">•</span>
            <span>{lastGeneratedMetadata.binCount} draft bins last generated</span>
          </>
        ) : null}
      </div>

      <div className="h-full w-full">
        {activeViewport === 'map' ? <MapVisualization /> : <CubeVisualization />}
      </div>
    </section>
  );

  return (
    <main className="h-screen w-screen overflow-hidden">
      <DashboardLayout
        mainViewport={mainViewport}
        bottomRail={<TimelinePanel />}
        rightRail={<DashboardStkdePanel />}
      />
    </main>
  );
}
