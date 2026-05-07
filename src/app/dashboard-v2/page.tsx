"use client";

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BinningControls } from '@/components/binning/BinningControls';
import { SuggestionToolbar } from '@/app/timeslicing/components/SuggestionToolbar';
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
import { useStkdeStore } from '@/store/useStkdeStore';
import { useBinningStore } from '@/store/useBinningStore';
import { project } from '@/lib/projection';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

const WORKFLOW_STEPS = [
  {
    key: 'generate',
    label: 'Generate Draft Slices',
    detail: 'Set intent and create reviewable slices.',
  },
  {
    key: 'review',
    label: 'Review',
    detail: 'Inspect draft bins and warnings before apply.',
  },
  {
    key: 'applied',
    label: 'Apply',
    detail: 'Promote the chosen draft into shared slices.',
  },
  {
    key: 'refine',
    label: 'Refine',
    detail: 'Merge, split, delete, and resize in place.',
  },
  {
    key: 'analyze',
    label: 'Analyze',
    detail: 'Unlock STKDE in the right sidebar.',
  },
] as const;

export default function DashboardV2Page() {
  const workflowPhase = useCoordinationStore((state) => state.workflowPhase);
  const setPanel = useLayoutStore((state) => state.setPanel);
  const panels = useLayoutStore((state) => state.panels);
  const mapRatio = useLayoutStore((state) => state.mapRatio);

  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const mapDomain = useAdaptiveStore((state) => state.mapDomain) ?? [0, 100];
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const hasValidAdaptiveDomain = mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;
  const domainStartSec = hasValidAdaptiveDomain ? mapDomain[0] : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain ? mapDomain[1] : (maxTimestampSec ?? DEFAULT_END_EPOCH);
  const analysisUnlocked = workflowPhase === 'applied' || workflowPhase === 'refine';

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

  const crimeData = useMemo(() => crimes ?? [], [crimes]);

  const generationData = useMemo(
    () => crimeData.map((crime) => ({ timestamp: crime.timestamp * 1000, type: crime.type, district: crime.district })),
    [crimeData]
  );

  const availableCrimeTypes = useMemo(() => {
    const uniqueTypes = new Set(crimeData.map((crime) => crime.type));
    return Array.from(uniqueTypes).sort();
  }, [crimeData]);

  const availableNeighbourhoods = useMemo(() => {
    const uniqueDistricts = new Set(crimeData.map((crime) => crime.district));
    return Array.from(uniqueDistricts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [crimeData]);

  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useTimeslicingModeStore((state) => state.generationError);
  const mode = useTimeslicingModeStore((state) => state.mode);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const setGenerationInputs = useTimeslicingModeStore((state) => state.setGenerationInputs);

  const bins = useBinningStore((state) => state.bins);
  const strategy = useBinningStore((state) => state.strategy);
  const selectedBinId = useBinningStore((state) => state.selectedBinId);
  const savedConfigurations = useBinningStore((state) => state.savedConfigurations);
  const setStrategy = useBinningStore((state) => state.setStrategy);
  const selectBin = useBinningStore((state) => state.selectBin);
  const mergeBins = useBinningStore((state) => state.mergeBins);
  const splitBin = useBinningStore((state) => state.splitBin);
  const deleteBin = useBinningStore((state) => state.deleteBin);
  const saveConfiguration = useBinningStore((state) => state.saveConfiguration);
  const loadConfiguration = useBinningStore((state) => state.loadConfiguration);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const setWorkflowPhase = useCoordinationStore((state) => state.setWorkflowPhase);
  const setSyncStatus = useCoordinationStore((state) => state.setSyncStatus);
  const commitSelection = useCoordinationStore((state) => state.commitSelection);
  const panelNoMatch = useCoordinationStore((state) => state.panelNoMatch);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const setSpatialBounds = useFilterStore((state) => state.setSpatialBounds);

  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const response = useStkdeStore((state) => state.response);
  const lastCommittedHotspotRef = useRef<string | null>(null);

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
    if (analysisUnlocked && !panels.stkde) {
      setPanel('stkde', true);
    }
  }, [analysisUnlocked, panels.stkde, setPanel]);

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
    if (!selectedHotspotId || !response) {
      lastCommittedHotspotRef.current = null;
      return;
    }

    if (lastCommittedHotspotRef.current === selectedHotspotId) {
      return;
    }

    const hotspotIndex = response.hotspots.findIndex((hotspot) => hotspot.id === selectedHotspotId);
    if (hotspotIndex < 0) {
      return;
    }

    const hotspot = response.hotspots[hotspotIndex];
    lastCommittedHotspotRef.current = selectedHotspotId;

    setTimeRange([hotspot.peakStartEpochSec, hotspot.peakEndEpochSec]);

    const latDelta = hotspot.radiusMeters / 111_320;
    const lonDelta = hotspot.radiusMeters / Math.max(1, 111_320 * Math.cos((hotspot.centroidLat * Math.PI) / 180));
    const minLat = hotspot.centroidLat - latDelta;
    const maxLat = hotspot.centroidLat + latDelta;
    const minLon = hotspot.centroidLng - lonDelta;
    const maxLon = hotspot.centroidLng + lonDelta;
    const [x1, z1] = project(minLat, minLon);
    const [x2, z2] = project(maxLat, maxLon);

    setSpatialBounds({
      minX: Math.min(x1, x2),
      maxX: Math.max(x1, x2),
      minZ: Math.min(z1, z2),
      maxZ: Math.max(z1, z2),
      minLat,
      maxLat,
      minLon,
      maxLon,
    });

    commitSelection(hotspotIndex, 'map');

    if (appliedSlices.length > 0) {
      const overlapsAppliedSlice = appliedSlices.some((slice) => {
        if (slice.type === 'range' && slice.range) {
          const start = Math.floor(Math.min(slice.range[0], slice.range[1]) / 1000);
          const end = Math.floor(Math.max(slice.range[0], slice.range[1]) / 1000);
          return hotspot.peakEndEpochSec >= start && hotspot.peakStartEpochSec <= end;
        }
        const pointSec = Math.floor(slice.time / 1000);
        return pointSec >= hotspot.peakStartEpochSec && pointSec <= hotspot.peakEndEpochSec;
      });

      if (!overlapsAppliedSlice) {
        setSyncStatus(
          'partial',
          'Hotspot time window is an investigative overlay; applied slices remain the workflow source of truth.',
          'map'
        );
      }
    }
  }, [appliedSlices, commitSelection, response, selectedHotspotId, setSpatialBounds, setSyncStatus, setTimeRange]);

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
    const timestamps = crimeData.map((crime) => crime.timestamp);
    const maxPoints = 4000;
    if (timestamps.length <= maxPoints) {
      return timestamps;
    }
    const step = Math.ceil(timestamps.length / maxPoints);
    return timestamps.filter((_, index) => index % step === 0);
  }, [crimeData]);

  const mapVisible = panels.map;
  const cubeVisible = panels.cube;
  const showAnalysisPanel = analysisUnlocked && panels.stkde;
  const activeWorkflowKey = showAnalysisPanel ? 'analyze' : workflowPhase;
  const completedWorkflowSteps = useMemo(() => {
    if (activeWorkflowKey === 'review') return new Set(['generate']);
    if (activeWorkflowKey === 'applied') return new Set(['generate', 'review']);
    if (activeWorkflowKey === 'refine') return new Set(['generate', 'review', 'applied']);
    if (activeWorkflowKey === 'analyze') return new Set(['generate', 'review', 'applied', 'refine']);
    return new Set<string>();
  }, [activeWorkflowKey]);

  const workflowLabels = WORKFLOW_STEPS.map((step) => ({
    ...step,
    isActive: step.key === activeWorkflowKey,
    isComplete: completedWorkflowSteps.has(step.key),
  }));

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <DashboardHeader />

      <div aria-label="workflow rail" className="border-b border-slate-800 bg-slate-950/85 px-4 py-3">
        <div className="grid gap-2 md:grid-cols-5">
          {workflowLabels.map((step) => (
            <div
              key={step.key}
              className={`rounded-lg border px-3 py-2 text-[11px] transition ${
                step.isActive
                  ? 'border-violet-400/50 bg-violet-500/10 text-violet-100'
                  : step.isComplete
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <div className="font-medium uppercase tracking-[0.16em]">{step.label}</div>
              <div className="mt-1 text-slate-400">{step.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)_minmax(0,360px)]">
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
            <Sparkles className="size-3.5 text-violet-300" />
            Guided generation and review stay in one surface.
          </div>

          <BinningControls
            bins={bins}
            strategy={strategy}
            onStrategyChange={setStrategy}
            onBinSelect={selectBin}
            selectedBinId={selectedBinId}
            onMerge={mergeBins}
            onSplit={splitBin}
            onDelete={(binId) => {
              deleteBin(binId);
              if (selectedBinId === binId) {
                selectBin(null);
              }
            }}
            savedConfigs={savedConfigurations.map((config) => ({ id: config.id, name: config.name }))}
            onSaveConfig={saveConfiguration}
            onLoadConfig={loadConfiguration}
            generationData={generationData}
            generationDomain={[rangeStart * 1000, rangeEnd * 1000]}
            availableCrimeTypes={availableCrimeTypes}
            availableNeighbourhoods={availableNeighbourhoods}
          />

          <div className="mt-4">
            <SuggestionToolbar applyDomain={[rangeStart * 1000, rangeEnd * 1000]} />
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] text-slate-400">
            Review and refinement stay in this same surface; STKDE stays hidden until the workflow unlocks analysis.
          </div>
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
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
                    <Suspense fallback={null}>
                      <CubeVisualization />
                    </Suspense>
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

        {showAnalysisPanel ? (
          <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
              <Shield className="size-3.5" />
              Analysis is now unlocked in the right sidebar.
            </div>

            <DashboardStkdePanel />

            {panels.layers ? (
              <div className="mt-4">
                <MapLayerManager />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
