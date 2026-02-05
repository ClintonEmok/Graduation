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
import { DataPoint, useDataStore } from '@/store/useDataStore';
import { computeAdaptiveY, computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import { getCrimeTypeId } from '@/lib/category-maps';
import { useTimeStore } from '@/store/useTimeStore';
import { useUIStore } from '@/store/ui';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { applyGhostingShader } from './shaders/ghosting';
import { useThemeStore } from '@/store/useThemeStore';
import { useSliceStore } from '@/store/useSliceStore';
import { PALETTES } from '@/lib/palettes';

interface DataPointsProps {
  data: DataPoint[];
}

const TYPE_MAP_SIZE = 36;
const DISTRICT_MAP_SIZE = 36;

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const DataPoints = forwardRef<THREE.InstancedMesh, DataPointsProps>(({ data }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useImperativeHandle(ref, () => meshRef.current!);

  const theme = useThemeStore((state) => state.theme);
  const colorMap = useMemo(() => PALETTES[theme].categoryColors, [theme]);

  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const showContext = useUIStore((state) => state.showContext);
  const contextOpacity = useUIStore((state) => state.contextOpacity);
  const columns = useDataStore((state) => state.columns);
  const minX = useDataStore((state) => state.minX) ?? -50;
  const maxX = useDataStore((state) => state.maxX) ?? 50;
  const minZ = useDataStore((state) => state.minZ) ?? -50;
  const maxZ = useDataStore((state) => state.maxZ) ?? 50;

  const timeRange = useTimeStore((state) => state.timeRange);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const spatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const clearSelection = useCoordinationStore((state) => state.clearSelection);

  // Normalize time range
  const normalizedTimeRange = useMemo(() => {
    return [
      (timeRange[0] - 0) / 100 * 100, // Assuming TIME_MIN/MAX are 0-100 in linear mode
      (timeRange[1] - 0) / 100 * 100
    ] as [number, number];
  }, [timeRange]);

  // Create selection maps for shader
  const typeSelectionMap = useMemo(() => {
    const map = new Float32Array(TYPE_MAP_SIZE);
    if (selectedTypes.length === 0) {
      map.fill(1);
    } else {
      selectedTypes.forEach((id) => {
        if (id >= 0 && id < TYPE_MAP_SIZE) map[id] = 1;
      });
    }
    return map;
  }, [selectedTypes]);

  const districtSelectionMap = useMemo(() => {
    const map = new Float32Array(DISTRICT_MAP_SIZE);
    if (selectedDistricts.length === 0) {
      map.fill(1);
    } else {
      selectedDistricts.forEach((id) => {
        if (id >= 0 && id < DISTRICT_MAP_SIZE) map[id] = 1;
      });
    }
    return map;
  }, [selectedDistricts]);

  const normalizedSpatialBounds = useMemo(() => {
    if (!spatialBounds) return null;
    return {
      min: [spatialBounds.minX, spatialBounds.minZ],
      max: [spatialBounds.maxX, spatialBounds.maxZ]
    };
  }, [spatialBounds]);

  const adaptiveYValues = useMemo(() => {
    if (columns) {
      return computeAdaptiveYColumnar(columns.timestamp, [0, 100], [0, 100]);
    }
    return new Float32Array(computeAdaptiveY(data, [0, 100], [0, 100]));
  }, [data, columns]);

  const { filterType, filterDistrict, colors, colX, colZ, colLinearY } = useMemo(() => {
    const count = columns ? columns.length : data.length;
    const types = new Float32Array(count);
    const districts = new Float32Array(count);

    if (columns) {
      return {
        filterType: columns.type,
        filterDistrict: columns.district,
        colors: new Float32Array(columns.length * 3), // Handled by attributes-colX/Z logic or pre-computed colors?
        colX: columns.x,
        colZ: columns.z,
        colLinearY: columns.timestamp
      };
    }

    const colorArr = new Float32Array(count * 3);
    data.forEach((point, i) => {
      types[i] = getCrimeTypeId(point.type);
      districts[i] = point.districtId || 0;
      // Use colorMap from store, normalize point type to UPPERCASE
      const typeKey = point.type.toUpperCase();
      // Try exact match, or 'OTHER'
      const colorHex = colorMap[typeKey] || colorMap[point.type] || colorMap['OTHER'] || '#FFFFFF';
      
      const c = new THREE.Color(colorHex);
      colorArr[i * 3] = c.r;
      colorArr[i * 3 + 1] = c.g;
      colorArr[i * 3 + 2] = c.b;
    });

    return {
      filterType: types,
      filterDistrict: districts,
      colors: colorArr,
      colX: null,
      colZ: null,
      colLinearY: null
    };
  }, [data, columns, colorMap]);

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
        const typeKey = point.type.toUpperCase();
        const colorHex = colorMap[typeKey] || colorMap[point.type] || colorMap['OTHER'] || '#FFFFFF';
        tempColor.set(colorHex);
        meshRef.current!.setColorAt(i, tempColor);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [data, columns, colorMap]);

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

        // Update Slices
        const slices = useSliceStore.getState().slices;
        const activeSlices = slices.filter(s => s.isVisible);
        const shader = material.userData.shader;
        
        if (shader.uniforms.uSliceCount) {
          shader.uniforms.uSliceCount.value = activeSlices.length;
        }
        
        if (shader.uniforms.uSlices && shader.uniforms.uSlices.value) {
          const sliceTimes = shader.uniforms.uSlices.value;
          for (let i = 0; i < 20; i++) {
            if (i < activeSlices.length) {
              sliceTimes[i] = activeSlices[i].time;
            } else {
              sliceTimes[i] = -9999;
            }
          }
        }
      }
    }
  });

  const onBeforeCompile = (shader: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
    (event: { stopPropagation: () => void; instanceId?: number }) => {
      event.stopPropagation();
      if (typeof event.instanceId !== 'number') return;
      setSelectedIndex(event.instanceId, 'cube');
    },
    [setSelectedIndex]
  );

  const handlePointerMissed = useCallback(
    (event: { type: string }) => {
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
