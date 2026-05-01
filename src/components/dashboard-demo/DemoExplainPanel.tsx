"use client";

import { useMemo } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { selectActiveSliceId, selectSlices, useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';

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
  const activeSliceId = useDashboardDemoSliceStore(selectActiveSliceId);
  const slices = useDashboardDemoSliceStore(selectSlices);

  const activeSlice = useMemo(
    () => slices.find((slice) => slice.id === activeSliceId) ?? null,
    [activeSliceId, slices]
  );
  const activeBurstWindow = selectedBurstWindows[0] ?? null;

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
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
          Explain
        </div>
        <p className="text-[11px] text-slate-400">Why this window is highlighted and what you should do next.</p>
      </header>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-300">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Detection reason</div>
        <p className="mt-1 text-base font-medium text-slate-100">{burstLabel}</p>
        <p className="text-slate-400">{burstSubtitle}</p>
        <p className="text-slate-200">{burstReason}</p>
        <div className="grid grid-cols-2 gap-2 pt-1 text-slate-400">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">True duration</div>
            <div className="text-slate-200">{burstDuration ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Relative cue</div>
            <div className="text-slate-200">{burstRelativeDuration ?? '—'}</div>
          </div>
        </div>
        <div className="mt-2 text-slate-500">
          Active source: {selectedSource ?? 'timeline'} · Selected index: {selectedIndex ?? '—'}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-300">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Belongs to</div>
        <p className="mt-1 text-slate-200">{activeSliceLabel}</p>
        <p className="mt-1 text-slate-500">{highlightReason}</p>
        <p className="mt-1 text-slate-500">Brush range: {brushRange ? `${brushRange[0].toFixed(1)} → ${brushRange[1].toFixed(1)}` : 'none'}</p>
        <p className="mt-1 text-slate-500">{burstLabel}</p>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-300">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Next action</div>
        <div className="mt-1 flex items-start gap-2 text-slate-200">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-sky-300" />
          <p>{nextAction}</p>
        </div>
      </div>
    </section>
  );
}
