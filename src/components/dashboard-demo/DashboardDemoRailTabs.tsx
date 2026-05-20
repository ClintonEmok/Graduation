"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DemoStatsPanel } from '@/components/dashboard-demo/DemoStatsPanel';
import { DemoDetectPanel } from '@/components/dashboard-demo/DemoDetectPanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';
import { DemoInspectPanel } from '@/components/dashboard-demo/DemoInspectPanel';
import { DemoConfigurePanel } from '@/components/dashboard-demo/DemoConfigurePanel';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';

export function DashboardDemoRailTabs() {
  const tab = useDashboardDemoCoordinationStore((state) => state.activeRailTab);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);

  return (
    <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
      <Tabs value={tab} onValueChange={setActiveRailTab} className="w-full">
        <Card className="border-slate-700/70 bg-slate-900/80 p-0 shadow-sm">
          <CardContent className="p-1.5">
            <TabsList className="grid h-auto w-full grid-cols-5 rounded-md bg-slate-800 p-0.5">
              <TabsTrigger value="scan" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Overview
              </TabsTrigger>
              <TabsTrigger value="detect" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Detect
              </TabsTrigger>
              <TabsTrigger value="slices" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Slices
              </TabsTrigger>
              <TabsTrigger value="inspect" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Inspect
              </TabsTrigger>
              <TabsTrigger value="configure" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Configure
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="detect" className="mt-2">
          <DemoDetectPanel />
        </TabsContent>

        <TabsContent value="slices" className="mt-2">
          <DemoSlicePanel />
        </TabsContent>

        <TabsContent value="inspect" className="mt-2">
          <DemoInspectPanel />
        </TabsContent>

        <TabsContent value="configure" className="mt-2">
          <DemoConfigurePanel />
        </TabsContent>

        <TabsContent value="scan" className="mt-2">
          <DemoStatsPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
