'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { KdeCell, EvolvingSlice } from '../lib/types';

const SLICE_SPACING = 7.25;
const START_Y = -32.625;
const TEXTURE_SIZE = 256;

function yForIndex(index: number): number {
  return START_Y + index * SLICE_SPACING;
}

function kdeColor(t: number): string {
  const intensity = Math.min(1, Math.max(0, t));
  if (intensity < 0.33) {
    const g = Math.round(intensity * 3 * 160);
    const b = Math.round(80 + intensity * 3 * 175);
    return `rgb(5, ${g}, ${b})`;
  }
  if (intensity < 0.66) {
    const r = Math.round((intensity - 0.33) * 3 * 220);
    const g = Math.round(160 - (intensity - 0.33) * 3 * 100);
    const b = Math.round(255 - (intensity - 0.33) * 3 * 200);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const r = Math.round(220 + (intensity - 0.66) * 3 * 35);
  const g = Math.round(60 - (intensity - 0.66) * 3 * 55);
  const b = Math.round(55 - (intensity - 0.66) * 3 * 55);
  return `rgb(${Math.min(255, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

function buildHeatmapTexture(cells: KdeCell[]): THREE.CanvasTexture | null {
  if (cells.length === 0 || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (const cell of cells) {
    const cx = ((cell.x + 50) / 100) * TEXTURE_SIZE;
    const cy = TEXTURE_SIZE - ((cell.z + 50) / 100) * TEXTURE_SIZE;
    const intensity = Math.min(1, Math.max(0, cell.intensity));
    const radius = Math.max(8, intensity * 40);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, kdeColor(intensity));
    gradient.addColorStop(0.6, kdeColor(intensity * 0.5));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

interface StkdeSliceStackProps {
  slices: EvolvingSlice[];
  sliceKdes: KdeCell[][];
  activeIndex: number;
}

export function StkdeSliceStack({
  slices,
  sliceKdes,
  activeIndex,
}: StkdeSliceStackProps) {
  const textures = useMemo(() => {
    const newTextures = new Map<number, THREE.CanvasTexture>();
    for (let i = 0; i < sliceKdes.length; i++) {
      const tex = buildHeatmapTexture(sliceKdes[i] ?? []);
      if (tex) {
        newTextures.set(i, tex);
      }
    }
    return newTextures;
  }, [sliceKdes]);

  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex.dispose());
    };
  }, [textures]);

  return (
    <group>
      {slices.map((slice) => {
        const i = slice.index;
        const y = yForIndex(i);
        const diff = Math.abs(i - activeIndex);
        const isActive = diff === 0;
        const isAdjacent = diff === 1;
        const opacityMultiplier = isActive
          ? 1
          : isAdjacent
            ? 0.35
            : 0.1;

        const gridOpacity = isActive ? 0.25 : isAdjacent ? 0.1 : 0.03;
        const planeOpacity = Math.min(0.95, 0.85 * opacityMultiplier);
        const texture = textures.get(i) ?? undefined;

        const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;

        return (
          <group key={slice.index} position={[0, y, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[100, 100]} />
                <meshBasicMaterial
                  map={texture}
                  transparent
                  opacity={planeOpacity}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
            </mesh>

            <gridHelper
              args={[100, 10]}
              position={[0, 0.05, 0]}
              rotation={[0, 0, 0]}
            >
              <meshBasicMaterial
                color="#94a3b8"
                transparent
                opacity={gridOpacity}
              />
            </gridHelper>

            {isActive && (
              <>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.08, 0]}
                >
                  <ringGeometry args={[49.2, 50, 64]} />
                  <meshBasicMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.7}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.1, 0]}
                >
                  <ringGeometry args={[48.5, 49.8, 64]} />
                  <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}

            {isAdjacent && (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.06, 0]}
              >
                <ringGeometry args={[49.4, 50, 64]} />
                <meshBasicMaterial
                  color="#94a3b8"
                  transparent
                  opacity={0.2}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            <Html position={[52, 0, 0]} center className="pointer-events-none select-none">
              <div
                className={`rounded-md border px-2 py-1 text-[10px] leading-tight shadow-sm ${
                  isActive
                    ? 'border-sky-400/60 bg-slate-950/95 text-sky-100'
                    : 'border-slate-600/40 bg-slate-950/80 text-slate-400'
                }`}
              >
                <div className="font-medium tracking-wide">
                  {slice.label}
                </div>
                <div className="flex gap-2 text-[9px] uppercase tracking-[0.15em]">
                  <span
                    className={
                      slice.burstScore > 0.5
                        ? 'text-amber-300'
                        : 'text-slate-500'
                    }
                  >
                    burst {burstLabel}
                  </span>
                  <span className="text-slate-500">
                    {slice.crimeCount} ev
                  </span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
