"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';
import { cn } from '@/lib/utils';

const formatDateTime = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Date(value).toLocaleString();
};

const formatCompactDate = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCoefficient = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(2);
};

const formatNormalizedScore = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value)} / 100`;
};

const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }

  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export function DemoSlicePanel() {
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { currentTime, timeRange, timeResolution } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const { isComputing } = useDebouncedDensity();
  const isEvaluationLocked = useIsEvaluationLocked();

  const slices = useSliceDomainStore((state) => state.slices);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const removeSlice = useSliceDomainStore((state) => state.removeSlice);
  const clearSlices = useSliceDomainStore((state) => state.clearSlices);

  const clearPendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const generationError = useDashboardDemoTimeslicingModeStore((state) => state.generationError);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const mergePendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.mergePendingGeneratedBins);
  const splitPendingGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.splitPendingGeneratedBin);
  const deletePendingGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.deletePendingGeneratedBin);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const applySingleGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.applySingleGeneratedBin);
  const lastGeneratedMetadata = useDashboardDemoTimeslicingModeStore((state) => state.lastGeneratedMetadata);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const warpMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);
  const resetWarp = useDashboardDemoCoordinationStore((state) => state.resetWarp);
  const clearSelectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.clearSelectedBurstWindows);

  const selectedSlice = useMemo(
    () => slices.find((slice) => slice.id === selectedSliceId) ?? null,
    [selectedSliceId, slices]
  );

  const selectedDraft = useMemo(
    () => pendingGeneratedBins.find((bin) => bin.id === selectedDraftId) ?? null,
    [pendingGeneratedBins, selectedDraftId]
  );

  const selectedSliceLabel = selectedSlice
    ? `${selectedSlice.name?.trim() || 'Applied slice'} · ${selectedSlice.type}`
    : 'Read-only metadata for the selected slice.';

  const selectedDraftLabel = selectedDraft
    ? `${selectedDraft.isNeutralPartition ? 'Neutral slice' : 'Selection-first slice'} · ${selectedDraft.burstClass ?? 'neutral'} · ${selectedDraft.id}`
    : 'Read-only metadata for the selected slice.';

  const visibleWarpSliceCount = useMemo(
    () => slices.filter((slice) => slice.isVisible && (slice.warpEnabled ?? true)).length,
    [slices]
  );

  useEffect(() => {
    if (visibleWarpSliceCount > 0) {
      if (warpMode !== 'adaptive') {
        setTimeScaleMode('adaptive');
      }
      if (warpFactor === 0) {
        setWarpFactor(1);
      }
      return;
    }
    if (warpMode !== 'linear' || warpFactor !== 0) {
      resetWarp();
    }
  }, [resetWarp, setTimeScaleMode, setWarpFactor, visibleWarpSliceCount, warpFactor, warpMode]);

  const handleAddRangeSlice = useCallback(() => {
    const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
    const start = Math.max(timeRange[0], currentTime - stepSize * 2);
    const end = Math.min(timeRange[1], currentTime + stepSize * 2);
    const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
    const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[0], minTimestampSec, maxTimestampSec) * 1000
      : null;
    const endDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[1], minTimestampSec, maxTimestampSec) * 1000
      : null;

    if (startDateTimeMs === null || endDateTimeMs === null) return;
    const binId = addManualDraftRange({ startMs: startDateTimeMs, endMs: endDateTimeMs });
    computeManualDraftBin(binId);
  }, [addManualDraftRange, computeManualDraftBin, currentTime, maxTimestampSec, minTimestampSec, timeRange, timeResolution]);

  const handleMergePendingDraft = useCallback((index: number) => {
    const current = pendingGeneratedBins[index];
    if (!current) {
      return;
    }
    const adjacent = pendingGeneratedBins[index - 1] ?? pendingGeneratedBins[index + 1];
    if (!adjacent) {
      return;
    }
    mergePendingGeneratedBins([adjacent.id, current.id]);
  }, [mergePendingGeneratedBins, pendingGeneratedBins]);

  const handleSplitPendingDraft = useCallback((binId: string) => {
    const target = pendingGeneratedBins.find((bin) => bin.id === binId);
    if (!target) {
      return;
    }
    const splitPoint = Math.round((target.startTime + target.endTime) / 2);
    splitPendingGeneratedBin(binId, splitPoint);
  }, [pendingGeneratedBins, splitPendingGeneratedBin]);

  const handleDeletePendingDraft = useCallback((binId: string) => {
    if (selectedDraftId === binId) {
      setSelectedDraftId(null);
    }
    deletePendingGeneratedBin(binId);
  }, [deletePendingGeneratedBin, selectedDraftId]);

  const handleOpenPendingDraftDetails = useCallback((binId: string) => {
    setSelectedSliceId(null);
    setSelectedDraftId(binId);
  }, [setSelectedDraftId, setSelectedSliceId]);

  const handleOpenSliceDetails = useCallback((sliceId: string) => {
    setSelectedDraftId(null);
    setSelectedSliceId(sliceId);
  }, [setSelectedDraftId, setSelectedSliceId]);

  const handleApplySingleDraft = useCallback((binId: string) => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    const [windowStart, windowEnd] = timeRange;
    const domainStartMs = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const domainEndMs = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;
    const applied = applySingleGeneratedBin(binId, [domainStartMs, domainEndMs]);
    if (applied) {
      toast.success('Slice applied', { description: 'Slice activated from Detect.' });
      const storeSlices = useSliceDomainStore.getState().slices;
      const visibleRange = storeSlices
        .filter((s) => s.isVisible && s.type === 'range')
        .sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0));
      const newIndex = Math.max(0, visibleRange.length - 1);
      useDashboardDemoCoordinationStore.getState().setActiveSliceIndex(newIndex);
    }
  }, [applySingleGeneratedBin, maxTimestampSec, minTimestampSec, timeRange]);

  const handleClearAll = useCallback(() => {
    setSelectedSliceId(null);
    setSelectedDraftId(null);
    clearSlices();
    clearPendingGeneratedBins();
    clearSelectedBurstWindows();
  }, [clearPendingGeneratedBins, clearSelectedBurstWindows, clearSlices]);

  const pendingItems = useMemo(
    () => [...pendingGeneratedBins].sort((a, b) => a.startTime - b.startTime),
    [pendingGeneratedBins],
  );

  const appliedItems = useMemo(
    () => [...slices].sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0)),
    [slices],
  );

  const toNormalizedFromTimestampMs = useCallback(
    (timestampMs: number | null): number | null => {
      if (timestampMs === null || minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
        return null;
      }

      const epochSec = timestampMs / 1000;
      const normalized = ((epochSec - minTimestampSec) / (maxTimestampSec - minTimestampSec)) * 100;
      return Math.min(100, Math.max(0, normalized));
    },
    [maxTimestampSec, minTimestampSec],
  );

  const handleSelectedSliceStartChange = useCallback((value: string) => {
    if (!selectedSlice) return;

    const nextStartMs = parseDateTimeLocalValue(value);
    if (selectedSlice.type === 'point') {
      const nextTime = toNormalizedFromTimestampMs(nextStartMs);
      updateSlice(selectedSlice.id, {
        startDateTimeMs: nextStartMs,
        ...(nextTime !== null ? { time: nextTime } : {}),
      });
      return;
    }

    const currentStartMs = selectedSlice.startDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[0], minTimestampSec, maxTimestampSec) * 1000
      : null);
    const currentEndMs = selectedSlice.endDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[1], minTimestampSec, maxTimestampSec) * 1000
      : null);

    const resolvedStartMs = nextStartMs ?? currentStartMs;
    const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
    const nextEndNorm = toNormalizedFromTimestampMs(currentEndMs);

    if (nextStartNorm !== null && nextEndNorm !== null) {
      const start = Math.min(nextStartNorm, nextEndNorm);
      const end = Math.max(nextStartNorm, nextEndNorm);
      updateSlice(selectedSlice.id, {
        startDateTimeMs: nextStartMs,
        range: [start, end],
        time: (start + end) / 2,
      });
      return;
    }

    updateSlice(selectedSlice.id, { startDateTimeMs: nextStartMs });
  }, [maxTimestampSec, minTimestampSec, selectedSlice, toNormalizedFromTimestampMs, updateSlice]);

  const handleSelectedSliceEndChange = useCallback((value: string) => {
    if (!selectedSlice || selectedSlice.type !== 'range') return;

    const nextEndMs = parseDateTimeLocalValue(value);
    const currentStartMs = selectedSlice.startDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[0], minTimestampSec, maxTimestampSec) * 1000
      : null);
    const nextStartNorm = toNormalizedFromTimestampMs(currentStartMs);
    const nextEndNorm = toNormalizedFromTimestampMs(nextEndMs);

    if (nextStartNorm !== null && nextEndNorm !== null) {
      const start = Math.min(nextStartNorm, nextEndNorm);
      const end = Math.max(nextStartNorm, nextEndNorm);
      updateSlice(selectedSlice.id, {
        endDateTimeMs: nextEndMs,
        range: [start, end],
        time: (start + end) / 2,
      });
      return;
    }

    updateSlice(selectedSlice.id, { endDateTimeMs: nextEndMs });
  }, [maxTimestampSec, minTimestampSec, selectedSlice, toNormalizedFromTimestampMs, updateSlice]);

  const hasItems = pendingItems.length > 0 || appliedItems.length > 0;

  return (
    <Card className="h-full min-h-0 overflow-y-auto border-border/70 bg-card/80 text-card-foreground shadow-sm" aria-busy={isComputing}>
      <CardHeader className="gap-1 px-4 pb-3 pt-4">
        <CardTitle className="text-sm font-semibold">Review & apply slices</CardTitle>
        <CardDescription className="text-xs">
          Pending slices from Detect land here first, then applied slices stay below for review.
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          {lastAppliedAt ? `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}` : 'No applied state yet'}
        </div>
        {isEvaluationLocked ? (
          <div
            className="mt-2 flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300"
            role="note"
            aria-label="setup locked during evaluation"
          >
            <Lock className="size-3.5 text-slate-400" aria-hidden />
            Setup locked during evaluation.
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRangeSlice}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <Plus className="h-3.5 w-3.5" />
              Range
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={!hasItems || isEvaluationLocked}
              aria-disabled={isEvaluationLocked || !hasItems}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-700/60 bg-slate-900/20 px-4 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Adaptive Warp</span>
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
              {warpMode} · {warpMode === 'adaptive' ? `${warpFactor.toFixed(2)}x` : '—'}
            </Badge>
          </div>
          <div className={cn('flex items-center gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}>
            <button
              type="button"
              onClick={() => setTimeScaleMode('linear')}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                warpMode === 'linear'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Linear
            </button>
            <button
              type="button"
              onClick={() => setTimeScaleMode('adaptive')}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                warpMode === 'adaptive'
                  ? 'bg-violet-700 text-violet-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Adaptive
            </button>
          </div>
          {warpMode === 'adaptive' && (
            <div className={cn('mt-2.5 space-y-1.5', isEvaluationLocked && 'pointer-events-none opacity-40')}>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Warp factor</span>
                <span className="font-mono text-slate-300">{warpFactor.toFixed(2)}</span>
              </div>
              <Slider
                value={[warpFactor]}
                onValueChange={([v]) => setWarpFactor(v)}
                min={0}
                max={3}
                step={0.05}
                disabled={isEvaluationLocked}
                aria-disabled={isEvaluationLocked}
                tabIndex={isEvaluationLocked ? -1 : undefined}
                className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-violet-500 [&_[data-slot=slider-thumb]]:size-3.5"
              />
            </div>
          )}
        </div>

        {generationError ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-100">
            {generationError}
          </div>
        ) : null}

        {lastGeneratedMetadata?.warning ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100">
            {lastGeneratedMetadata.warning}
          </div>
        ) : null}

        <div className="space-y-3">
          {!hasItems ? (
            <div className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
              No slices active. Generate slices from Detect, then review and apply them here.
            </div>
          ) : (
            <>
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Pending drafts</div>
                {pendingItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    No pending drafts. Generate slices from Detect to review them here.
                  </div>
                ) : (
                  pendingItems.map((bin, index) => {
                    const isManualDraft = bin.id.startsWith('manual-range-');
                    const burstScore = formatCoefficient(bin.burstinessCoefficient);
                    const label = isManualDraft ? `Manual ${index + 1}` : `Draft ${index + 1}`;

                    return (
                      <div
                        key={bin.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs hover:border-slate-700"
                      >
                        <span className="font-medium text-sky-100">{label}</span>

                        {!isManualDraft && burstScore && (
                          <Badge variant="outline" className="rounded-full border-sky-400/20 bg-sky-500/10 px-2 py-0 text-[10px] text-sky-100">
                            {burstScore}
                          </Badge>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {formatCompactDate(bin.startTime)} → {formatCompactDate(bin.endTime)}
                        </span>

                        <div className={cn('ml-auto flex shrink-0 items-center gap-1', isEvaluationLocked && 'pointer-events-none opacity-40')}>
                          <Button
                            type="button"
                            variant="default"
                            size="xs"
                            onClick={() => handleApplySingleDraft(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 gap-1 bg-emerald-600 text-[10px] text-emerald-50 hover:bg-emerald-500"
                          >
                            <Check className="h-3 w-3" />
                            Apply
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenPendingDraftDetails(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-slate-700 text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleMergePendingDraft(pendingItems.findIndex((b) => b.id === bin.id))}
                            disabled={pendingItems.length <= 1 || isEvaluationLocked}
                            aria-disabled={isEvaluationLocked || pendingItems.length <= 1}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-slate-700 text-[10px] text-slate-400 hover:bg-slate-800"
                          >
                            Merge
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleSplitPendingDraft(bin.id)}
                            disabled={bin.endTime <= bin.startTime || isEvaluationLocked}
                            aria-disabled={isEvaluationLocked || bin.endTime <= bin.startTime}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-slate-700 text-[10px] text-slate-400 hover:bg-slate-800"
                          >
                            Split
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleDeletePendingDraft(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-rose-500/30 text-[10px] text-rose-300 hover:border-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Applied slices</div>
                {appliedItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    Applied slices will appear here after you apply a draft.
                  </div>
                ) : (
                  appliedItems.map((slice) => {
                    const sliceIndex = slices.findIndex((s) => s.id === slice.id);
                    const label = slice.name?.trim() || `Slice ${sliceIndex + 1}`;
                    const warpLabel = (slice.warpEnabled ?? true)
                      ? `Warp ${(slice.warpWeight ?? 1).toFixed(2)}x`
                      : 'Warp disabled';

                    return (
                      <div
                        key={slice.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-xs hover:border-border"
                      >
                        <span className="font-medium text-slate-100">{label}</span>

                        <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-500/10 px-2 py-0 text-[10px] text-emerald-100">
                          {warpLabel}
                        </Badge>

                        <span className="text-[11px] text-slate-400">
                          {formatCompactDate(slice.startDateTimeMs)} → {formatCompactDate(slice.endDateTimeMs)}
                        </span>

                        {slice.isBurst && typeof slice.burstinessCoefficient === 'number' && (
                          <span className="text-[10px] text-slate-500">
                            {formatCoefficient(slice.burstinessCoefficient)}
                          </span>
                        )}

                        <div className={cn('ml-auto flex shrink-0 items-center gap-1', isEvaluationLocked && 'pointer-events-none opacity-40')}>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenSliceDetails(slice.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-slate-700 text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => removeSlice(slice.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-rose-500/30 text-[10px] text-rose-300 hover:border-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>

      <Dialog
        open={selectedSlice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSliceId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Slice details</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedSliceLabel}
            </DialogDescription>
          </DialogHeader>

          {selectedSlice ? (
            <div className="space-y-3 pt-2">
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Boundary editor</div>
                <div className="mt-3 flex gap-2">
                  <label className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
                    <span>{selectedSlice.type === 'range' ? 'Start datetime' : 'Datetime'}</span>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocalValue(selectedSlice.startDateTimeMs ?? null)}
                      onChange={(event) => handleSelectedSliceStartChange(event.target.value)}
                      className="border-slate-700 bg-slate-950 text-slate-100"
                    />
                  </label>

                  {selectedSlice.type === 'range' ? (
                    <label className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
                      <span>End datetime</span>
                      <Input
                        type="datetime-local"
                        value={toDateTimeLocalValue(selectedSlice.endDateTimeMs ?? null)}
                        onChange={(event) => handleSelectedSliceEndChange(event.target.value)}
                        className="border-slate-700 bg-slate-950 text-slate-100"
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Slice summary</div>
                  <div className="mt-2 text-sm text-slate-100">{selectedSlice.name?.trim() || 'Unnamed slice'}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {formatDateTime(selectedSlice.startDateTimeMs)}{selectedSlice.type === 'range' ? ` → ${formatDateTime(selectedSlice.endDateTimeMs)}` : ''}
                  </div>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Burst / warp</div>
                  <div className="mt-2 text-sm text-slate-100">{selectedSlice.burstClass ?? '—'}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Confidence {formatNormalizedScore(selectedSlice.burstConfidence) ?? '—'} · Coefficient {formatCoefficient(selectedSlice.burstinessCoefficient ?? selectedSlice.burstScore) ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Warp {(selectedSlice.warpEnabled ?? true) ? 'enabled' : 'disabled'} · Strength {(selectedSlice.warpWeight ?? 1).toFixed(2)}
                  </div>
                </div>

                {(selectedSlice.burstProvenance || selectedSlice.tieBreakReason || selectedSlice.thresholdSource) ? (
                  <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 sm:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Method notes</div>
                    {selectedSlice.burstProvenance ? (
                      <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap break-words">
                        {selectedSlice.burstProvenance}
                      </div>
                    ) : null}
                    {selectedSlice.tieBreakReason ? (
                      <div className="mt-2 text-xs text-slate-300 whitespace-pre-wrap break-words">
                        {selectedSlice.tieBreakReason}
                      </div>
                    ) : null}
                    {selectedSlice.thresholdSource ? (
                      <div className="mt-2 text-xs text-slate-400 whitespace-pre-wrap break-words">
                        {selectedSlice.thresholdSource}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDraftId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Draft details</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedDraftLabel}
            </DialogDescription>
          </DialogHeader>

          {selectedDraft ? (
            <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Draft / span</div>
                <div className="mt-2 text-sm text-slate-100">{selectedDraft.id}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDateTime(selectedDraft.startTime)} → {formatDateTime(selectedDraft.endTime)}
                </div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Burst class</div>
                <div className="mt-2 text-sm text-slate-100">{selectedDraft.burstClass ?? '—'}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Coefficient {formatCoefficient(selectedDraft.burstinessCoefficient) ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Warp / state</div>
                <div className="mt-2 text-sm text-slate-100">Warp weight {(selectedDraft.warpWeight ?? 1).toFixed(2)}</div>
                <div className="mt-1 text-xs text-slate-400">{selectedDraft.isNeutralPartition ? 'Fallback partition' : 'Expanded partition'}</div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Burst confidence</div>
                <div className="mt-2 text-sm text-slate-100">{formatNormalizedScore(selectedDraft.burstConfidence) ?? '—'}</div>
                <div className="mt-1 text-xs text-slate-400">{selectedDraft.count} events</div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Crime types</div>
                <div className="mt-2 text-sm text-slate-100">
                  {selectedDraft.crimeTypes.includes('all-crime-types') ? 'All crime types' : selectedDraft.crimeTypes.join(', ') || '—'}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {selectedDraft.districts?.length ? selectedDraft.districts.join(', ') : 'No district scope'}
                </div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Provenance / threshold</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-100">
                  {selectedDraft.burstProvenance ?? '—'}
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
                  {selectedDraft.thresholdSource ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 sm:col-span-2 lg:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Tie-break / neighborhood</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-100">
                  {selectedDraft.tieBreakReason ?? '—'}
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
                  {selectedDraft.neighborhoodSummary ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 sm:col-span-2 lg:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Burst score formula</div>
                <div className="mt-2 font-mono text-sm text-slate-100">{selectedDraft.burstinessFormula ?? 'B = (σ - μ) / (σ + μ)'}</div>
                <div className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-400">
                  {selectedDraft.burstinessCalculation ?? '—'}
                </div>
              </div>

              {selectedDraft.burstinessByType?.length ? (
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 sm:col-span-2 lg:col-span-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Type breakdown</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedDraft.burstinessByType.map((item) => (
                      <div key={item.type} className="rounded border border-slate-800 bg-slate-950/70 p-2">
                        <div className="text-sm text-slate-100">{item.type}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Count {item.count} · B {item.coefficient?.toFixed(2) ?? '—'}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-slate-500">
                          {item.calculation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}
