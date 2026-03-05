"use client";

import { useMemo } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';

const formatTimestamp = (value: number | null) => {
  if (value === null) {
    return 'Not generated';
  }

  return new Date(value).toLocaleTimeString();
};

const formatRange = (range: [number, number]) => `${range[0].toFixed(1)} -> ${range[1].toFixed(1)}`;

export function WarpProposalPanel() {
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const currentTime = useTimeStore((state) => state.currentTime);
  const timeRange = useTimeStore((state) => state.timeRange);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);

  const proposals = useWarpProposalStore((state) => state.proposals);
  const selectedProposalId = useWarpProposalStore((state) => state.selectedProposalId);
  const appliedProposalId = useWarpProposalStore((state) => state.appliedProposalId);
  const generation = useWarpProposalStore((state) => state.generation);
  const generate = useWarpProposalStore((state) => state.generate);
  const clear = useWarpProposalStore((state) => state.clear);
  const select = useWarpProposalStore((state) => state.select);

  const enabledConstraintCount = useMemo(
    () => constraints.filter((constraint) => constraint.enabled).length,
    [constraints]
  );

  const constraintById = useMemo(
    () => new Map(constraints.map((constraint) => [constraint.id, constraint])),
    [constraints]
  );

  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedProposalId) ?? null,
    [proposals, selectedProposalId]
  );

  const handleGenerate = () => {
    generate({
      constraints,
      temporalContext: {
        domain: timeRange,
        focusTime: currentTime,
        currentWarpFactor: warpFactor,
        hotspotIntensity: burstThreshold,
      },
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3" aria-label="Warp proposal panel">
      <header className="space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Warp proposals</h2>
        <p className="text-[11px] text-slate-400">Generate ranked adaptive candidates from enabled cube constraints.</p>
      </header>

      <dl className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Enabled constraints</dt>
          <dd className="text-slate-100">{enabledConstraintCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Proposals</dt>
          <dd className="text-slate-100">{proposals.length}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Selected</dt>
          <dd className="text-slate-100">{selectedProposal ? selectedProposal.label : 'None'}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Generated</dt>
          <dd className="text-slate-100">{formatTimestamp(generation.generatedAt)}</dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={enabledConstraintCount === 0}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-cyan-400/70 bg-cyan-500/10 text-xs font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate proposals
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={proposals.length === 0 && selectedProposalId === null}
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 px-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>

      {enabledConstraintCount === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
          Enable at least one spatial constraint to generate warp proposals.
        </p>
      ) : null}

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {proposals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
            No proposals yet. Generate candidates to inspect rationale before apply.
          </p>
        ) : null}

        {proposals.map((proposal) => {
          const isSelected = selectedProposalId === proposal.id;
          const linkedConstraint = constraintById.get(proposal.constraintId);

          return (
            <button
              type="button"
              key={proposal.id}
              onClick={() => select(proposal.id)}
              className={`w-full space-y-1 rounded-lg border p-2 text-left transition ${
                isSelected
                  ? 'border-emerald-400/70 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-100">{proposal.label}</p>
                <span className="text-[10px] text-slate-300">
                  {proposal.rationale.confidenceBand} ({proposal.rationale.confidenceScore})
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{proposal.rationale.summary}</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <span>Density: {proposal.rationale.densityConcentration}</span>
                <span>Hotspot: {proposal.rationale.hotspotCoverage}</span>
                <span>Warp: {proposal.payload.warpFactor.toFixed(3)}</span>
                <span>Range: {formatRange(proposal.payload.range)}</span>
                <span>Score: {proposal.score}</span>
                <span>Constraint: {linkedConstraint?.label ?? proposal.constraintId}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Selected proposal</h3>
        {selectedProposal ? (
          <>
            <p className="text-xs text-slate-100">{selectedProposal.label}</p>
            <p className="text-[11px] text-slate-400">
              Linked constraint: {constraintById.get(selectedProposal.constraintId)?.label ?? 'Unknown'} ({selectedProposal.constraintId})
            </p>
            <p className="text-[11px] text-slate-400">
              Source constraints: {generation.sourceConstraintIds.length ? generation.sourceConstraintIds.join(', ') : 'None'}
            </p>
            <p className="text-[11px] text-slate-400">
              Applied marker: {appliedProposalId === selectedProposal.id ? 'Applied' : 'Not applied'}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">Select a proposal to inspect linked constraints and rationale details.</p>
        )}
      </div>
    </section>
  );
}
