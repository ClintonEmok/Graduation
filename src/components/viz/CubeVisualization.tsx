"use client";

import React, { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useDataStore } from '@/store/useDataStore';
import { MainScene } from './MainScene';
import { useLogger } from '@/hooks/useLogger';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

export default function CubeVisualization() {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, columns } = useDataStore();
  const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);
  const { log } = useLogger();

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
      
      <button
        onClick={handleReset}
        className="absolute top-16 right-4 z-10 p-2 bg-background/80 backdrop-blur border rounded-md hover:bg-accent transition-colors shadow-sm"
        title="Reset View"
      >
        <RefreshCcw className="w-4 h-4" />
      </button>

      <div className="flex-1 w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
        <MainScene showMapBackground={false} />
        <div className="absolute bottom-4 right-4 z-10 rounded-md border bg-background/85 backdrop-blur px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span>Burst ≥ {Math.round(burstThreshold * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
