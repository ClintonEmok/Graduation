"use client";

import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMap } from 'react-map-gl/maplibre';
import * as THREE from 'three';
import { HeatmapOverlay } from '../viz/HeatmapOverlay';
import { project } from '@/lib/projection';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import { useHeatmapStore } from '@/store/useHeatmapStore';

/**
 * MapCameraSync synchronizes the Three.js orthographic camera with the 
 * MapLibre map's center and zoom level.
 */
function MapCameraSync() {
  const { camera, size } = useThree();
  const { current: map } = useMap();

  useFrame(() => {
    if (!map) return;
    
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    // Project map center to scene coordinates using the same logic as DataPoints
    const [sceneX, sceneZ] = project(center.lat, center.lng);
    
    // Zoom 12 is the base zoom level for the projection units.
    // At zoom Z, 1 unit in scene corresponds to (2^(Z-12)) pixels on screen.
    // So the width of the view in scene units is size.width / 2^(Z-12).
    const scale = Math.pow(2, zoom - 12);
    const width = size.width / scale;
    const height = size.height / scale;

    const orthoCam = camera as THREE.OrthographicCamera;
    orthoCam.left = -width / 2;
    orthoCam.right = width / 2;
    orthoCam.top = height / 2;
    orthoCam.bottom = -height / 2;
    
    // Position camera looking down at the projected map center
    orthoCam.position.set(sceneX, 10, sceneZ);
    orthoCam.lookAt(sceneX, 0, sceneZ);
    orthoCam.updateProjectionMatrix();
  });

  return null;
}

/**
 * MapHeatmapOverlay renders the HeatmapOverlay within a Three.js Canvas 
 * that is synchronized with the MapLibre map.
 */
export const MapHeatmapOverlay: React.FC = () => {
  const isHeatmapFeatureEnabled = useFeatureFlagsStore((state) => state.isEnabled('heatmap'));
  const isHeatmapEnabled = useHeatmapStore((state) => state.isEnabled);

  if (!isHeatmapFeatureEnabled || !isHeatmapEnabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]">
      <Canvas
        orthographic
        gl={{ alpha: true, antialias: true, stencil: false, depth: false }}
        camera={{ position: [0, 10, 0], zoom: 1 }}
      >
        <MapCameraSync />
        <HeatmapOverlay blending={THREE.AdditiveBlending} />
      </Canvas>
    </div>
  );
};
