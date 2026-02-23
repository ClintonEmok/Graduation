"use client";

import { Magnet, Merge, Scissors, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';
import { useSliceSelectionStore } from '@/store/useSliceSelectionStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';

const SNAP_PRESETS = [
  { label: '1m', valueSec: 60 },
  { label: '5m', valueSec: 5 * 60 },
  { label: '15m', valueSec: 15 * 60 },
  { label: '1h', valueSec: 60 * 60 },
  { label: '1d', valueSec: 24 * 60 * 60 },
] as const;

const DEFAULT_FIXED_PRESET_SEC = 5 * 60;

export const BURST_CHIP_CLASSNAME =
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-slate-600/60 bg-slate-800/65 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300';

export const BURST_CHIP_ICON_CLASSNAME = 'h-2.5 w-2.5 text-slate-400';

export function SliceToolbar() {
  const isCreating = useSliceCreationStore((state) => state.isCreating);
  const startCreation = useSliceCreationStore((state) => state.startCreation);
  const cancelCreation = useSliceCreationStore((state) => state.cancelCreation);
  const snapEnabled = useSliceCreationStore((state) => state.snapEnabled);
  const setSnapEnabled = useSliceCreationStore((state) => state.setSnapEnabled);
  const adjustmentSnapEnabled = useSliceAdjustmentStore((state) => state.snapEnabled);
  const adjustmentSnapMode = useSliceAdjustmentStore((state) => state.snapMode);
  const fixedSnapPresetSec = useSliceAdjustmentStore((state) => state.fixedSnapPresetSec);
  const setAdjustmentSnap = useSliceAdjustmentStore((state) => state.setSnap);
  const slices = useSliceStore((state) => state.slices);
  const clearSlices = useSliceStore((state) => state.clearSlices);
  const removeSlice = useSliceStore((state) => state.removeSlice);
  const mergeSlices = useSliceStore((state) => state.mergeSlices);
  const selectedIds = useSliceSelectionStore((state) => state.selectedIds);
  const selectedCount = useSliceSelectionStore((state) => state.selectedCount);
  const clearSelection = useSliceSelectionStore((state) => state.clearSelection);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const setTimeScaleMode = useTimeStore((state) => state.setTimeScaleMode);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const setWarpSource = useAdaptiveStore((state) => state.setWarpSource);

  const handleToggle = () => {
    if (isCreating) {
      cancelCreation();
      return;
    }

    startCreation('click');
  };

  const handleAdjustmentSnapToggle = () => {
    setAdjustmentSnap({
      snapEnabled: !adjustmentSnapEnabled,
      fixedSnapPresetSec:
        !adjustmentSnapEnabled && adjustmentSnapMode === 'fixed' && !fixedSnapPresetSec
          ? DEFAULT_FIXED_PRESET_SEC
          : fixedSnapPresetSec,
    });
  };

  const handleModeChange = (mode: 'adaptive' | 'fixed') => {
    setAdjustmentSnap({
      snapMode: mode,
      fixedSnapPresetSec:
        mode === 'fixed' && !fixedSnapPresetSec ? DEFAULT_FIXED_PRESET_SEC : fixedSnapPresetSec,
    });
  };

  const handleTimeScaleModeChange = (mode: 'linear' | 'adaptive') => {
    setTimeScaleMode(mode);
    if (mode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 p-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isCreating}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
          isCreating
            ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:border-amber-400/70 hover:bg-amber-500/25'
            : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
        }`}
      >
        <Scissors className="h-4 w-4" />
        <span>{isCreating ? 'Cancel' : 'Create Slice'}</span>
      </button>

      {isCreating ? (
        <div className="inline-flex flex-wrap items-center gap-2 text-xs text-amber-200">
          <span className="rounded-full border border-amber-500/50 bg-amber-500/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-300">
            Active
          </span>
          <span className="text-amber-100/90">Click or drag on timeline</span>
          <button
            type="button"
            onClick={() => setSnapEnabled(!snapEnabled)}
            aria-pressed={snapEnabled}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-all ${
              snapEnabled
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-100 hover:border-amber-400'
                : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
            }`}
          >
            <Magnet className="h-3.5 w-3.5" />
            <span>Snap to time</span>
          </button>
        </div>
      ) : null}

      <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-1">
        <button
          type="button"
          onClick={handleAdjustmentSnapToggle}
          aria-pressed={adjustmentSnapEnabled}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-all ${
            adjustmentSnapEnabled
              ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:border-cyan-400'
              : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Magnet className="h-3.5 w-3.5" />
          <span>Boundary snap</span>
        </button>

        <div className="inline-flex rounded-md border border-slate-700/80 bg-slate-900/70 p-0.5">
          {(['adaptive', 'fixed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeChange(mode)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition ${
                adjustmentSnapMode === mode
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {adjustmentSnapMode === 'fixed' ? (
          <div className="inline-flex items-center gap-1">
            {SNAP_PRESETS.map((preset) => (
              <button
                key={preset.valueSec}
                type="button"
                onClick={() =>
                  setAdjustmentSnap({
                    snapMode: 'fixed',
                    fixedSnapPresetSec: preset.valueSec,
                  })
                }
                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium transition ${
                  fixedSnapPresetSec === preset.valueSec
                    ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-100'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Time scale</span>

        <div className="inline-flex rounded-md border border-slate-700/80 bg-slate-900/70 p-0.5">
          {([
            { key: 'linear', label: 'Linear' },
            { key: 'adaptive', label: 'Adaptive' },
          ] as const).map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => handleTimeScaleModeChange(mode.key)}
              aria-pressed={timeScaleMode === mode.key}
              className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition ${
                timeScaleMode === mode.key
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            timeScaleMode === 'adaptive'
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              : 'border-slate-600 bg-slate-800 text-slate-300'
          }`}
        >
          {timeScaleMode === 'adaptive' ? 'Adaptive' : 'Linear'}
        </span>

        <div className="inline-flex items-center gap-2 pl-1">
          {timeScaleMode === 'adaptive' ? (
            <div className="inline-flex rounded-md border border-slate-700/80 bg-slate-900/70 p-0.5">
              {([
                { key: 'density', label: 'Density' },
                { key: 'slice-authored', label: 'User Slices' },
              ] as const).map((source) => (
                <button
                  key={source.key}
                  type="button"
                  onClick={() => setWarpSource(source.key)}
                  aria-pressed={warpSource === source.key}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition ${
                    warpSource === source.key
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>
          ) : null}

          <span className="text-[11px] text-slate-400">Warp</span>
          <div className="w-28">
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[warpFactor]}
              onValueChange={(vals) => setWarpFactor(vals[0] ?? warpFactor)}
              disabled={timeScaleMode === 'linear'}
              className="w-full"
            />
          </div>
          <span className="w-12 text-right font-mono text-[11px] text-slate-300">
            {Math.round(warpFactor * 100)}%
          </span>
          {timeScaleMode === 'adaptive' ? (
            <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              {warpSource === 'slice-authored' ? 'User-authored' : 'Density-driven'}
            </span>
          ) : null}
        </div>
      </div>

      {slices.length > 0 ? (
        <>
          <span className="text-xs text-slate-300">
            {slices.length} slice{slices.length === 1 ? '' : 's'}
          </span>
          {selectedCount > 0 ? (
            <span className="text-xs text-blue-300">{selectedCount} selected</span>
          ) : null}
          {selectedCount >= 1 ? (
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => removeSlice(id));
                clearSelection();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200 transition-all hover:border-red-400/70 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedCount})</span>
            </button>
          ) : null}
          {selectedCount >= 2 ? (
            <button
              type="button"
              onClick={() => {
                const mergedId = mergeSlices(Array.from(selectedIds));
                if (mergedId) {
                  clearSelection();
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-blue-500/50 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-200 transition-all hover:border-blue-400/70 hover:bg-blue-500/20"
            >
              <Merge className="h-3.5 w-3.5" />
              <span>Merge Selected</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              clearSlices();
              clearSelection();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
            title="Clear all slices"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear all</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
