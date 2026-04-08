"use client";

import React, { useCallback } from 'react';
import { useTimeslicingModeStore, TimeslicingMode, TimeslicePreset } from '@/store/useTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

interface TimesliceToolbarProps {
  className?: string;
}

export function TimesliceToolbar({ className = '' }: TimesliceToolbarProps) {
  const mode = useTimeslicingModeStore((state) => state.mode);
  const setMode = useTimeslicingModeStore((state) => state.setMode);
  const preset = useTimeslicingModeStore((state) => state.preset);
  const setPreset = useTimeslicingModeStore((state) => state.setPreset);
  const sliceTemplates = useTimeslicingModeStore((state) => state.sliceTemplates);
  const isComputing = useAdaptiveStore((state) => state.isComputing);
  
  const isCreating = useSliceDomainStore((state) => state.isCreating);
  const startCreation = useSliceDomainStore((state) => state.startCreation);
  const clearSlices = useSliceDomainStore((state) => state.clearSlices);
  const slices = useSliceDomainStore((state) => state.slices);
  
  const presets: { value: TimeslicePreset; label: string }[] = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekday-weekend', label: 'Weekday/Weekend' },
    { value: 'morning-afternoon-evening-night', label: '4 Time Blocks' },
    { value: 'business-hours', label: 'Business Hours' },
    { value: 'custom', label: 'Custom' },
  ];

  const handleModeToggle = useCallback(() => {
    setMode(mode === 'auto' ? 'manual' : 'auto');
  }, [mode, setMode]);

  const handleStartCreation = useCallback(() => {
    startCreation('drag');
  }, [startCreation]);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreset(e.target.value as TimeslicePreset);
  }, [setPreset]);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all slices?')) {
      clearSlices();
    }
  }, [clearSlices]);

  return (
    <div className={`flex flex-col gap-3 p-3 bg-background/80 backdrop-blur-sm rounded-lg border ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Mode:</span>
        <div className="flex rounded-md border bg-background p-0.5">
          <button
            onClick={() => setMode('auto')}
            className={`px-3 py-1 text-xs rounded transition ${
              mode === 'auto'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1 text-xs rounded transition ${
              mode === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Manual
          </button>
        </div>
        {isComputing && (
          <span className="text-xs text-amber-500 animate-pulse">Computing...</span>
        )}
      </div>

      {/* Manual Mode Controls */}
      {mode === 'manual' && (
        <>
          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Preset:</span>
            <select
              value={preset}
              onChange={handlePresetChange}
              className="flex-1 px-2 py-1 text-xs rounded bg-background border"
            >
              {presets.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleStartCreation}
              disabled={isCreating}
              className="px-3 py-1.5 text-xs rounded bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : '+ New Slice'}
            </button>
            <button
              onClick={handleClearAll}
              disabled={slices.length === 0}
              className="px-3 py-1.5 text-xs rounded bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              Clear All ({slices.length})
            </button>
          </div>

          {/* Quick Templates */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Quick Templates:</span>
            <div className="flex flex-wrap gap-1">
              {sliceTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    // Apply template: create slice with duration
                    const now = Date.now();
                    const newSlice = {
                      id: `template-${template.id}-${Date.now()}`,
                      name: template.name,
                      type: 'range' as const,
                      time: 0, // Will be set by user
                      range: [now, now + template.duration] as [number, number],
                      color: template.color,
                      isLocked: false,
                      isVisible: true,
                    };
                    useSliceDomainStore.getState().addSlice(newSlice);
                  }}
                  className="px-2 py-1 text-[10px] rounded border transition hover:bg-muted"
                  style={{ borderColor: template.color }}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Slice Count */}
          <div className="text-xs text-muted-foreground">
            {slices.length} slice{slices.length !== 1 ? 's' : ''} created
          </div>
        </>
      )}

      {/* Auto Mode Info */}
      {mode === 'auto' && (
        <div className="text-xs text-muted-foreground">
          Slices are automatically generated based on data patterns.
          Switch to Manual to create custom slices.
        </div>
      )}
    </div>
  );
}