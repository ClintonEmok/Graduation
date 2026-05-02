"use client";

import { useMemo } from 'react';
import { Lightbulb, ArrowRight, Layers3, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { selectActiveSliceId, selectSlices, useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';
import { useDemoBurstWindows } from '@/components/dashboard-demo/lib/useDemoBurstWindows';

const WORKFLOW_NEXT_ACTION: Record<string, string> = {
  generate: 'Generate the next draft window from the brushed range.',
  review: 'Review the highlighted slice and confirm whether it should be applied.',
  applied: 'Continue analysis with the updated slice set and compare the next window.',
  refine: 'Refine the active selection until the explanation matches the selection story.',
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0s';
  }
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

const BURST_TITLE: Record<'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral', string> = {
  'prolonged-peak': 'Sustained surge',
  'isolated-spike': 'Sharp spike',
  valley: 'Low-activity valley',
  neutral: 'Balanced window',
};

const BURST_CUE: Record<'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral', string> = {
  'prolonged-peak': 'Longer than surrounding windows',
  'isolated-spike': 'Shorter than surrounding windows',
  valley: 'Lower than surrounding windows',
  neutral: 'No clear burst; balanced activity',
};

export function DemoExplainPanel() {
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const selectedIndex = useDashboardDemoCoordinationStore((state) => state.selectedIndex);
  const selectedSource = useDashboardDemoCoordinationStore((state) => state.selectedSource);
  const workflowPhase = useDashboardDemoCoordinationStore((state) => state.workflowPhase);
  const syncStatus = useDashboardDemoCoordinationStore((state) => state.syncStatus);
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const clearSelectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.clearSelectedBurstWindows);
  const activeSliceId = useDashboardDemoSliceStore(selectActiveSliceId);
  const slices = useDashboardDemoSliceStore(selectSlices);
  const burstWindows = useDemoBurstWindows();

  const activeSlice = useMemo(
    () => slices.find((slice) => slice.id === activeSliceId) ?? null,
    [activeSliceId, slices]
  );
  const activeBurstWindow = selectedBurstWindows[0] ?? null;
  const visibleBurstWindowCount = burstWindows.filter((window) => window.burstClass && window.burstClass !== 'neutral').length;

  const highlightReason = syncStatus.reason ?? 'The active window is linked from the timeline selection.';
  const activeSliceLabel = activeSlice
    ? `${activeSlice.name?.trim() || (activeSlice.type === 'range' ? 'Range slice' : 'Point slice')} · ${activeSlice.type}`
    : 'No slice is pinned yet.';
  const burstLabel = activeBurstWindow
    ? BURST_TITLE[activeBurstWindow.burstClass]
    : 'No burst window is pinned right now.';
  const burstSubtitle = activeBurstWindow
    ? `${BURST_CUE[activeBurstWindow.burstClass]} · ${activeBurstWindow.burstClass}`
    : 'Neutral windows stay in the rail and can be inspected when selected elsewhere.';
  const burstReason = activeBurstWindow
    ? activeBurstWindow.burstRationale
    : 'Select a burst on the timeline to see the detection reason, duration, and confidence here.';
  const burstDuration = activeBurstWindow ? formatDuration(activeBurstWindow.duration) : null;
  const burstRelativeDuration = activeBurstWindow
    ? `${BURST_CUE[activeBurstWindow.burstClass]} (${activeBurstWindow.burstConfidence.toFixed(0)}% confidence)`
    : null;
  const nextAction = WORKFLOW_NEXT_ACTION[workflowPhase] ?? WORKFLOW_NEXT_ACTION.review;

  return (
    <Card className="border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardHeader className="gap-2 px-4 pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Explain
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Why this window is highlighted and what you should do next.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <Card className="border-cyan-500/20 bg-cyan-500/5 p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3 text-xs text-muted-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  <Layers3 className="h-3.5 w-3.5" />
                  Burst windows
                </div>
                <p className="text-sm text-foreground">{visibleBurstWindowCount} used as analysis input for draft bins</p>
                <p className="text-muted-foreground">They are hidden from the timeline view and carried into draft scoring.</p>
              </div>
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-100">
                Analysis
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelectedBurstWindows}
                disabled={selectedBurstWindows.length === 0}
                className="gap-2 border-border bg-background text-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
                Clear burst pin
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-100">
                Sustained surge
              </Badge>
              <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-100">
                Sharp spike
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100">
                Low-activity valley
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/20 p-0 shadow-none">
          <CardContent className="flex flex-col gap-2 p-3 text-xs">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Detection reason</div>
            <p className="text-base font-medium text-foreground">{burstLabel}</p>
            <p className="text-muted-foreground">{burstSubtitle}</p>
            <p className="text-foreground/90">{burstReason}</p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">True duration</div>
                <div className="text-foreground">{burstDuration ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Relative cue</div>
                <div className="text-foreground">{burstRelativeDuration ?? '—'}</div>
              </div>
            </div>
            <div className="text-muted-foreground">
              Active source: {selectedSource ?? 'timeline'} · Selected index: {selectedIndex ?? '—'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/20 p-0 shadow-none">
          <CardContent className="flex flex-col gap-2 p-3 text-xs text-muted-foreground">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Belongs to</div>
            <p className="text-foreground">{activeSliceLabel}</p>
            <p>{highlightReason}</p>
            <p>Brush range: {brushRange ? `${brushRange[0].toFixed(1)} → ${brushRange[1].toFixed(1)}` : 'none'}</p>
            <p>{burstLabel}</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/20 p-0 shadow-none">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-sky-500" />
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Next action</div>
              <p className="text-foreground">{nextAction}</p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
