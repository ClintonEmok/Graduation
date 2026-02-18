"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { scaleUtc } from 'd3-scale';
import { useMeasure } from '@/hooks/useMeasure';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { DensityAreaChart, type DensityPoint } from '@/components/timeline/DensityAreaChart';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { SliceCreationLayer } from '@/app/timeline-test/components/SliceCreationLayer';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore, type DataPoint } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceStore } from '@/store/useSliceStore';

const SAMPLE_POINT_COUNT = 160;
const MOCK_EVENT_COUNT = 2400;
const DETAIL_HEIGHT = 60;
const DETAIL_MARGIN = { left: 12, right: 12 };

const buildMockDensity = (pointCount: number, variant: number): Float32Array => {
  const values = new Float32Array(pointCount);
  const shift = (variant % 12) * 0.03;
  const modulation = 0.85 + (variant % 5) * 0.1;

  for (let i = 0; i < pointCount; i += 1) {
    const t = i / (pointCount - 1);
    const morningWave = Math.exp(-Math.pow((t - (0.18 + shift * 0.25)) / 0.06, 2));
    const middayWave = Math.exp(-Math.pow((t - (0.5 - shift * 0.2)) / 0.13, 2));
    const eveningWave = Math.exp(-Math.pow((t - (0.8 + shift * 0.35)) / 0.05, 2));
    const spikeA = Math.exp(-Math.pow((t - (0.33 + shift * 0.15)) / 0.018, 2)) * 1.6;
    const spikeB = Math.exp(-Math.pow((t - (0.67 - shift * 0.1)) / 0.02, 2)) * 1.9;
    const valley = 1 - 0.65 * Math.exp(-Math.pow((t - 0.42) / 0.08, 2));
    const noise = 0.04 * Math.sin(i * (0.65 + shift));

    const base = (morningWave * 0.6 + middayWave * 0.35 + eveningWave * 1.4 + spikeA + spikeB + noise) * valley;
    const contrasted = Math.pow(Math.max(0, base), 1.4);

    values[i] = Math.max(0.015, contrasted * modulation);
  }

  return values;
};

const buildMockTimestamps = (eventCount: number, variant: number): Float32Array => {
  const timestamps = new Float32Array(eventCount);
  const shift = (variant % 10) * 1.5;

  const gaussian = (mean: number, std: number) => {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * std;
  };

  for (let i = 0; i < eventCount; i += 1) {
    const r = Math.random();
    let value = 0;
    if (r < 0.35) value = gaussian(18 + shift * 0.2, 3.2);
    else if (r < 0.5) value = gaussian(33 - shift * 0.15, 2.4);
    else if (r < 0.75) value = gaussian(50 + shift * 0.05, 4.8);
    else if (r < 0.87) value = gaussian(67 - shift * 0.1, 2.2);
    else value = gaussian(82 + shift * 0.2, 3.0);

    const clamped = Math.max(0, Math.min(100, value));
    timestamps[i] = clamped;
  }

  return timestamps.sort();
};

