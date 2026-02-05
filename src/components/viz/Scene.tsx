'use client';

import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';

interface SceneProps {
  children?: ReactNode;
  transparent?: boolean;
}

export function Scene({ children, transparent = false }: SceneProps) {
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  return (
    <Canvas
      gl={{ alpha: true }}
      camera={{
        position: [50, 50, 50],
        fov: 45,
      }}
    >
      {!transparent && <color attach="background" args={[palette.background]} />}
      {!transparent && <fog attach="fog" args={[palette.background, 10, 500]} />}
      {children}
    </Canvas>
  );
}
