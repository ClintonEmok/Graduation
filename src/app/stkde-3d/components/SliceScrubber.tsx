'use client';

import type { EvolvingSlice } from '../lib/types';

interface SliceScrubberProps {
  slices: EvolvingSlice[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export function SliceScrubber({
  slices,
  activeIndex,
  onActiveIndexChange,
}: SliceScrubberProps) {
  const activeSlice = slices[activeIndex];

  const burstColor = (score: number) => {
    if (score > 0.6) return 'bg-amber-500';
    if (score > 0.3) return 'bg-amber-400/70';
    return 'bg-slate-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">
          Time Slices
        </h3>
        <span className="text-xs text-slate-400">
          {activeIndex + 1} / {slices.length}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onActiveIndexChange(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Prev
        </button>

        <div className="flex flex-1 items-center gap-1">
          {slices.map((slice) => (
            <button
              key={slice.index}
              type="button"
              onClick={() => onActiveIndexChange(slice.index)}
              className={`h-2 flex-1 rounded-full transition-all ${
                slice.index === activeIndex
                  ? 'bg-sky-400 scale-y-125'
                  : Math.abs(slice.index - activeIndex) === 1
                    ? 'bg-sky-600/50'
                    : 'bg-slate-700'
              }`}
              title={`${slice.label}: burst ${(slice.burstScore * 100).toFixed(0)}%`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            onActiveIndexChange(Math.min(slices.length - 1, activeIndex + 1))
          }
          disabled={activeIndex === slices.length - 1}
          className="rounded border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>

      {activeSlice && (
        <div className="rounded-md border border-slate-700/60 bg-slate-900/50 p-3 text-xs text-slate-300">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-slate-100">
              {activeSlice.label}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-950 ${
                burstColor(activeSlice.burstScore)
              }`}
            >
              burst{' '}
              {(activeSlice.burstScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Events</span>
              <span className="text-slate-100">
                {activeSlice.crimeCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time range</span>
              <span className="text-slate-100">
                {activeSlice.startPercent.toFixed(0)}% -{' '}
                {activeSlice.endPercent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-slate-400">
                <span>Burst intensity</span>
                <span className="text-slate-100">
                  {(activeSlice.burstScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeSlice.burstScore > 0.6
                      ? 'bg-amber-500'
                      : activeSlice.burstScore > 0.3
                        ? 'bg-amber-400/70'
                        : 'bg-slate-500'
                  }`}
                  style={{
                    width: `${activeSlice.burstScore * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {slices.map((slice) => (
          <button
            key={slice.index}
            type="button"
            onClick={() => onActiveIndexChange(slice.index)}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
              slice.index === activeIndex
                ? 'bg-sky-900/40 text-sky-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <span>{slice.label}</span>
            <span
              className={`rounded px-1 text-[9px] font-medium uppercase tracking-wider ${
                slice.burstScore > 0.6
                  ? 'bg-amber-500/20 text-amber-300'
                  : slice.burstScore > 0.3
                    ? 'bg-amber-400/10 text-amber-400/70'
                    : 'text-slate-500'
              }`}
            >
              {(slice.burstScore * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
