import React, { useRef, useLayoutEffect, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { extent } from 'd3-array';
import { CrimeEvent, CrimeType } from '@/types';
import { computeAdaptiveY, computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import { useTimeStore } from '@/store/useTimeStore';
import { useDataStore } from '@/store/useDataStore';

// Map crime types to colors
const COLOR_MAP: Record<string, string> = {
  'Theft': '#00FFFF', // Cyan
  'Assault': '#FF0000', // Red
  'Burglary': '#FFFF00', // Yellow
  'Robbery': '#FF00FF', // Magenta
  'Vandalism': '#00FF00', // Green
  'Other': '#CCCCCC'
};

const TYPE_ID_TO_COLOR: Record<number, THREE.Color> = {
  1: new THREE.Color('#00FFFF'),
  2: new THREE.Color('#FF0000'),
  3: new THREE.Color('#FFFF00'),
  4: new THREE.Color('#FF00FF'),
  5: new THREE.Color('#00FF00'),
  0: new THREE.Color('#CCCCCC')
};

interface DataPointsProps {
  data: CrimeEvent[];
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const DataPoints = forwardRef<THREE.InstancedMesh, DataPointsProps>(({ data }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const columns = useDataStore((state) => state.columns);
  
  useImperativeHandle(ref, () => meshRef.current!, []);

  // Calculate adaptive Y positions
  const { adaptiveYValues, colX, colZ, colLinearY, colors } = useMemo(() => {
    // Mode 1: Columnar Data (Real)
    if (columns) {
        const count = columns.length;
        const yRange: [number, number] = [0, 100];
        
        // Find extent from timestamps
        // timestamps are normalized 0-100 in store loadRealData?
        // Yes, we implemented normalization in loadRealData.
        // So timeRange for adaptive calculation is just [0, 100].
        // But computeAdaptiveYColumnar expects range.
        
        let minT = Infinity;
        let maxT = -Infinity;
        // Fast scan for extent if not trusted, but let's assume 0-100 or scan.
        // TypedArray scan is fast.
        for(let i=0; i<count; i++) {
            const t = columns.timestamp[i];
            if(t < minT) minT = t;
            if(t > maxT) maxT = t;
        }
        if (minT === Infinity) { minT = 0; maxT = 100; }
        
        const adaptive = computeAdaptiveYColumnar(columns.timestamp, [minT, maxT], yRange);
        
        // Colors
        const colorArray = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            const typeId = columns.type[i];
            const color = TYPE_ID_TO_COLOR[typeId] || TYPE_ID_TO_COLOR[0];
            colorArray[i*3] = color.r;
            colorArray[i*3+1] = color.g;
            colorArray[i*3+2] = color.b;
        }

        return {
            adaptiveYValues: adaptive,
            colX: columns.x,
            colZ: columns.z,
            colLinearY: columns.timestamp,
            colors: colorArray
        };
    }

    // Mode 2: Array Data (Mock)
    if (!data || data.length === 0) return { adaptiveYValues: new Float32Array(0) };

    const timeExtent = extent(data, d => d.timestamp) as [Date, Date];
    // Fallback if extent is undefined
    if (!timeExtent[0] || !timeExtent[1]) return { adaptiveYValues: new Float32Array(data.length).fill(0) };

    // Assuming Y range is 0 to 100 as per project context
    const yRange: [number, number] = [0, 100];
    
    // Bin count of 100 is default in computeAdaptiveY
    const adaptive = computeAdaptiveY(data, timeExtent, yRange);
    
    // Ensure no NaNs and valid length
    const result = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const val = adaptive[i];
        result[i] = (val === undefined || isNaN(val)) ? 0 : val;
    }
    
    return { adaptiveYValues: result };
  }, [data, columns]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Reset instanceMatrix to identity if using columns?
    // Actually, instancedMesh initializes with identity.
    // If we switch from data -> columns, we should clear/reset matrix?
    // But for Columns mode, we use attributes.
    // For Data mode, we update matrix.
    
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
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
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
    // Store shader reference for updates
    if (meshRef.current) {
        (meshRef.current.material as THREE.Material).userData.shader = shader;
    }

    shader.uniforms.uTimePlane = { value: 0 };
    shader.uniforms.uRange = { value: 10 };
    shader.uniforms.uTransition = { value: 0 };
    shader.uniforms.uUseColumns = { value: columns ? 1 : 0 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTransition;
      uniform float uUseColumns;
      
      attribute float adaptiveY;
      attribute float colX;
      attribute float colZ;
      attribute float colLinearY;
      
      varying float vWorldY;
      `
    );

    // Replace project_vertex to handle the position offset
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );

      float currentY = 0.0;
      
      if (uUseColumns > 0.5) {
         // Use attributes directly
         mvPosition.x += colX;
         mvPosition.z += colZ;
         // Linear Y
         currentY = colLinearY;
         mvPosition.y += colLinearY;
      } else {
         #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            currentY = instanceMatrix[3].y;
         #endif
      }
      
      // Adaptive Shift
      float targetY = adaptiveY;
      float yShift = (targetY - currentY) * uTransition;
      mvPosition.y += yShift;

      // Capture for fragment shader
      vWorldY = mvPosition.y;

      mvPosition = modelViewMatrix * mvPosition;

      gl_Position = projectionMatrix * mvPosition;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTimePlane;
      uniform float uRange;
      varying float vWorldY;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      
      float dist = abs(vWorldY - uTimePlane);
      
      if (dist > uRange) {
        gl_FragColor.rgb *= 0.2; // Dim by 80%
      }
      `
    );
  };

  // Determine count
  const count = columns ? columns.length : data.length;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
    >
      <sphereGeometry args={[0.5, 8, 8]}>
        <instancedBufferAttribute 
          attach="attributes-adaptiveY" 
          args={[adaptiveYValues, 1]} 
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
