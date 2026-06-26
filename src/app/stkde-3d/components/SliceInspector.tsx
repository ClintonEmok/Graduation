'use client';

import type { EvolvingSlice } from '../lib/types';
import type { computeSliceKde } from '@/lib/kde';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatSliceDate(epochSeconds: number): string {
  return DATE_FORMATTER.format(new Date(epochSeconds * 1000));
}

interface SliceInspectorProps {
  slice: EvolvingSlice | undefined;
  sliceKde: ReturnType<typeof computeSliceKde> | undefined;
  burstiness?: number | null;
}

function burstinessColor(value: number): string {
  if (value > 0.3) return 'bg-amber-500';
  if (value > 0.1) return 'bg-amber-400/70';
  if (value < -0.3) return 'bg-sky-500/70';
  if (value < -0.1) return 'bg-sky-400/60';
  return 'bg-slate-500';
}

export function SliceInspector({ slice, sliceKde: _sliceKde, burstiness }: SliceInspectorProps) {
  if (!slice) return null;

  const burstinessValue = burstiness ?? 0;
  const burstinessDisplay = Number.isFinite(burstinessValue) ? burstinessValue.toFixed(2) : '0.00';
  const burstinessWidth = Math.max(0, Math.min(1, Math.abs(burstinessValue)));

  return (
    <section className="rounded-md border border-border/70 bg-background/60 p-2 text-xs text-slate-300">
      <div className="space-y-1.5">
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Time range</span>
          <span className="text-right tabular-nums text-slate-100">
            {formatSliceDate(slice.startEpoch)} - {formatSliceDate(slice.endEpoch)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Events</span>
          <span className="tabular-nums text-slate-100">{slice.crimeCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-slate-400">
          <span>Burstiness</span>
          <span className="tabular-nums text-slate-100">{burstinessDisplay}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${burstinessColor(burstinessValue)}`}
            style={{ width: `${burstinessWidth * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
