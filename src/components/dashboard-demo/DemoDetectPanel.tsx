"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCrimeTypeName } from '@/lib/category-maps';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import {
  partitionSelectionByGranularity,
  recommendGranularityForSelection,
  type DemoSelectionGranularity,
} from '@/components/dashboard-demo/lib/demo-burst-generation';
import {
  allocateSlices,
  fetchBurstBins,
  resolveBurstMetricValue,
  type BurstMetric,
} from '@/lib/burst-detection';
import type { BurstBinResult } from '@/lib/burst-detection';
import { cn } from '@/lib/utils';

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
  const setGenerationInputs = useDashboardDemoTimeslicingModeStore((state) => state.setGenerationInputs);
  const generationInputs = useDashboardDemoTimeslicingModeStore((state) => state.generationInputs);
  const timelineColumns = useTimelineDataStore((state) => state.columns);
  const crimeTypes = useTimelineDataStore((state) => state.crimeTypes);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const isEvaluationLocked = useIsEvaluationLocked();
  const canScan = minTimestampSec !== null && maxTimestampSec !== null && selectedTimeRange !== null;

  const [burstBins, setBurstBins] = useState<BurstBinResult[] | null>(null);
  const [burstTargetSliceCount, setBurstTargetSliceCount] = useState<number | null>(null);
  const [isFetchingBurst, setIsFetchingBurst] = useState(false);
  const burstMetric: BurstMetric = 'temporal';

  const selectedWindowBounds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) return null;
    // selectedTimeRange is canonical epoch seconds — multiply to ms.
    const [windowStartSec, windowEndSec] = selectedTimeRange;
    const start = windowStartSec * 1000;
    const end = windowEndSec * 1000;
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

  useEffect(() => {
    if (!selectedWindowBounds) return;
    if (generationInputs.granularity !== suggestedGranularity) {
      setGenerationInputs({ granularity: suggestedGranularity });
    }
  }, [generationInputs.granularity, selectedWindowBounds, setGenerationInputs, suggestedGranularity]);

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
    // selectedTimeRange is canonical epoch seconds — multiply to ms.
    const [windowStartSec, windowEndSec] = selectedTimeRange;
    const start = windowStartSec * 1000;
    const end = windowEndSec * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const partitions = partitionSelectionByGranularity([start, end], scanGranularity);

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
          crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : undefined,
        });
      setBurstBins(result.bins);
      setBurstTargetSliceCount(result.targetSliceCount);
      toast.success('Scan complete', {
        description: `${result.bins.length} burst bins ready for review.`,
      });
    } catch {
      toast.error('Scan failed', {
        description: 'Could not fetch burst bins for the brushed range.',
      });
    }
    setIsFetchingBurst(false);
  }, [generationInputs.crimeTypes, maxTimestampSec, minTimestampSec, scanGranularity, selectedTimeRange]);

  const allocations = useMemo(() => {
    if (!burstBins || burstBins.length === 0) return null;
    return allocateSlices(burstBins, burstTargetSliceCount ?? burstBins.length * 3, burstMetric);
  }, [burstBins, burstTargetSliceCount, burstMetric]);

  return (
    <div className="space-y-3">
      {isEvaluationLocked ? (
        <div
          className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300"
          role="note"
          aria-label="setup locked during evaluation"
        >
          <Lock className="size-3.5 text-slate-400" aria-hidden />
          Setup locked during evaluation.
        </div>
      ) : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detect</CardTitle>
          <CardDescription className="text-xs">
            Scan the brushed range to inspect burst scores and preview candidate intervals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Crime types</span>
              <button
                type="button"
                onClick={() => setGenerationInputs({ crimeTypes: [] })}
                disabled={isEvaluationLocked}
                aria-disabled={isEvaluationLocked}
                tabIndex={isEvaluationLocked ? -1 : undefined}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                All types
              </button>
            </div>
            <div className={cn('flex flex-wrap gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}>
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
                    disabled={isEvaluationLocked}
                    aria-disabled={isEvaluationLocked}
                    tabIndex={isEvaluationLocked ? -1 : undefined}
                    className={`rounded-md border px-3 py-1.5 text-[11px] transition-colors ${
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
              disabled={isFetchingBurst || !canScan || isEvaluationLocked}
              aria-disabled={isEvaluationLocked || isFetchingBurst || !canScan}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              size="sm"
              variant="outline"
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <Sparkles className="size-3.5" />
              {isFetchingBurst ? 'Scanning…' : 'Scan brushed range'}
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
                          <span>Score {selectedScore.toFixed(2)}</span>
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
    </div>
  );
}
