"use client";

import React, { useEffect, useState } from 'react';
import { X, Info, Zap, Undo2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useCrimeFilters, useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore';
import { SuggestionCard } from './SuggestionCard';
import { ComparisonView } from './ComparisonView';

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
    showUndoToast,
    undoSuggestion,
    lastAction,
    comparisonIds,
    setComparisonId,
    clearComparison,
  } = useSuggestionStore();

  const activeWarpId = useWarpSliceStore((state) => state.activeWarpId);
  const getActiveWarp = useWarpSliceStore((state) => state.getActiveWarp);
  const activeWarp = getActiveWarp();
  const activeWarpSuggestion =
    activeWarpId === null
      ? null
      : suggestions.find(
          (suggestion) =>
            suggestion.id === activeWarpId &&
            suggestion.type === 'warp-profile' &&
            'name' in suggestion.data
        );

  const crimeFilters = useCrimeFilters();
  const startDate = useViewportStart();
  const endDate = useViewportEnd();

  const [showContext, setShowContext] = useState(false);
  const [processedCollapsed, setProcessedCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('suggestions-processed-collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    sessionStorage.setItem('suggestions-processed-collapsed', String(processedCollapsed));
  }, [processedCollapsed]);

  if (!isPanelOpen) {
    return null;
  }

  const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === 'pending');
  const processedSuggestions = suggestions.filter((suggestion) => suggestion.status !== 'pending');
  const selectedCount = selectedIds.size;
  const hasPendingSelected = pendingSuggestions.some((suggestion) => selectedIds.has(suggestion.id));
  const comparisonSuggestions = comparisonIds.map((id) =>
    id ? suggestions.find((suggestion) => suggestion.id === id) ?? null : null
  );
  const canCompare = comparisonSuggestions[0] !== null && comparisonSuggestions[1] !== null;

  const toggleComparison = (id: string) => {
    if (comparisonIds[0] === id) {
      setComparisonId(0, null);
      return;
    }
    if (comparisonIds[1] === id) {
      setComparisonId(1, null);
      return;
    }
    if (comparisonIds[0] === null) {
      setComparisonId(0, id);
      return;
    }
    if (comparisonIds[1] === null) {
      setComparisonId(1, id);
    }
  };

  const handleUndo = () => {
    undoSuggestion();
    toast.success('Action undone');
  };

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-slate-700 bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-200">Suggestions</h2>
          {suggestions.length > 0 && (
            <p className="text-xs text-slate-400">
              {pendingSuggestions.length} pending, {processedSuggestions.length} processed
            </p>
          )}
          {selectedCount > 0 && <p className="text-xs text-amber-400">{selectedCount} selected</p>}
          {activeWarp ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
              <Zap className="size-3" />
              <span>
                Active warp:{' '}
                {activeWarpSuggestion && 'name' in activeWarpSuggestion.data
                  ? activeWarpSuggestion.data.name
                  : activeWarp.label}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No active warp</p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(false)} className="h-7 w-7">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {pendingSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedCount === pendingSuggestions.length ? deselectAll : selectAll}
            className="h-7 px-2 text-xs text-slate-300 hover:text-slate-100"
          >
            {selectedCount === pendingSuggestions.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={acceptSelected}
            disabled={!hasPendingSelected}
            className="h-7 px-2 text-xs"
          >
            Accept Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={rejectSelected}
            disabled={!hasPendingSelected}
            className="h-7 px-2 text-xs"
          >
            Reject Selected
          </Button>
        </div>
      )}

      {showUndoToast && lastAction && (
        <div className="flex items-center justify-between border-b border-slate-700 bg-amber-900/30 px-4 py-2">
          <span className="text-xs text-amber-300">
            {lastAction.type === 'accept' ? 'Accepted' : 'Rejected'}. Undo available.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className="h-6 text-xs text-amber-300 hover:bg-amber-800/50 hover:text-amber-200"
          >
            <Undo2 className="mr-1 size-3" />
            Undo
          </Button>
        </div>
      )}

      {showContext && (
        <div className="border-b border-slate-700 bg-slate-800/50 p-3">
          <div className="mb-2 text-xs font-medium text-slate-300">Based on:</div>
          <div className="space-y-1 text-xs text-slate-400">
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

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isEmptyState ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">No crimes found in current view.</p>
              <p className="mt-1 text-xs text-slate-500">Try expanding your filters or time range.</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">No suggestions yet.</p>
              <p className="mt-1 text-xs text-slate-500">Click &apos;Generate&apos; to create suggestions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(comparisonIds[0] || comparisonIds[1]) && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-slate-300">Comparison mode</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearComparison}
                      className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Clear
                    </Button>
                  </div>
                  {canCompare && comparisonSuggestions[0] && comparisonSuggestions[1] ? (
                    <ComparisonView
                      suggestion1={comparisonSuggestions[0]}
                      suggestion2={comparisonSuggestions[1]}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">Select two suggestions to compare side by side.</p>
                  )}
                </div>
              )}

              {pendingSuggestions.length > 0 && (
                <>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</h3>
                  <div className="space-y-2 transition-all duration-200 ease-out">
                    {pendingSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="space-y-1">
                        <div className="flex justify-end">
                          <Button
                            variant={
                              comparisonIds[0] === suggestion.id || comparisonIds[1] === suggestion.id
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => toggleComparison(suggestion.id)}
                            disabled={
                              comparisonIds[0] !== suggestion.id &&
                              comparisonIds[1] !== suggestion.id &&
                              comparisonIds[0] !== null &&
                              comparisonIds[1] !== null
                            }
                            className="h-6 px-2 text-[11px]"
                          >
                            {comparisonIds[0] === suggestion.id || comparisonIds[1] === suggestion.id
                              ? 'Comparing'
                              : 'Compare'}
                          </Button>
                        </div>
                        <SuggestionCard suggestion={suggestion} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {processedSuggestions.length > 0 && (
                <>
                  <button
                    onClick={() => setProcessedCollapsed(!processedCollapsed)}
                    className="mt-4 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-400"
                    aria-expanded={!processedCollapsed}
                    aria-controls="processed-suggestions"
                  >
                    {processedCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    <span>Processed</span>
                    <span className="rounded-full border border-slate-600 px-1.5 py-0.5 text-[10px] leading-none text-slate-300">
                      {processedSuggestions.length}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      processedCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div id="processed-suggestions" className="space-y-2 overflow-hidden">
                      {!processedCollapsed &&
                        processedSuggestions.map((suggestion) => (
                          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                        ))}
                    </div>
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
