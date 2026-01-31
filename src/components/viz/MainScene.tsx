'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '../../store/ui';
import { Scene } from './Scene';
import { Controls } from './Controls';
import { Grid } from './Grid';
import { DataPoints } from './DataPoints';
import MapBase from '../map/MapBase';
import { generateMockData } from '../../lib/mockData';
import { CrimeEvent } from '@/types';

export function MainScene() {
  const mode = useUIStore((state) => state.mode);
  const [data, setData] = useState<CrimeEvent[]>([]);

  useEffect(() => {
    // Generate mock data on mount
    const mockData = generateMockData(1000);
    setData(mockData);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Map Layer - Only rendered in map mode, behind canvas */}
      {mode === 'map' && (
        <div className="absolute inset-0 z-0">
          <MapBase />
        </div>
      )}

      {/* 3D Scene Layer - Always rendered, transparent when over map */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Canvas needs pointer-events-auto for controls to work */}
        <div className="h-full w-full pointer-events-auto">
          <Scene transparent={mode === 'map'}>
             {/* Abstract Mode: Show Grid */}
            {mode === 'abstract' && <Grid />}
            
            <DataPoints data={data} />
            <Controls />
          </Scene>
        </div>
      </div>
    </div>
  );
}
