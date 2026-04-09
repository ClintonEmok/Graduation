"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DemoStatsPanel } from '@/components/dashboard-demo/DemoStatsPanel';
import { DemoStkdePanel } from '@/components/dashboard-demo/DemoStkdePanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';

export function DashboardDemoRailTabs() {
  return (
    <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
      <Tabs defaultValue="stkde" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900 text-slate-400">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="stkde">STKDE</TabsTrigger>
          <TabsTrigger value="slices">Slices</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-3">
          <DemoStatsPanel />
        </TabsContent>

        <TabsContent value="stkde" className="mt-3">
          <DemoStkdePanel />
        </TabsContent>

        <TabsContent value="slices" className="mt-3">
          <DemoSlicePanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
