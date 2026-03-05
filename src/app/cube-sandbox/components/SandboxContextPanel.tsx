"use client";

import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';
import { SpatialConstraintManager } from './SpatialConstraintManager';
import { WarpProposalPanel } from './WarpProposalPanel';

type SandboxContextPanelProps = {
  onReset: () => void;
  isResetting: boolean;
};

const formatBounds = (value: number) => value.toFixed(2);

export function SandboxContextPanel({ onReset, isResetting }: SandboxContextPanelProps) {
  const columns = useDataStore((state) => state.columns);
  const isLoading = useDataStore((state) => state.isLoading);
  const isMock = useDataStore((state) => state.isMock);
  const dataCount = useDataStore((state) => state.dataCount);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const getActiveFilterCount = useFilterStore((state) => state.getActiveFilterCount);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const proposals = useWarpProposalStore((state) => state.proposals);
  const selectedProposalId = useWarpProposalStore((state) => state.selectedProposalId);

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
  const enabledConstraintCount = constraints.filter((constraint) => constraint.enabled).length;
  const activeConstraintLabel =
    constraints.find((constraint) => constraint.id === activeConstraintId)?.label ?? 'None selected';
  const selectedProposalLabel =
    proposals.find((proposal) => proposal.id === selectedProposalId)?.label ?? 'None selected';

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

      <dl className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Constraints</dt>
          <dd className="text-right text-slate-100">{constraints.length}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Enabled</dt>
          <dd className="text-right text-slate-100">{enabledConstraintCount}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-slate-400">Active constraint</dt>
          <dd className="break-all text-slate-100">{activeConstraintLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Proposals</dt>
          <dd className="text-right text-slate-100">{proposals.length}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-slate-400">Selected proposal</dt>
          <dd className="break-all text-slate-100">{selectedProposalLabel}</dd>
        </div>
      </dl>

      <SpatialConstraintManager />

      <WarpProposalPanel />

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
