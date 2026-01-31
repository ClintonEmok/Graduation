'use client';

import { useRef, useState, useEffect } from 'react';
import { useUIStore } from '../../store/ui';
import { Scene } from './Scene';
import { Controls } from './Controls';
import { Grid } from './Grid';
import { DataPoints } from './DataPoints';
import { TimePlane } from './TimePlane';
import { TimeLoop } from './TimeLoop';
import MapBase from '../map/MapBase';
import { generateMockData } from '../../lib/mockData';
import { CrimeEvent } from '@/types';
import * as THREE from 'three';

export function MainScene({ showMapBackground = true }: { showMapBackground?: boolean }) {
  const mode = useUIStore((state) => state.mode);
  const [data, setData] = useState<CrimeEvent[]>([]);
  
  const pointsRef = useRef<THREE.InstancedMesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    // Generate mock data on mount
    const mockData = generateMockData(1000);
    setData(mockData);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Map Layer - Only rendered in map mode, behind canvas */}
      {mode === 'map' && showMapBackground && (
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
            
            <DataPoints data={data} ref={pointsRef} />
            <TimePlane ref={planeRef} />
            <TimeLoop pointsRef={pointsRef} planeRef={planeRef} />
            
            <Controls />
          </Scene>
        </div>
      </div>
    </div>
  );
}
