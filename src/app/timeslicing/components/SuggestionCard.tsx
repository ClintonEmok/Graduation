"use client";

import React from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfidenceBadge } from './ConfidenceBadge';
import { 
  useSuggestionStore, 
  type Suggestion, 
  type WarpProfileData, 
  type IntervalBoundaryData 
} from '@/store/useSuggestionStore';

interface SuggestionCardProps {
  suggestion: Suggestion;
}

function formatSuggestionType(type: Suggestion['type']): string {
  switch (type) {
    case 'warp-profile':
      return 'Warp Profile';
    case 'interval-boundary':
      return 'Interval Boundary';
    default:
      return type;
  }
}

function formatSuggestionData(
  data: WarpProfileData | IntervalBoundaryData,
  type: Suggestion['type']
): React.ReactNode {
  if (type === 'warp-profile' && 'intervals' in data) {
    const warpData = data as WarpProfileData;
    return (
      <div className="mt-2 text-xs text-slate-400">
        <div className="font-medium text-slate-300">{warpData.name}</div>
        <div className="mt-1">
          {warpData.intervals.length} interval(s)
        </div>
      </div>
    );
  }
  
  if (type === 'interval-boundary' && 'boundaries' in data) {
    const boundaryData = data as IntervalBoundaryData;
    return (
      <div className="mt-2 text-xs text-slate-400">
        <div className="font-medium text-slate-300">Boundaries</div>
        <div className="mt-1">
          {boundaryData.boundaries.length} boundary point(s)
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-2 text-xs text-slate-400">
      <pre className="overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { acceptSuggestion, rejectSuggestion, modifySuggestion, setActiveSuggestion, activeSuggestionId } = 
    useSuggestionStore();
  
  const isActive = activeSuggestionId === suggestion.id;
  const isPending = suggestion.status === 'pending';
  const isLowConfidence = suggestion.confidence < 50;
  
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    acceptSuggestion(suggestion.id);
  };
  
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    rejectSuggestion(suggestion.id);
  };
  
  const handleModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For now, just set as active - modify functionality comes later
    setActiveSuggestion(suggestion.id);
  };
  
  const handleClick = () => {
    setActiveSuggestion(isActive ? null : suggestion.id);
  };
  
  return (
    <div 
      className={`
        cursor-pointer rounded-lg border p-3 transition-all
        ${isActive 
          ? 'border-blue-500 bg-blue-500/10' 
          : isLowConfidence 
            ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-400'
            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
        }
        ${suggestion.status === 'accepted' ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
        ${suggestion.status === 'rejected' ? 'border-red-500/50 bg-red-500/5 opacity-60' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">
              {formatSuggestionType(suggestion.type)}
            </span>
            {suggestion.status !== 'pending' && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded
                ${suggestion.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                ${suggestion.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
                ${suggestion.status === 'modified' ? 'bg-amber-500/20 text-amber-400' : ''}
              `}>
                {suggestion.status}
              </span>
            )}
          </div>
          <div className="mt-1">
            <ConfidenceBadge confidence={suggestion.confidence} />
          </div>
          {formatSuggestionData(suggestion.data, suggestion.type)}
        </div>
      </div>
      
      {isPending && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleAccept}
            className="h-7 text-xs"
          >
            <Check className="size-3" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleModify}
            className="h-7 text-xs"
          >
            <Pencil className="size-3" />
            Modify
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="h-7 text-xs"
          >
            <X className="size-3" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
