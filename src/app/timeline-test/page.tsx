"use client";

import { useMemo } from 'react';
import { useMeasure } from '@/hooks/useMeasure';
import { DensityTrack } from '@/components/timeline/DensityTrack';
import { DensityAreaChart, type DensityPoint } from '@/components/timeline/DensityAreaChart';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

const SAMPLE_POINT_COUNT = 160;

const buildMockDensity = (pointCount: number): Float32Array => {
  const values = new Float32Array(pointCount);

  for (let i = 0; i < pointCount; i += 1) {
    const t = i / (pointCount - 1);
    const morningWave = Math.exp(-Math.pow((t - 0.22) / 0.09, 2));
    const middayWave = Math.exp(-Math.pow((t - 0.55) / 0.12, 2));
    const eveningWave = Math.exp(-Math.pow((t - 0.82) / 0.07, 2));
    const noise = 0.06 * Math.sin(i * 0.55);

    values[i] = Math.max(0.02, morningWave * 0.9 + middayWave * 0.55 + eveningWave * 1.2 + noise);
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
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  const mockDensity = useMemo(() => buildMockDensity(SAMPLE_POINT_COUNT), []);
  const sourceDensity = densityMap && densityMap.length > 0 ? densityMap : mockDensity;

  const [domainStartSec, domainEndSec] = mapDomain;
  const useRealDomain = densityMap && densityMap.length > 0;
  const chartStartMs = useRealDomain ? domainStartSec * 1000 : Date.now() - 3 * 24 * 60 * 60 * 1000;
  const chartEndMs = useRealDomain ? domainEndSec * 1000 : Date.now();

  const chartData = useMemo(
    () => toDensityPoints(sourceDensity, chartStartMs, chartEndMs),
    [sourceDensity, chartStartMs, chartEndMs]
  );

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
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Area Chart (72px)</h2>
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
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Heat Strip (12px)</h2>
            <p className="mt-1 text-xs text-slate-400">Existing canvas density track for compact comparison.</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {chartWidth > 0 ? <DensityTrack width={chartWidth - 24} height={12} /> : <div className="h-3" />}
          </div>
        </section>
      </div>
    </main>
  );
}
