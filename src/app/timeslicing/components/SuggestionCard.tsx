"use client";

import React, { useState } from 'react';
import { Check, Pencil, X, Save, Plus, Trash2 } from 'lucide-react';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<WarpProfileData | IntervalBoundaryData | null>(null);
  
  const isActive = activeSuggestionId === suggestion.id;
  const isPending = suggestion.status === 'pending';
  const isLowConfidence = suggestion.confidence < 50;
  const isModified = suggestion.status === 'modified';
  const typeStyles = getSuggestionTypeStyles(suggestion.type);
  
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
  };
  
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    rejectSuggestion(suggestion.id);
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
        cursor-pointer rounded-lg border p-3 transition-all
        ${getBorderColor()}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="mt-1">
            <ConfidenceBadge confidence={suggestion.confidence} />
          </div>
          {formatSuggestionData(suggestion.data, suggestion.type)}
        </div>
      </div>
      
      {/* Inline editing controls */}
      {isEditing && renderEditControls()}
      
      {/* Action buttons */}
      {isPending && !isEditing && (
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
      
      {/* Save/Cancel buttons for editing */}
      {isEditing && (
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
