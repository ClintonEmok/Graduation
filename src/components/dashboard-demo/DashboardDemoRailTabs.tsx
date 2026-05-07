"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DemoStatsPanel } from '@/components/dashboard-demo/DemoStatsPanel';
import { DemoStkdePanel } from '@/components/dashboard-demo/DemoStkdePanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';
import { DemoComparisonPanel } from '@/components/dashboard-demo/DemoComparisonPanel';
import { DemoEvolutionPanel } from '@/components/dashboard-demo/DemoEvolutionPanel';
import { DemoExplainPanel } from '@/components/dashboard-demo/DemoExplainPanel';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';

export function DashboardDemoRailTabs() {
  const detailsOpen = useDashboardDemoCoordinationStore((state) => state.detailsOpen);
  const [tab, setTab] = useState('stats');
  const activeTab = detailsOpen ? 'explain' : tab;

  return (
    <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-border bg-background/95 p-2 shadow-2xl backdrop-blur">
      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <Card className="border-border/70 bg-card/80 p-0 shadow-sm">
          <CardContent className="p-1.5">
            <TabsList className="grid h-auto w-full grid-cols-6 rounded-md bg-muted p-0.5">
              <TabsTrigger value="stats" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Stats
              </TabsTrigger>
              <TabsTrigger value="stkde" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                STKDE
              </TabsTrigger>
              <TabsTrigger value="slices" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Slices
              </TabsTrigger>
              <TabsTrigger value="compare" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Compare
              </TabsTrigger>
              <TabsTrigger value="evolution" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Evolution
              </TabsTrigger>
              <TabsTrigger value="explain" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Explain
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="stats" className="mt-2">
          <DemoStatsPanel />
        </TabsContent>

        <TabsContent value="stkde" className="mt-2">
          <DemoStkdePanel />
        </TabsContent>

        <TabsContent value="slices" className="mt-2">
          <DemoSlicePanel />
        </TabsContent>

        <TabsContent value="compare" className="mt-2">
          <DemoComparisonPanel />
        </TabsContent>

        <TabsContent value="evolution" className="mt-2">
          <DemoEvolutionPanel />
        </TabsContent>

        <TabsContent value="explain" className="mt-2">
          <DemoExplainPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
