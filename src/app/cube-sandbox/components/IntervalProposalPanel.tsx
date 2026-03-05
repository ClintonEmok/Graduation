"use client";

import { useMemo, useState } from 'react';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useIntervalProposalStore } from '@/store/useIntervalProposalStore';

const DEFAULT_VISIBLE_CANDIDATES = 3;

const formatTimestamp = (value: number | null) => {
  if (value === null) {
    return 'Not generated';
  }

  return new Date(value).toLocaleTimeString();
};

const formatRange = (range: [number, number]) => `${range[0].toFixed(2)} -> ${range[1].toFixed(2)}`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function IntervalProposalPanel() {
  const [showAll, setShowAll] = useState(false);

  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const selectedBurstWindows = useCoordinationStore((state) => state.selectedBurstWindows);

  const proposals = useIntervalProposalStore((state) => state.proposals);
  const selectedProposalId = useIntervalProposalStore((state) => state.selectedProposalId);
  const generation = useIntervalProposalStore((state) => state.generation);
  const generate = useIntervalProposalStore((state) => state.generate);
  const clear = useIntervalProposalStore((state) => state.clear);
  const select = useIntervalProposalStore((state) => state.select);

  const enabledConstraints = useMemo(
    () => constraints.filter((constraint) => constraint.enabled),
    [constraints]
  );

  const constraintById = useMemo(
    () => new Map(constraints.map((constraint) => [constraint.id, constraint])),
    [constraints]
  );

  const burstWindows = useMemo(
    () =>
      selectedBurstWindows.map((window, index) => {
        const start = Math.min(window.start, window.end);
        const end = Math.max(window.start, window.end);
        const span = Math.max(0.001, end - start);
        const basePeak = window.metric === 'density' ? 0.84 : 0.72;
        const peak = clamp(basePeak - Math.min(0.22, span * 0.18), 0.35, 0.95);

        return {
          id: `burst-${index}-${window.metric}-${start.toFixed(3)}-${end.toFixed(3)}`,
          start,
          end,
          peak,
          metric: window.metric,
        };
      }),
    [selectedBurstWindows]
  );

  const burstWindowById = useMemo(
    () => new Map(burstWindows.map((window) => [window.id, window])),
    [burstWindows]
  );

  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedProposalId) ?? null,
    [proposals, selectedProposalId]
  );

  const visibleProposals = showAll ? proposals : proposals.slice(0, DEFAULT_VISIBLE_CANDIDATES);

  const handleGenerate = () => {
    generate({
      constraints,
      burstWindows,
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3" aria-label="Interval proposal panel">
      <header className="space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Interval proposals</h2>
        <p className="text-[11px] text-slate-400">
          Generate confidence-ranked interval candidates from active cube constraints and selected burst windows.
        </p>
      </header>

      <dl className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Enabled constraints</dt>
          <dd className="text-slate-100">{enabledConstraints.length}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Selected bursts</dt>
          <dd className="text-slate-100">{burstWindows.length}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Proposals</dt>
          <dd className="text-slate-100">{proposals.length}</dd>
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
          disabled={enabledConstraints.length === 0 || burstWindows.length === 0}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-cyan-400/70 bg-cyan-500/10 text-xs font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate intervals
        </button>
        <button
          type="button"
          onClick={() => {
            clear();
            setShowAll(false);
          }}
          disabled={proposals.length === 0 && selectedProposalId === null}
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 px-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>

      {enabledConstraints.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
          Enable at least one spatial constraint to generate interval proposals.
        </p>
      ) : null}

      {enabledConstraints.length > 0 && burstWindows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
          Select one or more burst windows to provide temporal context for interval generation.
        </p>
      ) : null}

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {proposals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
            No interval proposals yet. Generate candidates to inspect rationale before slicing.
          </p>
        ) : null}

        {visibleProposals.map((proposal) => {
          const isSelected = selectedProposalId === proposal.id;
          const linkedConstraint = constraintById.get(proposal.constraintId);
          const burstKeyPrefix = `interval-${proposal.constraintId}-`;
          const burstId = proposal.id.startsWith(burstKeyPrefix)
            ? proposal.id.slice(burstKeyPrefix.length)
            : null;
          const linkedBurst = burstId ? burstWindowById.get(burstId) : undefined;

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
                  {proposal.confidence.band} ({proposal.confidence.score})
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{proposal.rationale.summary}</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <span>Density: {proposal.quality.densityConcentration}</span>
                <span>Hotspot: {proposal.quality.hotspotCoverage}</span>
                <span>Range: {formatRange(proposal.range)}</span>
                <span>Score: {proposal.score}</span>
                <span>Constraint: {linkedConstraint?.label ?? proposal.constraintLabel}</span>
                <span>Burst: {linkedBurst ? linkedBurst.metric : 'unknown'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {proposals.length > DEFAULT_VISIBLE_CANDIDATES ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 px-2 text-xs font-medium text-slate-200 transition hover:border-slate-500"
        >
          {showAll ? 'Show top candidates' : `Show all ${proposals.length} candidates`}
        </button>
      ) : null}

      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Selected interval</h3>
        {selectedProposal ? (
          <>
            <p className="text-xs text-slate-100">{selectedProposal.label}</p>
            <p className="text-[11px] text-slate-400">
              Linked spatial context: {constraintById.get(selectedProposal.constraintId)?.label ?? selectedProposal.constraintLabel}
            </p>
            <p className="text-[11px] text-slate-400">
              Confidence: {selectedProposal.confidence.band} ({selectedProposal.confidence.score})
            </p>
            <p className="text-[11px] text-slate-400">Quality: density {selectedProposal.quality.densityConcentration}, hotspot {selectedProposal.quality.hotspotCoverage}</p>
            <p className="text-[11px] text-slate-400">Proposal range: {formatRange(selectedProposal.range)}</p>
            <p className="text-[11px] text-slate-400">
              Source constraints: {generation.sourceConstraintIds.length ? generation.sourceConstraintIds.join(', ') : 'None'}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">Select a proposal to inspect confidence and linked cube context details.</p>
        )}
      </div>
    </section>
  );
}
