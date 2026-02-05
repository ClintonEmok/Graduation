import React, { useRef, useLayoutEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAggregationStore } from '@/store/useAggregationStore';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const AggregatedBars: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const bins = useAggregationStore((state) => state.bins);
  const gridResolution = useAggregationStore((state) => state.gridResolution);
  const enabled = useAggregationStore((state) => state.enabled);
  const lodFactor = useAggregationStore((state) => state.lodFactor);

  const dx = 100 / gridResolution.x;
  const dy = 100 / gridResolution.y;
  const dz = 100 / gridResolution.z;

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    if (!enabled || bins.length === 0) {
      meshRef.current.count = 0;
      return;
    }

    meshRef.current.count = bins.length;

    bins.forEach((bin, i) => {
      const height = Math.min(bin.count * 0.5, dy); 
      tempObject.position.set(bin.x, bin.y, bin.z);
      tempObject.scale.set(dx * 0.9, height, dz * 0.9);
      tempObject.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      tempColor.set(bin.color);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [bins, dx, dy, dz, enabled]);

  useFrame(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.Material;
      if (material.userData.shader) {
        material.userData.shader.uniforms.uLodFactor.value = lodFactor;
      }
    }
  });

  const onBeforeCompile = useCallback((shader: any) => {
    shader.uniforms.uLodFactor = { value: 0 };
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uLodFactor;
      `
    );
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec3 transformedCopy = transformed * uLodFactor;
      vec4 mvPosition = vec4( transformedCopy, 1.0 );
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uLodFactor;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      if (uLodFactor < 0.05) discard;
      if (uLodFactor < 0.95) {
        if (mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) > uLodFactor * 2.0) {
          discard;
        }
      }
      `
    );

    if (meshRef.current) {
      (meshRef.current.material as THREE.Material).userData.shader = shader;
    }
  }, []);

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, 20000]} 
      visible={enabled && bins.length > 0 && lodFactor > 0.01}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  );
};
