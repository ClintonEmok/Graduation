'use client';

import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/ui';

export function Controls() {
  const controlsRef = useRef<CameraControls>(null);
  const resetVersion = useUIStore((state) => state.resetVersion);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset(true);
    }
  }, [resetVersion]);

  return (
    <CameraControls
      ref={controlsRef}
      smoothTime={0.25}
      minDistance={1}
      maxDistance={500}
      maxPolarAngle={Math.PI / 2}
    />
  );
}
