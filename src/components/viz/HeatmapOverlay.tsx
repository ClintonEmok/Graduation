import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import { useDataStore } from '@/store/useDataStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useHeatmapStore } from '@/store/useHeatmapStore';
import {
  aggregationVertexShader,
  aggregationFragmentShader,
  heatmapVertexShader,
  heatmapFragmentShader
} from './shaders/heatmap';

/**
 * HeatmapOverlay component implements a two-pass GPGPU heatmap engine.
 * Pass 1: Aggregates spatial density into an offscreen Float RenderTarget.
 * Pass 2: Renders the density map onto a spatial plane with logarithmic scaling and color mapping.
 */
export const HeatmapOverlay: React.FC = () => {
  const isEnabled = useHeatmapStore((state) => state.isEnabled);
  const intensity = useHeatmapStore((state) => state.intensity);
  const radius = useHeatmapStore((state) => state.radius);
  const opacity = useHeatmapStore((state) => state.opacity);

  const columns = useDataStore((state) => state.columns);
  const minX = useDataStore((state) => state.minX) ?? -50;
  const maxX = useDataStore((state) => state.maxX) ?? 50;
  const minZ = useDataStore((state) => state.minZ) ?? -50;
  const maxZ = useDataStore((state) => state.maxZ) ?? 50;

  const timeRange = useTimeStore((state) => state.timeRange);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const spatialBounds = useFilterStore((state) => state.selectedSpatialBounds);

  const { gl } = useThree();
  
  // Create a high-precision Float RenderTarget for additive density accumulation
  const fbo = useFBO(1024, 1024, {
    type: THREE.FloatType,
    format: THREE.RedFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  // Aggregation Pass Scene and Camera
  const aggregationScene = useMemo(() => new THREE.Scene(), []);
  const aggregationCamera = useMemo(() => {
    // Orthographic camera aligned with the 100x100 spatial grid (-50 to 50)
    const cam = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 10);
    cam.position.z = 5;
    return cam;
  }, []);

  // Compute selection maps for GPU filtering
  const typeSelectionMap = useMemo(() => {
    const map = new Float32Array(36);
    if (selectedTypes.length === 0) {
      map.fill(1.0);
    } else {
      selectedTypes.forEach((id) => {
        if (id >= 0 && id < 36) map[id] = 1.0;
      });
    }
    return map;
  }, [selectedTypes]);

  const districtSelectionMap = useMemo(() => {
    const map = new Float32Array(36);
    if (selectedDistricts.length === 0) {
      map.fill(1.0);
    } else {
      selectedDistricts.forEach((id) => {
        if (id >= 0 && id < 36) map[id] = 1.0;
      });
    }
    return map;
  }, [selectedDistricts]);

  // Pass 1: Aggregation Material
  const aggregationMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uDataBoundsMin: { value: new THREE.Vector2(minX, minZ) },
      uDataBoundsMax: { value: new THREE.Vector2(maxX, maxZ) },
      uTimeMin: { value: timeRange[0] },
      uTimeMax: { value: timeRange[1] },
      uTypeMap: { value: typeSelectionMap },
      uDistrictMap: { value: districtSelectionMap },
      uBoundsMin: { value: new THREE.Vector2(0, 0) },
      uBoundsMax: { value: new THREE.Vector2(0, 0) },
      uHasBounds: { value: 0 },
      uPointSize: { value: radius * 5.0 },
    },
    vertexShader: aggregationVertexShader,
    fragmentShader: aggregationFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  }), []);

  // Pass 2: Final Heatmap Plane Material
  const heatmapMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tDensity: { value: fbo.texture },
      uMaxIntensity: { value: 5.0 }, 
      uIntensityScale: { value: intensity / 10.0 },
      uOpacity: { value: opacity },
    },
    vertexShader: heatmapVertexShader,
    fragmentShader: heatmapFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  }), [fbo.texture]);

  // Geometry for aggregation (using THREE.Points for max performance)
  const geometry = useMemo(() => {
    if (!columns) return null;
    const geo = new THREE.BufferGeometry();
    // Position is handled by colX/colZ in shader, but we need an attribute to trigger draw
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(columns.length * 3), 3));
    geo.setAttribute('filterType', new THREE.BufferAttribute(columns.type, 1));
    geo.setAttribute('filterDistrict', new THREE.BufferAttribute(columns.district, 1));
    geo.setAttribute('colX', new THREE.BufferAttribute(columns.x, 1));
    geo.setAttribute('colZ', new THREE.BufferAttribute(columns.z, 1));
    geo.setAttribute('colLinearY', new THREE.BufferAttribute(columns.timestamp, 1));
    return geo;
  }, [columns]);

  // Update loop
  useFrame(() => {
    if (!isEnabled || !columns) return;
    
    // 1. Sync Aggregation Uniforms
    aggregationMaterial.uniforms.uTimeMin.value = timeRange[0];
    aggregationMaterial.uniforms.uTimeMax.value = timeRange[1];
    aggregationMaterial.uniforms.uTypeMap.value = typeSelectionMap;
    aggregationMaterial.uniforms.uDistrictMap.value = districtSelectionMap;
    aggregationMaterial.uniforms.uPointSize.value = radius * 5.0;
    aggregationMaterial.uniforms.uDataBoundsMin.value.set(minX, minZ);
    aggregationMaterial.uniforms.uDataBoundsMax.value.set(maxX, maxZ);
    aggregationMaterial.uniforms.uHasBounds.value = spatialBounds ? 1.0 : 0.0;
    if (spatialBounds) {
      aggregationMaterial.uniforms.uBoundsMin.value.set(spatialBounds.minX, spatialBounds.minZ);
      aggregationMaterial.uniforms.uBoundsMax.value.set(spatialBounds.maxX, spatialBounds.maxZ);
    }

    // 2. Sync Heatmap Uniforms
    heatmapMaterial.uniforms.uIntensityScale.value = intensity / 10.0;
    heatmapMaterial.uniforms.uOpacity.value = opacity;

    // 3. Render Aggregation Pass to FBO
    const oldTarget = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(aggregationScene, aggregationCamera);
    gl.setRenderTarget(oldTarget);
  });

  if (!isEnabled || !columns || !geometry) return null;

  return (
    <>
      {/* Aggregation Pass Mesh (rendered off-screen via useFrame) */}
      {createPortal(
        <points geometry={geometry} material={aggregationMaterial} />,
        aggregationScene
      )}

      {/* Final Heatmap Overlay on the Ground Plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.015, 0]} 
        material={heatmapMaterial}
      >
        <planeGeometry args={[100, 100]} />
      </mesh>
    </>
  );
};
