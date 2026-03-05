"use client";

import React, { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';
import { MainScene } from './MainScene';
import { SimpleCrimeLegend } from './SimpleCrimeLegend';
import { useLogger } from '@/hooks/useLogger';

export default function CubeVisualization() {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, columns } = useDataStore();
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const appliedProposalId = useWarpProposalStore((state) => state.appliedProposalId);
  const proposals = useWarpProposalStore((state) => state.proposals);
  const { log } = useLogger();

  const enabledConstraints = constraints.filter((constraint) => constraint.enabled);
  const activeConstraintLabel =
    constraints.find((constraint) => constraint.id === activeConstraintId)?.label ?? 'None';
  const appliedProposalLabel =
    proposals.find((proposal) => proposal.id === appliedProposalId)?.label ?? appliedProposalId ?? 'None';

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
        <MainScene showMapBackground={false} />

        <div className="absolute top-4 left-4 z-10 rounded-md border border-slate-500/50 bg-slate-950/75 px-3 py-2 text-[10px] text-slate-100 shadow-sm backdrop-blur">
          <p>Constraints: {enabledConstraints.length} enabled · Active: {activeConstraintLabel}</p>
          <p>Adaptive: {warpSource} · Warp {warpFactor.toFixed(2)}</p>
          <p>Applied proposal: {appliedProposalLabel}</p>
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
      </div>
    </div>
  );
}
