"use client";

import { useState } from 'react';
import { FilterOverlay } from '@/components/viz/FilterOverlay';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';

type SandboxContextPanelProps = {
  onReset: () => void;
  isResetting: boolean;
};

const formatBounds = (value: number) => value.toFixed(2);

export function SandboxContextPanel({ onReset, isResetting }: SandboxContextPanelProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const columns = useDataStore((state) => state.columns);
  const isLoading = useDataStore((state) => state.isLoading);
  const isMock = useDataStore((state) => state.isMock);
  const dataCount = useDataStore((state) => state.dataCount);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const getActiveFilterCount = useFilterStore((state) => state.getActiveFilterCount);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const setTimeScaleMode = useTimeStore((state) => state.setTimeScaleMode);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);

  const activeFilterCount = getActiveFilterCount();
  const datasetLabel = isLoading
    ? 'Loading dataset'
    : columns
      ? isMock
        ? 'Demo dataset active'
        : 'Thesis dataset ready'
      : 'Dataset pending';
  const spatialLabel = selectedSpatialBounds
    ? `${formatBounds(selectedSpatialBounds.minX)}..${formatBounds(selectedSpatialBounds.maxX)} x ${formatBounds(selectedSpatialBounds.minZ)}..${formatBounds(selectedSpatialBounds.maxZ)} z`
    : 'Not constrained';

  return (
    <section className="space-y-3 text-xs text-slate-200" aria-label="Sandbox context panel">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sandbox context</p>
        <h1 className="text-sm font-semibold text-slate-100">Always-on experiment diagnostics</h1>
      </header>

      <dl className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Dataset</dt>
          <dd className="text-right text-slate-100">{datasetLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Rows</dt>
          <dd className="text-right text-slate-100">{dataCount ?? 0}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Time mode</dt>
          <dd className="text-right text-slate-100">{timeScaleMode}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Warp source</dt>
          <dd className="text-right text-slate-100">{warpSource}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Warp factor</dt>
          <dd className="text-right text-slate-100">{warpFactor.toFixed(2)}</dd>
        </div>
      </dl>

      <dl className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Active filters</dt>
          <dd className="text-right text-slate-100">{activeFilterCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Type filter</dt>
          <dd className="text-right text-slate-100">{selectedTypes.length > 0 ? 'On' : 'Off'}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">District filter</dt>
          <dd className="text-right text-slate-100">{selectedDistricts.length > 0 ? 'On' : 'Off'}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Time filter</dt>
          <dd className="text-right text-slate-100">{selectedTimeRange ? 'On' : 'Off'}</dd>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-cyan-400/70 bg-cyan-500/10 px-2 py-1.5 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
          >
            Open filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-600 px-2 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-slate-400"
          >
            Clear filters
          </button>
        </div>
      </dl>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <header className="flex items-center justify-between gap-2">
          <p className="text-slate-400">Warp toolbar</p>
          <p className="text-[11px] text-slate-100">{Math.round(warpFactor * 100)}%</p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTimeScaleMode('linear');
              setWarpFactor(0);
            }}
            className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
              timeScaleMode === 'linear'
                ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-600 text-slate-200 hover:border-slate-400'
            }`}
          >
            Linear
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeScaleMode('adaptive');
              if (warpFactor <= 0) {
                setWarpFactor(1);
              }
            }}
            className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
              timeScaleMode === 'adaptive'
                ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-600 text-slate-200 hover:border-slate-400'
            }`}
          >
            Adaptive
          </button>
        </div>

        <label className="space-y-1 text-[11px] text-slate-400">
          <span>Warp intensity</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.05}
            value={warpFactor}
            onChange={(event) => {
              const nextFactor = Number(event.target.value);
              setWarpFactor(nextFactor);
              if (nextFactor > 0 && timeScaleMode !== 'adaptive') {
                setTimeScaleMode('adaptive');
              }
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700"
          />
        </label>
      </section>

      <dl className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="space-y-1">
          <dt className="text-slate-400">Spatial bounds</dt>
          <dd className="break-all text-slate-100">{spatialLabel}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onReset}
        disabled={isResetting}
        className="inline-flex w-full items-center justify-center rounded-lg border border-amber-400/70 bg-amber-500/10 px-3 py-2 font-medium text-amber-100 transition hover:border-amber-300 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isResetting ? 'Resetting sandbox...' : 'Hard reset sandbox'}
      </button>

      <FilterOverlay isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </section>
  );
}
