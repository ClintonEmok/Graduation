'use client';

import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
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
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const setInspectIsPlaying = useDashboardDemoCoordinationStore((state) => state.setInspectIsPlaying);
  const setInspectIsScrubbing = useDashboardDemoCoordinationStore((state) => state.setInspectIsScrubbing);
  const setInspectPlaybackSpeed = useDashboardDemoCoordinationStore((state) => state.setInspectPlaybackSpeed);

  const clampIndex = (index: number) => Math.max(0, Math.min(slices.length - 1, index));

  const stepTo = (index: number) => {
    setInspectIsPlaying(false);
    setInspectIsScrubbing(false);
    onActiveIndexChange(clampIndex(index));
  };

  return (
    <div className="rounded-md border border-border/70 bg-background/60 p-2 text-xs text-slate-300">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Scrub slices</span>
        <span className="font-mono text-muted-foreground/80 tabular-nums">
          {activeIndex + 1} / {slices.length}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stepTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-sky-400/60 hover:text-sky-100"
        >
          Prev
        </button>

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

        <button
          type="button"
          onClick={() => stepTo(activeIndex + 1)}
          disabled={activeIndex === slices.length - 1}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-sky-400/60 hover:text-sky-100"
        >
          Next
        </button>
      </div>

      <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Speed</span>
          <span className="tabular-nums text-slate-100">{playbackSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={playbackSpeed}
          onChange={(event) => setInspectPlaybackSpeed(Number(event.target.value))}
          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
          aria-label="Playback speed"
        />
      </div>
    </div>
  );
}
