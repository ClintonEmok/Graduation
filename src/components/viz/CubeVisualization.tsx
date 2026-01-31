"use client";

import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { useUIStore } from '@/store/ui';

export default function CubeVisualization() {
  const { triggerReset } = useUIStore();

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      <div className="p-4 border-b border-border flex-none flex justify-between items-center">
        <h2 className="text-lg font-semibold">3D Cube View</h2>
      </div>
      
      <button
        onClick={triggerReset}
        className="absolute top-4 right-4 z-10 p-2 bg-background/80 backdrop-blur border rounded-md hover:bg-accent transition-colors shadow-sm"
        title="Reset View"
      >
        <RefreshCcw className="w-4 h-4" />
      </button>

      <div className="flex-1 w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
        <p className="text-muted-foreground select-none">3D Scene Area</p>
      </div>
    </div>
  );
}
