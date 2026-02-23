'use client';

import { useRef, useEffect } from 'react';
import { useUIStore } from '../../store/ui';
import { Scene } from './Scene';
import { SimpleCrimePoints } from './SimpleCrimePoints';
import MapBase from '../map/MapBase';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSelectionSync } from '@/hooks/useSelectionSync';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';
import { CameraControls } from '@react-three/drei';

export function MainScene({ showMapBackground = true }: { showMapBackground?: boolean }) {
  // Initialize the selection sync conductor - ties all views together
  useSelectionSync();

  const mode = useUIStore((state) => state.mode);
  const densityScope = useAdaptiveStore((state) => state.densityScope);
  const { data: viewportCrimes } = useViewportCrimeData({ bufferDays: 30 });
  const controlsRef = useRef<CameraControls>(null);
  const resetVersion = useUIStore((state) => state.resetVersion);

  // Viewport mode: compute adaptive maps from current viewport records.
  useEffect(() => {
    if (densityScope !== 'viewport' || !viewportCrimes || viewportCrimes.length === 0) return;

    const timestamps = new Float32Array(viewportCrimes.length);
    let minT = Infinity;
    let maxT = -Infinity;

    for (let i = 0; i < viewportCrimes.length; i += 1) {
      const t = viewportCrimes[i].timestamp;
      timestamps[i] = t;
      if (Number.isFinite(t)) {
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }

    if (minT !== Infinity && maxT > minT) {
      useAdaptiveStore.getState().computeMaps(timestamps, [minT, maxT]);
    }
  }, [densityScope, viewportCrimes]);

  // Global mode: hydrate adaptive maps from DB precompute, fallback to local compute if request fails.
  useEffect(() => {
    if (densityScope !== 'global') return;

    let cancelled = false;

    const fallbackToLocalCompute = () => {
      const { columns, data } = useDataStore.getState();

      if (columns && columns.timestamp) {
        useAdaptiveStore.getState().computeMaps(columns.timestamp, [0, 100]);
        return;
      }

      if (data.length === 0) return;

      const count = data.length;
      const timestamps = new Float32Array(count);
      const yValues = new Float32Array(count);
      let minT = Infinity;
      let maxT = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < count; i += 1) {
        const point = data[i];
        const y = typeof point.y === 'number' ? point.y : NaN;
        yValues[i] = y;
        if (Number.isFinite(y)) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        const rawTimestamp = point.timestamp as number | Date;
        const tValue = rawTimestamp instanceof Date ? rawTimestamp.getTime() : typeof rawTimestamp === 'number' ? rawTimestamp : NaN;
        timestamps[i] = tValue;
        if (Number.isFinite(tValue)) {
          if (tValue < minT) minT = tValue;
          if (tValue > maxT) maxT = tValue;
        }
      }

      if (minY !== Infinity && maxY > minY) {
        useAdaptiveStore.getState().computeMaps(yValues, [minY, maxY]);
        return;
      }

      if (minT !== Infinity && maxT > minT) {
        useAdaptiveStore.getState().computeMaps(timestamps, [minT, maxT]);
      }
    };

    const loadGlobalMaps = async () => {
      try {
        const response = await fetch('/api/adaptive/global');
        if (!response.ok) {
          throw new Error(`Global adaptive fetch failed: ${response.status}`);
        }

        const payload = (await response.json()) as {
          domain: [number, number];
          densityMap: number[];
          burstinessMap: number[];
          warpMap: number[];
        };

        if (cancelled) return;

        useAdaptiveStore.getState().setPrecomputedMaps(
          Float32Array.from(payload.densityMap || []),
          Float32Array.from(payload.burstinessMap || []),
          Float32Array.from(payload.warpMap || []),
          payload.domain
        );
      } catch (error) {
        console.warn('Falling back to local global adaptive compute:', error);
        if (!cancelled) fallbackToLocalCompute();
      }
    };

    loadGlobalMaps();

    return () => {
      cancelled = true;
    };
  }, [densityScope]);

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
