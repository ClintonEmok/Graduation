"use client";

import { useCallback, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toEpochSeconds } from '@/lib/time-domain';
import { getCrimeTypeName } from '@/lib/category-maps';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import {
  partitionSelectionByGranularity,
  recommendGranularityForSelection,
  type DemoSelectionGranularity,
} from '@/components/dashboard-demo/lib/demo-burst-generation';
import {
  BURST_METRIC_OPTIONS,
  SPATIAL_FORMULA_OPTIONS,
  allocateSlices,
  fetchBurstBins,
  resolveBurstMetricValue,
  type SpatialFormula,
  type BurstMetric,
} from '@/lib/burst-detection';
import type { BurstBinResult } from '@/lib/burst-detection';

const GRANULARITY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

const GRANULARITY_ORDER: DemoSelectionGranularity[] = ['quarterly', 'monthly', 'weekly', 'daily', 'hourly'];
const GRANULARITY_RANK = new Map<DemoSelectionGranularity, number>(
  GRANULARITY_ORDER.map((granularity, index) => [granularity, index]),
);

const coarsenGranularity = (
  preferred: DemoSelectionGranularity,
  suggested: DemoSelectionGranularity,
): DemoSelectionGranularity => {
  const preferredRank = GRANULARITY_RANK.get(preferred) ?? GRANULARITY_ORDER.length - 1;
  const suggestedRank = GRANULARITY_RANK.get(suggested) ?? GRANULARITY_ORDER.length - 1;
  return GRANULARITY_ORDER[Math.min(preferredRank, suggestedRank)];
};

