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
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { getCrimeTypeName } from '@/lib/category-maps';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { recommendGranularityForSelection } from '@/components/dashboard-demo/lib/demo-burst-generation';
import { fetchBurstBins, allocateSlices } from '@/lib/burst-detection';
import type { BurstBinResult } from '@/lib/burst-detection';

const GRANULARITY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

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
  const timeRange = useDashboardDemoTimeStore((state) => state.timeRange);
  const canGenerate = generationStatus !== 'generating' && minTimestampSec !== null && maxTimestampSec !== null;

  const [burstBins, setBurstBins] = useState<BurstBinResult[] | null>(null);
  const [isFetchingBurst, setIsFetchingBurst] = useState(false);

  const selectedWindowBounds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return null;
    const [windowStart, windowEnd] = timeRange;
    const start = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const end = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;
    return { start, end };
  }, [maxTimestampSec, minTimestampSec, timeRange]);

  const suggestedGranularity = useMemo(
    () => recommendGranularityForSelection(selectedWindowBounds),
    [selectedWindowBounds],
  );

  const suggestedGranularityLabel = GRANULARITY_OPTIONS.find(
    (o) => o.value === suggestedGranularity,
  )?.label ?? 'Daily';

  const activeGranularityLabel = GRANULARITY_OPTIONS.find(
    (o) => o.value === generationInputs.granularity,
  )?.label ?? 'Daily';

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
    if (minTimestampSec === null || maxTimestampSec === null) return;
    const [ws, we] = timeRange;
    const start = normalizedToEpochSeconds(ws, minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(we, minTimestampSec, maxTimestampSec);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    setIsFetchingBurst(true);
    try {
      const result = await fetchBurstBins({
        startEpoch: Math.floor(start),
        endEpoch: Math.floor(end),
        binCount: 10,
        granularity: generationInputs.granularity,
        crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : undefined,
      });
      setBurstBins(result.bins);
    } catch {
      toast.error('Failed to fetch burst data');
    }
    setIsFetchingBurst(false);
  }, [minTimestampSec, maxTimestampSec, timeRange, generationInputs.granularity, generationInputs.crimeTypes]);

  const handleGenerateBurstDrafts = async () => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      toast.error('Selection-first generation failed', {
        description: 'Choose a valid brushed selection before generating drafts.',
      });
      return;
    }
    const [windowStart, windowEnd] = timeRange;
    const start = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const end = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;
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
    return allocateSlices(burstBins, burstBins.length * 3);
  }, [burstBins]);

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
