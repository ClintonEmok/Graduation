import React, {
  useRef,
  useLayoutEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { extent } from 'd3-array';
import { CrimeEvent } from '@/types';
import { DataPoint, useDataStore } from '@/store/useDataStore';
import { computeAdaptiveY, computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import { getCrimeTypeId, getDistrictId } from '@/lib/category-maps';
import { useTimeStore } from '@/store/useTimeStore';
import { useUIStore } from '@/store/ui';

// ... imports

export const DataPoints = forwardRef<THREE.InstancedMesh, DataPointsProps>(({ data }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const showContext = useUIStore((state) => state.showContext);
  const contextOpacity = useUIStore((state) => state.contextOpacity);
  const columns = useDataStore((state) => state.columns);
  // ... other hooks

  // ... useMemo for data

  // ... other useMemos

  // Update uniforms on context changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.Material;
      if (material.userData.shader) {
        material.userData.shader.uniforms.uShowContext.value = showContext ? 1 : 0;
        material.userData.shader.uniforms.uContextOpacity.value = contextOpacity;
      }
    }
  }, [showContext, contextOpacity]);

  // Update mesh count and matrices
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    if (columns) {
      // Columnar mode: Attributes handle everything.
      // Ensure count is correct
      meshRef.current.count = columns.length;
    } else {
      // Data mode: Update Matrix
      meshRef.current.count = data.length;

      data.forEach((point, i) => {
        // Position
        // X and Z are space, Y is time (Y-up)
        tempObject.position.set(point.x, point.y, point.z);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);

        // Color
        const colorHex = COLOR_MAP[point.type] || '#FFFFFF';
        tempColor.set(colorHex);
        meshRef.current!.setColorAt(i, tempColor);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [data, columns]);

// Update uniforms
useEffect(() => {
  if (meshRef.current && meshRef.current.material) {
    const material = meshRef.current.material as THREE.Material;
    if (material.userData.shader) {
      material.userData.shader.uniforms.uUseColumns.value = columns ? 1 : 0;
    }
  }
}, [columns]);

useEffect(() => {
  if (!meshRef.current || !meshRef.current.material) return;
  const material = meshRef.current.material as THREE.Material;
  const shader = material.userData.shader;
  if (!shader) return;
  if (shader.uniforms.uTypeMap) {
    shader.uniforms.uTypeMap.value = typeSelectionMap;
  }
  if (shader.uniforms.uDistrictMap) {
    shader.uniforms.uDistrictMap.value = districtSelectionMap;
  }
}, [typeSelectionMap, districtSelectionMap]);

useEffect(() => {
  if (!meshRef.current || !meshRef.current.material) return;
  const material = meshRef.current.material as THREE.Material;
  const shader = material.userData.shader;
  if (!shader) return;
  if (shader.uniforms.uTimeMin) {
    shader.uniforms.uTimeMin.value = normalizedTimeRange[0];
  }
  if (shader.uniforms.uTimeMax) {
    shader.uniforms.uTimeMax.value = normalizedTimeRange[1];
  }
  // Update data bounds uniforms for projection
  if (shader.uniforms.uDataBoundsMin) {
    shader.uniforms.uDataBoundsMin.value.set(minX, minZ);
  }
  if (shader.uniforms.uDataBoundsMax) {
    shader.uniforms.uDataBoundsMax.value.set(maxX, maxZ);
  }
}, [normalizedTimeRange, minX, maxX, minZ, maxZ]);

useEffect(() => {
  if (!meshRef.current || !meshRef.current.material) return;
  const material = meshRef.current.material as THREE.Material;
  const shader = material.userData.shader;
  if (!shader) return;

  if (shader.uniforms.uHasBounds) {
    shader.uniforms.uHasBounds.value = normalizedSpatialBounds ? 1 : 0;
  }

  if (normalizedSpatialBounds) {
    if (shader.uniforms.uBoundsMin) {
      const value = shader.uniforms.uBoundsMin.value;
      if (value && typeof value.set === 'function') {
        value.set(normalizedSpatialBounds.min[0], normalizedSpatialBounds.min[1]);
      } else {
        shader.uniforms.uBoundsMin.value = normalizedSpatialBounds.min;
      }
    }
    if (shader.uniforms.uBoundsMax) {
      const value = shader.uniforms.uBoundsMax.value;
      if (value && typeof value.set === 'function') {
        value.set(normalizedSpatialBounds.max[0], normalizedSpatialBounds.max[1]);
      } else {
        shader.uniforms.uBoundsMax.value = normalizedSpatialBounds.max;
      }
    }
  }
}, [normalizedSpatialBounds]);

useEffect(() => {
  if (!meshRef.current || !meshRef.current.material) return;
  const material = meshRef.current.material as THREE.Material;
  const shader = material.userData.shader;
  if (!shader) return;
  if (shader.uniforms.uHasSelection) {
    shader.uniforms.uHasSelection.value = selectedIndex === null ? 0 : 1;
  }
  if (shader.uniforms.uSelectedIndex) {
    shader.uniforms.uSelectedIndex.value = selectedIndex ?? -1;
  }
}, [selectedIndex]);

// Animate transition
useFrame((state, delta) => {
  if (meshRef.current && meshRef.current.material) {
    const material = meshRef.current.material as THREE.Material;
    if (material.userData.shader) {
      const target = timeScaleMode === 'adaptive' ? 1 : 0;
      // Smoothly interpolate uTransition
      material.userData.shader.uniforms.uTransition.value = MathUtils.damp(
        material.userData.shader.uniforms.uTransition.value,
        target,
        5, // Speed/smoothness factor
        delta
      );
    }
  }
});

const onBeforeCompile = (shader: any) => {
  if (meshRef.current) {
    (meshRef.current.material as THREE.Material).userData.shader = shader;
  }

  applyGhostingShader(shader, {
    useColumns: Boolean(columns),
    typeMapSize: TYPE_MAP_SIZE,
    districtMapSize: DISTRICT_MAP_SIZE
  });
};

const handlePointerDown = useCallback(
  (event: any) => {
    event.stopPropagation();
    if (typeof event.instanceId !== 'number') return;
    setSelectedIndex(event.instanceId, 'cube');
  },
  [setSelectedIndex]
);

const handlePointerMissed = useCallback(
  (event: any) => {
    if (event.type !== 'pointerdown') return;
    clearSelection();
  },
  [clearSelection]
);

// Determine count
const count = columns ? columns.length : data.length;

return (
  <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, count]}
    onPointerDown={handlePointerDown}
    onPointerMissed={handlePointerMissed}
  >
    <sphereGeometry args={[0.5, 8, 8]}>
      <instancedBufferAttribute
        attach="attributes-adaptiveY"
        args={[adaptiveYValues, 1]}
      />
      <instancedBufferAttribute
        attach="attributes-filterType"
        args={[filterType, 1]}
      />
      <instancedBufferAttribute
        attach="attributes-filterDistrict"
        args={[filterDistrict, 1]}
      />
      {columns && (
        <>
          <instancedBufferAttribute attach="attributes-colX" args={[colX!, 1]} />
          <instancedBufferAttribute attach="attributes-colZ" args={[colZ!, 1]} />
          <instancedBufferAttribute attach="attributes-colLinearY" args={[colLinearY!, 1]} />
          <instancedBufferAttribute attach="instanceColor" args={[colors!, 3]} />
        </>
      )}
    </sphereGeometry>
    <meshStandardMaterial onBeforeCompile={onBeforeCompile} />
  </instancedMesh>
);
});

DataPoints.displayName = 'DataPoints';
