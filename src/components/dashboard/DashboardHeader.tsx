"use client";

import React from 'react';
import Link from 'next/link';
import { useFilterStore } from '@/store/useFilterStore';
import { useBinningStore } from '@/store/useBinningStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { BinningControls } from '@/components/binning/BinningControls';
import { TimesliceToolbar } from '@/components/timeslicing/TimesliceToolbar';

interface DashboardHeaderProps {
  className?: string;
}

export function DashboardHeader({ className = '' }: DashboardHeaderProps) {
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setTypes = useFilterStore((state) => state.setTypes);
  const setDistricts = useFilterStore((state) => state.setDistricts);
  
  const strategy = useBinningStore((state) => state.strategy);
  const setStrategy = useBinningStore((state) => state.setStrategy);
  const bins = useBinningStore((state) => state.bins);
  const savedConfigurations = useBinningStore((state) => state.savedConfigurations);
  
  const mode = useTimeslicingModeStore((state) => state.mode);

  return (
    <div className={`bg-background/90 backdrop-blur-sm border-b ${className}`}>
      {/* Top Row: Navigation and Quick Filters */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        {/* Left: Navigation Links */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">Neon Tiger</span>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link>
            <Link href="/timeslicing" className="text-muted-foreground hover:text-foreground">Timeslicing</Link>
            <Link href="/stats" className="text-muted-foreground hover:text-foreground">Stats</Link>
            <Link href="/stkde" className="text-muted-foreground hover:text-foreground">STKDE</Link>
          </div>
        </div>

        {/* Center: Filter Summary */}
        <div className="flex items-center gap-4 text-xs">
          {selectedTypes.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Types:</span>
              <span className="font-medium">{selectedTypes.length}</span>
              <button
                onClick={() => setTypes([])}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}
          {selectedDistricts.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Districts:</span>
              <span className="font-medium">{selectedDistricts.length}</span>
              <button
                onClick={() => setDistricts([])}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}
          {selectedTimeRange && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {new Date(selectedTimeRange[0]).toLocaleDateString()} - {new Date(selectedTimeRange[1]).toLocaleDateString()}
              </span>
            </div>
          )}
          {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange) && (
            <button
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Right: Mode Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${
            mode === 'auto' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {mode === 'auto' ? 'Auto' : 'Manual'} Mode
          </span>
        </div>
      </div>

      {/* Bottom Row: Binning and Timeslicing Controls */}
      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <TimesliceToolbar />
        </div>
        <div className="flex-1">
          <BinningControls
            bins={bins}
            strategy={strategy}
            onStrategyChange={setStrategy}
            savedConfigs={savedConfigurations.map(c => ({ id: c.id, name: c.name }))}
            onSaveConfig={(name) => useBinningStore.getState().saveConfiguration(name)}
            onLoadConfig={(id) => useBinningStore.getState().loadConfiguration(id)}
          />
        </div>
      </div>
    </div>
  );
}