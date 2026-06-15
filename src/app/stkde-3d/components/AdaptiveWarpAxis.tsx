'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { ADAPTIVE_BIN_COUNT } from '@/lib/adaptive-utils';
import { START_Y } from './StkdeSliceStack';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

const AXIS_WIDTH = 96;
const AXIS_DEPTH = 1.8;
const AXIS_HEIGHT = 100;
const AXIS_BOTTOM_Y = START_Y - 2;
const AXIS_Z = -50.4;

const COLOR_STOPS: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0, color: [30, 58, 95] },
  { stop: 0.5, color: [14, 165, 233] },
  { stop: 0.8, color: [245, 158, 11] },
  { stop: 1, color: [239, 68, 68] },
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const interpolateColor = (t: number): THREE.Color => {
  const normalized = clamp01(t);
  let left = COLOR_STOPS[0];
  let right = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    const current = COLOR_STOPS[i]!;
    const next = COLOR_STOPS[i + 1]!;
    if (normalized >= current.stop && normalized <= next.stop) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(1e-6, right.stop - left.stop);
  const localT = (normalized - left.stop) / span;
  const r = left.color[0] + (right.color[0] - left.color[0]) * localT;
  const g = left.color[1] + (right.color[1] - left.color[1]) * localT;
  const b = left.color[2] + (right.color[2] - left.color[2]) * localT;
  return tempColor.setRGB(r / 255, g / 255, b / 255);
};

export function AdaptiveWarpAxis() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const densityMap = useDashboardDemoCoordinationStore((state) => state.densityMap);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const bins = useMemo(() => {
    const adaptiveEnabled = timeScaleMode === 'adaptive' && warpFactor > 0 && Boolean(warpMap) && (warpMap?.length ?? 0) > 1;
    const totalSpan = adaptiveEnabled ? Math.max(1e-9, (warpMap?.[warpMap.length - 1] ?? viewportEnd) - (warpMap?.[0] ?? viewportStart)) : AXIS_HEIGHT;
    const equalHeight = AXIS_HEIGHT / ADAPTIVE_BIN_COUNT;

    return Array.from({ length: ADAPTIVE_BIN_COUNT }).reduce<Array<{ height: number; centerY: number; color: THREE.Color }>>((acc, _, index) => {
      const cursor = acc.length === 0 ? AXIS_BOTTOM_Y : acc[acc.length - 1]!.centerY + acc[acc.length - 1]!.height / 2;
      const densityValue = densityMap && densityMap.length > 0
        ? densityMap[Math.min(densityMap.length - 1, Math.floor((index / Math.max(1, ADAPTIVE_BIN_COUNT - 1)) * (densityMap.length - 1)))] ?? 0
        : 0;

      if (!adaptiveEnabled || !warpMap) {
        const centerY = cursor + equalHeight / 2;
        acc.push({
          height: equalHeight,
          centerY,
          color: tempColor.set('#4f7fa8'),
        });
        return acc;
      }

      const binStart = warpMap[index] ?? warpMap[warpMap.length - 1] ?? viewportStart;
      const nextValue = index < warpMap.length - 1 ? warpMap[index + 1] : warpMap[warpMap.length - 1];
      const binEnd = nextValue ?? binStart;
      const normalizedHeight = Math.max(0.01, ((binEnd - binStart) / totalSpan) * AXIS_HEIGHT);
      const centerY = cursor + normalizedHeight / 2;
      acc.push({
        height: normalizedHeight,
        centerY,
        color: interpolateColor(densityValue),
      });
      return acc;
    }, []);
  }, [densityMap, timeScaleMode, viewportEnd, viewportStart, warpFactor, warpMap]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.count = ADAPTIVE_BIN_COUNT;

    bins.forEach((bin, index) => {
        tempObject.position.set(0, bin.centerY, AXIS_Z);
        tempObject.scale.set(AXIS_WIDTH, bin.height, AXIS_DEPTH);
        tempObject.updateMatrix();

      mesh.setMatrixAt(index, tempObject.matrix);
      mesh.setColorAt(index, bin.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [bins]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, ADAPTIVE_BIN_COUNT]}
      renderOrder={-40}
      frustumCulled={false}
      visible
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={timeScaleMode === 'adaptive' && warpFactor > 0 ? 0.15 : 0.08} vertexColors depthWrite={false} />
    </instancedMesh>
  );
}
