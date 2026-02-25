"use client";

import React from 'react';
import { Sparkles, Trash2, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuggestionTrigger } from '@/hooks/useSuggestionTrigger';
import { useSuggestionStore } from '@/store/useSuggestionStore';

interface SuggestionToolbarProps {
  className?: string;
}

export function SuggestionToolbar({ className }: SuggestionToolbarProps) {
  const { trigger, suggestionCount, pendingCount } = useSuggestionTrigger();
  const { clearSuggestions, setPanelOpen, isPanelOpen } = useSuggestionStore();

  const handleGenerate = () => {
    trigger();
  };

  const handleClearAll = () => {
    clearSuggestions();
  };

  const handleTogglePanel = () => {
    setPanelOpen(!isPanelOpen);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Generate Button */}
      <Button
        variant="default"
        size="sm"
        onClick={handleGenerate}
        className="gap-1.5"
      >
        <Sparkles className="size-4" />
        Generate Suggestions
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
  );
}
