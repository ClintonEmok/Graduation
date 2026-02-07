'use client';

import { useRef, useEffect } from 'react';
import { useUIStore } from '../../store/ui';
import { Scene } from './Scene';
import { SimpleCrimePoints } from './SimpleCrimePoints';
import MapBase from '../map/MapBase';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSelectionSync } from '@/hooks/useSelectionSync';
import { CameraControls } from '@react-three/drei';

export function MainScene({ showMapBackground = true }: { showMapBackground?: boolean }) {
  // Initialize the selection sync conductor - ties all views together
  useSelectionSync();

  const mode = useUIStore((state) => state.mode);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const controlsRef = useRef<CameraControls>(null);
  const resetVersion = useUIStore((state) => state.resetVersion);

  // Trigger adaptive map computation when data loads
  useEffect(() => {
    // 1. Handle Columnar Data (Real Data)
    if (columns && columns.timestamp) {
      // timestamps are normalized 0-100 in the store for columnar data
      useAdaptiveStore.getState().computeMaps(columns.timestamp, [0, 100]);
    } 
    // 2. Handle Mock Data (Object Array)
    else if (data.length > 0) {
      const count = data.length;
      const timestamps = new Float32Array(count);
      let minT = Infinity;
      let maxT = -Infinity;

      const yValues = new Float32Array(count);
      let minY = Infinity;
      let maxY = -Infinity;
      
      for(let i=0; i<count; i++) {
        const point = data[i];
        const y = typeof point.y === 'number' ? point.y : NaN;
        yValues[i] = y;
        if (Number.isFinite(y)) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        let t = point.timestamp as number | Date;
        let tValue: number;
        if (t instanceof Date) {
          tValue = t.getTime();
        } else {
          tValue = typeof t === 'number' ? t : NaN;
        }

        timestamps[i] = tValue;
        if (Number.isFinite(tValue)) {
          if (tValue < minT) minT = tValue;
          if (tValue > maxT) maxT = tValue;
        }
      }

      const hasValidY = minY !== Infinity && maxY > minY;
      if (hasValidY) {
        useAdaptiveStore.getState().computeMaps(yValues, [minY, maxY]);
        return;
      }

      if (minT !== Infinity && maxT > minT) {
        useAdaptiveStore.getState().computeMaps(timestamps, [minT, maxT]);
      }
    }
  }, [columns, data]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset(true);
    }
  }, [resetVersion]);

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
            <SimpleCrimePoints />

            
            <CameraControls
              ref={controlsRef}
              makeDefault
              smoothTime={0.25}
              minDistance={1}
              maxDistance={500}
              maxPolarAngle={Math.PI / 2}
            />
          </Scene>
        </div>
      </div>
    </div>
  );
}
