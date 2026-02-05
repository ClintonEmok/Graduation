import React from 'react';
import { useFrame, RootState } from '@react-three/fiber';
import { MathUtils } from 'three';
import { useAggregationStore } from '@/store/useAggregationStore';

const NEAR_LIMIT = 100;
const FAR_LIMIT = 300;

export const LODController: React.FC = () => {
  const setLodFactor = useAggregationStore((state) => state.setLodFactor);

  useFrame((state: RootState) => {
    const { camera } = state;
    // Distance from origin (cube center)
    const distance = camera.position.length();
    
    // Map distance to lodFactor [0, 1]
    // lodFactor = 0 at NEAR_LIMIT
    // lodFactor = 1 at FAR_LIMIT
    // We use smoothstep for a non-linear transition
    const t = MathUtils.clamp(
      (distance - NEAR_LIMIT) / (FAR_LIMIT - NEAR_LIMIT),
      0,
      1
    );
    
    const factor = MathUtils.smoothstep(t, 0, 1);
    
    // Update store
    setLodFactor(factor);
  });

  return null;
};
