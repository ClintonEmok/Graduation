'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toDisplaySeconds } from '@/components/timeline/hooks/useScaleTransforms';
import { ADAPTIVE_BIN_COUNT } from '@/lib/adaptive-utils';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { START_Y } from './StkdeSliceStack';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

const AXIS_WIDTH = 100;
const AXIS_DEPTH = 1.8;
const AXIS_HEIGHT = 100;
const AXIS_BOTTOM_Y = START_Y;
const AXIS_Z = -50.6;
const LINEAR_COLOR = new THREE.Color('#4f7fa8');
const MIN_BIN_HEIGHT = AXIS_HEIGHT / ADAPTIVE_BIN_COUNT / 3;
const normalizeWarpBlend = (warpFactor: number): number => Math.min(1, Math.max(0, warpFactor / 3));

const COLOR_STOPS: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0, color: [30, 58, 95] },
  { stop: 0.5, color: [14, 165, 233] },
  { stop: 0.8, color: [245, 158, 11] },
  { stop: 1, color: [239, 68, 68] },
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const interpolateColor = (t: number): THREE.Color => {
  const normalized = clamp01(t);
  let left = COLOR_STOPS[0]!;
  let right = COLOR_STOPS[COLOR_STOPS.length - 1]!;

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
  return new THREE.Color(r / 255, g / 255, b / 255);
};

export function AdaptiveWarpAxis() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const densityMap = useDashboardDemoCoordinationStore((state) => state.densityMap);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const warpBlend = useMemo(() => normalizeWarpBlend(warpFactor), [warpFactor]);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const hasViewport = Number.isFinite(viewportStart) && Number.isFinite(viewportEnd) && viewportEnd > viewportStart;
  const viewportDomain: [number, number] = hasViewport ? [viewportStart, viewportEnd] : [0, 1];
  const warpDomain: [number, number] = mapDomain[1] > mapDomain[0] ? mapDomain : viewportDomain;
  const warpDomainDisplay = useMemo<[number, number]>(() => {
    if (timeScaleMode !== 'adaptive' || warpBlend <= 0 || !warpMap || warpMap.length < 2) {
      return warpDomain;
    }

    return [
      toDisplaySeconds(warpDomain[0], warpBlend, warpMap, warpDomain),
      toDisplaySeconds(warpDomain[1], warpBlend, warpMap, warpDomain),
    ];
  }, [timeScaleMode, warpDomain, warpBlend, warpMap]);

  const bins = useMemo(() => {
    const domain: [number, number] = warpDomain;
    const domainSpan = Math.max(1e-9, domain[1] - domain[0]);
    const adaptiveEnabled = timeScaleMode === 'adaptive' && warpBlend > 0 && warpMap && warpMap.length > 1;
    const equalHeight = AXIS_HEIGHT / ADAPTIVE_BIN_COUNT;
    const totalDisplaySpan = Math.max(1e-9, warpDomainDisplay[1] - warpDomainDisplay[0]);

    return Array.from({ length: ADAPTIVE_BIN_COUNT }).reduce<Array<{ centerY: number; height: number; color: THREE.Color }>>(
      (acc, _, index) => {
        const boundaryStart = domain[0] + (index / ADAPTIVE_BIN_COUNT) * domainSpan;
        const boundaryEnd = domain[0] + ((index + 1) / ADAPTIVE_BIN_COUNT) * domainSpan;
        const densityIndex = densityMap
          ? Math.min(densityMap.length - 1, Math.floor((index / Math.max(1, ADAPTIVE_BIN_COUNT - 1)) * densityMap.length))
          : -1;
        const densityValue = densityIndex >= 0 ? densityMap?.[densityIndex] ?? 0 : 0;

        const displayedStart = adaptiveEnabled && warpMap
          ? toDisplaySeconds(boundaryStart, warpBlend, warpMap, warpDomain)
          : boundaryStart;
        const displayedEnd = adaptiveEnabled && warpMap
          ? toDisplaySeconds(boundaryEnd, warpBlend, warpMap, warpDomain)
          : boundaryEnd;

        const binHeight = adaptiveEnabled
          ? Math.max(MIN_BIN_HEIGHT, ((displayedEnd - displayedStart) / totalDisplaySpan) * AXIS_HEIGHT)
          : equalHeight;
        const previousTop = acc.length === 0
          ? AXIS_BOTTOM_Y
          : acc[acc.length - 1]!.centerY + acc[acc.length - 1]!.height / 2;

        acc.push({
          centerY: previousTop + binHeight / 2,
          height: binHeight,
          color: adaptiveEnabled ? interpolateColor(densityValue) : LINEAR_COLOR,
        });

        return acc;
      },
      [],
    );
  }, [densityMap, timeScaleMode, warpBlend, warpDomain, warpDomainDisplay, warpMap]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.count = bins.length;
    mesh.raycast = () => null;

    bins.forEach((bin, index) => {
      tempObject.position.set(0, bin.centerY, AXIS_Z);
      tempObject.scale.set(AXIS_WIDTH, bin.height, AXIS_DEPTH);
      tempObject.updateMatrix();

      mesh.setMatrixAt(index, tempObject.matrix);
      tempColor.copy(bin.color);
      mesh.setColorAt(index, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [bins]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, ADAPTIVE_BIN_COUNT]}
      renderOrder={-10}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        transparent
        opacity={warpBlend > 0 ? 0.15 : 0.08}
        vertexColors
        depthWrite={false}
      />
    </instancedMesh>
  );
}
