"use client";

import { useCallback, useEffect, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';
import type { TimeSlice } from '@/store/useDashboardDemoSliceStore';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import {
  type TimeslicePreset,
  useDashboardDemoTimeslicingModeStore,
} from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';
import {
  DEMO_PRESET_BIAS_KEYS,
  PRESET_BIAS_HELPERS,
  PRESET_BIAS_RANGE,
  buildPresetBiasSummary,
} from '@/components/dashboard-demo/lib/demo-preset-thresholds';

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

const formatRange = (start: number, end: number) => {
  const startDate = new Date(start).toLocaleString();
  const endDate = new Date(end).toLocaleString();
  return `${startDate} → ${endDate}`;
};

const clampWarpWeight = (value: number) => Math.min(3, Math.max(0, value));
const clampNormalized = (value: number) => Math.min(100, Math.max(0, value));

export function DemoSlicePanel() {
  const { currentTime, timeRange, timeResolution } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const { isComputing } = useDebouncedDensity();

  const slices = useDashboardDemoSliceStore((state) => state.slices);
  const addSlice = useDashboardDemoSliceStore((state) => state.addSlice);
  const removeSlice = useDashboardDemoSliceStore((state) => state.removeSlice);
  const updateSlice = useDashboardDemoSliceStore((state) => state.updateSlice);
  const toggleLock = useDashboardDemoSliceStore((state) => state.toggleLock);
  const toggleVisibility = useDashboardDemoSliceStore((state) => state.toggleVisibility);
  const clearSlices = useDashboardDemoSliceStore((state) => state.clearSlices);

  const mode = useDashboardDemoTimeslicingModeStore((state) => state.mode);
  const preset = useDashboardDemoTimeslicingModeStore((state) => state.preset);
  const setPreset = useDashboardDemoTimeslicingModeStore((state) => state.setPreset);
  const presetBiases = useDashboardDemoTimeslicingModeStore((state) => state.presetBiases);
  const setPresetBias = useDashboardDemoTimeslicingModeStore((state) => state.setPresetBias);
  const resetPresetBias = useDashboardDemoTimeslicingModeStore((state) => state.resetPresetBias);
  const resetAllPresetBiases = useDashboardDemoTimeslicingModeStore((state) => state.resetAllPresetBiases);
  const generationStatus = useDashboardDemoTimeslicingModeStore((state) => state.generationStatus);
  const generationInputs = useDashboardDemoTimeslicingModeStore((state) => state.generationInputs);
  const setGenerationInputs = useDashboardDemoTimeslicingModeStore((state) => state.setGenerationInputs);
  const generateBinsFromActivePresetBias = useDashboardDemoTimeslicingModeStore((state) => state.generateBinsFromActivePresetBias);
  const generationError = useDashboardDemoTimeslicingModeStore((state) => state.generationError);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const lastGeneratedMetadata = useDashboardDemoTimeslicingModeStore((state) => state.lastGeneratedMetadata);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const warpMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const setTimeScaleMode = useDashboardDemoWarpStore((state) => state.setTimeScaleMode);
  const setWarpFactor = useDashboardDemoWarpStore((state) => state.setWarpFactor);
  const resetWarp = useDashboardDemoWarpStore((state) => state.resetWarp);

  const burstDraftSourceLabel = lastGeneratedMetadata?.generationSource === 'burst-windows'
    ? 'Burst-first'
    : lastGeneratedMetadata
      ? 'Preset-bias fallback'
      : 'Draft queue';

  const burstDraftSummary = lastGeneratedMetadata
    ? `${lastGeneratedMetadata.binCount} bin${lastGeneratedMetadata.binCount === 1 ? '' : 's'} • ${lastGeneratedMetadata.eventCount} events • ${burstDraftSourceLabel}`
    : `${pendingGeneratedBins.length} pending draft${pendingGeneratedBins.length === 1 ? '' : 's'} ready for review`;

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

  const activeWindowLabel = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return null;
    }

    const [windowStart, windowEnd] = timeRange;
    const startSec = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec);
    const endSec = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec);

    return {
      start: new Date(startSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      end: new Date(endSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }, [maxTimestampSec, minTimestampSec, timeRange]);

  const sliceStats = useMemo(() => {
    return {
      total: slices.length,
      visible: slices.filter((slice) => slice.isVisible).length,
      locked: slices.filter((slice) => slice.isLocked).length,
      burst: slices.filter((slice) => slice.isBurst).length,
    };
  }, [slices]);

  const formatNormalizedValue = useCallback(
    (value: number) => {
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        const epochSec = normalizedToEpochSeconds(value, minTimestampSec, maxTimestampSec);
        return new Date(epochSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return `${value.toFixed(1)}%`;
    },
    [maxTimestampSec, minTimestampSec]
  );

  const formatSliceLabel = useCallback(
    (slice: TimeSlice, index: number) => {
      const fallback = slice.type === 'point' ? `Slice ${index + 1}` : `Range ${index + 1}`;
      const title = slice.name?.trim() || fallback;

      if (slice.type === 'range' && slice.range) {
        return `${title} • ${formatNormalizedValue(slice.range[0])} → ${formatNormalizedValue(slice.range[1])}`;
      }

      return `${title} • ${formatNormalizedValue(slice.time)}`;
    },
    [formatNormalizedValue]
  );

  const toNormalizedFromTimestampMs = useCallback((timestampMs: number | null) => {
    if (
      timestampMs === null ||
      minTimestampSec === null ||
      maxTimestampSec === null ||
      maxTimestampSec <= minTimestampSec
    ) {
      return null;
    }

    return clampNormalized(epochSecondsToNormalized(timestampMs / 1000, minTimestampSec, maxTimestampSec));
  }, [maxTimestampSec, minTimestampSec]);

  const handleAddPointSlice = useCallback(() => {
    const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(currentTime, minTimestampSec, maxTimestampSec) * 1000
      : null;

    addSlice({
      type: 'point',
      time: currentTime,
      source: 'manual',
      warpEnabled: true,
      warpWeight: 1,
      isLocked: false,
      isVisible: true,
      startDateTimeMs,
    });
  }, [addSlice, currentTime, maxTimestampSec, minTimestampSec]);

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

    addSlice({
      type: 'range',
      time: (normalizedRange[0] + normalizedRange[1]) / 2,
      range: normalizedRange,
      source: 'manual',
      warpEnabled: true,
      warpWeight: 1,
      isLocked: false,
      isVisible: true,
      startDateTimeMs,
      endDateTimeMs,
    });
  }, [addSlice, currentTime, maxTimestampSec, minTimestampSec, timeRange, timeResolution]);

  const handleResetPresetBias = useCallback((targetPreset: TimeslicePreset) => {
    const helper = PRESET_BIAS_HELPERS[targetPreset];
    const shouldReset = window.confirm(`Reset ${helper.label} Bias to ${helper.recommendedBias}%?`);
    if (!shouldReset) {
      return;
    }
    resetPresetBias(targetPreset);
  }, [resetPresetBias]);

  const handleResetAllPresetBiases = useCallback(() => {
    const shouldReset = window.confirm('Reset all preset Bias values to recommended defaults?');
    if (!shouldReset) {
      return;
    }
    resetAllPresetBiases();
  }, [resetAllPresetBiases]);

  const handleGenerateFromPresetBias = useCallback(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return;
    }

    const [windowStart, windowEnd] = timeRange;
    const start = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const end = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;

    setGenerationInputs({
      timeWindow: {
        start,
        end,
      },
    });

    generateBinsFromActivePresetBias();
  }, [generateBinsFromActivePresetBias, maxTimestampSec, minTimestampSec, setGenerationInputs, timeRange]);

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100" aria-busy={isComputing}>
      <header className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-slate-100">Slice Companion</h2>
        <p className="text-[11px] text-slate-400">A secondary review rail for slice edits, locks, and visibility.</p>
        <div className="text-[11px] text-slate-500">
          {lastAppliedAt ? `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}` : 'No applied state yet'}
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Slices {sliceStats.total}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Visible {sliceStats.visible}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Locked {sliceStats.locked}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Burst {sliceStats.burst}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Mode {mode}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Status {generationStatus}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Draft bins {pendingGeneratedBins.length}</span>
        </div>

        {pendingGeneratedBins.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-50">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold uppercase tracking-[0.18em] text-amber-100">{burstDraftSourceLabel}</span>
              <span>{pendingGeneratedBins.length} draft bins before apply</span>
            </div>
            <div className="mt-1 text-amber-100/90">{burstDraftSummary}</div>
          </div>
        ) : null}

        {activeWindowLabel ? (
          <div className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-300">
            <div className="uppercase tracking-[0.24em] text-slate-500">Active window</div>
            <div className="mt-1 font-medium text-slate-100">
              {activeWindowLabel.start} → {activeWindowLabel.end}
            </div>
          </div>
        ) : null}

        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <details open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.2em] text-slate-300">Bin Parameters</span>
              <span className="truncate text-[11px] text-slate-500">{PRESET_BIAS_HELPERS[preset].label} • {buildPresetBiasSummary(presetBiases[preset])}</span>
            </summary>
            <div className="space-y-2 pt-2">
              {DEMO_PRESET_BIAS_KEYS.map((presetKey) => {
                const helper = PRESET_BIAS_HELPERS[presetKey];
                const biasValue = presetBiases[presetKey];
                const isActive = presetKey === preset;

                return (
                  <div
                    key={presetKey}
                    className={`rounded-md border px-3 py-2 ${isActive
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/50'
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreset(presetKey)}
                          className="truncate text-left text-xs font-semibold text-slate-100 underline-offset-2 hover:underline"
                        >
                          {helper.label}
                        </button>
                        {isActive ? (
                          <span className="rounded-full border border-emerald-400/70 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-300">{buildPresetBiasSummary(biasValue)}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{helper.helperText}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">Bias</span>
                      <Slider
                        min={PRESET_BIAS_RANGE.min}
                        max={PRESET_BIAS_RANGE.max}
                        step={PRESET_BIAS_RANGE.step}
                        value={[biasValue]}
                        onValueChange={(value) => setPresetBias(presetKey, value[0] ?? biasValue)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => handleResetPresetBias(preset)}
                className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-900"
              >
                Reset preset
              </button>
              <button
                type="button"
                onClick={handleResetAllPresetBiases}
                className="rounded border border-amber-500/60 bg-amber-500/10 px-2.5 py-1 text-amber-200 transition-colors hover:border-amber-400"
              >
                Reset all
              </button>
            </div>
          </details>

          <details open className="mt-2 border-t border-slate-800 pt-2">
            <summary className="cursor-pointer list-none py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Slice tools</summary>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleGenerateFromPresetBias}
                disabled={generationStatus === 'generating' || minTimestampSec === null || maxTimestampSec === null}
                className="inline-flex items-center gap-2 rounded-md border border-violet-500/50 bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-100 transition-colors hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generationStatus === 'generating' ? 'Generating…' : `Generate (${PRESET_BIAS_HELPERS[preset].label} • ${presetBiases[preset]}%)`}
              </button>
              <button
                type="button"
                onClick={handleAddPointSlice}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Point
              </button>
              <button
                type="button"
                onClick={handleAddRangeSlice}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Range
              </button>
              <button
                type="button"
                onClick={clearSlices}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            {lastGeneratedMetadata ? (
              <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11px] text-slate-300">
                <div>
                  Last generate: {lastGeneratedMetadata.binCount} draft bins from {PRESET_BIAS_HELPERS[lastGeneratedMetadata.preset].label} at {lastGeneratedMetadata.presetBias}% Bias
                </div>
                {generationInputs.timeWindow.start !== null && generationInputs.timeWindow.end !== null ? (
                  <div className="text-slate-500">
                    Window {formatRange(generationInputs.timeWindow.start, generationInputs.timeWindow.end)}
                  </div>
                ) : null}
                <div className="mt-1 text-slate-400">
                  {lastGeneratedMetadata.generationSource === 'burst-windows'
                    ? 'Burst-first drafts stay visible here before apply.'
                    : 'Preset-bias fallback keeps the draft rail populated when no burst windows overlap.'}
                </div>
              </div>
            ) : null}
            {generationError ? (
              <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-100">
                {generationError}
              </div>
            ) : null}
            {lastGeneratedMetadata?.warning ? (
              <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100">
                {lastGeneratedMetadata.warning}
              </div>
            ) : null}
          </details>
        </div>

        <div className="space-y-2">
          {slices.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-sm text-slate-400">
              No slices active. Add a point or range to inspect the demo timeline companion.
            </div>
          ) : (
            slices.map((slice, index) => {
              const fallbackName = slice.type === 'point' ? `Slice ${index + 1}` : `Range ${index + 1}`;

              return (
                <div key={slice.id} className="grid gap-2 rounded-md border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="space-y-2">
                    {slice.isBurst ? (
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1">burst</span>
                      </div>
                    ) : null}

                    <input
                      type="text"
                      value={slice.name ?? ''}
                      onChange={(event) => {
                        const nextName = event.target.value.trim();
                        updateSlice(slice.id, { name: nextName || undefined });
                      }}
                      placeholder={fallbackName}
                      aria-label={`Slice name for ${fallbackName}`}
                      className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100"
                    />

                    <div className="text-xs text-slate-400">{formatSliceLabel(slice, index)}</div>

                    <div className="text-[11px] text-slate-500">
                      {(slice.warpEnabled ?? true)
                        ? `Warp x${clampWarpWeight(slice.warpWeight ?? 1).toFixed(1)}`
                        : 'Warp off'}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updateSlice(slice.id, { warpEnabled: !(slice.warpEnabled ?? true) })}
                        className={`rounded border px-2 py-1 font-medium transition ${(slice.warpEnabled ?? true)
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        title={(slice.warpEnabled ?? true) ? 'Disable warp influence' : 'Enable warp influence'}
                      >
                        {(slice.warpEnabled ?? true) ? 'Warp enabled' : 'Warp disabled'}
                      </button>

                      <label className="inline-flex items-center gap-2 text-slate-400">
                        <span>Warp strength</span>
                        <Input
                          type="number"
                          min={0}
                          max={3}
                          step={0.1}
                          value={(slice.warpWeight ?? 1).toFixed(1)}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (!Number.isFinite(parsed)) {
                              return;
                            }
                            updateSlice(slice.id, { warpWeight: clampWarpWeight(parsed) });
                          }}
                          className="h-7 w-20 border-slate-700 bg-slate-950 text-right text-slate-100"
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-[11px] text-slate-400">
                        <span>{slice.type === 'range' ? 'Start datetime' : 'Datetime'}</span>
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocalValue(slice.startDateTimeMs ?? null)}
                          onChange={(event) => {
                            const nextStartMs = parseDateTimeLocalValue(event.target.value);

                            if (slice.type === 'point') {
                              const nextTime = toNormalizedFromTimestampMs(nextStartMs);
                              updateSlice(slice.id, {
                                startDateTimeMs: nextStartMs,
                                ...(nextTime !== null ? { time: nextTime } : {}),
                              });
                              return;
                            }

                            const currentStartMs = slice.startDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                              ? normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec) * 1000
                              : null);
                            const currentEndMs = slice.endDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                              ? normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec) * 1000
                              : null);

                            const resolvedStartMs = nextStartMs ?? currentStartMs;
                            const resolvedEndMs = currentEndMs;
                            const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
                            const nextEndNorm = toNormalizedFromTimestampMs(resolvedEndMs);

                            if (nextStartNorm !== null && nextEndNorm !== null) {
                              const start = Math.min(nextStartNorm, nextEndNorm);
                              const end = Math.max(nextStartNorm, nextEndNorm);
                              updateSlice(slice.id, {
                                startDateTimeMs: nextStartMs,
                                range: [start, end],
                                time: (start + end) / 2,
                              });
                              return;
                            }

                            updateSlice(slice.id, { startDateTimeMs: nextStartMs });
                          }}
                          className="border-slate-700 bg-slate-950 text-slate-100"
                        />
                      </label>

                      {slice.type === 'range' ? (
                        <label className="space-y-1 text-[11px] text-slate-400">
                          <span>End datetime</span>
                          <Input
                            type="datetime-local"
                            value={toDateTimeLocalValue(slice.endDateTimeMs ?? null)}
                            onChange={(event) => {
                              const nextEndMs = parseDateTimeLocalValue(event.target.value);
                              const currentStartMs = slice.startDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                                ? normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec) * 1000
                                : null);
                              const resolvedStartMs = currentStartMs;
                              const resolvedEndMs = nextEndMs;
                              const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
                              const nextEndNorm = toNormalizedFromTimestampMs(resolvedEndMs);

                              if (nextStartNorm !== null && nextEndNorm !== null) {
                                const start = Math.min(nextStartNorm, nextEndNorm);
                                const end = Math.max(nextStartNorm, nextEndNorm);
                                updateSlice(slice.id, {
                                  endDateTimeMs: nextEndMs,
                                  range: [start, end],
                                  time: (start + end) / 2,
                                });
                                return;
                              }

                              updateSlice(slice.id, { endDateTimeMs: nextEndMs });
                            }}
                            className="border-slate-700 bg-slate-950 text-slate-100"
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleVisibility(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title={slice.isVisible ? 'Hide slice' : 'Show slice'}
                    >
                      {slice.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLock(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title={slice.isLocked ? 'Unlock slice' : 'Lock slice'}
                    >
                      {slice.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlice(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title="Remove slice"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
