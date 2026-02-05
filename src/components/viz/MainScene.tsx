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
import { useSelectionSync } from '@/hooks/useSelectionSync';
import * as THREE from 'three';
import { CameraControls } from '@react-three/drei';

export function MainScene({ showMapBackground = true }: { showMapBackground?: boolean }) {
  // Initialize the selection sync conductor - ties all views together
  useSelectionSync();

  const mode = useUIStore((state) => state.mode);
  const data = useDataStore((state) => state.data);
  const isTimeSlicesEnabled = useFeatureFlagsStore((state) => state.isEnabled('timeSlices'));
  const isHeatmapEnabled = useFeatureFlagsStore((state) => state.isEnabled('heatmap'));
  const isClusteringEnabled = useFeatureFlagsStore((state) => state.isEnabled('clustering'));
  const isTrajectoriesEnabled = useFeatureFlagsStore((state) => state.isEnabled('trajectories'));
  const isAggregatedBinsEnabled = useFeatureFlagsStore((state) => state.isEnabled('aggregatedBins'));
  
  const pointsRef = useRef<THREE.InstancedMesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<CameraControls>(null);
  const resetVersion = useUIStore((state) => state.resetVersion);

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
