"use client";

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
  const { columns, isLoading, isMock, dataCount } = useDataStore((state) => ({
    columns: state.columns,
    isLoading: state.isLoading,
    isMock: state.isMock,
    dataCount: state.dataCount,
  }));
  const { selectedTypes, selectedDistricts, selectedTimeRange, selectedSpatialBounds, getActiveFilterCount } =
    useFilterStore((state) => ({
      selectedTypes: state.selectedTypes,
      selectedDistricts: state.selectedDistricts,
      selectedTimeRange: state.selectedTimeRange,
      selectedSpatialBounds: state.selectedSpatialBounds,
      getActiveFilterCount: state.getActiveFilterCount,
    }));
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const { warpSource, warpFactor } = useAdaptiveStore((state) => ({
    warpSource: state.warpSource,
    warpFactor: state.warpFactor,
  }));

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
      </dl>

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
    </section>
  );
}
