"use client";

import { useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useDataStore } from "@/store/useDataStore";
import { useSliceSelectionStore } from "@/store/useSliceSelectionStore";
import { useSliceStore } from "@/store/useSliceStore";
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

export function TimeSlices3D() {
  const slices = useSliceStore((state) => state.slices);
  const addSlice = useSliceStore((state) => state.addSlice);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const selectedIds = useSliceSelectionStore((state) => state.selectedIds);
  const selectSlice = useSliceSelectionStore((state) => state.selectSlice);
  const toggleSlice = useSliceSelectionStore((state) => state.toggleSlice);
  const clearSelection = useSliceSelectionStore((state) => state.clearSelection);

  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  const domain = useMemo<[number, number]>(() => {
    const domainStart = minTimestampSec ?? mapDomain[0];
    const domainEnd = maxTimestampSec ?? mapDomain[1];
    if (domainEnd > domainStart) {
      return [domainStart, domainEnd];
    }
    return [0, 1];
  }, [mapDomain, maxTimestampSec, minTimestampSec]);

  const useAdaptiveMapping =
    timeScaleMode === "adaptive" && warpFactor > 0 && warpMap && warpMap.length > 1;

  const { percentToY, yToPercent } = useMemo(() => {
    const [domainStart, domainEnd] = domain;
    const span = Math.max(1e-9, domainEnd - domainStart);

    const toDisplayTime = (percent: number) => {
      const linearSec = domainStart + (clamp(percent, 0, 100) / 100) * span;
      if (!useAdaptiveMapping) {
        return linearSec;
      }
      return (
        linearSec * (1 - warpFactor) +
        sampleWarpSeconds(linearSec, warpMap, mapDomain) * warpFactor
      );
    };

    const samplePercents = Array.from({ length: 101 }, (_, index) => index);
    const sampleDisplayTimes = samplePercents.map((percent) => toDisplayTime(percent));
    const minDisplayTime = sampleDisplayTimes[0] ?? 0;
    const maxDisplayTime = sampleDisplayTimes[sampleDisplayTimes.length - 1] ?? 1;
    const ySpan = Math.max(1e-9, maxDisplayTime - minDisplayTime);

    const percentToY = (percent: number) => {
      const display = toDisplayTime(percent);
      return ((display - minDisplayTime) / ySpan) * 100 - 50;
    };

    const yToPercent = (y: number) => {
      const targetDisplay = ((clamp(y, -50, 50) + 50) / 100) * ySpan + minDisplayTime;

      let lowIndex = 0;
      let highIndex = sampleDisplayTimes.length - 1;
      while (highIndex - lowIndex > 1) {
        const middle = Math.floor((lowIndex + highIndex) / 2);
        if ((sampleDisplayTimes[middle] ?? targetDisplay) < targetDisplay) {
          lowIndex = middle;
        } else {
          highIndex = middle;
        }
      }

      const lowDisplay = sampleDisplayTimes[lowIndex] ?? targetDisplay;
      const highDisplay = sampleDisplayTimes[highIndex] ?? lowDisplay;
      const t =
        highDisplay > lowDisplay
          ? clamp((targetDisplay - lowDisplay) / (highDisplay - lowDisplay), 0, 1)
          : 0;
      return clamp((lowIndex + (highIndex - lowIndex) * t) / 100, 0, 1) * 100;
    };

    return { percentToY, yToPercent };
  }, [domain, mapDomain, useAdaptiveMapping, warpFactor, warpMap]);

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const percent = yToPercent(event.point.y);
    addSlice({ type: "point", time: percent });
  };

  const handleSliceClick = (event: ThreeEvent<MouseEvent>, sliceId: string) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      toggleSlice(sliceId);
      setActiveSlice(sliceId);
      return;
    }
    selectSlice(sliceId);
    setActiveSlice(sliceId);
  };

  return (
    <group>
      <mesh
        onDoubleClick={handleDoubleClick}
        onClick={(event) => {
          event.stopPropagation();
          clearSelection();
          setActiveSlice(null);
        }}
      >
        <boxGeometry args={[100, 100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          if (slice.type === "range" && slice.range) {
            const start = Math.min(slice.range[0], slice.range[1]);
            const end = Math.max(slice.range[0], slice.range[1]);
            const startY = percentToY(start);
            const endY = percentToY(end);
            const height = Math.max(0.5, Math.abs(endY - startY));
            const centerY = (startY + endY) / 2;
            const isSelected = selectedIds.has(slice.id);

            return (
              <mesh
                key={slice.id}
                position={[0, centerY, 0]}
                onClick={(event) => handleSliceClick(event, slice.id)}
              >
                <boxGeometry args={[100, height, 100]} />
                <meshBasicMaterial
                  color={isSelected ? "#60a5fa" : slice.isBurst ? "#f97316" : "#22d3ee"}
                  transparent
                  opacity={isSelected ? 0.35 : slice.isBurst ? 0.2 : 0.12}
                  depthWrite={false}
                />
              </mesh>
            );
          }

          const isSelected = selectedIds.has(slice.id);

          return (
            <group key={slice.id} position={[0, percentToY(slice.time), 0]}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(event) => handleSliceClick(event, slice.id)}
              >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial
                  color={isSelected ? "#60a5fa" : slice.isBurst ? "#f97316" : "#22d3ee"}
                  transparent
                  opacity={isSelected ? 0.6 : slice.isBurst ? 0.4 : 0.28}
                  depthWrite={false}
                />
              </mesh>
              <gridHelper args={[100, 10]} position={[0, 0.05, 0]}>
                <meshBasicMaterial
                  color={isSelected ? "#60a5fa" : slice.isBurst ? "#f97316" : "#22d3ee"}
                  transparent
                  opacity={isSelected ? 0.45 : 0.2}
                />
              </gridHelper>
            </group>
          );
        })}
    </group>
  );
}
