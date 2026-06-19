'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { buildAgingOpacityMap, computeTrailIntensity } from '@/lib/motion/aging';
import { easeInOutCubic, interpolateKdeCells } from '@/lib/motion/easing';
import { epochSecondsToNormalized, normalizedToEpochSeconds } from '@/lib/time-domain';
import { toDisplaySeconds, toLinearSeconds } from '@/components/timeline/hooks/useScaleTransforms';
import type { KdeCell, EvolvingSlice } from '../lib/types';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import type { TimeSlice } from '@/store/slice-domain/types';

export const SLICE_SPACING = 7.25;
export const START_Y = -32.625;
const TEXTURE_SIZE = 256;
const TRAIL_HISTORY_LIMIT = 4;
const TRANSITION_DURATION_MS = 240;
const MIN_RESIZE_DURATION_SEC = 3600;
const normalizeWarpBlend = (warpFactor: number): number => Math.min(1, Math.max(0, warpFactor / 3));

export function yForIndex(index: number): number {
  return START_Y + index * SLICE_SPACING;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const span = Math.max(1e-9, inMax - inMin);
  const t = clamp((value - inMin) / span, 0, 1);
  return outMin + t * (outMax - outMin);
}

function formatRangeLabel(startEpoch: number, endEpoch: number): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(new Date(startEpoch * 1000))} → ${formatter.format(new Date(endEpoch * 1000))}`;
}

function resolveSliceEpochRange(
  slice: TimeSlice,
  minTimestampSec: number,
  maxTimestampSec: number,
): [number, number] {
  if (slice.startDateTimeMs !== undefined || slice.endDateTimeMs !== undefined) {
    const startMs = slice.startDateTimeMs ?? slice.endDateTimeMs ?? 0;
    const endMs = slice.endDateTimeMs ?? slice.startDateTimeMs ?? startMs;
    const start = startMs / 1000;
    const end = endMs / 1000;
    return start <= end ? [start, end] : [end, start];
  }

  if (slice.type === 'range' && slice.range) {
    const start = normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec);
    return start <= end ? [start, end] : [end, start];
  }

  const time = normalizedToEpochSeconds(slice.time, minTimestampSec, maxTimestampSec);
  return [time, time];
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

type ResizeHandle = 'start' | 'end';

interface DragState {
  sliceId: string;
  sliceIndex: number;
  handle: ResizeHandle;
  pointerId: number;
  centerY: number;
  startEpoch: number;
  endEpoch: number;
  previewStartEpoch: number;
  previewEndEpoch: number;
}

interface SliceTransition {
  fromIndex: number;
  toIndex: number;
  startedAt: number;
}

interface OrderedSourceSlice {
  sourceSliceId: string;
  index: number;
  startEpoch: number;
  endEpoch: number;
}

function buildOrderedSourceSlices(
  sourceSlices: TimeSlice[],
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
): OrderedSourceSlice[] {
  if (minTimestampSec === null || maxTimestampSec === null) return [];

  return sourceSlices
    .filter((slice) => slice.isVisible && slice.type === 'range')
    .map((slice, originalIndex) => {
      const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
      return {
        sourceSliceId: slice.id,
        index: originalIndex,
        startEpoch,
        endEpoch,
      };
    })
    .sort((left, right) => {
      const startDelta = left.startEpoch - right.startEpoch;
      if (startDelta !== 0) return startDelta;
      const endDelta = left.endEpoch - right.endEpoch;
      if (endDelta !== 0) return endDelta;
      return left.sourceSliceId.localeCompare(right.sourceSliceId);
    });
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
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const warpBlend = useMemo(() => normalizeWarpBlend(warpFactor), [warpFactor]);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const activeSliceId = useSliceDomainStore((state) => state.activeSliceId);
  const sourceSlices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const { camera, gl } = useThree();

  const [dragState, setDragState] = useState<DragState | null>(null);

  const orderedSourceSliceIds = useMemo(() => {
    return buildOrderedSourceSlices(sourceSlices, minTimestampSec, maxTimestampSec).map((slice) => slice.sourceSliceId);
  }, [maxTimestampSec, minTimestampSec, sourceSlices]);

  const adaptiveDomain = useMemo<[number, number]>(() => {
    if (!Number.isFinite(viewportStart) || !Number.isFinite(viewportEnd) || viewportEnd <= viewportStart) {
      return [0, 1];
    }
    return [viewportStart, viewportEnd];
  }, [viewportEnd, viewportStart]);
  const warpDomain = useMemo<[number, number]>(() => (
    mapDomain[1] > mapDomain[0] ? mapDomain : adaptiveDomain
  ), [mapDomain, adaptiveDomain]);
  const warpDomainDisplay = useMemo<[number, number]>(() => {
    if (timeScaleMode !== 'adaptive' || warpBlend <= 0 || !warpMap || warpMap.length < 2) {
      return warpDomain;
    }

    return [
      toDisplaySeconds(warpDomain[0], warpBlend, warpMap, warpDomain),
      toDisplaySeconds(warpDomain[1], warpBlend, warpMap, warpDomain),
    ];
  }, [timeScaleMode, warpDomain, warpBlend, warpMap]);

  const stackEndY = useMemo(() => START_Y + SLICE_SPACING * Math.max(1, slices.length - 1), [slices.length]);

  const resolveSliceY = useMemo(
    () => (slice: EvolvingSlice): number => {
      if (timeScaleMode !== 'adaptive' || warpBlend <= 0 || !warpMap || warpMap.length < 2) {
        return compact ? 0 : yForIndex(slice.index);
      }

      const midEpoch = (slice.startEpoch + slice.endEpoch) / 2;
      const displayEpoch = toDisplaySeconds(midEpoch, warpBlend, warpMap, warpDomain);
      return mapRange(displayEpoch, warpDomainDisplay[0], warpDomainDisplay[1], START_Y, stackEndY);
    },
    [compact, warpDomainDisplay, stackEndY, timeScaleMode, warpBlend, warpDomain, warpMap]
  );

  const resolveSourceSliceId = useCallback(
    (sliceIndex: number): string | null => {
      if (compact) {
        return activeSliceId ?? orderedSourceSliceIds[0] ?? null;
      }

      return orderedSourceSliceIds[sliceIndex] ?? null;
    },
    [activeSliceId, compact, orderedSourceSliceIds]
  );

  const yToEpoch = useCallback(
    (y: number): number => {
      if (timeScaleMode === 'adaptive' && warpMap && warpBlend > 0 && warpMap.length > 1) {
        const displayEpoch = mapRange(y, START_Y, stackEndY, warpDomainDisplay[0], warpDomainDisplay[1]);
        return toLinearSeconds(displayEpoch, warpDomain, warpBlend, warpMap, warpDomain);
      }

      return mapRange(y, START_Y, stackEndY, warpDomain[0], warpDomain[1]);
    },
    [warpDomainDisplay, stackEndY, timeScaleMode, warpBlend, warpDomain, warpMap]
  );

  const resolvePointerY = useCallback(
    (clientX: number, clientY: number, planeY: number): number => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        cameraDirection.clone().negate(),
        new THREE.Vector3(0, planeY, 0),
      );

      const target = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, target);
      return intersection?.y ?? planeY;
    },
    [camera, gl.domElement]
  );

  const commitResize = useCallback((state: DragState) => {
    const startEpoch = Math.min(state.previewStartEpoch, state.previewEndEpoch);
    const endEpoch = Math.max(state.previewStartEpoch, state.previewEndEpoch);
    const midpointEpoch = (startEpoch + endEpoch) / 2;
    const normalizedStart = minTimestampSec !== null && maxTimestampSec !== null
      ? epochSecondsToNormalized(startEpoch, minTimestampSec, maxTimestampSec)
      : null;
    const normalizedEnd = minTimestampSec !== null && maxTimestampSec !== null
      ? epochSecondsToNormalized(endEpoch, minTimestampSec, maxTimestampSec)
      : null;

    updateSlice(state.sliceId, {
      startDateTimeMs: startEpoch * 1000,
      endDateTimeMs: endEpoch * 1000,
      time: normalizedStart !== null && normalizedEnd !== null
        ? (normalizedStart + normalizedEnd) / 2
        : midpointEpoch,
      ...(normalizedStart !== null && normalizedEnd !== null ? { range: [normalizedStart, normalizedEnd] as [number, number] } : {}),
    });

    setActiveSlice(state.sliceId);
    const nextOrderedSliceIds = buildOrderedSourceSlices(
      useSliceDomainStore.getState().slices,
      minTimestampSec,
      maxTimestampSec,
    ).map((slice) => slice.sourceSliceId);
    const nextIndex = nextOrderedSliceIds.indexOf(state.sliceId);
    if (nextIndex >= 0) {
      setActiveSliceIndex(compact ? 0 : nextIndex);
    }
  }, [compact, maxTimestampSec, minTimestampSec, setActiveSlice, setActiveSliceIndex, updateSlice]);

  const handleSliceSelect = useCallback((sliceIndex: number) => {
    const sourceSliceId = resolveSourceSliceId(sliceIndex);
    if (sourceSliceId) {
      setActiveSlice(sourceSliceId);
    }
    setActiveSliceIndex(compact ? 0 : sliceIndex);
  }, [compact, resolveSourceSliceId, setActiveSlice, setActiveSliceIndex]);

  const handleHandlePointerDown = useCallback((e: ThreeEvent<PointerEvent>, sliceIndex: number, handle: ResizeHandle) => {
    e.stopPropagation();
    const sourceSliceId = resolveSourceSliceId(sliceIndex);
    if (!sourceSliceId) return;

    const slice = slices[sliceIndex];
    if (!slice) return;

    handleSliceSelect(sliceIndex);
    gl.domElement.setPointerCapture(e.pointerId);
    setDragState({
      sliceId: sourceSliceId,
      sliceIndex,
      handle,
      pointerId: e.pointerId,
      centerY: resolveSliceY(slice),
      startEpoch: slice.startEpoch,
      endEpoch: slice.endEpoch,
      previewStartEpoch: slice.startEpoch,
      previewEndEpoch: slice.endEpoch,
    });
  }, [gl.domElement, handleSliceSelect, resolveSourceSliceId, resolveSliceY, slices]);

  useEffect(() => {
    if (!dragState) return undefined;

    const onPointerMove = (event: PointerEvent) => {
      const y = resolvePointerY(event.clientX, event.clientY, dragState.centerY);
      const nextEpoch = yToEpoch(y);

      const nextStart = dragState.handle === 'start'
        ? Math.min(nextEpoch, dragState.endEpoch - MIN_RESIZE_DURATION_SEC)
        : dragState.startEpoch;
      const nextEnd = dragState.handle === 'end'
        ? Math.max(nextEpoch, dragState.startEpoch + MIN_RESIZE_DURATION_SEC)
        : dragState.endEpoch;

      setDragState((current) => (current ? {
        ...current,
        previewStartEpoch: nextStart,
        previewEndEpoch: nextEnd,
      } : current));
    };

    const onPointerUp = () => {
      commitResize(dragState);
      setDragState(null);
      try {
        gl.domElement.releasePointerCapture(dragState.pointerId);
      } catch {
        // ignore capture release issues
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [commitResize, dragState, gl.domElement, resolvePointerY, yToEpoch]);

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

  const hasActiveSlice = activeIndex >= 0 && activeIndex < slices.length;

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
        const y = resolveSliceY(slice);
        const diff = Math.abs(i - activeIndex);
        const isActive = hasActiveSlice && diff === 0;
        const isAdjacent = hasActiveSlice && diff === 1;
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
        const sourceSliceId = resolveSourceSliceId(i);
        const isDraggingThisSlice = dragState?.sliceId === sourceSliceId;
        const labelText = isDraggingThisSlice && dragState
          ? formatRangeLabel(dragState.previewStartEpoch, dragState.previewEndEpoch)
          : slice.label;
        const handleInset = Math.max(0.06, thickness * 0.12);
        const bottomHandleY = hasVolume ? handleInset : 0.08;
        const topHandleY = hasVolume ? Math.max(handleInset + 0.06, thickness - handleInset) : 0.18;

        return (
          <group
            key={slice.index}
            position={[0, y, 0]}
            onClick={(event) => {
              event.stopPropagation();
              handleSliceSelect(i);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {hasVolume ? (
              <>
                <mesh position={[0, thickness / 2, 0]}>
                  <boxGeometry args={[100, thickness, 100]} />
                  <meshStandardMaterial
                    color={isActive ? '#1e40af' : '#334155'}
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

            {isActive && sourceSliceId ? (
              <>
                <mesh
                  position={[50, topHandleY, 0]}
                  onPointerDown={(event) => handleHandlePointerDown(event, i, 'end')}
                >
                  <sphereGeometry args={[0.9, 16, 16]} />
                  <meshBasicMaterial color={dragState?.sliceId === sourceSliceId && dragState.handle === 'end' ? '#67e8f9' : '#ffffff'} />
                </mesh>
                <mesh
                  position={[50, bottomHandleY, 0]}
                  onPointerDown={(event) => handleHandlePointerDown(event, i, 'start')}
                >
                  <sphereGeometry args={[0.9, 16, 16]} />
                  <meshBasicMaterial color={dragState?.sliceId === sourceSliceId && dragState.handle === 'start' ? '#67e8f9' : '#ffffff'} />
                </mesh>
              </>
            ) : null}

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
                    color="#ffffff"
                    transparent
                    opacity={0.4}
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
                    color="#ffffff"
                    transparent
                    opacity={0.2}
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
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className={`rounded-md border px-2 py-1 text-[10px] leading-tight shadow-sm ${
                  isActive
                    ? 'border-sky-400/60 bg-slate-950/95 text-sky-100'
                    : 'border-sky-800/40 bg-slate-950/80 text-sky-300'
                }`}
                >
                <div className="font-medium tracking-wide">
                  {labelText}
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
                {isDraggingThisSlice && dragState ? (
                  <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-cyan-200">
                    {dragState.handle === 'start' ? 'Resizing start boundary' : 'Resizing end boundary'}
                  </div>
                ) : null}
              </div>
            </Html>

            {isDraggingThisSlice && dragState ? (
              <Html position={[52, 18, 0]} center className="pointer-events-none select-none">
                <div className="rounded-md border border-cyan-400/40 bg-slate-950/90 px-2 py-1 text-[9px] font-medium tracking-[0.12em] text-cyan-100 shadow-sm">
                  {formatRangeLabel(dragState.previewStartEpoch, dragState.previewEndEpoch)}
                </div>
              </Html>
            ) : null}

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
