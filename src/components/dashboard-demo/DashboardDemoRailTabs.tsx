"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DemoStatsPanel } from '@/components/dashboard-demo/DemoStatsPanel';
import { DemoDetectPanel } from '@/components/dashboard-demo/DemoDetectPanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';
import { DemoInspectPanel } from '@/components/dashboard-demo/DemoInspectPanel';
import { DemoConfigurePanel } from '@/components/dashboard-demo/DemoConfigurePanel';
import { DemoStkdePanel } from '@/components/dashboard-demo/DemoStkdePanel';

export function DashboardDemoRailTabs() {
  const [tab, setTab] = useState('scan');

  return (
    <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-border bg-background/95 p-2 shadow-2xl backdrop-blur">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <Card className="border-border/70 bg-card/80 p-0 shadow-sm">
          <CardContent className="p-1.5">
            <TabsList className="grid h-auto w-full grid-cols-5 rounded-md bg-muted p-0.5">
              <TabsTrigger value="scan" className="rounded-sm px-2.5 py-1.5 text-[11px] font-medium">
                Scan
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

        <TabsContent value="scan" className="mt-2">
          <DemoStatsPanel />
          <div className="mt-2">
            <DemoStkdePanel />
          </div>
        </TabsContent>

        <TabsContent value="detect" className="mt-2">
          <DemoDetectPanel onNavigateToSlices={() => setTab('slices')} />
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
      </Tabs>
    </aside>
  );
}
