"use client";

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutoProposalSet } from '@/types/autoProposalSet';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

interface AutoProposalSetCardProps {
  proposalSet: AutoProposalSet;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (id: string) => void;
  startEpoch?: number;
  endEpoch?: number;
}

function formatScore(value: number): string {
  return `${Math.round(value)}%`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatEpochDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

export function AutoProposalSetCard({
  proposalSet,
  isSelected,
  isRecommended,
  onSelect,
  startEpoch,
  endEpoch,
}: AutoProposalSetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lowConfidenceReason = proposalSet.reasonMetadata?.lowConfidenceReason ?? null;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isSelected
          ? 'border-violet-500 bg-violet-500/10'
          : lowConfidenceReason
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-slate-700/70 bg-slate-900 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              Rank #{proposalSet.rank}
            </span>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                <Sparkles className="size-3" />
                Recommended
              </span>
            )}
            {isSelected && (
              <span className="rounded border border-violet-500/40 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                Selected
              </span>
            )}
          </div>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">Total score</p>
              <p className="text-xl font-semibold text-slate-100">{formatScore(proposalSet.score.total)}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>{proposalSet.warp.name}</p>
              <p>
                {proposalSet.warp.intervals.length} warp intervals
              </p>
            </div>
          </div>

          {lowConfidenceReason && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
              <div className="flex items-center gap-1 font-medium text-amber-300">
                <AlertTriangle className="size-3" />
                Low confidence
              </div>
              <p className="mt-0.5 text-amber-200/90">{lowConfidenceReason}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse score details' : 'Expand score details'}
        >
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="mt-3 space-y-2 rounded border border-slate-700/80 bg-slate-950/60 p-2 text-xs">
            <p className="font-medium uppercase tracking-wide text-slate-400">Score Breakdown</p>
            <div className="grid grid-cols-2 gap-1 text-slate-300">
              <span>Coverage</span>
              <span className="text-right">{formatScore(proposalSet.score.coverage)}</span>
              <span>Relevance</span>
              <span className="text-right">{formatScore(proposalSet.score.relevance)}</span>
              <span>Overlap</span>
              <span className="text-right">{formatScore(proposalSet.score.overlap)}</span>
              <span>Continuity</span>
              <span className="text-right">{formatScore(proposalSet.score.continuity)}</span>
            </div>
          </div>

          <div className="mt-3 space-y-2 rounded border border-slate-700/80 bg-slate-950/60 p-2 text-xs">
            <p className="font-medium uppercase tracking-wide text-slate-400">Warp Intervals</p>
            <div className="space-y-1">
              {proposalSet.warp.intervals.map((interval, index) => {
                // Convert percentages to date ranges if epoch bounds provided
                const hasEpochBounds = startEpoch !== undefined && endEpoch !== undefined;
                const startDateStr = hasEpochBounds
                  ? formatEpochDate(normalizedToEpochSeconds(interval.startPercent, startEpoch, endEpoch))
                  : formatPercent(interval.startPercent);
                const endDateStr = hasEpochBounds
                  ? formatEpochDate(normalizedToEpochSeconds(interval.endPercent, startEpoch, endEpoch))
                  : formatPercent(interval.endPercent);

                return (
                  <div key={index} className="flex items-center justify-between text-slate-300">
                    <span>
                      {startDateStr} → {endDateStr}
                    </span>
                    <span className="font-medium text-violet-300">
                      {formatPercent(interval.strength * 100)} warp
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant={isSelected ? 'secondary' : 'default'} onClick={() => onSelect(proposalSet.id)}>
          {isSelected ? 'Selected package' : 'Select package'}
        </Button>
      </div>
    </div>
  );
}
