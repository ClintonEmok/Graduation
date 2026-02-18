"use client";

import { X } from 'lucide-react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceStore } from '@/store/useSliceStore';

const toTimestampLabel = (normalizedTime: number, domain: [number, number]): string => {
  const [startSec, endSec] = domain;
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
    return `${normalizedTime.toFixed(2)}%`;
  }

  const epochSec = startSec + ((endSec - startSec) * normalizedTime) / 100;
  const timestamp = new Date(epochSec * 1000);
  if (Number.isNaN(timestamp.getTime())) {
    return `${normalizedTime.toFixed(2)}%`;
  }

  return timestamp.toLocaleString();
};

export function SliceList() {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const removeSlice = useSliceStore((state) => state.removeSlice);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  if (slices.length === 0) {
    return <p className="rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-400">No slices created yet</p>;
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-300">Created slices</h3>
      <ul className="space-y-2">
        {slices.map((slice, index) => {
          const rangeLabel = slice.range
            ? `${toTimestampLabel(slice.range[0], mapDomain)} -> ${toTimestampLabel(slice.range[1], mapDomain)}`
            : toTimestampLabel(slice.time, mapDomain);

          return (
            <li key={slice.id}>
              <div
                className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-xs transition-all ${
                  activeSliceId === slice.id
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                }`}
              >
                <span className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveSlice(slice.id)}
                    className="block text-left font-semibold underline-offset-2 hover:underline"
                  >
                    {slice.name ?? `Slice ${index + 1}`}
                  </button>
                  <span className="block text-slate-300">{rangeLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeSlice(slice.id)}
                  className="rounded p-1 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                  aria-label={`Delete ${slice.name ?? `Slice ${index + 1}`}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
