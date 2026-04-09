"use client";

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { HotspotPanel } from '@/app/stkde/lib/HotspotPanel';
import { useDemoStkde } from '@/components/dashboard-demo/lib/useDemoStkde';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';

const STKDE_SCOPE_LABELS = {
  'applied-slices': 'Applied slices',
  'full-viewport': 'Full viewport',
} as const;

type DemoStkdePreset = {
  id: string;
  label: string;
  description: string;
  scopeMode: 'applied-slices' | 'full-viewport';
  params: {
    spatialBandwidthMeters: number;
    temporalBandwidthHours: number;
    gridCellMeters: number;
    topK: number;
    minSupport: number;
    timeWindowHours: number;
  };
};

const STKDE_PRESETS: DemoStkdePreset[] = [
  {
    id: 'focus',
    label: 'Focus',
    description: 'Tighter hotspot hunt for applied slices.',
    scopeMode: 'applied-slices',
    params: {
      spatialBandwidthMeters: 450,
      temporalBandwidthHours: 12,
      gridCellMeters: 250,
      topK: 8,
      minSupport: 3,
      timeWindowHours: 12,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default demo scan with steady coverage.',
    scopeMode: 'applied-slices',
    params: {
      spatialBandwidthMeters: 750,
      temporalBandwidthHours: 24,
      gridCellMeters: 500,
      topK: 12,
      minSupport: 5,
      timeWindowHours: 24,
    },
  },
  {
    id: 'wide',
    label: 'Wide',
    description: 'Broader city sweep for full viewport analysis.',
    scopeMode: 'full-viewport',
    params: {
      spatialBandwidthMeters: 1200,
      temporalBandwidthHours: 48,
      gridCellMeters: 750,
      topK: 20,
      minSupport: 8,
      timeWindowHours: 48,
    },
  },
];

const toRadiusDegrees = (lat: number, radiusMeters: number) => {
  const latDelta = radiusMeters / 111_320;
  const lonDelta = radiusMeters / Math.max(1, 111_320 * Math.cos((lat * Math.PI) / 180));
  return { latDelta, lonDelta };
};

export function DemoStkdePanel() {
  const {
    rows,
    summaryLabel,
    heatmapCellCount,
    isLoading,
    error,
    response,
    refresh,
    setSelectedHotspot,
    setHoveredHotspot,
    setStkdeParams,
    setScopeMode,
  } = useDemoStkde();

  const scopeMode = useDashboardDemoAnalysisStore((state) => state.stkdeScopeMode);
  const params = useDashboardDemoAnalysisStore((state) => state.stkdeParams);
  const selectedHotspotId = useDashboardDemoAnalysisStore((state) => state.selectedHotspotId);
  const hoveredHotspotId = useDashboardDemoAnalysisStore((state) => state.hoveredHotspotId);
  const setSpatialFilter = useDashboardDemoAnalysisStore((state) => state.setSpatialFilter);
  const setTemporalFilter = useDashboardDemoAnalysisStore((state) => state.setTemporalFilter);

  const activePreset = useMemo(
    () =>
      STKDE_PRESETS.find(
        (preset) =>
          preset.scopeMode === scopeMode &&
          preset.params.spatialBandwidthMeters === params.spatialBandwidthMeters &&
          preset.params.temporalBandwidthHours === params.temporalBandwidthHours &&
          preset.params.gridCellMeters === params.gridCellMeters &&
          preset.params.topK === params.topK &&
          preset.params.minSupport === params.minSupport &&
          preset.params.timeWindowHours === params.timeWindowHours
      ) ?? null,
    [params, scopeMode]
  );

  const applyPreset = (preset: DemoStkdePreset) => {
    setScopeMode(preset.scopeMode);
    setStkdeParams(preset.params);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100">
      <header className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">STKDE Rail</div>
        <p className="text-[11px] text-slate-400">Primary analysis surface for hotspot investigation inside the demo shell.</p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-300">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-sky-200">{STKDE_SCOPE_LABELS[scopeMode]}</span>
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
        <div className="mt-2 text-slate-400">{summaryLabel}</div>
        <div className="mt-1 text-slate-500">{heatmapCellCount.toLocaleString()} heatmap cells</div>
        {error ? <div className="mt-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-200">{error}</div> : null}
        {isLoading ? <div className="mt-2 text-slate-500">Computing hotspot surface…</div> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-500">
          <span>Presets</span>
          <span>{activePreset ? `Active: ${activePreset.label}` : 'Preset-driven controls'}</span>
        </div>
        <div className="grid gap-2">
          {STKDE_PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive ? 'border-sky-400/70 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">{preset.label}</span>
                  <span className="text-[10px] text-slate-500">{STKDE_SCOPE_LABELS[preset.scopeMode]}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{preset.description}</div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {preset.params.spatialBandwidthMeters}m • {preset.params.temporalBandwidthHours}h • {preset.params.gridCellMeters}m • top {preset.params.topK}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 text-[11px] text-slate-300">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScopeMode('applied-slices')}
            className={`rounded border px-2 py-1 ${scopeMode === 'applied-slices' ? 'border-sky-400/70 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-900/60'}`}
          >
            Applied slices
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('full-viewport')}
            className={`rounded border px-2 py-1 ${scopeMode === 'full-viewport' ? 'border-sky-400/70 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-900/60'}`}
          >
            Full viewport
          </button>
        </div>
        <p className="text-slate-500">Parameters are preset-only in the demo rail.</p>
      </div>

      <HotspotPanel
        rows={rows}
        selectedHotspotId={selectedHotspotId}
        hoveredHotspotId={hoveredHotspotId}
        onSelectHotspot={(row) => {
          setSelectedHotspot(row.id);
          const { latDelta, lonDelta } = toRadiusDegrees(row.centroid[1], row.radiusMeters);
          setSpatialFilter({
            minLng: row.centroid[0] - lonDelta,
            maxLng: row.centroid[0] + lonDelta,
            minLat: row.centroid[1] - latDelta,
            maxLat: row.centroid[1] + latDelta,
          });

          const selectedHotspot = response?.hotspots.find((hotspot) => hotspot.id === row.id);
          if (selectedHotspot) {
            setTemporalFilter({
              startEpochSec: selectedHotspot.peakStartEpochSec,
              endEpochSec: selectedHotspot.peakEndEpochSec,
            });
          }
        }}
        onHoverHotspot={setHoveredHotspot}
      />
    </section>
  );
}
