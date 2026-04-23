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

  const highlightReason = syncStatus.reason ?? 'The active window is linked from the timeline selection.';
  const activeSliceLabel = activeSlice
    ? `${activeSlice.name?.trim() || (activeSlice.type === 'range' ? 'Range slice' : 'Point slice')} · ${activeSlice.type}`
    : 'No slice is pinned yet.';
  const burstLabel = selectedBurstWindows.length > 0
    ? `${selectedBurstWindows.length} burst window${selectedBurstWindows.length === 1 ? '' : 's'} are highlighted.`
    : 'No burst windows are pinned right now.';
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
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Why highlighted</div>
        <p className="mt-1 text-slate-200">{highlightReason}</p>
        <div className="mt-2 text-slate-500">
          Active source: {selectedSource ?? 'timeline'} · Selected index: {selectedIndex ?? '—'}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-300">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Belongs to</div>
        <p className="mt-1 text-slate-200">{activeSliceLabel}</p>
        <p className="mt-1 text-slate-500">{burstLabel}</p>
        <p className="mt-1 text-slate-500">Brush range: {brushRange ? `${brushRange[0].toFixed(1)} → ${brushRange[1].toFixed(1)}` : 'none'}</p>
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