const buildMockPoints = (timestamps: Float32Array): DataPoint[] => {
  const points: DataPoint[] = new Array(timestamps.length);
  for (let i = 0; i < timestamps.length; i += 1) {
    points[i] = {
      id: `mock-${i}`,
      timestamp: timestamps[i],
      x: (Math.random() - 0.5) * 100,
      y: 0,
      z: (Math.random() - 0.5) * 100,
      type: 'Theft'
    };
  }
  return points;
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
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();
  const [mockVariant, setMockVariant] = useState(0);
  const [useMockData, setUseMockData] = useState(true);
  const { isComputing, triggerUpdate } = useDebouncedDensity({ delay: 400 });

  const computeMaps = useAdaptiveStore((state) => state.computeMaps);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const setData = useDataStore((state) => state.setData);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const isCreatingSlice = useSliceCreationStore((state) => state.isCreating);
  const startCreation = useSliceCreationStore((state) => state.startCreation);
  const cancelCreation = useSliceCreationStore((state) => state.cancelCreation);
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);

  const mockDensity = useMemo(() => buildMockDensity(SAMPLE_POINT_COUNT, mockVariant), [mockVariant]);
  const mockTimestamps = useMemo(() => buildMockTimestamps(MOCK_EVENT_COUNT, mockVariant), [mockVariant]);
  const sourceDensity = densityMap && densityMap.length > 0 ? densityMap : mockDensity;

  const [domainStartSec, domainEndSec] = mapDomain;
  const useRealDomain = densityMap && densityMap.length > 0;
  const chartStartMs = useRealDomain ? domainStartSec * 1000 : Date.now() - 3 * 24 * 60 * 60 * 1000;
  const chartEndMs = useRealDomain ? domainEndSec * 1000 : Date.now();

  const chartData = useMemo(
    () => toDensityPoints(sourceDensity, chartStartMs, chartEndMs),
    [sourceDensity, chartStartMs, chartEndMs]
  );

  useEffect(() => {
    if (!useMockData) return;
    computeMaps(mockTimestamps, [0, 100]);
    setData(buildMockPoints(mockTimestamps));
  }, [computeMaps, mockTimestamps, setData, useMockData]);

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
  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));
  const detailInnerWidth = Math.max(0, timelineWidth - DETAIL_MARGIN.left - DETAIL_MARGIN.right);

  const [domainStart, domainEnd] = useMemo<[number, number]>(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [maxTimestampSec, minTimestampSec]);

  const detailRangeSec = useMemo<[number, number]>(() => {
    if (selectedTimeRange) {
      const [rawStart, rawEnd] = selectedTimeRange;
      const start = Math.min(rawStart, rawEnd);
      const end = Math.max(rawStart, rawEnd);
      const overlaps = end >= domainStart && start <= domainEnd;
      if (Number.isFinite(start) && Number.isFinite(end) && overlaps) {
        return [start, end];
      }
    }
    return [domainStart, domainEnd];
  }, [domainEnd, domainStart, selectedTimeRange]);

  const detailXScale = useMemo(
    () =>
      scaleUtc()
        .domain([new Date(detailRangeSec[0] * 1000), new Date(detailRangeSec[1] * 1000)])
        .range([0, detailInnerWidth]),
    [detailInnerWidth, detailRangeSec]
  );

  const simulateFilterChange = useCallback(() => {
    const defaultEnd = Math.floor(Date.now() / 1000);
    const defaultStart = defaultEnd - 7 * 24 * 60 * 60;
    const start = minTimestampSec ?? defaultStart;
    const end = maxTimestampSec ?? defaultEnd;
    const span = Math.max(60, end - start);
    const windowSize = Math.max(300, Math.floor(span * 0.25));
    const offsetMax = Math.max(0, span - windowSize);
    const offset = Math.floor(Math.random() * (offsetMax + 1));

    setTimeRange([start + offset, start + offset + windowSize]);
    triggerUpdate();
  }, [maxTimestampSec, minTimestampSec, setTimeRange, triggerUpdate]);

  const clearFilters = useCallback(() => {
    resetFilters();
    triggerUpdate();
  }, [resetFilters, triggerUpdate]);

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
          <SliceToolbar />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isComputing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <strong className="text-slate-100">{isComputing ? 'Computing density...' : 'Density ready'}</strong>
              </span>
              <span>
                Source:{' '}
                <strong className="text-slate-100">
                  {useMockData ? 'mock KDE' : densityMap && densityMap.length > 0 ? 'adaptive store' : 'mock density'}
                </strong>
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={simulateFilterChange}
                className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1 font-medium text-amber-100 transition hover:border-amber-400"
              >
                Simulate Filter Change
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-slate-100 transition hover:border-slate-400"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => setUseMockData((value) => !value)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-slate-100 transition hover:border-slate-400"
              >
                {useMockData ? 'Use Adaptive Store' : 'Use Mock KDE'}
              </button>
              <button
                type="button"
                onClick={() => setMockVariant((value) => value + 1)}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-slate-100 transition hover:border-slate-400"
              >
                Regenerate Mock Density
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">1. Density Area Chart (Detail View)</h2>
            <p className="mt-1 text-xs text-slate-400">Gradient-filled curve should show clear peaks and valleys with subtle fade while loading.</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {chartWidth > 0 ? (
              <DensityAreaChart data={chartData} width={chartWidth - 24} height={72} isLoading={isComputing} />
            ) : (
              <div className="h-[72px]" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">2. Density Heat Strip (Overview)</h2>
            <p className="mt-1 text-xs text-slate-400">Canvas strip uses blue-to-red interpolation with compact 12px height and loading fade.</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            {chartWidth > 0 ? (
              <DensityHeatStrip densityMap={sourceDensity} width={chartWidth - 24} height={12} isLoading={isComputing} />
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            <span>
              Manual Slice Creation:{' '}
              <strong className="text-slate-100">
                {isCreatingSlice ? 'active (click or drag on timeline)' : 'inactive'}
              </strong>
            </span>
            <button
              type="button"
              onClick={isCreatingSlice ? cancelCreation : () => startCreation('drag')}
              className={`rounded border px-3 py-1 font-medium transition ${
                isCreatingSlice
                  ? 'border-rose-400/70 bg-rose-500/10 text-rose-100 hover:border-rose-300'
                  : 'border-amber-500/60 bg-amber-500/10 text-amber-100 hover:border-amber-400'
              }`}
            >
              {isCreatingSlice ? 'Cancel' : 'Create Slice'}
            </button>
          </div>
          <div ref={timelineContainerRef} className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            <DualTimeline />
            {detailInnerWidth > 0 && (
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: DETAIL_MARGIN.left + 12,
                  right: DETAIL_MARGIN.right + 12,
                  bottom: 40,
                  height: DETAIL_HEIGHT,
                }}
              >
                <SliceCreationLayer
                  scale={detailXScale}
                  height={DETAIL_HEIGHT}
                  containerRef={timelineContainerRef}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-300">Created slices</h3>
            {slices.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">No slices yet. Click &quot;Create Slice&quot; and click or drag on timeline.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {slices.map((slice, index) => (
                  <li
                    key={slice.id}
                    className={`rounded border px-2 py-1 ${
                      slice.id === activeSliceId
                        ? 'border-amber-400/70 bg-amber-500/10 text-amber-100'
                        : 'border-slate-700 bg-slate-900/70 text-slate-200'
                    }`}
                  >
                    Slice {index + 1}: {slice.range ? `${slice.range[0].toFixed(2)} - ${slice.range[1].toFixed(2)}` : slice.time.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
