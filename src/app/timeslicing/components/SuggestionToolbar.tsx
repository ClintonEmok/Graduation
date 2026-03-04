"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Filter, PanelRightOpen, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSuggestionGenerator, type GenerationParams } from '@/hooks/useSuggestionGenerator';
import { getAllCrimeTypeIds, getCrimeTypeName } from '@/lib/category-maps';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useCrimeFilters, useViewportStore } from '@/lib/stores/viewportStore';
import { BoundaryMethod } from '@/lib/interval-detection';

interface SuggestionToolbarProps {
  className?: string;
}

type AnalysisScopeMode = 'visible' | 'all';

type DebugWarpInterval = {
  id: string;
  startPercent: number;
  endPercent: number;
  strength: number;
};

type DebugBoundary = {
  id: string;
  epochSec: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const DEBUG_PREVIEW_WARP_PROFILE_ID = '__debug-full-auto-preview__';

const percentToEpochSec = (percent: number, domain: [number, number]) => {
  const [start, end] = domain;
  return start + (clamp(percent, 0, 100) / 100) * (end - start);
};

const epochSecToPercent = (epochSec: number, domain: [number, number]) => {
  const [start, end] = domain;
  const span = Math.max(1e-9, end - start);
  return clamp(((epochSec - start) / span) * 100, 0, 100);
};

const toDateTimeLocalInput = (epochSec: number) => {
  const date = new Date(epochSec * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalInput = (value: string) => {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return parsed / 1000;
};

interface AnalyzeVisibleAllToggleProps {
  mode: AnalysisScopeMode;
  onChange: (mode: AnalysisScopeMode) => void;
}

function AnalyzeVisibleAllToggle({ mode, onChange }: AnalyzeVisibleAllToggleProps) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <label
        className="shrink-0 text-slate-400"
        title="Visible analyzes only the current timeline viewport. All analyzes the selected time range."
      >
        Analysis scope:
      </label>
      <div className="inline-flex max-w-full flex-wrap rounded-full border border-slate-700 bg-slate-900/70 p-0.5">
        <button
          type="button"
          onClick={() => onChange('visible')}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'visible' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700/70'
          }`}
          title="Analyze only crimes in the currently visible timeline range"
        >
          Analyze Visible
        </button>
        <button
          type="button"
          onClick={() => onChange('all')}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'all' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700/70'
          }`}
          title="Analyze all crimes in the selected time range"
        >
          Analyze All
        </button>
      </div>
    </div>
  );
}

