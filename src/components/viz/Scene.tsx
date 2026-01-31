'use client';

import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';

interface SceneProps {
  children?: ReactNode;
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      camera={{
        position: [50, 50, 50],
        fov: 45,
      }}
    >
      <color attach="background" args={['#000000']} />
      {children}
    </Canvas>
  );
}