export function DemoDetectPanel() {
  const generationStatus = useDashboardDemoTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useDashboardDemoTimeslicingModeStore((state) => state.generationError);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const clearPendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const setGenerationInputs = useDashboardDemoTimeslicingModeStore((state) => state.setGenerationInputs);
  const generateBurstDraftBinsFromWindows = useDashboardDemoTimeslicingModeStore((state) => state.generateBurstDraftBinsFromWindows);
  const applyGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.applyGeneratedBins);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const generationInputs = useDashboardDemoTimeslicingModeStore((state) => state.generationInputs);
  const clearSelectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.clearSelectedBurstWindows);
  const timelineColumns = useTimelineDataStore((state) => state.columns);
  const crimeTypes = useTimelineDataStore((state) => state.crimeTypes);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const canGenerate =
    generationStatus !== 'generating' &&
    minTimestampSec !== null &&
    maxTimestampSec !== null &&
    selectedTimeRange !== null;

  const [burstBins, setBurstBins] = useState<BurstBinResult[] | null>(null);
  const [burstTargetSliceCount, setBurstTargetSliceCount] = useState<number | null>(null);
  const [isFetchingBurst, setIsFetchingBurst] = useState(false);
  const [burstMetric, setBurstMetric] = useState<BurstMetric>('combined');
  const [spatialFormula, setSpatialFormula] = useState<SpatialFormula>('balanced');

  const selectedWindowBounds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) return null;
    const [windowStart, windowEnd] = selectedTimeRange;
    const start = toEpochSeconds(windowStart) * 1000;
    const end = toEpochSeconds(windowEnd) * 1000;
    return { start, end };
  }, [maxTimestampSec, minTimestampSec, selectedTimeRange]);

  const suggestedGranularity = useMemo(
    () => recommendGranularityForSelection(selectedWindowBounds),
    [selectedWindowBounds],
  );
  const scanGranularity = useMemo(
    () =>
      selectedWindowBounds
        ? coarsenGranularity(generationInputs.granularity, suggestedGranularity)
        : generationInputs.granularity,
    [generationInputs.granularity, selectedWindowBounds, suggestedGranularity],
  );

  const suggestedGranularityLabel = GRANULARITY_OPTIONS.find(
    (o) => o.value === suggestedGranularity,
  )?.label ?? 'Daily';

  const activeGranularityLabel = GRANULARITY_OPTIONS.find(
    (o) => o.value === generationInputs.granularity,
  )?.label ?? 'Daily';

  const activeBurstMetricLabel = BURST_METRIC_OPTIONS.find((o) => o.value === burstMetric)?.label ?? 'Combined';
  const activeSpatialFormulaLabel = SPATIAL_FORMULA_OPTIONS.find((o) => o.value === spatialFormula)?.label ?? 'Balanced';

  const availableCrimeTypes = useMemo(() => {
    if (crimeTypes.length > 0) return crimeTypes;
    if (!timelineColumns?.type || timelineColumns.type.length === 0) return [];
    return Array.from(
      new Set(
        Array.from(timelineColumns.type, (typeId) => getCrimeTypeName(typeId)).filter(
          (type) => type.trim().length > 0,
        ),
      ),
    ).sort();
  }, [crimeTypes, timelineColumns]);

  const selectedCrimeTypes = generationInputs.crimeTypes;

  const handleFetchBurstBins = useCallback(async () => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) return;
    const [ws, we] = selectedTimeRange;
    const start = toEpochSeconds(ws) * 1000;
    const end = toEpochSeconds(we) * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const partitions = partitionSelectionByGranularity(
      [start, end],
      scanGranularity,
    );

    if (partitions.length === 0) {
      toast.error('No partitions to score', {
        description: 'Choose a wider selection or a coarser granularity.',
      });
      return;
    }

    setIsFetchingBurst(true);
    try {
      const result = await fetchBurstBins({
        partitions: partitions.map((partition) => ({
          startEpoch: partition.startTime / 1000,
          endEpoch: partition.endTime / 1000,
        })),
        granularity: scanGranularity,
        spatialFormula,
        crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : undefined,
      });
      setBurstBins(result.bins);
      setBurstTargetSliceCount(result.targetSliceCount);
    } catch {
      toast.error('Failed to fetch burst data');
    }
    setIsFetchingBurst(false);
  }, [generationInputs.crimeTypes, maxTimestampSec, minTimestampSec, scanGranularity, selectedTimeRange, spatialFormula]);

  const handleGenerateBurstDrafts = async () => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) {
      toast.error('Selection-first generation failed', {
        description: 'Choose a valid brushed selection before generating drafts.',
      });
      return;
    }
    const [windowStart, windowEnd] = selectedTimeRange;
    const start = toEpochSeconds(windowStart) * 1000;
    const end = toEpochSeconds(windowEnd) * 1000;
    setGenerationInputs({ timeWindow: { start, end } });
    const generated = await generateBurstDraftBinsFromWindows();
    const state = useDashboardDemoTimeslicingModeStore.getState();
    if (generated && state.lastGeneratedMetadata) {
      toast.success('Burst drafts generated', {
        description: state.lastGeneratedMetadata.warning ?? 'Drafts ready for review.',
      });
      return;
    }
    toast.error('Generation failed', {
      description: state.generationError ?? 'Could not generate drafts.',
    });
  };

  const handleApplyDraftSlices = () => {
    if (pendingGeneratedBins.length === 0 || minTimestampSec === null || maxTimestampSec === null) return;
    const domain: [number, number] = [minTimestampSec * 1000, maxTimestampSec * 1000];
    applyGeneratedBins(domain);
    toast.success('Draft slices applied');
  };

  const handleClear = useCallback(() => {
    clearPendingGeneratedBins();
    clearSelectedBurstWindows();
    setBurstBins(null);
    setBurstTargetSliceCount(null);
  }, [clearPendingGeneratedBins, clearSelectedBurstWindows]);

  const selectionStateLabel = pendingGeneratedBins.length === 0
    ? 'idle'
    : pendingGeneratedBins.every((bin) => bin.isNeutralPartition)
      ? 'neutral'
      : 'expanded';

  const selectionBLabel = useMemo(() => {
    const bestBin = pendingGeneratedBins.reduce<{ burstinessCoefficient?: number; burstScore?: number } | null>(
      (best, bin) => {
        if (!best) return bin;
        const bestScore = Math.abs(best?.burstinessCoefficient ?? best?.burstScore ?? 0);
        const currentScore = Math.abs(bin.burstinessCoefficient ?? bin.burstScore ?? 0);
        return currentScore > bestScore ? bin : best;
      },
      null,
    );
    const coefficient = bestBin?.burstinessCoefficient ?? bestBin?.burstScore;
    return typeof coefficient === 'number' && Number.isFinite(coefficient) ? coefficient.toFixed(2) : '—';
  }, [pendingGeneratedBins]);

  const allocations = useMemo(() => {
    if (!burstBins || burstBins.length === 0) return null;
    return allocateSlices(burstBins, burstTargetSliceCount ?? burstBins.length * 3, burstMetric);
  }, [burstBins, burstTargetSliceCount, burstMetric]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Burst Detection</CardTitle>
          <CardDescription className="text-xs">
            Analyze burstiness across the selected time range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Granularity</span>
              <span className="text-muted-foreground/70">Suggested: {suggestedGranularityLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {GRANULARITY_OPTIONS.map((option) => {
                const isActive = generationInputs.granularity === option.value;
                const isRecommended = option.value === suggestedGranularity;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGenerationInputs({ granularity: option.value })}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isActive
                        ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                        : isRecommended
                          ? 'border-amber-300/60 bg-amber-500/10 text-amber-100 hover:border-amber-200'
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {option.label}
                    {isRecommended && (
                      <span className="ml-1 text-[9px] uppercase tracking-[0.18em] text-amber-200">Rec</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Active: {activeGranularityLabel}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Burst metric</span>
              <span className="text-muted-foreground/70">Active: {activeBurstMetricLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {BURST_METRIC_OPTIONS.map((option) => {
                const isActive = burstMetric === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBurstMetric(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isActive
                        ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Spatial formula</span>
              <span className="text-muted-foreground/70">Active: {activeSpatialFormulaLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPATIAL_FORMULA_OPTIONS.map((option) => {
                const isActive = spatialFormula === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSpatialFormula(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isActive
                        ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Crime types</span>
              <button
                type="button"
                onClick={() => setGenerationInputs({ crimeTypes: [] })}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                All types
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCrimeTypes.length > 0 ? availableCrimeTypes.map((crimeType) => {
                const isActive = selectedCrimeTypes.includes(crimeType);
                return (
                  <button
                    key={crimeType}
                    type="button"
                    onClick={() => setGenerationInputs({
                      crimeTypes: isActive
                        ? selectedCrimeTypes.filter((t) => t !== crimeType)
                        : [...selectedCrimeTypes, crimeType],
                    })}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isActive
                        ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {crimeType}
                  </button>
                );
              }) : (
                <span className="text-[11px] text-muted-foreground">All types included by default.</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleFetchBurstBins}
              disabled={isFetchingBurst || !canGenerate}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="size-3.5" />
              {isFetchingBurst ? 'Scanning…' : 'Scan burstiness'}
            </Button>
            <Button
              type="button"
              onClick={handleGenerateBurstDrafts}
              disabled={!canGenerate}
              size="sm"
              className="gap-2"
            >
              {generationStatus === 'generating' ? 'Generating…' : 'Generate drafts'}
            </Button>
          </div>

          {burstBins && burstBins.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Burst scores ({burstBins.length} bins)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {allocations && `${allocations.filter((a) => a.slicesAllocated > 1).length} bins bursty`}
                </span>
              </div>
              <div className="space-y-1">
                {burstBins.map((bin, i) => {
                  const alloc = allocations?.[i];
                  const selectedScore = resolveBurstMetricValue(bin, burstMetric);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-muted-foreground">
                          Bin {i + 1}
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{bin.recordCount} events</span>
                          {alloc && <span>{alloc.slicesAllocated} slices</span>}
                          <span>{activeBurstMetricLabel} {selectedScore.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                          bin.temporalB > 0.5 ? 'bg-amber-500/20 text-amber-300' : 'bg-muted text-muted-foreground'
                        }`}>
                          T {bin.temporalB.toFixed(2)}
                        </span>
                        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                          bin.spatialB > 0.5 ? 'bg-sky-500/20 text-sky-300' : 'bg-muted text-muted-foreground'
                        }`}>
                          S {bin.spatialB.toFixed(2)}
                        </span>
                        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                          bin.combinedB > 0.5 ? 'bg-violet-500/20 text-violet-300' : 'bg-muted text-muted-foreground'
                        }`}>
                          C {bin.combinedB.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingGeneratedBins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Pending Drafts</CardTitle>
              <Button
                type="button"
                onClick={handleClear}
                variant="ghost"
                size="icon-sm"
                className="size-6"
              >
                <X className="size-3" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              {pendingGeneratedBins.length} bins ready to apply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max B</span>
                <span className="font-medium">{selectionBLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium">{selectionStateLabel}</span>
              </div>
              {selectionStateLabel === 'neutral' ? (
                <p className="mt-1 text-muted-foreground">Muted neutral partition keeps the selection evenly split.</p>
              ) : (
                <p className="mt-1 text-muted-foreground">Drafts stay editable before apply.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleApplyDraftSlices}
                size="sm"
                className="flex-1 gap-2"
              >
                Apply drafts
              </Button>
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Clear
              </Button>
            </div>

            {lastAppliedAt && (
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Last applied: {new Date(lastAppliedAt).toLocaleTimeString()}
              </div>
            )}
            {generationError && (
              <div className="rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                {generationError}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
