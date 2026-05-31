'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { buildAgingOpacityMap, computeTrailIntensity } from '@/lib/motion/aging';
import { easeInOutCubic, interpolateKdeCells } from '@/lib/motion/easing';
import type { KdeCell, EvolvingSlice } from '../lib/types';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';

export const SLICE_SPACING = 7.25;
export const START_Y = -32.625;
const TEXTURE_SIZE = 256;
const TRAIL_HISTORY_LIMIT = 4;
const TRANSITION_DURATION_MS = 240;

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

function flattenKdeCells(cells: KdeCell[]): Float32Array {
  const flat = new Float32Array(cells.length * 4);
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i]!;
    flat[i * 4] = cell.x;
    flat[i * 4 + 1] = cell.z;
    flat[i * 4 + 2] = cell.intensity;
    flat[i * 4 + 3] = cell.support;
  }
  return flat;
}

function unflattenKdeCells(flat: Float32Array): KdeCell[] {
  const cells: KdeCell[] = [];
  for (let i = 0; i < flat.length / 4; i += 1) {
    cells.push({
      x: flat[i * 4],
      z: flat[i * 4 + 1],
      intensity: flat[i * 4 + 2],
      support: flat[i * 4 + 3],
    });
  }
  return cells;
}

function buildInterpolatedTexture(
  fromCells: KdeCell[] | undefined,
  toCells: KdeCell[] | undefined,
  t: number,
): THREE.CanvasTexture | null {
  if (!fromCells || !toCells || fromCells.length === 0 || toCells.length === 0) return null;

  if (fromCells.length !== toCells.length) {
    return buildHeatmapTexture(toCells);
  }

  const interpolated = interpolateKdeCells(flattenKdeCells(fromCells), flattenKdeCells(toCells), t);
  return buildHeatmapTexture(unflattenKdeCells(interpolated));
}

interface StkdeSliceStackProps {
  slices: EvolvingSlice[];
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  activeIndex: number;
  compact?: boolean;
  sliceOpacity?: number;
}

interface ActiveTrailEntry {
  index: number;
  startedAt: number;
}

interface SliceTransition {
  fromIndex: number;
  toIndex: number;
  startedAt: number;
}

