"use client";

import React, { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useStore } from 'zustand';
import { useUIStore } from '@/store/ui';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useIntervalProposalStore } from '@/store/useIntervalProposalStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { MainScene } from './MainScene';
import { SimpleCrimeLegend } from './SimpleCrimeLegend';
import { useLogger } from '@/hooks/useLogger';
import { useStkdeStore } from '@/store/useStkdeStore';
import type { DashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';

interface CubeVisualizationProps {
  selectionStory?: DashboardDemoSelectionStory | null;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}

export default function CubeVisualization({
  selectionStory = null,
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  timeStoreOverride,
  sliceStoreOverride,
}: CubeVisualizationProps) {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, columns } = useTimelineDataStore();
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;

  const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
  const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const selectedSpatialBounds = useStore(filterStore, (state) => state.selectedSpatialBounds);
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
  const warpProposals = useWarpProposalStore((state) => state.proposals);
  const selectedWarpProposalId = useWarpProposalStore((state) => state.selectedProposalId);
  const appliedWarpProposalId = useWarpProposalStore((state) => state.appliedProposalId);
  const intervalProposals = useIntervalProposalStore((state) => state.proposals);
  const selectedIntervalId = useIntervalProposalStore((state) => state.selectedProposalId);
  const previewIntervalId = useIntervalProposalStore((state) => state.previewProposalId);
  const appliedIntervalId = useIntervalProposalStore((state) => state.appliedProposalId);
  const stkdeResponse = useStkdeStore((state) => state.response);
  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const runMeta = useStkdeStore((state) => state.runMeta);
  const { log } = useLogger();

  const enabledConstraints = constraints.filter((constraint) => constraint.enabled);
  const activeConstraint =
    constraints.find((constraint) => constraint.id === activeConstraintId) ?? enabledConstraints[0] ?? null;
  const activeConstraintLabel = activeConstraint?.label ?? 'None';
  const selectedWarpProposal =
    warpProposals.find((proposal) => proposal.id === selectedWarpProposalId) ?? null;
  const appliedWarpProposal =
    warpProposals.find((proposal) => proposal.id === appliedWarpProposalId) ?? null;
  const appliedProposalLabel = appliedWarpProposal?.label ?? selectedWarpProposal?.label ?? 'None';
  const selectedInterval =
    intervalProposals.find((proposal) => proposal.id === selectedIntervalId) ?? null;
  const previewInterval =
    intervalProposals.find((proposal) => proposal.id === previewIntervalId) ?? null;
  const appliedInterval =
    intervalProposals.find((proposal) => proposal.id === appliedIntervalId) ?? null;
  const previewIntervalLabel = previewInterval?.label ?? 'None';
  const appliedIntervalLabel = appliedInterval?.label ?? 'None';

  const selectedHotspot = stkdeResponse?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null;

  useEffect(() => {
    if (!columns && !isLoading) {
      loadRealData();
    }
  }, [columns, isLoading, loadRealData]);

  const handleReset = () => {
    log('view_reset');
    triggerReset();
  };


  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      <div className="h-2" />
      
      <div className="absolute top-16 right-4 z-10">
        <button
          onClick={handleReset}
          className="p-2 bg-background/80 backdrop-blur border rounded-md hover:bg-accent transition-colors shadow-sm"
          title="Reset View"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
        <MainScene
          showMapBackground={false}
          filterStoreOverride={filterStore}
          coordinationStoreOverride={coordinationStore}
          adaptiveStoreOverride={adaptiveStore}
          timeStoreOverride={timeStore}
          sliceStoreOverride={sliceStore}
        />

        <div className="absolute top-4 left-4 z-10 rounded-md border border-slate-500/50 bg-slate-950/75 px-3 py-2 text-[10px] text-slate-100 shadow-sm backdrop-blur">
          <p>Relational mode: {warpSource} · warp {warpFactor.toFixed(2)}</p>
          <p>Active structure: {activeConstraintLabel}</p>
          <p>Linked selection: {selectedInterval?.label ?? appliedIntervalLabel}</p>
          <p>Proposal story: {appliedProposalLabel}</p>
          <p>Comparison cue: {previewIntervalLabel}</p>
          <p>Applied interval: {appliedIntervalLabel}</p>
          <p>
            Slice confidence:{' '}
            {(appliedInterval ?? selectedInterval)?.confidence.band ?? 'None'}
            {' · '}
            {(appliedInterval ?? selectedInterval)?.qualityState ?? 'none'}
            {' · '}
            {(appliedInterval ?? selectedInterval)?.isEdited ? 'Edited' : 'Original'}
          </p>
          {selectionStory ? (
            <div className="mt-2 rounded border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-cyan-100">
              <p>Window: {selectionStory.activeWindowLabel}</p>
              <p>Linked: {selectionStory.linkedHighlightLabel}</p>
              <p>{selectionStory.explanationLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <SimpleCrimeLegend />
        </div>
        {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds) && (
          <div className="absolute bottom-4 right-4 z-10 rounded-md border bg-background/85 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground shadow-sm">
            Filters: {[
              selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
              selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
              selectedTimeRange ? 'Time' : null,
              selectedSpatialBounds ? 'Region' : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

          {stkdeResponse ? (
          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-md border bg-background/85 px-3 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            <div className="text-xs font-semibold text-foreground">Relational context</div>
            {selectedHotspot ? (
              <>
                <div className="mt-1 text-foreground">Hotspot {selectedHotspot.id}</div>
                <div className="mt-1">Intensity: {selectedHotspot.intensityScore.toFixed(3)}</div>
                <div className="mt-1">Support: {selectedHotspot.supportCount}</div>
                <div className="mt-1">
                  Time window: {new Date(selectedHotspot.peakStartEpochSec * 1000).toLocaleString()} →{' '}
                  {new Date(selectedHotspot.peakEndEpochSec * 1000).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="mt-1">No hotspot selected</div>
            )}
            {runMeta ? (
              <div className="mt-1 text-sky-700 dark:text-sky-300">
                requested={runMeta.requestedComputeMode} effective={runMeta.effectiveComputeMode}
                {runMeta.truncated ? ' • truncated' : ''}
                {runMeta.fallbackApplied ? ` • fallback=${runMeta.fallbackApplied}` : ''}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
