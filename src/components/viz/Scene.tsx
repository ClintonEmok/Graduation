'use client';

import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';

interface SceneProps {
  children?: ReactNode;
  transparent?: boolean;
}

export function Scene({ children, transparent = false }: SceneProps) {
  return (
    <Canvas
      gl={{ alpha: true }}
      camera={{
        position: [50, 50, 50],
        fov: 45,
      }}
    >
      {!transparent && <color attach="background" args={['#000000']} />}
      {children}
    </Canvas>
  );
}
