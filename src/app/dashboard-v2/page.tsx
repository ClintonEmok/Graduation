"use client";

import React, { useEffect, useMemo } from 'react';
import { CheckCircle2, Clock3, Cuboid, Layers3, Sparkles, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SuggestionToolbar } from '@/app/timeslicing/components/SuggestionToolbar';
import { Button } from '@/components/ui/button';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { MapLayerManager } from '@/components/map/MapLayerManager';
import { DashboardStkdePanel } from '@/components/stkde/DashboardStkdePanel';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

export default function DashboardV2Page() {
  const panels = useLayoutStore((state) => state.panels);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const mapRatio = useLayoutStore((state) => state.mapRatio);

  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const domainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (start !== end) {
        return [start, end];
      }
    }
    return [viewportStart, viewportEnd];
  }, [selectedTimeRange, viewportEnd, viewportStart]);

  const { data: crimes } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const generationError = useTimeslicingModeStore((state) => state.generationError);
  const mode = useTimeslicingModeStore((state) => state.mode);
  const clearPendingGeneratedBins = useTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const applyGeneratedBins = useTimeslicingModeStore((state) => state.applyGeneratedBins);
  const setGenerationInputs = useTimeslicingModeStore((state) => state.setGenerationInputs);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const setWorkflowPhase = useCoordinationStore((state) => state.setWorkflowPhase);
  const setSyncStatus = useCoordinationStore((state) => state.setSyncStatus);
  const panelNoMatch = useCoordinationStore((state) => state.panelNoMatch);

  useEffect(() => {
    setGenerationInputs({
      timeWindow: {
        start: rangeStart * 1000,
        end: rangeEnd * 1000,
      },
    });
  }, [rangeEnd, rangeStart, setGenerationInputs]);

  useEffect(() => {
    if (pendingGeneratedBins.length > 0) {
      setWorkflowPhase('review');
      return;
    }

    if (appliedSlices.length > 0 && mode === 'manual') {
      setWorkflowPhase('refine');
      return;
    }

    if (appliedSlices.length > 0) {
      setWorkflowPhase('applied');
      return;
    }

    setWorkflowPhase('generate');
  }, [appliedSlices.length, mode, pendingGeneratedBins.length, setWorkflowPhase]);

  useEffect(() => {
    if (generationStatus === 'generating') {
      setSyncStatus('syncing');
      return;
    }

    if (generationError) {
      setSyncStatus('partial', generationError);
      return;
    }

    const noMatchEntries = Object.values(panelNoMatch);
    if (noMatchEntries.length > 0) {
      const latest = noMatchEntries.sort((a, b) => b.at - a.at)[0];
      setSyncStatus('partial', latest.reason, latest.panel);
      return;
    }

    setSyncStatus('synchronized');
  }, [generationError, generationStatus, panelNoMatch, setSyncStatus]);

  useEffect(() => {
    if (!crimes || crimes.length === 0) {
      return;
    }

    const timestamps = new Float32Array(crimes.length);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    const points = crimes.map((crime, index) => {
      timestamps[index] = crime.timestamp;
      minX = Math.min(minX, crime.x);
      maxX = Math.max(maxX, crime.x);
      minZ = Math.min(minZ, crime.z);
      maxZ = Math.max(maxZ, crime.z);

      return {
        id: `${crime.timestamp}-${index}`,
        timestamp: crime.timestamp,
        x: crime.x,
        y: 0,
        z: crime.z,
        type: crime.type,
      };
    });

    useTimelineDataStore.setState({
      data: points,
      columns: null,
      minTimestampSec: domainStartSec,
      maxTimestampSec: domainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: 'uniform-events' });
  }, [crimes, domainEndSec, domainStartSec]);

  const selectionDetailPoints = useMemo(() => {
    const timestamps = crimes.map((crime) => crime.timestamp);
    const maxPoints = 4000;
    if (timestamps.length <= maxPoints) {
      return timestamps;
    }
    const step = Math.ceil(timestamps.length / maxPoints);
    return timestamps.filter((_, index) => index % step === 0);
  }, [crimes]);

  const handleApply = () => {
    applyGeneratedBins([rangeStart * 1000, rangeEnd * 1000]);
  };

  const mapVisible = panels.map;
  const cubeVisible = panels.cube;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <DashboardHeader />

      <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px]">
        <button
          onClick={() => togglePanel('timeline')}
          className={`rounded border px-2 py-1 transition ${
            panels.timeline ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          <Clock3 className="mr-1 inline size-3" />
          Timeline
        </button>
        <button
          onClick={() => togglePanel('map')}
          className={`rounded border px-2 py-1 transition ${
            panels.map ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          Map / heatmap
        </button>
        <button
          onClick={() => togglePanel('cube')}
          className={`rounded border px-2 py-1 transition ${
            panels.cube ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          <Cuboid className="mr-1 inline size-3" />
          Cube
        </button>
        <button
          onClick={() => togglePanel('refinement')}
          className={`rounded border px-2 py-1 transition ${
            panels.refinement ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          <Sparkles className="mr-1 inline size-3" />
          Refinement
        </button>
        <button
          onClick={() => togglePanel('layers')}
          className={`rounded border px-2 py-1 transition ${
            panels.layers ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          <Layers3 className="mr-1 inline size-3" />
          Layers
        </button>
        <button
          onClick={() => togglePanel('stkde')}
          className={`rounded border px-2 py-1 transition ${
            panels.stkde ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-400'
          }`}
        >
          STKDE
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {panels.refinement && (
          <aside className="w-80 overflow-y-auto border-r border-slate-800 bg-slate-950/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Refinement</h2>
              <button onClick={() => togglePanel('refinement')} className="rounded p-0.5 text-slate-500 hover:text-slate-300">
                <X className="size-3.5" />
              </button>
            </div>

            {pendingGeneratedBins.length > 0 && (
              <div className="mb-3 rounded border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px]">
                <div className="font-medium text-amber-200">Draft bins ({pendingGeneratedBins.length})</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handleApply} className="h-7 gap-1 text-[11px]">
                    <CheckCircle2 className="size-3" />
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearPendingGeneratedBins} className="h-7 text-[11px]">
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <SuggestionToolbar applyDomain={[rangeStart * 1000, rangeEnd * 1000]} />
          </aside>
        )}

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 border-b border-slate-800" style={{ height: `${mapRatio}%` }}>
            {mapVisible || cubeVisible ? (
              <div className={`grid h-full gap-0 ${mapVisible && cubeVisible ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {mapVisible ? (
                  <div className="min-h-0 border-r border-slate-800/70">
                    <MapVisualization />
                  </div>
                ) : null}
                {cubeVisible ? (
                  <div className="min-h-0">
                    <CubeVisualization />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Enable Map / heatmap or Cube panel from the header toggles.
              </div>
            )}
          </div>

          {panels.timeline && (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Timeline</h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm border border-amber-300/80 bg-amber-400/15" />
                    Draft
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm border border-emerald-300/80 bg-emerald-400/15" />
                    Applied
                  </span>
                </div>
              </div>

              <DualTimeline
                detailRangeOverride={[rangeStart, rangeEnd]}
                detailPointsOverride={selectionDetailPoints}
                detailRenderMode="auto"
                disableAutoBurstSlices={true}
                adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
                adaptiveWarpMapOverride={null}
                tickLabelStrategy="span-aware"
              />
            </div>
          )}
        </section>

        {(panels.layers || panels.stkde) && (
          <aside className="w-80 overflow-y-auto border-l border-slate-800 bg-slate-950/80 p-3">
            <div className="space-y-3">
              {panels.layers ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-medium text-slate-300">Layer Manager</h2>
                    <button onClick={() => togglePanel('layers')} className="rounded p-0.5 text-slate-500 hover:text-slate-300">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <MapLayerManager />
                </div>
              ) : null}

              {panels.stkde ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-medium text-slate-300">STKDE</h2>
                    <button onClick={() => togglePanel('stkde')} className="rounded p-0.5 text-slate-500 hover:text-slate-300">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <DashboardStkdePanel />
                </div>
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
