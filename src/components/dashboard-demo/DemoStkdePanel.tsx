"use client";

import { RefreshCw } from 'lucide-react';
import { HotspotPanel } from '@/app/stkde/lib/HotspotPanel';
import { useDemoStkde } from '@/components/dashboard-demo/lib/useDemoStkde';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';

const STKDE_SCOPE_LABELS = {
  'applied-slices': 'Applied slices',
  'full-viewport': 'Full viewport',
} as const;

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

      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
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

      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
        <label>
          Spatial BW (m)
          <input type="number" value={params.spatialBandwidthMeters} onChange={(event) => setStkdeParams({ spatialBandwidthMeters: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
        <label>
          Temporal BW (h)
          <input type="number" value={params.temporalBandwidthHours} onChange={(event) => setStkdeParams({ temporalBandwidthHours: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
        <label>
          Grid cell (m)
          <input type="number" value={params.gridCellMeters} onChange={(event) => setStkdeParams({ gridCellMeters: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
        <label>
          Top K
          <input type="number" value={params.topK} onChange={(event) => setStkdeParams({ topK: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
        <label>
          Min support
          <input type="number" value={params.minSupport} onChange={(event) => setStkdeParams({ minSupport: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
        <label>
          Time window (h)
          <input type="number" value={params.timeWindowHours} onChange={(event) => setStkdeParams({ timeWindowHours: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        </label>
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
