'use client';

import { useRef, useEffect } from 'react';
import { useUIStore } from '../../store/ui';
import { Scene } from './Scene';
import { Grid } from './Grid';
import { DataPoints } from './DataPoints';
import { TimePlane } from './TimePlane';
import { TimeLoop } from './TimeLoop';
import { TimeSlices } from './TimeSlices';
import { HeatmapOverlay } from './HeatmapOverlay';
import { ClusterManager } from './ClusterManager';
import { ClusterHighlights } from './ClusterHighlights';
import { ClusterLabels } from './ClusterLabels';
import { AggregationManager } from './AggregationManager';
import { AggregatedBars } from './AggregatedBars';
import { LODController } from './LODController';
import { TrajectoryLayer } from './TrajectoryLayer';
import MapBase from '../map/MapBase';
import { useDataStore } from '@/store/useDataStore';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSelectionSync } from '@/hooks/useSelectionSync';
import * as THREE from 'three';
import { CameraControls } from '@react-three/drei';

export function MainScene({ showMapBackground = true }: { showMapBackground?: boolean }) {
  // Initialize the selection sync conductor - ties all views together
  useSelectionSync();

  const mode = useUIStore((state) => state.mode);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const isTimeSlicesEnabled = useFeatureFlagsStore((state) => state.isEnabled('timeSlices'));
  const isHeatmapEnabled = useFeatureFlagsStore((state) => state.isEnabled('heatmap'));
  const isClusteringEnabled = useFeatureFlagsStore((state) => state.isEnabled('clustering'));
  const isTrajectoriesEnabled = useFeatureFlagsStore((state) => state.isEnabled('trajectories'));
  const isAggregatedBinsEnabled = useFeatureFlagsStore((state) => state.isEnabled('aggregatedBins'));
  
  const pointsRef = useRef<THREE.InstancedMesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);
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
             {/* Abstract Mode: Show Grid */}
            {mode === 'abstract' && <Grid />}
            
            <DataPoints data={data} ref={pointsRef} />
            <TimePlane ref={planeRef} />
            {isTimeSlicesEnabled && <TimeSlices />}
            {isHeatmapEnabled && <HeatmapOverlay />}
            {isClusteringEnabled && (
              <>
                <ClusterManager />
                <ClusterHighlights />
                 <ClusterLabels />
              </>
            )}
            {isAggregatedBinsEnabled && (
              <>
                <AggregationManager />
                <AggregatedBars />
                <LODController />
              </>
            )}
            {isTrajectoriesEnabled && <TrajectoryLayer />}
            <TimeLoop pointsRef={pointsRef} planeRef={planeRef} />

            
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
