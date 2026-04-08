"use client";

import React, { useEffect, useState } from 'react';
import { X, Info, Zap, Undo2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSuggestionStore } from '@/store/useSuggestionStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useCrimeFilters, useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { SuggestionCard } from './SuggestionCard';
import { ComparisonView } from './ComparisonView';
import { ProfileManager } from './ProfileManager';
import { AutoProposalSetCard } from './AutoProposalSetCard';
import type { AutoProposalSet } from '@/types/autoProposalSet';

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatHistoryDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PROCESSED_COLLAPSE_SESSION_KEY = 'suggestions-processed-collapsed';

function summarizeHistoryParameters(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    return 'Unknown parameters';
  }

  if ('intervals' in data && Array.isArray(data.intervals)) {
    return `${data.intervals.length} time scale interval${data.intervals.length === 1 ? '' : 's'}`;
  }

  if ('boundaries' in data && Array.isArray(data.boundaries)) {
    return `${data.boundaries.length} boundary point${data.boundaries.length === 1 ? '' : 's'}`;
  }

  return 'Custom parameters';
}

function summarizeHistoryContext(entry: { contextMetadata?: { crimeTypes: string[]; isFullDataset: boolean; profileName?: string } }): string {
  const metadata = entry.contextMetadata;
  if (!metadata) {
    return 'Context unavailable';
  }

  if (metadata.profileName) {
    return metadata.profileName;
  }

  if (metadata.crimeTypes.length === 0) {
    return 'All crimes';
  }

  if (metadata.crimeTypes.length === 1) {
    return metadata.crimeTypes[0];
  }

  return `${metadata.crimeTypes.length} crime types`;
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
    minConfidence,
    comparisonIds,
    setComparisonId,
    clearComparison,
    acceptedHistory,
    clearHistory,
    reapplyFromHistory,
    fullAutoProposalSets,
    selectedFullAutoSetId,
    recommendedFullAutoSetId,
    fullAutoLowConfidenceReason,
    fullAutoNoResultReason,
    hasFullAutoLowConfidence,
    selectFullAutoProposalSet,
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
            suggestion.type === 'time-scale' &&
            'name' in suggestion.data
        );

  const crimeFilters = useCrimeFilters();
  const startDate = useViewportStart();
  const endDate = useViewportEnd();
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const [showContext, setShowContext] = useState(false);
  const [viewMode, setViewMode] = useState<'suggestions' | 'history'>('suggestions');
  const [comparisonExpanded, setComparisonExpanded] = useState(false);
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false);
  const [showDiagnosticsDetails, setShowDiagnosticsDetails] = useState(false);
  const [processedCollapsed, setProcessedCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(PROCESSED_COLLAPSE_SESSION_KEY) === 'true';
    }
    return false;
  });

  useEffect(() => {
    sessionStorage.setItem(PROCESSED_COLLAPSE_SESSION_KEY, String(processedCollapsed));
  }, [processedCollapsed]);

  if (!isPanelOpen) {
    return null;
  }

  const visibleSuggestions = suggestions.filter((suggestion) => suggestion.confidence >= minConfidence);
  const pendingSuggestions = visibleSuggestions.filter((suggestion) => suggestion.status === 'pending');
  const processedSuggestions = visibleSuggestions.filter((suggestion) => suggestion.status !== 'pending');
  const selectedCount = selectedIds.size;
  const hasPendingSelected = pendingSuggestions.some((suggestion) => selectedIds.has(suggestion.id));
  const comparisonSuggestions = comparisonIds.map((id) =>
    id ? suggestions.find((suggestion) => suggestion.id === id) ?? null : null
  );
  const canCompare = comparisonSuggestions[0] !== null && comparisonSuggestions[1] !== null;
  const selectionRange = selectedTimeRange
    ? [Math.min(selectedTimeRange[0], selectedTimeRange[1]), Math.max(selectedTimeRange[0], selectedTimeRange[1])]
    : [startDate, endDate];
  const topRankedProposalSets = fullAutoProposalSets.slice(0, 3);
  const hasAutoProposalSetData = topRankedProposalSets.length > 0;
  const effectiveRecommendedFullAutoSetId = recommendedFullAutoSetId ?? topRankedProposalSets[0]?.id ?? null;
  const selectedFullAutoSet =
    selectedFullAutoSetId === null
      ? null
      : fullAutoProposalSets.find((proposalSet) => proposalSet.id === selectedFullAutoSetId) ?? null;
  const diagnosticsSuggestion = pendingSuggestions[0] ?? visibleSuggestions[0] ?? null;
  const diagnostics = diagnosticsSuggestion?.contextMetadata?.contextDiagnostics;
  const temporalMissing = diagnostics?.sections.temporal.status === 'missing';
  const spatialMissing = diagnostics?.sections.spatial.status === 'missing';

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

  const handleReapply = (historyId: string) => {
    reapplyFromHistory(historyId);
    toast.success('Suggestion reapplied from history');
  };

  const handleTestExtremeWarp = () => {
    // Create an extreme warp package for visual testing
    const extremeWarpPackage: AutoProposalSet = {
      id: `test-extreme-warp-${Date.now()}`,
      rank: 0,
      isRecommended: true,
      confidence: 100,
      score: {
        coverage: 100,
        relevance: 100,
        overlap: 100,
        continuity: 100,
        total: 100,
      },
      warp: {
        name: 'Test Extreme Warp (DEBUG)',
        emphasis: 'aggressive',
        confidence: 100,
        intervals: [
          // 0-20%: 10x stretch (extremely stretched)
          {
            startPercent: 0,
            endPercent: 20,
            strength: 10,
          },
          // 20-80%: 0.1x compress (extremely compressed)
          {
            startPercent: 20,
            endPercent: 80,
            strength: 0.1,
          },
          // 80-100%: 8x stretch (extremely stretched)
          {
            startPercent: 80,
            endPercent: 100,
            strength: 8,
          },
        ],
      },
    };

    // Update the store with this test package
    selectFullAutoProposalSet(extremeWarpPackage.id);
    
    // Dispatch the accept event to apply the warp
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('accept-full-auto-package', {
          detail: { proposalSetId: extremeWarpPackage.id, autoProposalSet: extremeWarpPackage },
        })
      );
    }

    toast.success('Test extreme warp applied! Check the timeline.');
  };

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-slate-700 bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-200">Suggestions</h2>
          {suggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                {pendingSuggestions.length} pending, {processedSuggestions.length} processed
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                Selection: {formatDate(selectionRange[0])} - {formatDate(selectionRange[1])}
              </span>
            </div>
          )}
          {suggestions.length > 0 && minConfidence > 0 && (
            <p className="text-xs text-violet-300">Showing {visibleSuggestions.length} of {suggestions.length} suggestions</p>
          )}
          {selectedCount > 0 && <p className="text-xs text-amber-400">{selectedCount} selected</p>}
          {selectedFullAutoSet && (
            <p className="text-xs text-emerald-300">Selected package: Rank #{selectedFullAutoSet.rank}</p>
          )}
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
          {acceptedHistory.length > 0 && (
            <div className="flex overflow-hidden rounded-md border border-slate-700">
              <button
                onClick={() => setViewMode('suggestions')}
                className={`px-2 py-1 text-xs ${
                  viewMode === 'suggestions'
                    ? 'bg-slate-600 text-slate-100'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Suggestions
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-2 py-1 text-xs ${
                  viewMode === 'history'
                    ? 'bg-slate-600 text-slate-100'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                History
              </button>
            </div>
          )}
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

      <ProfileManager />

      {/* Debug: Test Extreme Warp Button */}
      <div className="border-b border-slate-700 px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestExtremeWarp}
          className="w-full text-xs"
          title="Generate an extreme warp with 10x, 0.1x, 8x multipliers to visually test warping"
        >
          <Zap className="mr-1 size-3" />
          Test Extreme Warp (DEBUG)
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {viewMode === 'history' ? (
            acceptedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-400">No accepted suggestions yet.</p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/30 p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    History ({acceptedHistory.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {acceptedHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded border border-slate-700 bg-slate-900/70 p-2 text-xs text-slate-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-200">
                          {entry.suggestion.type === 'time-scale' ? 'Time Scale' : 'Interval boundaries'}
                        </span>
                        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200">
                          {entry.suggestion.confidence}%
                        </span>
                      </div>
                      <div className="mt-1 text-slate-400">{formatHistoryDate(entry.acceptedAt)}</div>
                      <div className="mt-1 text-slate-500">
                        {summarizeHistoryParameters(entry.suggestion.data)}
                      </div>
                      {entry.contextMetadata && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          <span className="text-slate-400">Context:</span> {summarizeHistoryContext(entry)}
                          {entry.contextMetadata.isFullDataset ? ' (full range)' : ''}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReapply(entry.id)}
                          className="h-6 px-2 text-[11px]"
                        >
                          Re-apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : isEmptyState ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">No crimes found in current view.</p>
              <p className="mt-1 text-xs text-slate-500">Try expanding your filters or time range.</p>
            </div>
          ) : suggestions.length === 0 && !hasAutoProposalSetData && !fullAutoNoResultReason && !hasFullAutoLowConfidence ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">No suggestions yet.</p>
              <p className="mt-1 text-xs text-slate-500">Click &apos;Generate&apos; to create suggestions.</p>
            </div>
          ) : visibleSuggestions.length === 0 && !hasAutoProposalSetData && !fullAutoNoResultReason && !hasFullAutoLowConfidence ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">No suggestions match this confidence filter.</p>
              <p className="mt-1 text-xs text-slate-500">Lower the minimum confidence to see more results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnostics && (
                <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-3" data-testid="suggestion-diagnostics-summary">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-300">Diagnostics</h3>
                      <p className="mt-1 text-sm text-slate-100">
                        Dynamic profile:{' '}
                        <span className="font-medium">{diagnostics.dynamicProfileLabel || 'No strong profile'}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {diagnostics.temporalSummary ?? diagnostics.spatialSummary ?? 'Context diagnostics are available.'}
                      </p>
                    </div>
                    {diagnostics.hasNoStrongProfile ? (
                      <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">
                        No strong profile
                      </span>
                    ) : diagnostics.isWeakSignal ? (
                      <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                        Signal is weak
                      </span>
                    ) : (
                      <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                        Strong signal
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-slate-300">
                      Temporal: {diagnostics.sections.temporal.status === 'available' ? 'available' : 'missing'}
                    </span>
                    <span className="rounded border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-slate-300">
                      Spatial: {diagnostics.sections.spatial.status === 'available' ? 'available' : 'missing'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDiagnosticsDetails((current) => !current)}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:text-slate-100"
                    >
                      {showDiagnosticsDetails ? 'Hide diagnostics details' : 'Show diagnostics details'}
                    </button>
                  </div>

                  {showDiagnosticsDetails && (
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      <p>
                        {diagnostics.sections.temporal.status === 'available'
                          ? diagnostics.temporalSummary ?? 'Temporal summary unavailable.'
                          : diagnostics.sections.temporal.notice ?? 'Temporal diagnostics missing.'}
                      </p>
                      {diagnostics.sections.spatial.status === 'available' ? (
                        diagnostics.spatialHotspots && diagnostics.spatialHotspots.length > 0 ? (
                          <ul className="space-y-1 text-slate-300">
                            {diagnostics.spatialHotspots.slice(0, 3).map((hotspot) => (
                              <li key={`${hotspot.label}-${hotspot.supportCount}`}>
                                {hotspot.label} · {hotspot.supportCount} events · {(hotspot.density * 100).toFixed(1)}%
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>{diagnostics.spatialSummary ?? 'Spatial summary unavailable.'}</p>
                        )
                      ) : (
                        <p>{diagnostics.sections.spatial.notice ?? 'Spatial diagnostics missing.'}</p>
                      )}
                    </div>
                  )}

                  {(temporalMissing || spatialMissing) && (
                    <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                      {temporalMissing && (
                        <p>{diagnostics.sections.temporal.notice ?? 'Temporal diagnostics missing.'}</p>
                      )}
                      {spatialMissing && (
                        <p>{diagnostics.sections.spatial.notice ?? 'Spatial diagnostics missing.'}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-2 border-t border-slate-700/80 pt-2">
                    <button
                      type="button"
                      onClick={() => setComparisonExpanded((current) => !current)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-slate-100"
                      aria-expanded={comparisonExpanded}
                      aria-controls="profile-comparison-panel"
                    >
                      {comparisonExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                      Comparison (static vs dynamic)
                    </button>
                    {comparisonExpanded && (
                      <div id="profile-comparison-panel" className="mt-2 space-y-1 text-xs text-slate-300">
                        <p>Static: {diagnostics.staticProfileLabel}</p>
                        <p>Dynamic: {diagnostics.dynamicProfileLabel}</p>
                        <p className="text-slate-400">{diagnostics.profileComparison.reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 border-t border-slate-700/80 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfidenceDetails((current) => !current)}
                      className="text-xs font-medium text-slate-300 hover:text-slate-100"
                    >
                      {showConfidenceDetails ? 'Hide confidence details' : 'Show confidence details'}
                    </button>
                    {showConfidenceDetails && (
                      <p className="mt-1 text-xs text-slate-400">
                        Confidence: {typeof diagnostics.confidence === 'number' ? `${Math.round(diagnostics.confidence * 100)}%` : 'Unavailable'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(hasAutoProposalSetData || fullAutoNoResultReason || hasFullAutoLowConfidence) && (
                <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/30 p-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Full-auto packages</h3>
                    {effectiveRecommendedFullAutoSetId && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Ranked top 3
                      </span>
                    )}
                  </div>

                  {fullAutoNoResultReason && (
                    <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                      <p className="font-medium text-amber-300">No package available</p>
                      <p className="mt-0.5">{fullAutoNoResultReason}</p>
                    </div>
                  )}

                  {!fullAutoNoResultReason && hasFullAutoLowConfidence && fullAutoLowConfidenceReason && (
                    <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                      <div className="flex items-center gap-1 font-medium text-amber-300">
                        <AlertTriangle className="size-3" />
                        Low confidence package guidance
                      </div>
                      <p className="mt-0.5">{fullAutoLowConfidenceReason}</p>
                    </div>
                  )}

                  {hasAutoProposalSetData ? (
                    <div className="space-y-2">
                      {topRankedProposalSets.map((proposalSet) => (
                        <AutoProposalSetCard
                          key={proposalSet.id}
                          proposalSet={proposalSet}
                          isSelected={selectedFullAutoSetId === proposalSet.id}
                          isRecommended={effectiveRecommendedFullAutoSetId === proposalSet.id}
                          whyRecommended={proposalSet.reasonMetadata?.whyRecommended}
                          onSelect={selectFullAutoProposalSet}
                          startEpoch={startDate}
                          endEpoch={endDate}
                        />
                      ))}
                    </div>
                  ) : (
                    !fullAutoNoResultReason && (
                      <p className="text-xs text-slate-500">Generate suggestions to review ranked full-auto packages.</p>
                    )
                  )}
                </div>
              )}

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
                    {processedCollapsed && <span className="sr-only">collapsed</span>}
                  </button>
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      processedCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div id="processed-suggestions" data-section="processed" className="space-y-2 overflow-hidden">
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
