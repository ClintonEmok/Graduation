"use client";

import React, { useState } from 'react';
import { Check, Pencil, X, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfidenceBadge } from './ConfidenceBadge';
import { useDataStore } from '@/store/useDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { 
  useSuggestionStore, 
  type Suggestion, 
  type WarpProfileData, 
  type IntervalBoundaryData 
} from '@/store/useSuggestionStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { toast } from 'sonner';

/**
 * Format epoch seconds as readable date
 */
function formatEpochDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a percentage (0-100) to a readable date using the timeline domain
 */
function formatPercentAsDate(percent: number, minEpoch: number, maxEpoch: number): string {
  const epoch = normalizedToEpochSeconds(percent, minEpoch, maxEpoch);
  return formatEpochDate(epoch);
}

interface SuggestionCardProps {
  suggestion: Suggestion;
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

function getSuggestionTypeStyles(type: Suggestion['type']): {
  badge: string;
  icon: React.ReactNode;
} {
  switch (type) {
    case 'warp-profile':
      return {
        badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        icon: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h2m16 0h2M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>,
      };
    case 'interval-boundary':
      return {
        badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        icon: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
      };
    default:
      return {
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        icon: null,
      };
  }
}

function formatSuggestionData(
  data: WarpProfileData | IntervalBoundaryData,
  type: Suggestion['type'],
  minTimestampSec: number | null,
  maxTimestampSec: number | null
): React.ReactNode {
  const hasValidDomain = minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec;
  
  if (type === 'warp-profile' && 'intervals' in data) {
    const warpData = data as WarpProfileData;
    return (
      <div className="mt-2 text-xs text-slate-400">
        <div className="font-medium text-slate-300">{warpData.name}</div>
        <div className="mt-1 space-y-1">
          {warpData.intervals.map((interval, index) => (
            <div key={index} className="text-slate-400">
              {hasValidDomain ? (
                <>
                  <span className="text-violet-400">{formatPercentAsDate(interval.startPercent, minTimestampSec!, maxTimestampSec!)}</span>
                  {' - '}
                  <span className="text-violet-400">{formatPercentAsDate(interval.endPercent, minTimestampSec!, maxTimestampSec!)}</span>
                </>
              ) : (
                <span>{interval.startPercent.toFixed(1)}% - {interval.endPercent.toFixed(1)}%</span>
              )}
              <span className="ml-1 text-slate-500">(w: {interval.strength.toFixed(1)})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (type === 'interval-boundary' && 'boundaries' in data) {
    const boundaryData = data as IntervalBoundaryData;
    return (
      <div className="mt-2 text-xs text-slate-400">
        <div className="font-medium text-slate-300">Boundaries</div>
        <div className="mt-1 space-y-0.5">
          {boundaryData.boundaries.map((boundary, index) => (
            <div key={index} className="text-teal-400">
              {formatEpochDate(boundary)}
            </div>
          ))}
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
  const {
    acceptSuggestion,
    rejectSuggestion,
    modifySuggestion,
    setActiveSuggestion,
    activeSuggestionId,
    selectedIds,
    toggleSelect,
  } = 
    useSuggestionStore();
  
  // Get active warp from warp slice store
  const activeWarpId = useWarpSliceStore((state) => state.activeWarpId);
  const getActiveWarp = useWarpSliceStore((state) => state.getActiveWarp);
  const activeWarp = getActiveWarp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editData, setEditData] = useState<WarpProfileData | IntervalBoundaryData | null>(null);
  const [isAcceptHovered, setIsAcceptHovered] = useState(false);

  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const hasValidDomain =
    minTimestampSec !== null &&
    maxTimestampSec !== null &&
    maxTimestampSec > minTimestampSec;
  
  const isActive = activeSuggestionId === suggestion.id;
  const isSelected = selectedIds.has(suggestion.id);
  const isPending = suggestion.status === 'pending';
  const isLowConfidence = suggestion.status === 'pending' && suggestion.confidence < 50;
  const isModified = suggestion.status === 'modified';
  const typeStyles = getSuggestionTypeStyles(suggestion.type);
  
  // Check if this suggestion will replace the current warp
  const willReplaceWarp = suggestion.status === 'pending' && 
    suggestion.type === 'warp-profile' && 
    activeWarpId !== null;
  
  // Check if this suggestion is the active warp
  const isActiveWarp = suggestion.status === 'accepted' && 
    suggestion.type === 'warp-profile' && 
    activeWarpId === suggestion.id;
  
  // Determine border color based on type and status
  const getBorderColor = () => {
    if (suggestion.status === 'accepted') return 'border-emerald-500/50 bg-emerald-500/5';
    if (suggestion.status === 'rejected') return 'border-red-500/50 bg-red-500/5 opacity-60';
    if (suggestion.type === 'warp-profile') {
      return isActive || isEditing ? 'border-violet-500 bg-violet-500/10' : isLowConfidence ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-400' : 'border-violet-700/50 bg-slate-900 hover:border-violet-600';
    }
    // interval-boundary
    return isActive || isEditing ? 'border-teal-500 bg-teal-500/10' : isLowConfidence ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-400' : 'border-teal-700/50 bg-slate-900 hover:border-teal-600';
  };
  
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    acceptSuggestion(suggestion.id);
    
    // Show toast notification
    if (suggestion.type === 'warp-profile') {
      toast.success('Warp profile applied', {
        description: 'Your timeline has been updated with the new warp intervals.',
      });
    } else {
      toast.success('Intervals created', {
        description: 'Time slices have been added to your timeline.',
      });
    }
  };
  
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    rejectSuggestion(suggestion.id);
    
    // Show toast notification
    toast.info('Suggestion rejected', {
      description: 'The suggestion has been removed from the list.',
    });
  };
  
  const handleModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData(suggestion.data);
    setIsEditing(true);
  };
  
  const handleSaveEdit = () => {
    if (editData) {
      modifySuggestion(suggestion.id, editData);
    }
    setIsEditing(false);
    setEditData(null);
    
    // Show toast notification
    toast.success('Changes saved', {
      description: 'Your modifications have been applied.',
    });
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };
  
  const handleClick = () => {
    if (!isEditing) {
      setActiveSuggestion(isActive ? null : suggestion.id);
    }
  };
  
  // Update edit data for warp profile intervals
  const updateInterval = (index: number, field: 'startPercent' | 'endPercent' | 'strength', value: number) => {
    if (editData && 'intervals' in editData) {
      const newIntervals = [...editData.intervals];
      newIntervals[index] = { ...newIntervals[index], [field]: value };
      setEditData({ ...editData, intervals: newIntervals });
    }
  };
  
  // Add new interval for warp profile
  const addInterval = () => {
    if (editData && 'intervals' in editData) {
      const lastInterval = editData.intervals[editData.intervals.length - 1];
      const newInterval = {
        startPercent: lastInterval ? lastInterval.endPercent + 5 : 0,
        endPercent: lastInterval ? lastInterval.endPercent + 15 : 10,
        strength: 1,
      };
      setEditData({ ...editData, intervals: [...editData.intervals, newInterval] });
    }
  };
  
  // Remove interval from warp profile
  const removeInterval = (index: number) => {
    if (editData && 'intervals' in editData && editData.intervals.length > 1) {
      const newIntervals = editData.intervals.filter((_, i) => i !== index);
      setEditData({ ...editData, intervals: newIntervals });
    }
  };
  
  // Update boundary value
  const updateBoundary = (index: number, value: number) => {
    if (editData && 'boundaries' in editData) {
      const newBoundaries = [...editData.boundaries];
      newBoundaries[index] = value;
      setEditData({ ...editData, boundaries: newBoundaries });
    }
  };
  
  // Get item count for collapsed display
  const getItemCount = (): number => {
    if (suggestion.type === 'warp-profile' && 'intervals' in suggestion.data) {
      return (suggestion.data as WarpProfileData).intervals.length;
    }
    if (suggestion.type === 'interval-boundary' && 'boundaries' in suggestion.data) {
      return (suggestion.data as IntervalBoundaryData).boundaries.length;
    }
    return 0;
  };
  
  const itemCount = getItemCount();
  
  // Add new boundary
  const addBoundary = () => {
    if (editData && 'boundaries' in editData) {
      const lastBoundary = editData.boundaries[editData.boundaries.length - 1] || 0;
      setEditData({ ...editData, boundaries: [...editData.boundaries, lastBoundary + 86400] }); // Add 1 day
    }
  };
  
  // Remove boundary
  const removeBoundary = (index: number) => {
    if (editData && 'boundaries' in editData && editData.boundaries.length > 2) {
      const newBoundaries = editData.boundaries.filter((_, i) => i !== index);
      setEditData({ ...editData, boundaries: newBoundaries });
    }
  };
  
  // Render inline editing controls
  const renderEditControls = () => {
    if (!editData) return null;
    
    if ('intervals' in editData && suggestion.type === 'warp-profile') {
      return (
        <div className="mt-3 space-y-2 p-2 bg-slate-800/50 rounded">
          <div className="text-xs font-medium text-slate-300">Edit Intervals</div>
          {editData.intervals.map((interval, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-8">#{index + 1}</span>
              <label className="text-slate-500">Start:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={interval.startPercent}
                onChange={(e) => updateInterval(index, 'startPercent', Number(e.target.value))}
                className="w-14 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
              />
              <label className="text-slate-500">End:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={interval.endPercent}
                onChange={(e) => updateInterval(index, 'endPercent', Number(e.target.value))}
                className="w-14 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
              />
              <label className="text-slate-500">Str:</label>
              <input
                type="number"
                min="0"
                max="3"
                step="0.1"
                value={interval.strength}
                onChange={(e) => updateInterval(index, 'strength', Number(e.target.value))}
                className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
              />
              <button
                onClick={() => removeInterval(index)}
                className="text-red-400 hover:text-red-300"
                disabled={editData.intervals.length <= 1}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addInterval}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            <Plus className="size-3" /> Add Interval
          </button>
        </div>
      );
    }
    
    if ('boundaries' in editData && suggestion.type === 'interval-boundary') {
      return (
        <div className="mt-3 space-y-2 p-2 bg-slate-800/50 rounded">
          <div className="text-xs font-medium text-slate-300">Edit Boundaries (epoch seconds)</div>
          {editData.boundaries.map((boundary, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-8">#{index + 1}</span>
              <input
                type="number"
                value={boundary}
                onChange={(e) => updateBoundary(index, Number(e.target.value))}
                className="w-32 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
              />
              <button
                onClick={() => removeBoundary(index)}
                className="text-red-400 hover:text-red-300"
                disabled={editData.boundaries.length <= 2}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addBoundary}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300"
          >
            <Plus className="size-3" /> Add Boundary
          </button>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div 
      className={`
        cursor-pointer rounded-lg border p-3 transition-all overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-200
        ${getBorderColor()}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPending && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelect(suggestion.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="size-3.5 accent-amber-500"
                aria-label="Select suggestion"
              />
            )}
            <span className="font-medium text-slate-200">
              {formatSuggestionType(suggestion.type)}
            </span>
            {/* Type badge */}
            <span className={`text-xs px-1.5 py-0.5 rounded border ${typeStyles.badge} flex items-center gap-1`}>
              {typeStyles.icon}
              {suggestion.type === 'warp-profile' ? 'WARP' : 'INTERVAL'}
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
            {/* Active warp indicator - shown for accepted warp profiles */}
            {isActiveWarp && (
              <span 
                className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30"
                title="This warp is currently applied to the timeline"
              >
                ACTIVE
              </span>
            )}
          </div>
          <div className="mt-1">
            <ConfidenceBadge confidence={suggestion.confidence} />
          </div>
          {/* Collapsed: show count, Expanded: show full details */}
          {isCollapsed ? (
            <div className="mt-2 text-xs text-slate-400">
              {suggestion.type === 'warp-profile' 
                ? `${itemCount} interval${itemCount !== 1 ? 's' : ''}`
                : `${itemCount} boundary point${itemCount !== 1 ? 's' : ''}`
              }
            </div>
          ) : (
            formatSuggestionData(suggestion.data, suggestion.type, minTimestampSec, maxTimestampSec)
          )}
        </div>
        
        {/* Collapse/Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          title={isCollapsed ? 'Expand details' : 'Collapse details'}
        >
          {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
      
      {/* Inline editing controls */}
      {isEditing && !isCollapsed && renderEditControls()}
      
      {/* Action buttons - hide when collapsed */}
      {isPending && !isEditing && !isCollapsed && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleAccept}
              onMouseEnter={() => setIsAcceptHovered(true)}
              onMouseLeave={() => setIsAcceptHovered(false)}
              className={`h-7 text-xs ${willReplaceWarp ? 'bg-amber-600 hover:bg-amber-500' : ''}`}
              title={willReplaceWarp ? 'Accepting this warp will replace the current active warp' : 'Accept suggestion'}
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
          {/* Warning about warp replacement */}
          {willReplaceWarp && isAcceptHovered && (
            <div className="text-xs text-amber-400 flex items-center gap-1">
              <svg className="size-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                This will replace your current warp
                {activeWarp ? ` (${activeWarp.label})` : ''}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Save/Cancel buttons for editing - hide when collapsed */}
      {isEditing && !isCollapsed && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSaveEdit}
            className="h-7 text-xs gap-1"
          >
            <Save className="size-3" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelEdit}
            className="h-7 text-xs"
          >
            <X className="size-3" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
