import React, { useRef, useLayoutEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { extent } from 'd3-array';
import { CrimeEvent, CrimeType } from '@/types';
import { computeAdaptiveY } from '@/lib/adaptive-scale';
import { useTimeStore } from '@/store/useTimeStore';

// Map crime types to colors
const COLOR_MAP: Record<CrimeType, string> = {
  Theft: '#00FFFF', // Cyan
  Assault: '#FF0000', // Red
  Burglary: '#FFFF00', // Yellow
  Robbery: '#FF00FF', // Magenta
  Vandalism: '#00FF00', // Green
};

interface DataPointsProps {
  data: CrimeEvent[];
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const DataPoints = forwardRef<THREE.InstancedMesh, DataPointsProps>(({ data }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  useImperativeHandle(ref, () => meshRef.current!, []);

  // Calculate adaptive Y positions
  const adaptiveYValues = useMemo(() => {
    if (!data || data.length === 0) return new Float32Array(0);

    const timeExtent = extent(data, d => d.timestamp) as [Date, Date];
    // Fallback if extent is undefined
    if (!timeExtent[0] || !timeExtent[1]) return new Float32Array(data.length).fill(0);

    // Assuming Y range is 0 to 100 as per project context
    const yRange: [number, number] = [0, 100];
    
    // Bin count of 100 is default in computeAdaptiveY, which matches the scale roughly
    const adaptive = computeAdaptiveY(data, timeExtent, yRange);
    return new Float32Array(adaptive);
  }, [data]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Set positions and colors for each instance
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

    // Add adaptiveY attribute
    meshRef.current.geometry.setAttribute(
        'adaptiveY',
        new THREE.InstancedBufferAttribute(adaptiveYValues, 1)
    );

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.geometry.attributes.adaptiveY.needsUpdate = true;

  }, [data, adaptiveYValues]);

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
    if (meshRef.current && meshRef.current.material) {
        (meshRef.current.material as THREE.Material).userData.shader = shader;
    }

    shader.uniforms.uTimePlane = { value: 0 };
    shader.uniforms.uRange = { value: 10 };
    shader.uniforms.uTransition = { value: 0 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTransition;
      attribute float adaptiveY;
      varying float vWorldY;
      `
    );

    // We replace project_vertex to handle the position offset
    // This ensures we modify the world position before projection
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );

      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif

      // Custom Adaptive Logic
      #ifdef USE_INSTANCING
        // instanceMatrix[3].y is the translation Y component (linear time Y)
        float originalY = instanceMatrix[3].y;
        
        // Interpolate between original Y and adaptive Y
        // We calculate the shift needed for the instance center
        float targetY = adaptiveY;
        float yShift = (targetY - originalY) * uTransition;
        
        // Apply shift to the world position
        mvPosition.y += yShift;
      #endif

      // Capture for fragment shader (before view transform)
      vWorldY = mvPosition.y;

      mvPosition = modelViewMatrix * vec4( transformed, 1.0 ); 
      // Wait, modelViewMatrix includes modelMatrix * viewMatrix.
      // But we just did instanceMatrix manually?
      // Standard project_vertex does:
      // mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( transformed, 1.0 );
      
      // Let's reconstruct carefully to match three.js behavior + our mod.
      // We already applied instanceMatrix.
      // Now apply modelMatrix (usually identity) and viewMatrix.
      
      mvPosition = modelMatrix * mvPosition;
      mvPosition = viewMatrix * mvPosition;
      
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

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.length]}
    >
      <sphereGeometry args={[0.5, 8, 8]} /> {/* Low poly sphere */}
      <meshStandardMaterial onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  );
});

DataPoints.displayName = 'DataPoints';