export function StkdeSliceStack({
  slices,
  sliceKdes,
  volumeProfile,
  activeIndex,
  compact = false,
  sliceOpacity = 1,
}: StkdeSliceStackProps) {
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const isInterpolated = useDashboardDemoCoordinationStore((state) => state.inspectInterpolation);
  const trailEnabled = useDashboardDemoCoordinationStore((state) => state.inspectTrailEnabled);
  const trailDecay = useDashboardDemoCoordinationStore((state) => state.inspectTrailDecay);

  const textures = useMemo(() => {
    const newTextures = new Map<number, THREE.CanvasTexture>();
    for (let i = 0; i < sliceKdes.length; i += 1) {
      const tex = buildHeatmapTexture(sliceKdes[i] ?? []);
      if (tex) {
        newTextures.set(i, tex);
      }
    }
    return newTextures;
  }, [sliceKdes]);

  const agingOpacityMap = useMemo(
    () => buildAgingOpacityMap(activeIndex, slices.length, trailDecay),
    [activeIndex, slices.length, trailDecay],
  );
  const [trailHistory, setTrailHistory] = useState<ActiveTrailEntry[]>([]);
  const [transition, setTransition] = useState<SliceTransition | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const previousActiveIndexRef = useRef(activeIndex);

  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex.dispose());
    };
  }, [textures]);

  useEffect(() => {
    const previousIndex = previousActiveIndexRef.current;
    previousActiveIndexRef.current = activeIndex;

    if (previousIndex === activeIndex || previousIndex < 0) return;

    setTrailHistory((history) => {
      const nextHistory = [{ index: previousIndex, startedAt: Date.now() }, ...history];
      return nextHistory.slice(0, TRAIL_HISTORY_LIMIT);
    });

    if (!isPlaying || !isInterpolated) {
      setTransition(null);
      return;
    }

    setTransition({ fromIndex: previousIndex, toIndex: activeIndex, startedAt: performance.now() });
  }, [activeIndex, isInterpolated, isPlaying]);

  useEffect(() => {
    if (!trailEnabled && trailHistory.length === 0 && !transition) return undefined;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 80);

    return () => window.clearInterval(interval);
  }, [trailEnabled, trailHistory.length, transition]);

  const transitionProgress = useMemo(
    () => (transition ? clamp01((nowMs - transition.startedAt) / TRANSITION_DURATION_MS) : 0),
    [nowMs, transition],
  );

  const transitionTexture = useMemo(() => {
    if (!transition || !isPlaying || !isInterpolated) return null;
    const fromCells = sliceKdes[transition.fromIndex];
    const toCells = sliceKdes[transition.toIndex];
    return buildInterpolatedTexture(fromCells, toCells, easeInOutCubic(transitionProgress));
  }, [isInterpolated, isPlaying, sliceKdes, transition, transitionProgress]);

  useEffect(() => {
    return () => {
      transitionTexture?.dispose();
    };
  }, [transitionTexture]);

  const trailHistoryByIndex = useMemo(() => {
    const map = new Map<number, ActiveTrailEntry>();
    for (const entry of trailHistory) {
      if (!map.has(entry.index)) {
        map.set(entry.index, entry);
      }
    }
    return map;
  }, [trailHistory]);

  return (
    <group>
      {slices.map((slice) => {
        const i = slice.index;
        const y = compact ? 0 : yForIndex(i);
        const diff = Math.abs(i - activeIndex);
        const isActive = diff === 0;
        const isAdjacent = diff === 1;
        const agingWeight = trailEnabled ? 0.28 + agingOpacityMap[i]! * 0.72 : 1;
        const opacityMultiplier = isActive
          ? 1
          : isAdjacent
            ? 0.35
            : 0.1;

        const gridOpacity = isActive ? 0.08 : isAdjacent ? 0.03 : 0.01;
        const volume = volumeProfile?.[i];
        const hasVolume = Boolean(volume);
        const thickness = volume?.thickness ?? 0.3;
        const surfaceY = hasVolume ? thickness / 2 + 0.05 : 0;
        const baseMultiplier = opacityMultiplier * agingWeight * sliceOpacity;
        const slabOpacity = hasVolume
          ? Math.min(0.26, Math.max(0.08, (volume?.opacity ?? 0.18) * baseMultiplier))
          : 0;
        const surfaceOpacity = hasVolume
          ? Math.min(0.82, Math.max(0.16, ((volume?.opacity ?? 0.18) + 0.18) * baseMultiplier))
          : Math.min(0.85, 0.3 * baseMultiplier);
        const underlayOpacity = hasVolume
          ? Math.max(0.04, surfaceOpacity * (0.22 + (volume?.falloff ?? 0.1)))
          : 0;
        const texture = textures.get(i) ?? undefined;
        const trailEntry = trailHistoryByIndex.get(i);
        const trailIntensity = trailEntry
          ? computeTrailIntensity((nowMs - trailEntry.startedAt) / 1000, Math.max(0.12, trailDecay * 2.4))
          : 0;
        const trailOpacity = trailEnabled && !isActive ? Math.max(0, trailIntensity * 0.18) : 0;
        const trailOffset = trailEnabled && !isActive ? Math.min(0.5, trailIntensity * 0.28) : 0;

        const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;

        return (
          <group key={slice.index} position={[0, y, 0]}>
            {hasVolume ? (
              <>
                <mesh position={[0, thickness / 2, 0]}>
                  <boxGeometry args={[100, thickness, 100]} />
                  <meshStandardMaterial
                    color={isActive ? '#132238' : '#0f172a'}
                    transparent
                    opacity={slabOpacity}
                    roughness={0.96}
                    metalness={0.02}
                    depthWrite={false}
                  />
                </mesh>

                {texture ? (
                  <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, surfaceY + 0.01, 0]}>
                      <planeGeometry args={[100 - (volume?.falloff ?? 0.1) * 6, 100 - (volume?.falloff ?? 0.1) * 6]} />
                      <meshBasicMaterial
                        map={texture}
                        transparent
                        opacity={surfaceOpacity}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>

                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, surfaceY - 0.03, 0]}>
                      <planeGeometry args={[96 - (volume?.falloff ?? 0.1) * 8, 96 - (volume?.falloff ?? 0.1) * 8]} />
                      <meshBasicMaterial
                        map={texture}
                        transparent
                        opacity={underlayOpacity}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                  </>
                ) : null}
              </>
            ) : (
              texture ? (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[100, 100]} />
                  <meshBasicMaterial
                    map={texture}
                    transparent
                    opacity={surfaceOpacity}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              ) : null
            )}

            {trailEnabled && trailOpacity > 0 && texture ? (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, hasVolume ? surfaceY + 0.06 + trailOffset : 0.04 + trailOffset, 0]}
                renderOrder={-50 + i}
              >
                <planeGeometry args={[96, 96]} />
                <meshBasicMaterial
                  map={texture}
                  transparent
                  opacity={trailOpacity}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}

            <gridHelper
              args={[100, 10]}
              position={[0, hasVolume ? surfaceY + 0.04 : 0.05, 0]}
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
                  position={[0, hasVolume ? surfaceY + 0.1 : 0.08, 0]}
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
                  position={[0, hasVolume ? surfaceY + 0.12 : 0.1, 0]}
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
                position={[0, hasVolume ? surfaceY + 0.08 : 0.06, 0]}
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

            {transitionTexture && transition && i === transition.toIndex ? (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, hasVolume ? surfaceY + 0.16 : 0.12, 0]}
                renderOrder={100 + i}
              >
                <planeGeometry args={[98, 98]} />
                <meshBasicMaterial
                  map={transitionTexture}
                  transparent
                  opacity={0.34 * easeInOutCubic(transitionProgress)}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
