"use client";

import { Html } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useCoordinationStore } from "@/store/useCoordinationStore";
import { useTimelineDataStore } from "@/store/useTimelineDataStore";
import { useFilterStore } from "@/store/useFilterStore";
import { useTimeStore } from "@/store/useTimeStore";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sampleWarpSeconds = (
  linearSec: number,
  warpMap: Float32Array,
  warpDomain: [number, number]
) => {
  if (warpMap.length === 0) return linearSec;
  const [warpStartSec, warpEndSec] = warpDomain;
  const warpSpan = Math.max(1e-9, warpEndSec - warpStartSec);
  const normalized = clamp((linearSec - warpStartSec) / warpSpan, 0, 1);
  const rawIndex = normalized * (warpMap.length - 1);
  const low = Math.floor(rawIndex);
  const high = Math.min(low + 1, warpMap.length - 1);
  const frac = rawIndex - low;
  const lowVal = warpMap[Math.max(0, low)] ?? linearSec;
  const highVal = warpMap[Math.max(0, high)] ?? lowVal;
  return lowVal * (1 - frac) + highVal * frac;
};

export function TimelineTest3DPoints() {
  const data = useTimelineDataStore((state) => state.data);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [rangeStartSec, rangeEndSec] = useMemo<[number, number]>(() => {
    if (
      selectedTimeRange &&
      Number.isFinite(selectedTimeRange[0]) &&
      Number.isFinite(selectedTimeRange[1])
    ) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (end > start) return [start, end];
    }

    const domainStart = minTimestampSec ?? mapDomain[0];
    const domainEnd = maxTimestampSec ?? mapDomain[1];
    if (domainEnd > domainStart) return [domainStart, domainEnd];
    return [0, 1];
  }, [mapDomain, maxTimestampSec, minTimestampSec, selectedTimeRange]);

  const { positions, colors, indices, timestamps, types, count } = useMemo(() => {
    const visible: Array<{ pointIndex: number; x: number; z: number; timestamp: number }> = [];
    for (let i = 0; i < data.length; i += 1) {
      const point = data[i];
      if (!point || !Number.isFinite(point.timestamp)) continue;
      const ts = point.timestamp;
      if (ts < rangeStartSec || ts > rangeEndSec) continue;
      visible.push({ pointIndex: i, x: point.x, z: point.z, timestamp: ts });
    }

    if (visible.length === 0) {
      return {
        positions: new Float32Array(),
        colors: new Float32Array(),
        indices: [] as number[],
        timestamps: [] as number[],
        types: [] as string[],
        count: 0,
      };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    let minDisplayTime = Number.POSITIVE_INFINITY;
    let maxDisplayTime = Number.NEGATIVE_INFINITY;

    const displayTimes = new Array<number>(visible.length);
    const useAdaptiveMapping =
      timeScaleMode === "adaptive" && warpFactor > 0 && warpMap && warpMap.length > 1;

    for (let i = 0; i < visible.length; i += 1) {
      const item = visible[i];
      minX = Math.min(minX, item.x);
      maxX = Math.max(maxX, item.x);
      minZ = Math.min(minZ, item.z);
      maxZ = Math.max(maxZ, item.z);

      const warpedTime = useAdaptiveMapping
        ? item.timestamp * (1 - warpFactor) +
          sampleWarpSeconds(item.timestamp, warpMap, mapDomain) * warpFactor
        : item.timestamp;

      displayTimes[i] = warpedTime;
      minDisplayTime = Math.min(minDisplayTime, warpedTime);
      maxDisplayTime = Math.max(maxDisplayTime, warpedTime);
    }

    const xSpan = Math.max(1e-9, maxX - minX);
    const zSpan = Math.max(1e-9, maxZ - minZ);
    const ySpan = Math.max(1e-9, maxDisplayTime - minDisplayTime);

    const positions = new Float32Array(visible.length * 3);
    const colors = new Float32Array(visible.length * 3);
    const indices = new Array<number>(visible.length);
    const timestamps = new Array<number>(visible.length);
    const types = new Array<string>(visible.length);

    const baseColor = new THREE.Color("#38bdf8");
    const selectedColor = new THREE.Color("#f97316");

    for (let i = 0; i < visible.length; i += 1) {
      const item = visible[i];
      const x = ((item.x - minX) / xSpan) * 100 - 50;
      const y = ((displayTimes[i] - minDisplayTime) / ySpan) * 100 - 50;
      const z = ((item.z - minZ) / zSpan) * 100 - 50;
      const base = i * 3;
      const isSelected = item.pointIndex === selectedIndex;
      const color = isSelected ? selectedColor : baseColor;

      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = z;

      colors[base] = color.r;
      colors[base + 1] = color.g;
      colors[base + 2] = color.b;

      indices[i] = item.pointIndex;
      timestamps[i] = item.timestamp;
      types[i] = data[item.pointIndex]?.type ?? "Unknown";
    }

    return { positions, colors, indices, timestamps, types, count: visible.length };
  }, [
    data,
    mapDomain,
    rangeEndSec,
    rangeStartSec,
    selectedIndex,
    timeScaleMode,
    warpFactor,
    warpMap,
  ]);

  const hovered = useMemo(() => {
    if (hoveredIndex === null) return null;
    if (hoveredIndex < 0 || hoveredIndex >= count) return null;

    const base = hoveredIndex * 3;
    const timestamp = timestamps[hoveredIndex];
    return {
      position: [positions[base], positions[base + 1], positions[base + 2]] as [
        number,
        number,
        number,
      ],
      type: types[hoveredIndex],
      timeLabel: new Date(timestamp * 1000).toLocaleString(),
    };
  }, [count, hoveredIndex, positions, timestamps, types]);

  if (count === 0) {
    return null;
  }

  return (
    <points
      frustumCulled={false}
      onPointerMove={(event) => {
        event.stopPropagation();
        if (typeof event.index === "number") {
          setHoveredIndex(event.index);
        }
      }}
      onPointerOut={() => setHoveredIndex(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (typeof event.index !== "number") return;
        const canonicalIndex = indices[event.index];
        if (typeof canonicalIndex !== "number") return;
        setSelectedIndex(canonicalIndex, "cube");
        setDetailsOpen(true);
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={1.15} sizeAttenuation vertexColors depthWrite={false} />
      {hovered ? (
        <Html position={hovered.position} center>
          <div className="rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow">
            <div className="font-medium">{hovered.type}</div>
            <div className="text-[10px] text-slate-400">{hovered.timeLabel}</div>
          </div>
        </Html>
      ) : null}
    </points>
  );
}
