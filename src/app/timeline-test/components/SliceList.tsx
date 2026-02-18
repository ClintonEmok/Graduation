"use client";

import { Check, X } from 'lucide-react';
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
          const isActive = activeSliceId === slice.id;
          const rangeLabel = slice.range
            ? `${toTimestampLabel(slice.range[0], mapDomain)} -> ${toTimestampLabel(slice.range[1], mapDomain)}`
            : toTimestampLabel(slice.time, mapDomain);

          return (
            <li key={slice.id}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => setActiveSlice(slice.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveSlice(slice.id);
                  }
                }}
                className={`relative flex cursor-pointer items-start justify-between gap-3 rounded-md border px-3 py-2 pl-5 text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-900/90'
                }`}
              >
                <span
                  className={`absolute inset-y-1 left-1 w-1 rounded-full transition-colors ${
                    isActive ? 'bg-amber-300' : 'bg-transparent'
                  }`}
                />
                <span className="space-y-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {slice.name ?? `Slice ${index + 1}`}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                        <Check className="h-2.5 w-2.5" />
                        Selected
                      </span>
                    ) : null}
                  </span>
                  <span className={`block ${isActive ? 'text-amber-100/90' : 'text-slate-300'}`}>{rangeLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSlice(slice.id);
                  }}
                  className={`rounded p-1 transition hover:bg-red-500/10 hover:text-red-300 ${
                    isActive ? 'text-amber-200/80' : 'text-slate-400'
                  }`}
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
