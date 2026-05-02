"use client";

import { useMemo } from 'react';
import { ChevronUp, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL_DEMO_DISTRICTS } from '@/store/useDashboardDemoAnalysisStore';
import { useDemoStatsSummary } from '@/components/dashboard-demo/lib/useDemoStatsSummary';

const toDateInputValue = (epochSec: number) => new Date(epochSec * 1000).toISOString().slice(0, 10);

const parseDateInput = (value: string, fallback: number, edge: 'start' | 'end') => {
  if (!value) return fallback;
  const parsed = Date.parse(edge === 'start' ? `${value}T00:00:00Z` : `${value}T23:59:59Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : fallback;
};

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="gap-2 border-border/70 bg-muted/20 p-0 shadow-none">
      <CardContent className="px-3 py-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </CardContent>
    </Card>
  );
}

interface PulseChartProps {
  title: string;
  readout: string;
  points: Array<{ label: string; count: number }>;
  accentClassName: string;
  labelStep?: number;
}

function PulseChart({ title, readout, points, accentClassName, labelStep = 1 }: PulseChartProps) {
  const { minCount, range } = useMemo(() => {
    if (points.length === 0) {
      return { minCount: 0, range: 1 };
    }

    const counts = points.map((point) => point.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    return {
      minCount: min,
      range: Math.max(max - min, 1),
    };
  }, [points]);

  return (
    <Card className="gap-3 border-border/70 bg-muted/20 p-0 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
          <span className="text-[11px] text-muted-foreground">{readout}</span>
        </div>

        <div className="mt-3 flex h-32 items-end justify-between gap-1">
        {points.map((point, index) => (
          <div key={`${title}-${point.label}-${index}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="relative w-full overflow-hidden rounded-t bg-slate-800" style={{ height: '80px' }}>
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t ${accentClassName}`}
                style={{
                  height: `${Math.max(8, ((point.count - minCount) / range) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-1 min-h-[0.75rem] text-center text-[10px] text-slate-500">
              {(index % labelStep === 0 || index === points.length - 1) ? point.label : ''}
            </div>
          </div>
        ))}
      </div>
      </CardContent>
    </Card>
  );
}

export function DemoStatsPanel() {
  const {
    summary,
    stats,
    temporalPulses,
    isLoading,
    selectedDistricts,
    selectedDistrictLabels,
    timeRange,
    toggleDistrict,
    setSelectedDistricts,
    setTimeRange,
    timelineSummary,
  } = useDemoStatsSummary();

  const topTypes = useMemo(() => stats?.byType.slice(0, 4) ?? [], [stats]);

  return (
    <Card className="border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardHeader className="gap-2 px-4 pb-3 pt-4">
        <CardTitle className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Stats Summary</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          District-first entry surface for the demo analysis flow.
        </CardDescription>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">{selectedDistrictLabels.join(', ')}</Badge>
          <Badge variant="outline">Window: {timelineSummary.selectedWindowLabel}</Badge>
          <Badge variant="outline">Overview: {timelineSummary.overviewRangeLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total Crimes" value={summary?.totalCrimes ?? 0} />
          <MetricCard label="Avg / Day" value={summary?.avgPerDay ?? 0} />
          <MetricCard label="Peak Hour" value={summary?.peakHourLabel ?? '--'} />
          <MetricCard label="Top Crime" value={summary?.mostCommonCrime ?? '--'} />
        </div>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Districts</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="xs" onClick={() => setSelectedDistricts([])} className="gap-1">
                  <Minus className="h-3 w-3" />
                  Clear
                </Button>
                <Button type="button" variant="outline" size="xs" onClick={() => setSelectedDistricts(ALL_DEMO_DISTRICTS)} className="gap-1">
                  <ChevronUp className="h-3 w-3" />
                  All
                </Button>
              </div>
            </div>

            <div className="max-h-28 overflow-hidden">
              <div className="grid max-h-28 grid-cols-5 gap-1 overflow-y-auto pr-1 text-[11px]">
                {ALL_DEMO_DISTRICTS.map((district) => {
                  const active = selectedDistricts.includes(district);
                  return (
                    <Button
                      key={district}
                      type="button"
                      variant={active ? 'secondary' : 'outline'}
                      size="xs"
                      onClick={() => toggleDistrict(district)}
                      className="justify-center rounded-md px-2"
                    >
                      {district}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Spatial distribution</div>
            <p className="text-xs text-muted-foreground">Keep the hotspot map visible as the balanced spatial context for these district summaries.</p>
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="grid grid-cols-2 gap-2 p-3 text-xs">
            <label className="flex flex-col gap-1 text-muted-foreground">
              <span>Start</span>
              <input
                type="date"
                value={toDateInputValue(timeRange[0])}
                onChange={(event) => setTimeRange([parseDateInput(event.target.value, timeRange[0], 'start'), timeRange[1]])}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-muted-foreground">
              <span>End</span>
              <input
                type="date"
                value={toDateInputValue(timeRange[1])}
                onChange={(event) => setTimeRange([timeRange[0], parseDateInput(event.target.value, timeRange[1], 'end')])}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-foreground"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Top types</h3>
              <Badge variant="outline">{selectedDistricts.length || 'all'} districts</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {topTypes.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate pr-2">{item.name}</span>
                    <span>{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(6, Math.min(100, item.percentage))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="hourly" className="rounded-xl border border-border/70 bg-card/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trends</h3>
            <TabsList className="h-9 rounded-full bg-muted p-1">
              <TabsTrigger value="hourly" className="rounded-full px-3 py-1 text-[11px]">Hourly</TabsTrigger>
              <TabsTrigger value="daily" className="rounded-full px-3 py-1 text-[11px]">Daily</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-full px-3 py-1 text-[11px]">Monthly</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hourly" className="mt-3">
            <PulseChart title="Hourly pulse" readout="24h read" points={temporalPulses.hourly} accentClassName="bg-violet-500" labelStep={6} />
          </TabsContent>

          <TabsContent value="daily" className="mt-3">
            <PulseChart title="Daily trend" readout="7d read" points={temporalPulses.daily} accentClassName="bg-sky-500" labelStep={1} />
          </TabsContent>

          <TabsContent value="monthly" className="mt-3">
            <PulseChart title="Monthly trend" readout="12mo read" points={temporalPulses.monthly} accentClassName="bg-emerald-500" labelStep={1} />
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground">
          {isLoading ? 'Loading demo stats…' : summary ? `Loaded ${summary.totalCrimes.toLocaleString()} crimes for the current demo context.` : 'No demo stats loaded yet.'}
        </div>
      </CardContent>
    </Card>
  );
}
