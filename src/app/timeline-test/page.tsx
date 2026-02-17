"use client";

import { useMemo, useState } from 'react';
import { useMeasure } from '@/hooks/useMeasure';
import { DensityAreaChart, type DensityPoint } from '@/components/timeline/DensityAreaChart';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

const SAMPLE_POINT_COUNT = 160;

const buildMockDensity = (pointCount: number, variant: number): Float32Array => {
  const values = new Float32Array(pointCount);
  const shift = (variant % 12) * 0.03;
  const modulation = 0.85 + (variant % 5) * 0.08;

  for (let i = 0; i < pointCount; i += 1) {
    const t = i / (pointCount - 1);
    const morningWave = Math.exp(-Math.pow((t - (0.2 + shift * 0.3)) / 0.09, 2));
    const middayWave = Math.exp(-Math.pow((t - (0.52 - shift * 0.2)) / 0.12, 2));
    const eveningWave = Math.exp(-Math.pow((t - (0.78 + shift * 0.4)) / 0.07, 2));
    const noise = 0.06 * Math.sin(i * (0.45 + shift));

    values[i] = Math.max(0.02, (morningWave * 0.9 + middayWave * 0.55 + eveningWave * 1.2 + noise) * modulation);
  }

  return values;
};

const toDensityPoints = (density: Float32Array, startMs: number, endMs: number): DensityPoint[] => {
  if (density.length === 0) {
    return [];
  }

  const points: DensityPoint[] = new Array(density.length);
  const spanMs = Math.max(1, endMs - startMs);

  for (let i = 0; i < density.length; i += 1) {
    const ratio = density.length === 1 ? 0 : i / (density.length - 1);
    points[i] = {
      time: new Date(startMs + ratio * spanMs),
      density: density[i] ?? 0
    };
  }

  return points;
};

export default function TimelineTestPage() {
  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const [mockVariant, setMockVariant] = useState(0);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const isComputing = useAdaptiveStore((state) => state.isComputing);

  const mockDensity = useMemo(() => buildMockDensity(SAMPLE_POINT_COUNT, mockVariant), [mockVariant]);
  const sourceDensity = densityMap && densityMap.length > 0 ? densityMap : mockDensity;

  const [domainStartSec, domainEndSec] = mapDomain;
  const useRealDomain = densityMap && densityMap.length > 0;
  const chartStartMs = useRealDomain ? domainStartSec * 1000 : Date.now() - 3 * 24 * 60 * 60 * 1000;
  const chartEndMs = useRealDomain ? domainEndSec * 1000 : Date.now();

  const chartData = useMemo(
    () => toDensityPoints(sourceDensity, chartStartMs, chartEndMs),
    [sourceDensity, chartStartMs, chartEndMs]
  );

  const densityStats = useMemo(() => {
    if (!sourceDensity.length) {
      return { min: 0, max: 0, length: 0 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < sourceDensity.length; i += 1) {
      const value = sourceDensity[i] ?? 0;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    return { min, max, length: sourceDensity.length };
  }, [sourceDensity]);

  const chartWidth = Math.max(0, Math.floor(bounds.width));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timeline Density Visualization Test</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            This isolated route compares a new 72px gradient area chart against the existing 12px heat strip.
            It uses adaptive store density data when available and falls back to deterministic mock density.
          </p>
        </header>

        <section className="space-y-5 rounded-xl border border-slate-700/60 bg-slate-900/65 p-5" ref={containerRef}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                Source: <strong className="text-slate-100">{densityMap && densityMap.length > 0 ? 'adaptive store' : 'mock density'}</strong>
              </span>
              <span>
                Length: <strong className="text-slate-100">{densityStats.length}</strong>
              </span>
              <span>
                Min: <strong className="text-slate-100">{densityStats.min.toFixed(4)}</strong>
              </span>
              <span>
                Max: <strong className="text-slate-100">{densityStats.max.toFixed(4)}</strong>
              </span>
              <span>
                isComputing: <strong className="text-slate-100">{isComputing ? 'true' : 'false'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMockVariant((value) => value + 1)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-slate-100 transition hover:border-slate-400"
            >
              Regenerate Mock Density
            </button>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">1. Density Area Chart (Detail View)</h2>
            <p className="mt-1 text-xs text-slate-400">Gradient-filled curve should show clear peaks and valleys.</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {chartWidth > 0 ? (
              <DensityAreaChart data={chartData} width={chartWidth - 24} height={72} />
            ) : (
              <div className="h-[72px]" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">2. Density Heat Strip (Overview)</h2>
            <p className="mt-1 text-xs text-slate-400">Canvas strip uses blue-to-red interpolation with compact 12px height.</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {chartWidth > 0 ? (
              <DensityHeatStrip densityMap={sourceDensity} width={chartWidth - 24} height={12} />
            ) : (
              <div className="h-3" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">3. Dual Timeline with Density</h2>
            <p className="mt-1 text-xs text-slate-400">
              Integrated view should render the same density context above overview/detail timelines with brush and zoom interactions.
            </p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            <DualTimeline />
          </div>
        </section>
      </div>
    </main>
  );
}
