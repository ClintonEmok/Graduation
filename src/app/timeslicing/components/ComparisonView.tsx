"use client";

import React from 'react';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfidenceBadge } from './ConfidenceBadge';
import { 
  useSuggestionStore, 
  type Suggestion, 
  type WarpProfileData, 
  type IntervalBoundaryData 
} from '@/store/useSuggestionStore';

interface ComparisonViewProps {
  suggestion1: Suggestion;
  suggestion2: Suggestion;
}

function formatSuggestionType(type: Suggestion['type']): string {
  switch (type) {
    case 'warp-profile':
      return 'Warp';
    case 'interval-boundary':
      return 'Interval';
    default:
      return type;
  }
}

function formatWarpData(data: WarpProfileData): React.ReactNode {
  return (
    <div className="space-y-2">
      <div className="font-medium text-slate-200">{data.name}</div>
      <div className="text-xs text-slate-400">
        {data.intervals.length} interval(s)
      </div>
      <div className="mt-2 space-y-1">
        {data.intervals.map((interval, idx) => (
          <div key={idx} className="flex justify-between text-xs">
            <span className="text-slate-500">Interval {idx + 1}:</span>
            <span className="text-slate-300">
              {interval.startPercent.toFixed(1)}% - {interval.endPercent.toFixed(1)}% 
              (strength: {interval.strength.toFixed(1)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBoundaryData(data: IntervalBoundaryData): React.ReactNode {
  const formatEpoch = (epoch: number) => {
    return new Date(epoch * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <div className="space-y-2">
      <div className="font-medium text-slate-200">Boundaries</div>
      <div className="text-xs text-slate-400">
        {data.boundaries.length} boundary point(s)
      </div>
      <div className="mt-2 space-y-1">
        {data.boundaries.map((boundary, idx) => (
          <div key={idx} className="flex justify-between text-xs">
            <span className="text-slate-500">Point {idx + 1}:</span>
            <span className="text-slate-300">{formatEpoch(boundary)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSuggestionContent(suggestion: Suggestion): React.ReactNode {
  if (suggestion.type === 'warp-profile' && 'intervals' in suggestion.data) {
    return formatWarpData(suggestion.data as WarpProfileData);
  }
  
  if (suggestion.type === 'interval-boundary' && 'boundaries' in suggestion.data) {
    return formatBoundaryData(suggestion.data as IntervalBoundaryData);
  }
  
  return (
    <pre className="text-xs text-slate-400 overflow-x-auto">
      {JSON.stringify(suggestion.data, null, 2)}
    </pre>
  );
}

function renderVisualDiff(suggestion1: Suggestion, suggestion2: Suggestion): React.ReactNode {
  if (suggestion1.type === 'warp-profile' && suggestion2.type === 'warp-profile') {
    const first = suggestion1.data as WarpProfileData;
    const second = suggestion2.data as WarpProfileData;
    const avg = (items: WarpProfileData['intervals']) =>
      items.length === 0 ? 0 : items.reduce((sum, interval) => sum + interval.strength, 0) / items.length;

    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
          <div className="text-slate-500">Intervals</div>
          <div className="font-medium text-slate-200">
            {first.intervals.length} vs {second.intervals.length}
          </div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
          <div className="text-slate-500">Avg strength</div>
          <div className="font-medium text-slate-200">
            {avg(first.intervals).toFixed(2)} vs {avg(second.intervals).toFixed(2)}
          </div>
        </div>
      </div>
    );
  }

  if (suggestion1.type === 'interval-boundary' && suggestion2.type === 'interval-boundary') {
    const first = suggestion1.data as IntervalBoundaryData;
    const second = suggestion2.data as IntervalBoundaryData;
    const range = (boundaries: number[]) => {
      if (boundaries.length < 2) return 0;
      return boundaries[boundaries.length - 1] - boundaries[0];
    };

    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
          <div className="text-slate-500">Boundary points</div>
          <div className="font-medium text-slate-200">
            {first.boundaries.length} vs {second.boundaries.length}
          </div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
          <div className="text-slate-500">Covered seconds</div>
          <div className="font-medium text-slate-200">
            {range(first.boundaries).toLocaleString()} vs {range(second.boundaries).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return <div className="text-xs text-slate-500">Suggestions are different types; compare confidence and details manually.</div>;
}

export function ComparisonView({ suggestion1, suggestion2 }: ComparisonViewProps) {
  const { acceptSuggestion, clearComparison } = useSuggestionStore();
  
  const handleAccept = (id: string) => {
    acceptSuggestion(id);
  };
  
  const sameType = suggestion1.type === suggestion2.type;
  const confidenceDiff = Math.abs(suggestion1.confidence - suggestion2.confidence);
  const higherConfidence = suggestion1.confidence > suggestion2.confidence ? suggestion1 : suggestion2;
  
  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-4 text-slate-400" />
          <span className="font-medium text-slate-200">Compare Suggestions</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearComparison}
          className="h-7 w-7 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>
      
      {/* Type/Confidence Summary */}
      <div className="text-xs text-slate-400">
        {sameType ? (
          <span>Both are {formatSuggestionType(suggestion1.type).toLowerCase()} suggestions</span>
        ) : (
          <span>Different types - comparison may not be direct</span>
        )}
        {confidenceDiff > 0 && (
          <span className="ml-2">
            (Confidence difference: {confidenceDiff}%)
          </span>
        )}
      </div>
      
      {/* Side by side comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Suggestion 1 */}
        <div className={`
          rounded-lg border p-3
          ${suggestion1.type === 'warp-profile' ? 'border-violet-500/50 bg-violet-500/5' : 'border-teal-500/50 bg-teal-500/5'}
          ${higherConfidence.id === suggestion1.id ? 'ring-1 ring-amber-400/50' : ''}
        `}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              {formatSuggestionType(suggestion1.type)}
            </span>
            <ConfidenceBadge confidence={suggestion1.confidence} />
          </div>
          {renderSuggestionContent(suggestion1)}
          <div className="mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAccept(suggestion1.id)}
              className="w-full gap-1"
              disabled={suggestion1.status !== 'pending'}
            >
              <Check className="size-3" />
              Accept
            </Button>
          </div>
        </div>
        
        {/* Suggestion 2 */}
        <div className={`
          rounded-lg border p-3
          ${suggestion2.type === 'warp-profile' ? 'border-violet-500/50 bg-violet-500/5' : 'border-teal-500/50 bg-teal-500/5'}
          ${higherConfidence.id === suggestion2.id ? 'ring-1 ring-amber-400/50' : ''}
        `}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              {formatSuggestionType(suggestion2.type)}
            </span>
            <ConfidenceBadge confidence={suggestion2.confidence} />
          </div>
          {renderSuggestionContent(suggestion2)}
          <div className="mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAccept(suggestion2.id)}
              className="w-full gap-1"
              disabled={suggestion2.status !== 'pending'}
            >
              <Check className="size-3" />
              Accept
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">Visual diff</div>
        {renderVisualDiff(suggestion1, suggestion2)}
      </div>
      
      {/* Summary note */}
      {confidenceDiff > 0 && (
        <div className="text-xs text-slate-500 text-center">
          Higher confidence suggestion is highlighted
        </div>
      )}
    </div>
  );
}
