"use client";

import React, { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useDataStore } from '@/store/useDataStore';
import { MainScene } from './MainScene';
import { SimpleCrimeLegend } from './SimpleCrimeLegend';
import { useLogger } from '@/hooks/useLogger';

export default function CubeVisualization() {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, columns } = useDataStore();
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
      </div>
    </div>
  );
}
