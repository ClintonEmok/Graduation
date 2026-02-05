import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useAggregationStore } from '@/store/useAggregationStore';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const AggregatedBars: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const bins = useAggregationStore((state) => state.bins);
  const gridResolution = useAggregationStore((state) => state.gridResolution);
  const enabled = useAggregationStore((state) => state.enabled);

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
      // Bar height corresponds to event count in the bin
      // Height = count * 0.5, clamped to avoid vertical overlap if possible
      const height = Math.min(bin.count * 0.5, dy); 
      
      // Position: Each instance should be at the bin's (x, y, z) center.
      tempObject.position.set(bin.x, bin.y, bin.z);
      
      // Scale: X and Z scales should match the bin size.
      // Use a slight multiplier (0.9) to make them look like distinct bars
      tempObject.scale.set(dx * 0.9, height, dz * 0.9);
      tempObject.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // Color: Use the dominant type's color from the bin.
      tempColor.set(bin.color);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [bins, dx, dy, dz, enabled]);

  // We always return the mesh but control visibility via count and enabled
  // This avoids unmounting/remounting which can be expensive for instancedMesh
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, 20000]} 
      visible={enabled && bins.length > 0}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
};
