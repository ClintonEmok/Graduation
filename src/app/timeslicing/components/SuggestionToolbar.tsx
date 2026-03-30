"use client";

import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, Layers3, RefreshCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { getDistrictDisplayName } from '@/lib/category-maps';

interface SuggestionToolbarProps {
  className?: string;
  applyDomain?: [number, number];
}

const formatDateTime = (timestampMs: number | null) => {
  if (!timestampMs || !Number.isFinite(timestampMs)) return 'Not set';
  return new Date(timestampMs).toLocaleString();
};

export function SuggestionToolbar({ className, applyDomain }: SuggestionToolbarProps) {
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useTimeslicingModeStore((state) => state.generationError);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const lastGeneratedMetadata = useTimeslicingModeStore((state) => state.lastGeneratedMetadata);
  const lastAppliedAt = useTimeslicingModeStore((state) => state.lastAppliedAt);
  const clearPendingGeneratedBins = useTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const applyGeneratedBins = useTimeslicingModeStore((state) => state.applyGeneratedBins);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const workflowLabel = generationError
    ? 'Generation needs attention'
    : generationStatus === 'generating'
      ? 'Generating draft bins'
      : pendingGeneratedBins.length > 0
        ? 'Draft bins ready for review'
        : generationStatus === 'applied' || appliedSlices.length > 0
          ? 'Applied slices active'
          : 'Ready to generate';

  const handleApply = () => {
    if (!resolvedApplyDomain) return;
    applyGeneratedBins(resolvedApplyDomain);
  };

  const generationSummary = lastGeneratedMetadata?.inputs;
  const resolvedApplyDomain: [number, number] | null = applyDomain
    ? applyDomain
    : generationSummary?.timeWindow.start && generationSummary.timeWindow.end
      ? [generationSummary.timeWindow.start, generationSummary.timeWindow.end]
      : minTimestampSec !== null && maxTimestampSec !== null
        ? [minTimestampSec * 1000, maxTimestampSec * 1000]
        : null;

  return (
    <div className={`space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Sparkles className="size-4 text-violet-300" />
            Generate → review → apply
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Generated bins stay in draft until you apply them into the active slice set.
          </p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
          {workflowLabel}
        </span>
      </div>

      {(generationError || lastGeneratedMetadata?.warning) && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          generationError
            ? 'border-red-500/40 bg-red-500/10 text-red-100'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        }`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{generationError ?? lastGeneratedMetadata?.warning}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Clock3 className="size-3.5" />
            Draft review
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{pendingGeneratedBins.length}</div>
          <div className="mt-1 text-xs text-slate-400">Generated bins waiting for apply</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Layers3 className="size-3.5" />
            Active slices
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{appliedSlices.length}</div>
          <div className="mt-1 text-xs text-slate-400">Currently applied generated slices</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <CheckCircle2 className="size-3.5" />
            Last apply
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-100">{lastAppliedAt ? new Date(lastAppliedAt).toLocaleTimeString() : 'Not applied yet'}</div>
          <div className="mt-1 text-xs text-slate-400">Apply promotes the current draft into the shared slice domain</div>
        </div>
      </div>

      {generationSummary && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
          <div className="font-medium text-slate-100">Review context</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Crime types</div>
              <div className="mt-1 text-slate-200">
                {generationSummary.crimeTypes.length > 0 ? generationSummary.crimeTypes.join(', ') : 'All crime types'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Neighbourhood</div>
              <div className="mt-1 text-slate-200">
                {generationSummary.neighbourhood ? getDistrictDisplayName(generationSummary.neighbourhood) : 'All neighbourhoods'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Window</div>
              <div className="mt-1 text-slate-200">
                {formatDateTime(generationSummary.timeWindow.start)}<br />{formatDateTime(generationSummary.timeWindow.end)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Granularity</div>
              <div className="mt-1 text-slate-200 capitalize">{generationSummary.granularity}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleApply} disabled={pendingGeneratedBins.length === 0 || !resolvedApplyDomain} className="gap-2">
          <CheckCircle2 className="size-4" />
          Apply generated bins
        </Button>
        <Button variant="outline" onClick={clearPendingGeneratedBins} disabled={pendingGeneratedBins.length === 0} className="gap-2">
          <RefreshCcw className="size-4" />
          Clear draft
        </Button>
        <span className="text-xs text-slate-400">
          {pendingGeneratedBins.length > 0
            ? 'Draft bins are highlighted on the timeline until apply.'
            : appliedSlices.length > 0
              ? 'Applied slices remain active until you generate and apply a new draft.'
              : 'Generate bins to begin the workflow.'}
        </span>
      </div>
    </div>
  );
}
