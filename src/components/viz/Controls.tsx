'use client';

import { CameraControls } from '@react-three/drei';

export function Controls() {
  return (
    <CameraControls
      smoothTime={0.25}
      minDistance={1}
      maxDistance={500}
      maxPolarAngle={Math.PI / 2}
    />
  );
}
