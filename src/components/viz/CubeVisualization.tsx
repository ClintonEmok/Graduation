"use client";

import React, { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { MainScene } from './MainScene';
import { SimpleCrimeLegend } from './SimpleCrimeLegend';
import { useLogger } from '@/hooks/useLogger';
import { useStkdeStore } from '@/store/useStkdeStore';

export default function CubeVisualization() {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, columns } = useTimelineDataStore();
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const stkdeResponse = useStkdeStore((state) => state.response);
  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const runMeta = useStkdeStore((state) => state.runMeta);
  const { log } = useLogger();

  const selectedHotspot = stkdeResponse?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null;

  useEffect(() => {
    if (!columns && !isLoading) {
      loadRealData();
    }
  }, [columns, isLoading, loadRealData]);

  const handleReset = () => {
    log('view_reset');
    triggerReset();
  };


  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      <div className="h-2" />
      
      <div className="absolute top-16 right-4 z-10">
        <button
          onClick={handleReset}
          className="p-2 bg-background/80 backdrop-blur border rounded-md hover:bg-accent transition-colors shadow-sm"
          title="Reset View"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
        <MainScene showMapBackground={false} />
        <div className="absolute bottom-4 left-4 z-10">
          <SimpleCrimeLegend />
        </div>
        {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds) && (
          <div className="absolute bottom-4 right-4 z-10 rounded-md border bg-background/85 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground shadow-sm">
            Filters: {[
              selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
              selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
              selectedTimeRange ? 'Time' : null,
              selectedSpatialBounds ? 'Region' : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

        {stkdeResponse ? (
          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-md border bg-background/85 px-3 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            <div className="text-xs font-semibold text-foreground">STKDE Context</div>
            {selectedHotspot ? (
              <>
                <div className="mt-1 text-foreground">Hotspot {selectedHotspot.id}</div>
                <div className="mt-1">Intensity: {selectedHotspot.intensityScore.toFixed(3)}</div>
                <div className="mt-1">Support: {selectedHotspot.supportCount}</div>
                <div className="mt-1">
                  Time window: {new Date(selectedHotspot.peakStartEpochSec * 1000).toLocaleString()} →{' '}
                  {new Date(selectedHotspot.peakEndEpochSec * 1000).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="mt-1">No hotspot selected</div>
            )}
            {runMeta ? (
              <div className="mt-1 text-sky-700 dark:text-sky-300">
                requested={runMeta.requestedComputeMode} effective={runMeta.effectiveComputeMode}
                {runMeta.truncated ? ' • truncated' : ''}
                {runMeta.fallbackApplied ? ` • fallback=${runMeta.fallbackApplied}` : ''}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
