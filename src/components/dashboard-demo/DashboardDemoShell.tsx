"use client";

import { useEffect, useState } from 'react';
import { Map, SquareStack } from 'lucide-react';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { DemoTimelinePanel } from '@/components/dashboard-demo/DemoTimelinePanel';
import { DashboardDemoRailTabs } from '@/components/dashboard-demo/DashboardDemoRailTabs';
import { Button } from '@/components/ui/button';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { DemoMapVisualization } from '@/components/dashboard-demo/DemoMapVisualization';
import { useDashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';

type DemoViewport = 'map' | 'cube';

export function DashboardDemoShell() {
  const [activeViewport, setActiveViewport] = useState<DemoViewport>('map');
  const loadSummaryData = useTimelineDataStore((state) => state.loadSummaryData);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const setViewport = useViewportStore((state) => state.setViewport);
  const selectionStory = useDashboardDemoSelectionStory();

  useEffect(() => {
    void (async () => {
      await loadSummaryData();
    })();

    return () => {
    };
  }, [loadSummaryData]);

  useEffect(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    if (maxTimestampSec <= minTimestampSec) return;
    setViewport(minTimestampSec, maxTimestampSec);
  }, [maxTimestampSec, minTimestampSec, setViewport]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-background text-foreground"
      aria-label="dashboard demo workspace"
      data-phase="phase-13-guided-analysis-workflow"
    >
      <div className="flex h-full min-w-0 flex-col pr-80">
        <header className="border-b border-border bg-card/80 px-4 py-3 shadow-sm" />

        <section className="relative min-h-0 flex-1 overflow-hidden bg-background" aria-label="dashboard demo shared viewport">
          <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              onClick={() => setActiveViewport('map')}
              aria-label="Show map viewport"
              title="Show map viewport"
              variant={activeViewport === 'map' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <Map className="size-3.5" />
            </Button>
            <Button
              type="button"
              onClick={() => setActiveViewport('cube')}
              aria-label="Show cube viewport"
              title="Show cube viewport"
              variant={activeViewport === 'cube' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <SquareStack className="size-3.5" />
            </Button>
          </div>

          <div className="h-full w-full transition-opacity duration-200 ease-out">
            {activeViewport === 'map' ? (
              <DemoMapVisualization />
            ) : (
              <CubeVisualization selectionStory={selectionStory} />
            )}
          </div>
        </section>

        <div className="shrink-0 border-t border-border bg-card/70">
          <DemoTimelinePanel />
        </div>
      </div>

      <DashboardDemoRailTabs />
    </main>
  );
}
