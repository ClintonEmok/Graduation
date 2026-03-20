import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useSuggestionStore } from '@/store/useSuggestionStore';

interface NeighbourhoodSection {
  status: 'available' | 'missing';
  notice?: string;
}

interface NeighbourhoodDiagnostics {
  neighbourhoodSummary?: string;
  sections: {
    neighbourhood: NeighbourhoodSection;
  };
}

/**
 * Neighbourhood diagnostics panel for /timeslicing-algos route.
 * Shows compact neighbourhood context summary with expandable details.
 * Follows the Phase 57 compact summary + expandable details pattern.
 */
export function NeighbourhoodDiagnosticsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeSuggestionId = useSuggestionStore((state) => state.activeSuggestionId);
  const suggestions = useSuggestionStore((state) => state.suggestions);
  
  const activeSuggestion = suggestions.find((s) => s.id === activeSuggestionId);
  const contextDiagnostics = activeSuggestion?.contextMetadata?.contextDiagnostics as NeighbourhoodDiagnostics | undefined;
  
  const neighbourhoodSection = contextDiagnostics?.sections?.neighbourhood;
  const neighbourhoodSummary = contextDiagnostics?.neighbourhoodSummary;
  
  // Loading/empty state - no active suggestion
  if (!activeSuggestionId) {
    return (
      <section
        className="mt-4 rounded-md border border-slate-700/70 bg-slate-900/60 p-3"
        data-testid="neighbourhood-diagnostics-panel"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <MapPin className="size-3.5" />
          <span>Neighbourhood Context</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Generate suggestions to see neighbourhood context
        </p>
      </section>
    );
  }
  
  // No neighbourhood data in diagnostics
  if (!neighbourhoodSection) {
    return (
      <section
        className="mt-4 rounded-md border border-slate-700/70 bg-slate-900/60 p-3"
        data-testid="neighbourhood-diagnostics-panel"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <MapPin className="size-3.5" />
          <span>Neighbourhood Context</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Neighbourhood data not available
        </p>
      </section>
    );
  }
  
  const isAvailable = neighbourhoodSection.status === 'available';
  const notice = neighbourhoodSection.notice;
  
  return (
    <section
      className="mt-4 rounded-md border border-slate-700/70 bg-slate-900/60 p-3"
      data-testid="neighbourhood-diagnostics-panel"
    >
      {/* Header row with expand/collapse toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <MapPin className="size-3.5" />
          <span>Neighbourhood Context</span>
        </div>
        
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <span className="hidden sm:inline">{isExpanded ? 'Less' : 'More'}</span>
          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      </div>
      
      {/* Compact summary - always visible */}
      <div className="mt-2">
        {isAvailable && neighbourhoodSummary ? (
          <p className="text-xs text-slate-300">{neighbourhoodSummary}</p>
        ) : notice ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertCircle className="size-3" />
            {notice}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {isAvailable ? 'Neighbourhood data available' : 'Neighbourhood data not available'}
          </p>
        )}
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 space-y-2 border-t border-slate-800/70 pt-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                isAvailable
                  ? 'border border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                  : 'border border-slate-700 bg-slate-800/50 text-slate-400'
              }`}
            >
              {isAvailable ? 'Available' : 'Not available'}
            </span>
          </div>
          
          {/* Notice if present */}
          {notice && (
            <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-2">
              <p className="text-[11px] text-slate-400">
                <span className="font-medium text-slate-300">Notice:</span> {notice}
              </p>
            </div>
          )}
          
          {/* POI category breakdown would go here if available in the future */}
          {isAvailable && (
            <p className="text-[11px] text-slate-500 italic">
              Additional neighbourhood details can be expanded here as POI data becomes available.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
