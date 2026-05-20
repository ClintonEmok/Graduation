'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { KdeCell, EvolvingSlice } from '../lib/types';

export const SLICE_SPACING = 7.25;
export const START_Y = -32.625;
const TEXTURE_SIZE = 256;

export function yForIndex(index: number): number {
  return START_Y + index * SLICE_SPACING;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

function kdeColor(t: number): string {
  const intensity = clamp01(t);

  type ColorStop = { stop: number; color: [number, number, number] };

  const stops: ColorStop[] = [
    { stop: 0, color: [34, 76, 255] },
    { stop: 0.28, color: [0, 212, 255] },
    { stop: 0.55, color: [42, 255, 163] },
    { stop: 0.75, color: [255, 214, 64] },
    { stop: 0.9, color: [255, 122, 42] },
    { stop: 1, color: [255, 64, 96] },
  ];

  let left = stops[0];
  let right = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i]!;
    const next = stops[i + 1]!;
    if (intensity >= current.stop && intensity <= next.stop) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(0.0001, right.stop - left.stop);
  const localT = (intensity - left.stop) / span;
  const r = lerp(left.color[0], right.color[0], localT);
  const g = lerp(left.color[1], right.color[1], localT);
  const b = lerp(left.color[2], right.color[2], localT);
  const alpha = lerp(0.22, 0.98, intensity ** 0.85);

  return rgba(r, g, b, alpha);
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
    const radius = Math.max(10, intensity * 44);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, kdeColor(intensity));
    gradient.addColorStop(0.42, kdeColor(intensity * 0.72));
    gradient.addColorStop(0.78, kdeColor(intensity * 0.24));
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
  compact?: boolean;
  sliceOpacity?: number;
}

export function StkdeSliceStack({
  slices,
  sliceKdes,
  activeIndex,
  compact = false,
  sliceOpacity = 1,
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
        const y = compact ? 0 : yForIndex(i);
        const diff = Math.abs(i - activeIndex);
        const isActive = diff === 0;
        const isAdjacent = diff === 1;
        const opacityMultiplier = isActive
          ? 1
          : isAdjacent
            ? 0.35
            : 0.1;

        const gridOpacity = isActive ? 0.08 : isAdjacent ? 0.03 : 0.01;
        const planeOpacity = Math.min(0.85, 0.3 * opacityMultiplier * sliceOpacity);
        const texture = textures.get(i) ?? undefined;

        const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;

        return (
          <group key={slice.index} position={[0, y, 0]}>
            {texture ? (
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
            ) : null}

            <gridHelper
              args={[100, 10]}
              position={[0, 0.05, 0]}
              rotation={[0, 0, 0]}
            >
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={gridOpacity * 0.5}
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
                    opacity={0.2}
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
                    opacity={0.08}
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
                  color="#38bdf8"
                  transparent
                  opacity={0.05}
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
                    : 'border-sky-800/40 bg-slate-950/80 text-sky-300'
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
                        : 'text-sky-400'
                    }
                  >
                    burst {burstLabel}
                  </span>
                  <span className="text-sky-500">
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
