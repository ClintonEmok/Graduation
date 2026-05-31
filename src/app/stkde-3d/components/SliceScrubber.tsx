'use client';

import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import type { EvolvingSlice } from '../lib/types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatSliceDate(epochSeconds: number): string {
  return DATE_FORMATTER.format(new Date(epochSeconds * 1000));
}

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
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const isInterpolated = useDashboardDemoCoordinationStore((state) => state.inspectInterpolation);
  const trailEnabled = useDashboardDemoCoordinationStore((state) => state.inspectTrailEnabled);
  const trailDecay = useDashboardDemoCoordinationStore((state) => state.inspectTrailDecay);
  const setInspectIsPlaying = useDashboardDemoCoordinationStore((state) => state.setInspectIsPlaying);
  const toggleInspectPlayback = useDashboardDemoCoordinationStore((state) => state.toggleInspectPlayback);
  const setInspectPlaybackSpeed = useDashboardDemoCoordinationStore((state) => state.setInspectPlaybackSpeed);
  const setInspectInterpolation = useDashboardDemoCoordinationStore((state) => state.setInspectInterpolation);
  const setInspectTrailEnabled = useDashboardDemoCoordinationStore((state) => state.setInspectTrailEnabled);
  const setInspectTrailDecay = useDashboardDemoCoordinationStore((state) => state.setInspectTrailDecay);
  const setInspectIsScrubbing = useDashboardDemoCoordinationStore((state) => state.setInspectIsScrubbing);

  const burstColor = (score: number) => {
    if (score > 0.6) return 'bg-amber-500';
    if (score > 0.3) return 'bg-amber-400/70';
    return 'bg-slate-600';
  };

  const clampIndex = (index: number) => Math.max(0, Math.min(slices.length - 1, index));

  const stepTo = (index: number) => {
    setInspectIsPlaying(false);
    setInspectIsScrubbing(false);
    onActiveIndexChange(clampIndex(index));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/55 p-3 text-xs text-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            time slices
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {activeIndex + 1} / {slices.length}
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleInspectPlayback()}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
            isPlaying
              ? 'border-sky-400/40 bg-sky-400/10 text-sky-100'
              : 'border-slate-700 bg-slate-900/70 text-slate-300'
          }`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stepTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          Prev
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, slices.length - 1)}
            step={1}
            value={activeIndex}
            onPointerDown={() => {
              setInspectIsPlaying(false);
              setInspectIsScrubbing(true);
            }}
            onPointerUp={() => setInspectIsScrubbing(false)}
            onPointerCancel={() => setInspectIsScrubbing(false)}
            onChange={(event) => stepTo(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
            aria-label="Slice scrubber"
          />
        </div>

        <button
          type="button"
          onClick={() => stepTo(activeIndex + 1)}
          disabled={activeIndex === slices.length - 1}
          className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1.2fr_0.9fr]">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-100">Speed</span>
            <span className="tabular-nums text-slate-400">{playbackSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={playbackSpeed}
            onChange={(event) => setInspectPlaybackSpeed(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
            aria-label="Playback speed"
          />
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-100">Interpolated</span>
            <button
              type="button"
              onClick={() => setInspectInterpolation(!isInterpolated)}
              disabled={!isPlaying}
              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition ${
                isInterpolated && isPlaying
                  ? 'border-sky-400/40 bg-sky-400/10 text-sky-100'
                  : 'border-slate-700 text-slate-400 disabled:opacity-40'
              }`}
            >
              {isInterpolated ? 'On' : 'Off'}
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Playback only.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setInspectTrailEnabled(!trailEnabled)}
            className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] transition ${
              trailEnabled
                ? 'border-sky-400/40 bg-sky-400/10 text-sky-100'
                : 'border-slate-700 bg-slate-950/40 text-slate-400'
            }`}
          >
            Trails
          </button>
          <span className="tabular-nums text-slate-400">{trailDecay.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.12}
          max={0.9}
          step={0.02}
          value={trailDecay}
          onChange={(event) => setInspectTrailDecay(Number(event.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
          aria-label="Trail decay"
        />
      </div>

      {activeSlice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-900/40 p-2.5">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-slate-100">
              {activeSlice.label}
            </div>
            <div className="mt-0.5 text-[10px] tabular-nums text-slate-500">
              {formatSliceDate(activeSlice.startEpoch)} - {formatSliceDate(activeSlice.endEpoch)}
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-950 ${burstColor(activeSlice.burstScore)}`}>
            {(activeSlice.burstScore * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
