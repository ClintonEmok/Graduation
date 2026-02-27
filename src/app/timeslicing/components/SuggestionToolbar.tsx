"use client";

import React, { useMemo, useState } from 'react';
import { AlertCircle, Filter, PanelRightOpen, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuggestionGenerator, type GenerationParams } from '@/hooks/useSuggestionGenerator';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { BoundaryMethod } from '@/lib/interval-detection';

interface SuggestionToolbarProps {
  className?: string;
}

export function SuggestionToolbar({ className }: SuggestionToolbarProps) {
  const [snapToUnit, setSnapToUnit] = useState<'hour' | 'day' | 'none'>('none');
  const [boundaryMethod, setBoundaryMethod] = useState<BoundaryMethod>('peak');
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);

  const {
    trigger,
    suggestionCount,
    pendingCount,
    isGenerating,
    generationError,
    clearGenerationError,
  } = useSuggestionGenerator();
  const {
    suggestions,
    clearSuggestions,
    setPanelOpen,
    isPanelOpen,
    minConfidence,
    setMinConfidence,
    warpCount,
    intervalCount,
    setWarpCount,
    setIntervalCount,
  } = useSuggestionStore();

  const visibleCount = useMemo(() => {
    return suggestions.filter((suggestion) => suggestion.confidence >= minConfidence).length;
  }, [minConfidence, suggestions]);

  const handleGenerate = () => {
    clearGenerationError();
    const params: GenerationParams = {
      warpCount,
      intervalCount,
      snapToUnit,
      boundaryMethod,
    };
    trigger(params);
  };

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
        <Button
          variant="default"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-1.5"
          title="Create new warp profile and interval boundary suggestions based on current data"
        >
          <Sparkles className="size-4" />
          {isGenerating ? 'Generating...' : 'Generate Suggestions'}
        </Button>

        {suggestionCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">{suggestionCount} total</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                {pendingCount} pending
              </span>
            )}
            <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-200">
              Showing {visibleCount} of {suggestionCount}
            </span>
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

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <label
            className="text-slate-400"
            title="Number of warp profiles to generate (affects time scaling)"
          >
            Warps:
          </label>
          <input
            type="range"
            min="0"
            max="6"
            value={warpCount}
            onChange={(e) => setWarpCount(parseInt(e.target.value, 10))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-slate-700"
            title="Number of warp profiles to generate (affects time scaling)"
          />
          <span className="w-4 text-slate-300">{warpCount}</span>
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
