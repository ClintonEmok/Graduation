"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DemoStatsPanel } from '@/components/dashboard-demo/DemoStatsPanel';
import { DemoStkdePanel } from '@/components/dashboard-demo/DemoStkdePanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';
import { DemoExplainPanel } from '@/components/dashboard-demo/DemoExplainPanel';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';

export function DashboardDemoRailTabs() {
  const detailsOpen = useDashboardDemoCoordinationStore((state) => state.detailsOpen);
  const [tab, setTab] = useState('stats');
  const activeTab = detailsOpen ? 'explain' : tab;

  return (
    <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-border bg-background/95 p-3 shadow-2xl backdrop-blur">
      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <Card className="border-border/70 bg-card/80 p-0 shadow-sm">
          <CardContent className="p-2">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-full bg-muted p-1">
              <TabsTrigger value="stats" className="rounded-full px-3 py-1.5 text-[11px] font-medium">
                Stats
              </TabsTrigger>
              <TabsTrigger value="stkde" className="rounded-full px-3 py-1.5 text-[11px] font-medium">
                STKDE
              </TabsTrigger>
              <TabsTrigger value="slices" className="rounded-full px-3 py-1.5 text-[11px] font-medium">
                Slices
              </TabsTrigger>
              <TabsTrigger value="explain" className="rounded-full px-3 py-1.5 text-[11px] font-medium">
                Explain
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="stats" className="mt-3">
          <DemoStatsPanel />
        </TabsContent>

        <TabsContent value="stkde" className="mt-3">
          <DemoStkdePanel />
        </TabsContent>

        <TabsContent value="slices" className="mt-3">
          <DemoSlicePanel />
        </TabsContent>

        <TabsContent value="explain" className="mt-3">
          <DemoExplainPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
