"use client";

import React, { useState } from 'react';
import { X, Info, Zap, CheckSquare, Square, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useCrimeFilters, useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore';
import { SuggestionCard } from './SuggestionCard';

/**
 * Format date for display
 */
function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SuggestionPanel() {
  const { 
    suggestions, 
    isPanelOpen, 
    setPanelOpen, 
    clearSuggestions, 
    isEmptyState,
    selectedIds,
    selectAll,
    deselectAll,
    acceptSelected,
    rejectSelected,
  } = useSuggestionStore();
  
  // Get active warp info
  const activeWarpId = useWarpSliceStore((state) => state.activeWarpId);
  const getActiveWarp = useWarpSliceStore((state) => state.getActiveWarp);
  const activeWarp = getActiveWarp();
  
  // Get viewport context for display
  const crimeFilters = useCrimeFilters();
  const startDate = useViewportStart();
  const endDate = useViewportEnd();
  
  // Context display toggle
  const [showContext, setShowContext] = useState(false);
  
  if (!isPanelOpen) {
    return null;
  }
  
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');
  const selectedCount = selectedIds.size;
  const hasPendingSelected = pendingSuggestions.some(s => selectedIds.has(s.id));
  
  return (
    <div className="fixed right-0 top-0 h-full w-80 border-l border-slate-700 bg-slate-900 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-200">Suggestions</h2>
          {suggestions.length > 0 && (
            <p className="text-xs text-slate-400">
              {pendingSuggestions.length} pending, {processedSuggestions.length} processed
            </p>
          )}
          {/* Active warp indicator */}
          {activeWarp ? (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
              <Zap className="size-3" />
              <span>Active: {activeWarp.label}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-1">No active warp</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Context toggle button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowContext(!showContext)}
            className={`h-7 w-7 ${showContext ? 'text-amber-400' : 'text-slate-400'}`}
            title="Show context"
          >
            <Info className="size-4" />
          </Button>
          {suggestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSuggestions}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPanelOpen(false)}
            className="h-7 w-7"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      
      {/* Context display */}
      {showContext && (
        <div className="border-b border-slate-700 bg-slate-800/50 p-3">
          <div className="text-xs font-medium text-slate-300 mb-2">Based on:</div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>
              {crimeFilters.crimeTypes.length > 0 ? (
                <span>Crime types: {crimeFilters.crimeTypes.join(', ')}</span>
              ) : (
                <span>All crime types</span>
              )}
            </div>
            <div>
              {crimeFilters.districts.length > 0 ? (
                <span>Districts: {crimeFilters.districts.join(', ')}</span>
              ) : (
                <span>All districts</span>
              )}
            </div>
            <div className="text-slate-500">
              {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </div>
        </div>
      )}
      
      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Empty state message */}
          {isEmptyState ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">
                No crimes found in current view.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try expanding your filters or time range.
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">
                No suggestions yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click &apos;Generate&apos; to create suggestions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSuggestions.length > 0 && (
                <>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Pending
                  </h3>
                  <div className="space-y-2">
                    {pendingSuggestions.map((suggestion) => (
                      <SuggestionCard 
                        key={suggestion.id} 
                        suggestion={suggestion} 
                      />
                    ))}
                  </div>
                </>
              )}
              
              {processedSuggestions.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Processed
                  </h3>
                  <div className="space-y-2">
                    {processedSuggestions.map((suggestion) => (
                      <SuggestionCard 
                        key={suggestion.id} 
                        suggestion={suggestion} 
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
