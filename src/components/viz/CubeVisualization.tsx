"use client";

import React, { useEffect } from 'react';
import { RefreshCcw, Database } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useDataStore } from '@/store/useDataStore';
import { MainScene } from './MainScene';
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

  const handleLoadData = () => {
    log('data_load_requested');
    loadRealData();
  };

  const handleReset = () => {
    log('view_reset');
    triggerReset();
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      <div className="p-4 border-b border-border flex-none flex justify-between items-center">
        <h2 className="text-lg font-semibold">3D Cube View</h2>
        
        <button
          onClick={handleLoadData}
          disabled={isLoading || !!columns}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Database className="w-3 h-3" />
          {isLoading ? 'Loading...' : (columns ? 'Real Data Loaded' : 'Load Real Data')}
        </button>
      </div>
      
      <button
        onClick={handleReset}
        className="absolute top-16 right-4 z-10 p-2 bg-background/80 backdrop-blur border rounded-md hover:bg-accent transition-colors shadow-sm"
        title="Reset View"
      >
        <RefreshCcw className="w-4 h-4" />
      </button>

      <div className="flex-1 w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
        <MainScene showMapBackground={false} />
      </div>
    </div>
  );
}
