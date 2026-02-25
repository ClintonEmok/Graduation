"use client";

import React, { useState } from 'react';
import { Sparkles, Trash2, PanelRightOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuggestionGenerator, type GenerationParams } from '@/hooks/useSuggestionGenerator';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { BoundaryMethod } from '@/lib/interval-detection';

interface SuggestionToolbarProps {
  className?: string;
}

export function SuggestionToolbar({ className }: SuggestionToolbarProps) {
  // Generation params state
  const [intervalCount, setIntervalCount] = useState(5);  // default 5, range 3-12
  const [snapToUnit, setSnapToUnit] = useState<'hour' | 'day' | 'none'>('none');
  const [boundaryMethod, setBoundaryMethod] = useState<BoundaryMethod>('peak');
  
  const { trigger, suggestionCount, pendingCount, isGenerating } = useSuggestionGenerator();
  const { clearSuggestions, setPanelOpen, isPanelOpen } = useSuggestionStore();

  const handleGenerate = () => {
    const params: GenerationParams = {
      intervalCount,
      snapToUnit,
      boundaryMethod,
    };
    trigger(params);
  };

  const handleClearAll = () => {
    clearSuggestions();
  };

  const handleTogglePanel = () => {
    setPanelOpen(!isPanelOpen);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main controls row */}
      <div className="flex items-center gap-3">
        {/* Generate Button */}
        <Button
          variant="default"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-1.5"
        >
          <Sparkles className="size-4" />
          {isGenerating ? 'Generating...' : 'Generate Suggestions'}
        </Button>

        {/* Suggestion Count Badge */}
        {suggestionCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">
              {suggestionCount} total
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                {pendingCount} pending
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear All Button */}
        {suggestionCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="size-4" />
            Clear All
          </Button>
        )}

        {/* Toggle Panel Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTogglePanel}
          className="gap-1.5"
        >
          <PanelRightOpen className="size-4" />
          {isPanelOpen ? 'Hide Panel' : 'Show Panel'}
        </Button>
      </div>
      
      {/* Secondary options row */}
      <div className="flex items-center gap-4 text-xs">
        {/* Interval count slider */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Intervals:</label>
          <input
            type="range"
            min="3"
            max="12"
            value={intervalCount}
            onChange={(e) => setIntervalCount(parseInt(e.target.value, 10))}
            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-slate-300 w-4">{intervalCount}</span>
        </div>

        {/* Snapping toggle */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Snapping:</label>
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            {(['none', 'hour', 'day'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSnapToUnit(option)}
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

        {/* Method selector */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Method:</label>
          <select
            value={boundaryMethod}
            onChange={(e) => setBoundaryMethod(e.target.value as BoundaryMethod)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="peak">Peak</option>
            <option value="change-point">Change Point</option>
            <option value="rule-based">Rule-based</option>
          </select>
        </div>
      </div>
    </div>
  );
}
