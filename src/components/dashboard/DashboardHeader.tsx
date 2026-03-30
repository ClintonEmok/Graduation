"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useShallow } from 'zustand/react/shallow';
import { useBinningStore } from '@/store/useBinningStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';

interface DashboardHeaderProps {
  className?: string;
}

const WORKFLOW_LABELS = {
  generate: 'generate',
  review: 'review',
  applied: 'applied',
  refine: 'refine',
} as const;

const SYNC_LABELS = {
  syncing: 'syncing',
  synchronized: 'synchronized',
  partial: 'partial',
} as const;

const badgeClassName = (tone: 'violet' | 'emerald' | 'amber' | 'slate') => {
  if (tone === 'violet') return 'border-violet-400/40 bg-violet-500/10 text-violet-200';
  if (tone === 'emerald') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (tone === 'amber') return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
};

export function DashboardHeader({ className = '' }: DashboardHeaderProps) {
  const workflowPhase = useCoordinationStore((state) => state.workflowPhase);
  const syncStatus = useCoordinationStore((state) => state.syncStatus);

  const strategy = useBinningStore((state) => state.strategy);
  const granularity = useTimeslicingModeStore((state) => state.generationInputs.granularity);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const workflowTone =
    workflowPhase === 'generate'
      ? 'violet'
      : workflowPhase === 'review'
        ? 'amber'
        : workflowPhase === 'applied'
          ? 'emerald'
          : 'slate';

  const syncTone =
    syncStatus.status === 'synchronized'
      ? 'emerald'
      : syncStatus.status === 'syncing'
        ? 'amber'
        : 'violet';

  const summary = useMemo(() => {
    const draftCount = pendingGeneratedBins.length;
    const appliedCount = appliedSlices.length;

    return {
      draftCount,
      appliedCount,
      summaryText: `strategy ${strategy} · granularity ${granularity} · applied ${appliedCount} · draft ${draftCount}`,
    };
  }, [appliedSlices.length, granularity, pendingGeneratedBins.length, strategy]);

  return (
    <header className={`border-b border-slate-800 bg-slate-950/95 px-4 py-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">dashboard-v2 · unified v3.0 route</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Timeline, map/heatmap, and cube stay synchronized without route switching.
          </p>
        </div>

        <nav className="flex items-center gap-2 text-[11px] text-slate-500">
          <Link href="/dashboard-v2" className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200">
            dashboard-v2
          </Link>
          <Link href="/timeslicing" className="hover:text-slate-300">
            timeslicing
          </Link>
          <Link href="/stkde" className="hover:text-slate-300">
            stkde
          </Link>
        </nav>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-slate-200 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-900/80 px-2.5 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">workflow</div>
          <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${badgeClassName(workflowTone)}`}>
            {WORKFLOW_LABELS[workflowPhase]}
          </span>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/80 px-2.5 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">sync status</div>
          <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${badgeClassName(syncTone)}`}>
            {SYNC_LABELS[syncStatus.status]}
          </span>
          {syncStatus.status === 'partial' && syncStatus.reason ? (
            <p className="mt-1 truncate text-[10px] text-violet-300" title={syncStatus.reason}>
              {syncStatus.panel ? `${syncStatus.panel}: ` : ''}
              {syncStatus.reason}
            </p>
          ) : null}
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/80 px-2.5 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">strategy / granularity</div>
          <p className="text-slate-200">{strategy}</p>
          <p className="text-slate-400">{granularity}</p>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/80 px-2.5 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">slice summary</div>
          <p className="text-slate-200">Applied {summary.appliedCount}</p>
          <p className="text-slate-400">Draft {summary.draftCount}</p>
        </div>
      </div>

      <p className="mt-2 truncate text-[10px] text-slate-500">{summary.summaryText}</p>
    </header>
  );
}
