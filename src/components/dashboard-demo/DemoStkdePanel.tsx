"use client";

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useDemoStkde } from '@/components/dashboard-demo/lib/useDemoStkde';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { getDistrictDisplayName } from '@/app/stats/lib/stats-view-model';

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
  const selectedDistricts = useDashboardDemoAnalysisStore((state) => state.selectedDistricts);

  const selectedDistrictLabels = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map((district) => getDistrictDisplayName(district)) : ['All districts']),
    [selectedDistricts]
  );

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
        <p className="text-[11px] text-slate-400">Balanced hotspot surface for the selected district context.</p>
        <div className="text-[11px] text-slate-500">District context: {selectedDistrictLabels.join(', ')}</div>
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

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">District hotspots</h3>
          <span className="text-[11px] text-slate-500">Top matches</span>
        </div>
        {rows.length === 0 ? (
          <div className="rounded border border-dashed border-slate-700 px-3 py-4 text-xs text-slate-500">
            No hotspots found for the current district context. Try Refresh or a wider preset.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, index) => {
              const selected = row.id === selectedHotspotId;
              const hovered = row.id === hoveredHotspotId;

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      selected
                        ? 'border-rose-400/80 bg-rose-500/10'
                        : hovered
                          ? 'border-slate-500 bg-slate-800/80'
                          : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                    }`}
                    onMouseEnter={() => setHoveredHotspot(row.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                    onFocus={() => setHoveredHotspot(row.id)}
                    onBlur={() => setHoveredHotspot(null)}
                    onClick={() => {
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
                    >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-100">District cluster {index + 1}</span>
                      <span className="text-[11px] text-slate-500">{row.supportLabel} support</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Place context: {selectedDistrictLabels.join(', ')}</span>
                      <span>Shared hotspot surface</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
