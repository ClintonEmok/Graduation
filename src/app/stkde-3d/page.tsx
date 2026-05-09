'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { generateStkde3dMockData } from './lib/mock-data';
import { computeSliceKde } from './lib/slice-kde';
import { Stkde3DScene } from './components/Stkde3DScene';
import { SliceScrubber } from './components/SliceScrubber';

export default function Stkde3DPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const { slices, sliceEvents } = useMemo(() => {
    return generateStkde3dMockData();
  }, []);

  const sliceKdes = useMemo(
    () => sliceEvents.map((events) => computeSliceKde(events).cells),
    [sliceEvents],
  );

  const totalEvents = useMemo(
    () => slices.reduce((sum, s) => sum + s.crimeCount, 0),
    [slices],
  );

  useEffect(() => {
    if (!isPlaying || slices.length === 0) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slices.length);
    }, Math.max(180, 1000 / playbackSpeed));

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isPlaying, playbackSpeed, slices.length]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              STKDE 3D Evolution
            </h1>
            <p className="text-xs text-slate-400">
              KDE heatmaps stacked through time &mdash; {slices.length} slices
              across {totalEvents.toLocaleString()} mock events
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 backdrop-blur">
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-800 px-3 py-1.5 text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-[0.18em] text-slate-500">Speed</span>
              <select
                value={playbackSpeed}
                onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 outline-none transition focus:border-sky-400/60"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
                <option value={3}>3.0x</option>
              </select>
            </label>

            <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sky-200">
              Looping playback
            </span>
          </div>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex-1">
            <Stkde3DScene
              slices={slices}
              sliceKdes={sliceKdes}
              activeIndex={activeIndex}
            />
          </div>

          <aside className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-md border border-slate-700/60 bg-slate-900/65 p-4">
            <SliceScrubber
              slices={slices}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
