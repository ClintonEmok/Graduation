import React, { useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { CrimeEvent, CrimeType } from '@/types';

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

  useImperativeHandle(ref, () => meshRef.current!, []);

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

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
    }

  }, [data]);

  const onBeforeCompile = (shader: THREE.Shader) => {
    // Store shader reference for updates
    if (meshRef.current && meshRef.current.material) {
        (meshRef.current.material as THREE.Material).userData.shader = shader;
    }

    shader.uniforms.uTimePlane = { value: 0 };
    shader.uniforms.uRange = { value: 10 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying float vWorldY;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Calculate world Y position for the instance
      // Using instanceMatrix to transform position to world space (assuming mesh at 0,0,0)
      vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      vWorldY = worldPosition.y;
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
      <sphereGeometry args={[0.5, 8, 8]} /> {/* Low poly sphere: radius 0.5, widthSeg 8, heightSeg 8 */}
      <meshStandardMaterial onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  );
});

DataPoints.displayName = 'DataPoints';
