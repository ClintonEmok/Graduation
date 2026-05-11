import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';
import type { FilteredPoint } from '@/lib/data/types';
import { getCrimeTypeName } from '@/lib/category-maps';

interface SliceCrimePointsProps {
  points: FilteredPoint[];
  maxPoints?: number;
}

export function SliceCrimePoints({ points, maxPoints = 10000 }: SliceCrimePointsProps) {
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  const sampled = useMemo(() => {
    if (points.length <= maxPoints) return points;
    const step = Math.ceil(points.length / maxPoints);
    const result: FilteredPoint[] = [];
    for (let i = 0; i < points.length; i += step) {
      result.push(points[i]);
    }
    return result;
  }, [points, maxPoints]);

  const { positions, colors } = useMemo(() => {
    if (sampled.length === 0) return { positions: new Float32Array(0), colors: new Float32Array(0) };

    const pos = new Float32Array(sampled.length * 3);
    const col = new Float32Array(sampled.length * 3);
    const color = new THREE.Color();

    for (let i = 0; i < sampled.length; i++) {
      const p = sampled[i];
      const i3 = i * 3;
      pos[i3] = (p.x - 50) * 2;
      pos[i3 + 1] = 0.01;
      pos[i3 + 2] = (p.z - 50) * 2;

      const typeName = getCrimeTypeName(p.typeId);
      const key = typeName?.toUpperCase() ?? 'OTHER';
      const hex = palette.categoryColors[key] ?? palette.categoryColors['OTHER'] ?? '#ffffff';
      color.set(hex);
      col[i3] = color.r;
      col[i3 + 1] = color.g;
      col[i3 + 2] = color.b;
    }

    return { positions: pos, colors: col };
  }, [sampled, palette]);

  if (sampled.length === 0) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.6} sizeAttenuation vertexColors depthWrite={false} transparent opacity={0.85} />
    </points>
  );
}
