"use client";

import React, { useState, useCallback } from 'react';
import { TimeBin } from '@/lib/binning/types';
import { BinningStrategy, PRESET_RULES } from '@/lib/binning/rules';

interface BinningControlsProps {
  /** Current bins */
  bins: TimeBin[];
  /** Current strategy */
  strategy: BinningStrategy;
  /** On strategy change */
  onStrategyChange: (strategy: BinningStrategy) => void;
  /** On bin selection */
  onBinSelect?: (binId: string | null) => void;
  /** Selected bin ID */
  selectedBinId?: string | null;
  /** On merge bins */
  onMerge?: (binIds: string[]) => void;
  /** On split bin */
  onSplit?: (binId: string, splitPoint: number) => void;
  /** On delete bin */
  onDelete?: (binId: string) => void;
  /** On resize bin */
  onResize?: (binId: string, newStartTime: number, newEndTime: number) => void;
  /** On save configuration */
  onSaveConfig?: (name: string) => void;
  /** On load configuration */
  onLoadConfig?: (configId: string) => void;
  /** Available saved configurations */
  savedConfigs?: Array<{ id: string; name: string }>;
}

export function BinningControls({
  bins,
  strategy,
  onStrategyChange,
  onBinSelect,
  selectedBinId,
  onMerge,
  onSplit,
  onDelete,
  onResize,
  onSaveConfig,
  onLoadConfig,
  savedConfigs = [],
}: BinningControlsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ binId: string; edge: 'start' | 'end' } | null>(null);

  const strategies: { value: BinningStrategy; label: string; description: string }[] = [
    { value: 'auto-adaptive', label: 'Auto Adaptive', description: 'Automatically detect best strategy' },
    { value: 'daytime-heavy', label: 'Daytime Heavy', description: 'Focus on 6am-6pm patterns' },
    { value: 'nighttime-heavy', label: 'Nighttime Heavy', description: 'Focus on 6pm-6am patterns' },
    { value: 'crime-type-specific', label: 'Crime Type', description: 'Group by crime type clusters' },
    { value: 'burstiness', label: 'Burstiness', description: 'Split by inter-arrival times' },
    { value: 'uniform-distribution', label: 'Uniform Events', description: 'Equal events per bin' },
    { value: 'uniform-time', label: 'Uniform Time', description: 'Equal time spans' },
    { value: 'weekday-weekend', label: 'Weekday/Weekend', description: 'Separate weekday from weekend' },
    { value: 'quarter-hourly', label: '15 Min', description: '15-minute intervals' },
    { value: 'hourly', label: 'Hourly', description: 'Hourly intervals' },
    { value: 'daily', label: 'Daily', description: 'Daily intervals' },
    { value: 'weekly', label: 'Weekly', description: 'Weekly intervals' },
  ];

  const handleMerge = useCallback(() => {
    if (!selectedBinId || !onMerge) return;
    // Find adjacent bins to merge
    const selectedIndex = bins.findIndex(b => b.id === selectedBinId);
    if (selectedIndex > 0) {
      onMerge([bins[selectedIndex - 1].id, selectedBinId]);
    } else if (selectedIndex < bins.length - 1) {
      onMerge([selectedBinId, bins[selectedIndex + 1].id]);
    }
  }, [bins, selectedBinId, onMerge]);

  const handleSplit = useCallback(() => {
    if (!selectedBinId || !onSplit) return;
    const bin = bins.find(b => b.id === selectedBinId);
    if (bin) {
      // Split at midpoint
      const midpoint = (bin.startTime + bin.endTime) / 2;
      onSplit(selectedBinId, midpoint);
    }
  }, [bins, selectedBinId, onSplit]);

  const handleDelete = useCallback(() => {
    if (!selectedBinId || !onDelete) return;
    onDelete(selectedBinId);
  }, [selectedBinId, onDelete]);

  const handleSaveConfig = useCallback(() => {
    if (configName.trim() && onSaveConfig) {
      onSaveConfig(configName.trim());
      setConfigName('');
      setShowSaveDialog(false);
    }
  }, [configName, onSaveConfig]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-lg border">
      {/* Strategy Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Binning Strategy</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {strategies.map(s => (
            <button
              key={s.value}
              onClick={() => onStrategyChange(s.value)}
              className={`p-2 rounded-md text-left text-xs transition ${
                strategy === s.value
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
              title={s.description}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-muted-foreground text-[10px] line-clamp-1">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Bins: {bins.length}</span>
        <span>Total Events: {bins.reduce((sum, b) => sum + b.count, 0)}</span>
        <span>Avg/Bin: {(bins.reduce((sum, b) => sum + b.count, 0) / bins.length).toFixed(1)}</span>
      </div>

      {/* Bin Operations (when bin selected) */}
      {selectedBinId && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleMerge}
            disabled={!onMerge}
            className="px-3 py-1.5 text-xs rounded-md bg-background border hover:bg-muted disabled:opacity-50"
          >
            Merge with Neighbor
          </button>
          <button
            onClick={handleSplit}
            disabled={!onSplit}
            className="px-3 py-1.5 text-xs rounded-md bg-background border hover:bg-muted disabled:opacity-50"
          >
            Split at Midpoint
          </button>
          <button
            onClick={handleDelete}
            disabled={!onDelete}
            className="px-3 py-1.5 text-xs rounded-md bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            Delete Bin
          </button>
        </div>
      )}

      {/* Configuration Save/Load */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-3 py-1.5 text-xs rounded-md bg-background border hover:bg-muted"
        >
          Save Config
        </button>
        {savedConfigs.length > 0 && (
          <select
            onChange={(e) => onLoadConfig?.(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-md bg-background border"
            defaultValue=""
          >
            <option value="" disabled>Load Config</option>
            {savedConfigs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="flex gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Config name..."
            className="flex-1 px-2 py-1 text-xs rounded-md bg-background border"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
          />
          <button
            onClick={handleSaveConfig}
            className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground"
          >
            Save
          </button>
          <button
            onClick={() => setShowSaveDialog(false)}
            className="px-3 py-1 text-xs rounded-md bg-background border"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bin List */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        <div className="text-xs font-medium text-muted-foreground mb-2">Bins ({bins.length})</div>
        {bins.map(bin => (
          <div
            key={bin.id}
            onClick={() => onBinSelect?.(bin.id)}
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition ${
              selectedBinId === bin.id
                ? 'bg-primary/20 border border-primary'
                : 'hover:bg-muted border border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex gap-2">
                <span className="font-mono">{formatTime(bin.startTime)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono">{formatTime(bin.endTime)}</span>
              </div>
              <div className="text-muted-foreground text-[10px]">
                {bin.crimeTypes.slice(0, 3).join(', ')}{bin.crimeTypes.length > 3 ? '...' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{bin.count}</div>
              <div className="text-[10px] text-muted-foreground">events</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}