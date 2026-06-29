"use client";

import { useCallback, useEffect, useMemo } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
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
import { recommendGranularityForSelection } from '@/components/dashboard-demo/lib/demo-burst-generation';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { cn } from '@/lib/utils';

export function DemoDetectPanel() {
  const generationStatus = useDashboardDemoTimeslicingModeStore((state) => state.generationStatus);
  const setGenerationInputs = useDashboardDemoTimeslicingModeStore((state) => state.setGenerationInputs);
  const generateBurstDraftBinsFromWindows = useDashboardDemoTimeslicingModeStore(
    (state) => state.generateBurstDraftBinsFromWindows,
  );
  const generationInputs = useDashboardDemoTimeslicingModeStore((state) => state.generationInputs);
  const timelineColumns = useTimelineDataStore((state) => state.columns);
  const crimeTypes = useTimelineDataStore((state) => state.crimeTypes);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const isEvaluationLocked = useIsEvaluationLocked();
  const canGenerate = generationStatus !== 'generating' && minTimestampSec !== null && maxTimestampSec !== null && selectedTimeRange !== null;

  const selectedWindowBounds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) return null;
    const [windowStartSec, windowEndSec] = selectedTimeRange;
    return {
      start: toEpochSeconds(windowStartSec) * 1000,
      end: toEpochSeconds(windowEndSec) * 1000,
    };
  }, [maxTimestampSec, minTimestampSec, selectedTimeRange]);

  const suggestedGranularity = useMemo(
    () => recommendGranularityForSelection(selectedWindowBounds),
    [selectedWindowBounds],
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

  const handleGenerateBurstDrafts = useCallback(async () => {
    if (minTimestampSec === null || maxTimestampSec === null || selectedTimeRange === null) return;
    const [windowStartSec, windowEndSec] = selectedTimeRange;
    const start = toEpochSeconds(windowStartSec) * 1000;
    const end = toEpochSeconds(windowEndSec) * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    // console.log('[Detect] generate clicked — timeWindow:', { start, end, granularity: generationInputs.granularity, crimeTypes: generationInputs.crimeTypes.length, neighbourhood: generationInputs.neighbourhood });
    setGenerationInputs({ timeWindow: { start, end } });
    const generated = await generateBurstDraftBinsFromWindows();
    const state = useDashboardDemoTimeslicingModeStore.getState();
    // console.log('[Detect] generate result:', { generated, binCount: state.pendingGeneratedBins.length, status: state.generationStatus, error: state.generationError });
    if (generated && state.lastGeneratedMetadata) {
      toast.success('Slices generated', {
        description: state.lastGeneratedMetadata.warning ?? 'Slices ready for review in Slices.',
      });
      return;
    }
    toast.error('Generation failed', {
      description: state.generationError ?? 'Could not generate slices.',
    });
  }, [generateBurstDraftBinsFromWindows, maxTimestampSec, minTimestampSec, selectedTimeRange, setGenerationInputs]);

  return (
    <div className="space-y-3">
      {isEvaluationLocked ? (
        <div
          className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          role="note"
          aria-label="setup locked during evaluation"
        >
          <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          Setup locked during evaluation.
        </div>
      ) : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detect</CardTitle>
          <CardDescription className="text-xs">
            Generate candidate slices from the brushed range.
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
              onClick={handleGenerateBurstDrafts}
              disabled={!canGenerate || isEvaluationLocked}
              aria-disabled={isEvaluationLocked || !canGenerate}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              size="sm"
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <ArrowRight className="size-3.5" />
              {generationStatus === 'generating' ? 'Generating…' : 'Generate slices'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