export function SuggestionToolbar({ className }: SuggestionToolbarProps) {
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);
  const [crimeTypeQuery, setCrimeTypeQuery] = useState('');
  const [debugWarpName, setDebugWarpName] = useState('Debug Warp');
  const [debugWarpIntervals, setDebugWarpIntervals] = useState<DebugWarpInterval[]>(() => {
    const base = [
      { startPercent: 0, endPercent: 25, strength: 0.6 },
      { startPercent: 25, endPercent: 60, strength: 0.9 },
      { startPercent: 60, endPercent: 100, strength: 0.5 },
    ];
    return base.map((entry, index) => ({
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `debug-warp-${Date.now()}-${index}`,
      ...entry,
    }));
  });
  const [debugIntervalBoundaries, setDebugIntervalBoundaries] = useState<DebugBoundary[]>([]);
  const [debugConfidence, setDebugConfidence] = useState(80);
  const [debugRank, setDebugRank] = useState(1);
  const [debugRecommended, setDebugRecommended] = useState(true);
  const [debugTimelinePreview, setDebugTimelinePreview] = useState(true);
  const isDev = process.env.NODE_ENV !== 'production';
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  const clearDebugPreviewSlices = useCallback(() => {
    const { slices, removeSlice } = useWarpSliceStore.getState();
    const previewSliceIds = slices
      .filter((slice) => slice.warpProfileId === DEBUG_PREVIEW_WARP_PROFILE_ID)
      .map((slice) => slice.id);
    previewSliceIds.forEach((id) => removeSlice(id));
  }, []);

  const {
    trigger,
    suggestionCount,
    pendingCount,
    isGenerating,
    generationError,
    lastSampleUpdateAt,
    autoRunStatus,
    lastRunSource,
  } = useSuggestionGenerator();
  const {
    suggestions,
    clearSuggestions,
    setPanelOpen,
    isPanelOpen,
    minConfidence,
    setMinConfidence,
    setGenerationError,
    warpCount,
    intervalCount,
    setWarpCount,
    setIntervalCount,
    snapToUnit,
    boundaryMethod,
    setSnapToUnit,
    setBoundaryMethod,
    presets,
    activePresetId,
    contextMode,
    savePreset,
    loadPreset,
    setActivePreset,
    setContextMode,
    loadPresetsFromStorage,
    fullAutoProposalSets,
    selectedFullAutoSetId,
    fullAutoNoResultReason,
    fullAutoLowConfidenceReason,
    hasFullAutoLowConfidence,
    setFullAutoProposalResults,
  } = useSuggestionStore();

  const crimeFilters = useCrimeFilters();
  const setCrimeTypes = useViewportStore((state) => state.setCrimeTypes);

  useEffect(() => {
    loadPresetsFromStorage();
  }, [loadPresetsFromStorage]);

  useEffect(() => {
    if (!isDev) return;

    clearDebugPreviewSlices();
    if (!debugTimelinePreview) {
      const { activeWarpId, clearActiveWarp } = useWarpSliceStore.getState();
      if (activeWarpId === DEBUG_PREVIEW_WARP_PROFILE_ID) {
        clearActiveWarp();
      }
      return;
    }

    const previewIntervals = debugWarpIntervals
      .map((interval, index) => ({
        label: `Debug Preview ${index + 1}`,
        range: [clamp(interval.startPercent, 0, 100), clamp(interval.endPercent, 0, 100)] as [number, number],
        weight: clamp(interval.strength, 0, 3),
      }))
      .filter((interval) => interval.range[1] > interval.range[0]);

    const { addSlice, setActiveWarp, activeWarpId, clearActiveWarp } = useWarpSliceStore.getState();
    previewIntervals.forEach((interval) => {
      addSlice({
        label: interval.label,
        range: interval.range,
        weight: interval.weight,
        enabled: true,
        source: 'suggestion',
        warpProfileId: DEBUG_PREVIEW_WARP_PROFILE_ID,
      });
    });

    if (previewIntervals.length > 0) {
      setActiveWarp(DEBUG_PREVIEW_WARP_PROFILE_ID);
      useTimeStore.getState().setTimeScaleMode('adaptive');
      useAdaptiveStore.getState().setWarpFactor(1);
    } else if (activeWarpId === DEBUG_PREVIEW_WARP_PROFILE_ID) {
      clearActiveWarp();
    }
  }, [clearDebugPreviewSlices, debugTimelinePreview, debugWarpIntervals, isDev]);

  useEffect(() => {
    return () => {
      clearDebugPreviewSlices();
    };
  }, [clearDebugPreviewSlices]);

  const visibleCount = useMemo(() => {
    return suggestions.filter((suggestion) => suggestion.confidence >= minConfidence).length;
  }, [minConfidence, suggestions]);

  const sampleUpdateLabel = useMemo(() => {
    if (!lastSampleUpdateAt) {
      return null;
    }

    return `Last refresh ${new Date(lastSampleUpdateAt).toLocaleTimeString()}`;
  }, [lastSampleUpdateAt]);

  const handleGenerate = () => {
    setGenerationError(null);
    const params = {
      warpCount,
      intervalCount,
      snapToUnit,
      boundaryMethod,
      contextMode,
      fullAuto: true,
    } satisfies GenerationParams;
    trigger(params);
  };

  const addDebugWarpInterval = () => {
    setDebugWarpIntervals((prev) => {
      const index = prev.length;
      return [
        ...prev,
        {
          id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `debug-warp-${Date.now()}-${index}`,
          startPercent: clamp(12 + index * 8, 0, 92),
          endPercent: clamp(20 + index * 8, 1, 100),
          strength: 1,
        },
      ];
    });
  };

  const updateDebugWarpInterval = (id: string, updates: Partial<Omit<DebugWarpInterval, 'id'>>) => {
    setDebugWarpIntervals((prev) =>
      prev.map((interval) => {
        if (interval.id !== id) return interval;
        const nextStart = updates.startPercent ?? interval.startPercent;
        const nextEnd = updates.endPercent ?? interval.endPercent;
        return {
          ...interval,
          startPercent: clamp(nextStart, 0, 100),
          endPercent: clamp(nextEnd, 0, 100),
          strength: clamp(updates.strength ?? interval.strength, 0, 3),
        };
      })
    );
  };

  const removeDebugWarpInterval = (id: string) => {
    setDebugWarpIntervals((prev) => prev.filter((interval) => interval.id !== id));
  };

  const addDebugBoundary = () => {
    setDebugIntervalBoundaries((prev) => {
      const base = mapDomain?.[0] ?? 0;
      const nextEpoch = Number.isFinite(base) ? base : 0;
      return [
        ...prev,
        {
          id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `debug-boundary-${Date.now()}-${prev.length}`,
          epochSec: nextEpoch,
        },
      ];
    });
  };

  const updateDebugBoundary = (id: string, epochSec: number) => {
    setDebugIntervalBoundaries((prev) =>
      prev.map((boundary) => (boundary.id === id ? { ...boundary, epochSec } : boundary))
    );
  };

  const removeDebugBoundary = (id: string) => {
    setDebugIntervalBoundaries((prev) => prev.filter((boundary) => boundary.id !== id));
  };

  const handleApplyDebugPackage = () => {
    setGenerationError(null);
    const warpIntervals = debugWarpIntervals
      .map((interval) => ({
        startPercent: clamp(interval.startPercent, 0, 100),
        endPercent: clamp(interval.endPercent, 0, 100),
        strength: clamp(interval.strength, 0, 3),
      }))
      .filter((interval) => interval.endPercent > interval.startPercent);
    if (warpIntervals.length === 0) {
      setGenerationError('Debug package: add at least one warp interval with valid start/end.');
      return;
    }

    const boundaries = debugIntervalBoundaries
      .map((boundary) => boundary.epochSec)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const clampedConfidence = Math.max(0, Math.min(100, debugConfidence));
    const score = {
      coverage: Math.min(100, clampedConfidence + 5),
      relevance: clampedConfidence,
      overlap: Math.max(0, clampedConfidence - 5),
      continuity: Math.min(100, clampedConfidence + 2),
      total: clampedConfidence,
    };
    const id = `debug-package-${Date.now()}`;

    setFullAutoProposalResults({
      generatedAt: Date.now(),
      recommendedId: debugRecommended ? id : null,
      sets: [
        {
          id,
          rank: Math.max(1, debugRank),
          isRecommended: debugRecommended,
          confidence: clampedConfidence,
          score,
          warp: {
            name: debugWarpName.trim() || 'Debug Warp',
            emphasis: 'balanced',
            confidence: clampedConfidence,
            intervals: warpIntervals,
          },
          intervals: boundaries.length >= 2
            ? {
                boundaries,
                method: 'rule-based',
                confidence: clampedConfidence,
              }
            : undefined,
        },
      ],
    });

    useTimeStore.getState().setTimeScaleMode('adaptive');
    useAdaptiveStore.getState().setWarpFactor(1);
  };

  const handleClearDebugPackage = () => {
    setFullAutoProposalResults(null);
  };

  const handleAcceptSelectedPackage = () => {
    window.dispatchEvent(new CustomEvent('accept-full-auto-package', {
      detail: {
        proposalSetId: selectedFullAutoSetId ?? undefined,
      },
    }));
  };

  const handleSavePreset = () => {
    const name = window.prompt('Preset name', 'My preset');
    if (!name) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    savePreset(trimmed);
  };

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      setActivePreset(null);
      return;
    }

    const preset = presets.find((item) => item.id === value);
    if (preset) {
      loadPreset(preset);
    }
  };

  const activePresetName =
    activePresetId === null
      ? 'Custom'
      : presets.find((preset) => preset.id === activePresetId)?.name ?? 'Custom';

  const crimeTypeOptions = useMemo(() => {
    const names = getAllCrimeTypeIds()
      .map((id) => getCrimeTypeName(id))
      .filter((name) => name && name !== 'Unknown');
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredCrimeTypeOptions = useMemo(() => {
    const query = crimeTypeQuery.trim().toLowerCase();
    if (!query) return crimeTypeOptions;
    return crimeTypeOptions.filter((name) => name.toLowerCase().includes(query));
  }, [crimeTypeOptions, crimeTypeQuery]);

  const selectedCrimeTypeLabel = useMemo(() => {
    if (crimeFilters.crimeTypes.length === 0) return 'All types';
    if (crimeFilters.crimeTypes.length === 1) return crimeFilters.crimeTypes[0];
    return `${crimeFilters.crimeTypes.length} selected`;
  }, [crimeFilters.crimeTypes]);

  const toggleCrimeType = (name: string) => {
    if (crimeFilters.crimeTypes.length === 0) {
      setCrimeTypes([name]);
      return;
    }
    if (crimeFilters.crimeTypes.includes(name)) {
      const next = crimeFilters.crimeTypes.filter((type) => type !== name);
      setCrimeTypes(next);
      return;
    }
    setCrimeTypes([...crimeFilters.crimeTypes, name]);
  };

  const handleSelectAllCrimeTypes = () => {
    setCrimeTypes([]);
  };

  const selectedPackage = useMemo(
    () => fullAutoProposalSets.find((proposal) => proposal.id === selectedFullAutoSetId) ?? null,
    [fullAutoProposalSets, selectedFullAutoSetId]
  );

  const noResultActive = Boolean(fullAutoNoResultReason);
  const canAcceptPackage = Boolean(selectedPackage) && !noResultActive && !isGenerating;

  const fullAutoStatusText = useMemo(() => {
    if (isGenerating && autoRunStatus === 'running') {
      return 'Auto-refreshing package suggestions...';
    }
    if (isGenerating) {
      return 'Generating package suggestions...';
    }
    if (autoRunStatus === 'error') {
      return 'Auto-run failed. Use manual rerun to refresh suggestions.';
    }
    if (noResultActive) {
      return 'No package available. Adjust context or filters, then rerun.';
    }
    if (hasFullAutoLowConfidence) {
      return fullAutoLowConfidenceReason ?? 'Low-confidence package set. Review before accepting.';
    }
    if (lastRunSource === 'manual') {
      return 'Showing latest manual rerun results.';
    }
    if (lastRunSource === 'auto') {
      return 'Auto-generated package set is up to date.';
    }
    return 'Auto-run will generate package suggestions from current context.';
  }, [
    autoRunStatus,
    fullAutoLowConfidenceReason,
    hasFullAutoLowConfidence,
    isGenerating,
    lastRunSource,
    noResultActive,
  ]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {generationError && (
        <div className="flex items-center justify-between rounded-md border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-300" />
            <span>{generationError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerate} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {suggestionCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-300">{suggestionCount} total</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                {pendingCount} pending
              </span>
            )}
            <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-200">
              Showing {visibleCount} of {suggestionCount}
            </span>
            {sampleUpdateLabel && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                {sampleUpdateLabel}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfidenceFilter(!showConfidenceFilter)}
          className={`gap-1.5 ${showConfidenceFilter ? 'text-violet-400' : 'text-slate-400'}`}
        >
          <Filter className="size-4" />
          Filter
        </Button>

        {suggestionCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSuggestions}
            className="gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="size-4" />
            Clear All
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => setPanelOpen(!isPanelOpen)} className="gap-1.5">
          <PanelRightOpen className="size-4" />
          {isPanelOpen ? 'Hide Panel' : 'Show Panel'}
        </Button>
      </div>

      <div className={`rounded-md border px-3 py-2 text-xs ${noResultActive ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-slate-700/70 bg-slate-900/60 text-slate-300'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{fullAutoStatusText}</span>
          {selectedPackage && (
            <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
              Selected package: Rank #{selectedPackage.rank}
            </span>
          )}
        </div>
        {noResultActive && fullAutoNoResultReason && (
          <p className="mt-1 text-[11px] text-amber-200/90">{fullAutoNoResultReason}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1.5 whitespace-nowrap"
            title="Manually rerun full-auto package generation"
          >
            <Sparkles className="size-4" />
            {isGenerating ? 'Running...' : 'Rerun Full-Auto'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAcceptSelectedPackage}
            disabled={!canAcceptPackage}
            className="whitespace-nowrap"
            title={noResultActive ? 'Acceptance is blocked until results are available' : 'Apply selected full-auto package'}
          >
            Accept Selected Package
          </Button>
        </div>
      </div>

      {isDev && (
        <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-100">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-amber-300">
            <span>Debug full-auto package</span>
            <span>dev only</span>
          </div>
          <div className="mt-2 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] text-amber-200">Warp name</label>
                <Input
                  value={debugWarpName}
                  onChange={(event) => setDebugWarpName(event.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-amber-200">Confidence</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={debugConfidence}
                  onChange={(event) => setDebugConfidence(Number(event.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-amber-200">Rank</label>
                <Input
                  type="number"
                  min={1}
                  max={3}
                  value={debugRank}
                  onChange={(event) => setDebugRank(Number(event.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-amber-200">Recommended</label>
                <div className="flex h-7 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={debugRecommended}
                    onChange={(event) => setDebugRecommended(event.target.checked)}
                  />
                  <span className="text-[11px] text-amber-200">Mark as recommended</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-amber-200">Timeline preview</label>
                <div className="flex h-7 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={debugTimelinePreview}
                    onChange={(event) => setDebugTimelinePreview(event.target.checked)}
                  />
                  <span className="text-[11px] text-amber-200">Highlight warp intervals on timeline</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 rounded border border-amber-500/30 bg-amber-950/20 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-200">Warp intervals</span>
                <button
                  type="button"
                  onClick={addDebugWarpInterval}
                  className="inline-flex items-center gap-1 rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add interval</span>
                </button>
              </div>
              {debugWarpIntervals.length === 0 ? (
                <p className="rounded border border-dashed border-amber-500/30 px-2 py-2 text-[11px] text-amber-200/80">
                  No warp intervals yet. Add one to define the package warp.
                </p>
              ) : (
                <div className="space-y-2">
                  {debugWarpIntervals.map((interval) => (
                    <div key={interval.id} className="space-y-2 rounded border border-amber-500/30 bg-amber-950/30 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-amber-500/30 bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                          Interval
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDebugWarpInterval(interval.id)}
                          className="inline-flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-100 transition hover:border-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <label className="flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-950/40 px-2 py-1">
                          <span className="text-[11px] text-amber-200">Start</span>
                          <input
                            type="datetime-local"
                            step={60}
                            value={toDateTimeLocalInput(percentToEpochSec(interval.startPercent, mapDomain))}
                            onChange={(event) => {
                              const nextEpoch = parseDateTimeLocalInput(event.target.value);
                              if (nextEpoch === null) return;
                              const nextStart = epochSecToPercent(nextEpoch, mapDomain);
                              updateDebugWarpInterval(interval.id, { startPercent: nextStart });
                            }}
                            className="w-44 rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-right text-[11px] text-amber-100"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-950/40 px-2 py-1">
                          <span className="text-[11px] text-amber-200">End</span>
                          <input
                            type="datetime-local"
                            step={60}
                            value={toDateTimeLocalInput(percentToEpochSec(interval.endPercent, mapDomain))}
                            onChange={(event) => {
                              const nextEpoch = parseDateTimeLocalInput(event.target.value);
                              if (nextEpoch === null) return;
                              const nextEnd = epochSecToPercent(nextEpoch, mapDomain);
                              updateDebugWarpInterval(interval.id, { endPercent: nextEnd });
                            }}
                            className="w-44 rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-right text-[11px] text-amber-100"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-950/40 px-2 py-1">
                          <span className="text-[11px] text-amber-200">Strength</span>
                          <input
                            type="number"
                            min={0}
                            max={3}
                            step={0.1}
                            value={interval.strength.toFixed(1)}
                            onChange={(event) =>
                              updateDebugWarpInterval(interval.id, { strength: Number(event.target.value) })
                            }
                            className="w-20 rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-right text-[11px] text-amber-100"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 rounded border border-amber-500/30 bg-amber-950/20 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-200">Interval boundaries</span>
                <button
                  type="button"
                  onClick={addDebugBoundary}
                  className="inline-flex items-center gap-1 rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add boundary</span>
                </button>
              </div>
              {debugIntervalBoundaries.length === 0 ? (
                <p className="rounded border border-dashed border-amber-500/30 px-2 py-2 text-[11px] text-amber-200/80">
                  Optional. Add two or more boundaries to create time slices.
                </p>
              ) : (
                <div className="space-y-2">
                  {debugIntervalBoundaries.map((boundary, index) => (
                    <div key={boundary.id} className="flex flex-wrap items-center gap-2 rounded border border-amber-500/30 bg-amber-950/30 p-2">
                      <span className="text-[11px] text-amber-200">#{index + 1}</span>
                      <input
                        type="datetime-local"
                        step={60}
                        value={toDateTimeLocalInput(boundary.epochSec)}
                        onChange={(event) => {
                          const nextEpoch = parseDateTimeLocalInput(event.target.value);
                          if (nextEpoch === null) return;
                          updateDebugBoundary(boundary.id, nextEpoch);
                        }}
                        className="w-44 rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 text-right text-[11px] text-amber-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeDebugBoundary(boundary.id)}
                        className="inline-flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-100 transition hover:border-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleApplyDebugPackage}>
                Apply Debug Package
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearDebugPackage}>
                Clear Debug Package
              </Button>
              <span className="text-[11px] text-amber-300/80">Boundaries are sorted on apply. Two+ required to create slices.</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-slate-400" title="Save and reuse generation settings">
            Preset:
          </label>
          <select
            value={activePresetId ?? 'custom'}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
            title="Choose a saved generation preset"
          >
            <option value="custom">Custom</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSavePreset}
            className="h-7 px-2 text-xs text-slate-300"
            title="Save current toolbar settings as a preset"
          >
            Save Preset
          </Button>
          <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[11px] font-medium text-slate-200">
            {activePresetName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="text-slate-400"
            title="Number of time scale profiles to generate (affects time scaling)"
          >
            Time Scales:
          </label>
          <input
            type="range"
            min="0"
            max="6"
            value={warpCount}
            onChange={(e) => setWarpCount(parseInt(e.target.value, 10))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-slate-700"
            title="Number of time scale profiles to generate (affects time scaling)"
          />
          <span className="w-4 text-slate-300">{warpCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400" title="Filter suggestions by crime type">
            Crime types:
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <Filter className="size-3.5" />
                {selectedCrimeTypeLabel}
                <ChevronDown className="size-3.5 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Select crime types</span>
                <button
                  type="button"
                  onClick={handleSelectAllCrimeTypes}
                  className="text-slate-400 hover:text-slate-200"
                >
                  All types
                </button>
              </div>
              <div className="mt-2">
                <Input
                  value={crimeTypeQuery}
                  onChange={(event) => setCrimeTypeQuery(event.target.value)}
                  placeholder="Search crime types"
                  className="h-8 text-xs"
                />
              </div>
              <ScrollArea className="mt-2 h-48 pr-2">
                <div className="space-y-1">
                  {filteredCrimeTypeOptions.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-slate-400">No matching crime types.</div>
                  ) : (
                    filteredCrimeTypeOptions.map((name) => {
                      const isSelected =
                        crimeFilters.crimeTypes.length === 0
                          ? false
                          : crimeFilters.crimeTypes.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleCrimeType(name)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-slate-200 hover:bg-slate-800"
                        >
                          <span>{name}</span>
                          {isSelected ? <Check className="size-3.5 text-emerald-400" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <div className="mt-2 text-[11px] text-slate-400">
                {crimeFilters.crimeTypes.length === 0
                  ? 'All crime types included.'
                  : `${crimeFilters.crimeTypes.length} selected.`}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400" title="Number of boundary sets to generate">
            Intervals:
          </label>
          <input
            type="range"
            min="0"
            max="6"
            value={intervalCount}
            onChange={(e) => setIntervalCount(parseInt(e.target.value, 10))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-slate-700"
            title="Number of boundary sets to generate"
          />
          <span className="w-4 text-slate-300">{intervalCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400" title="Round boundaries to hour/day boundaries">
            Snapping:
          </label>
          <div className="flex overflow-hidden rounded-md border border-slate-700">
            {(['none', 'hour', 'day'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSnapToUnit(option)}
                title="Round boundaries to hour/day boundaries"
                className={`px-2 py-1 text-xs transition-colors ${
                  snapToUnit === option
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {option === 'none' ? 'Exact' : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <AnalyzeVisibleAllToggle mode={contextMode} onChange={setContextMode} />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400" title="Algorithm used to detect boundaries">
            Method:
          </label>
          <select
            value={boundaryMethod}
            onChange={(e) => setBoundaryMethod(e.target.value as BoundaryMethod)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
            title="Algorithm used to detect boundaries"
          >
            <option value="peak">Peak</option>
            <option value="change-point">Change Point</option>
            <option value="rule-based">Rule-based</option>
          </select>
        </div>
      </div>

      {showConfidenceFilter && (
        <div className="flex items-center gap-4 border-t border-slate-700/50 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Min Confidence:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseInt(e.target.value, 10))}
              className="h-1 w-24 cursor-pointer appearance-none rounded-lg bg-slate-700"
            />
            <span className="w-8 text-violet-400">{minConfidence}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Quick:</span>
            <button
              onClick={() => setMinConfidence(0)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                minConfidence === 0
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Show all
            </button>
            <button
              onClick={() => setMinConfidence(70)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                minConfidence === 70
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              High confidence (70+)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
