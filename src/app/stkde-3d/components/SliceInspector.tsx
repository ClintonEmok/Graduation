'use client';

import type { EvolvingSlice } from '../lib/types';
import type { computeSliceKde } from '../lib/slice-kde';

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
  isFocusedView: boolean;
}

export function SliceInspector({ slice, sliceKde, isFocusedView }: SliceInspectorProps) {
  if (!slice) return null;

  const burstPercent = (slice.burstScore * 100).toFixed(0);
  const cellCount = sliceKde?.cells.length ?? 0;
  const peakIntensity = sliceKde?.maxIntensity ?? 0;

  return (
    <section className="rounded-md border border-slate-700/60 bg-slate-900/50 p-4 text-xs text-slate-300">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Detail Inspector
          </div>
          <h3 className="mt-1 text-sm font-medium text-slate-100">{slice.label}</h3>
        </div>

        {isFocusedView && (
          <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sky-200">
            Focused
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Events</span>
          <span className="text-slate-100">{slice.crimeCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Time range</span>
          <span className="text-right text-slate-100">
            {formatSliceDate(slice.startEpoch)} - {formatSliceDate(slice.endEpoch)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">KDE cells</span>
          <span className="text-slate-100">{cellCount}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Peak intensity</span>
          <span className="text-slate-100">{peakIntensity.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-slate-400">
          <span>Burst score</span>
          <span className="text-slate-100">{burstPercent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              slice.burstScore > 0.6
                ? 'bg-amber-500'
                : slice.burstScore > 0.3
                  ? 'bg-amber-400/70'
                  : 'bg-slate-500'
            }`}
            style={{ width: `${slice.burstScore * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
