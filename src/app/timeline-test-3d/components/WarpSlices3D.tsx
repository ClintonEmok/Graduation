"use client";

import { Html } from "@react-three/drei";
import { useMemo, useState } from "react";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useTimelineDataStore } from "@/store/useTimelineDataStore";
import { useTimeStore } from "@/store/useTimeStore";
import { useWarpSliceStore } from "@/store/useWarpSliceStore";

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

export function WarpSlices3D() {
  const slices = useWarpSliceStore((state) => state.slices);
  const activeWarpId = useWarpSliceStore((state) => state.activeWarpId);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const percentToY = useMemo(() => {
    const [domainStart, domainEnd] = domain;
    const domainSpan = Math.max(1e-9, domainEnd - domainStart);

    const toDisplayTime = (percent: number) => {
      const linearSec = domainStart + (clamp(percent, 0, 100) / 100) * domainSpan;
      if (!useAdaptiveMapping) {
        return linearSec;
      }
      return (
        linearSec * (1 - warpFactor) +
        sampleWarpSeconds(linearSec, warpMap, mapDomain) * warpFactor
      );
    };

    const minDisplayTime = toDisplayTime(0);
    const maxDisplayTime = toDisplayTime(100);
    const ySpan = Math.max(1e-9, maxDisplayTime - minDisplayTime);

    return (percent: number) => {
      const display = toDisplayTime(percent);
      return ((display - minDisplayTime) / ySpan) * 100 - 50;
    };
  }, [domain, mapDomain, useAdaptiveMapping, warpFactor, warpMap]);

  return (
    <group>
      {slices.map((slice) => {
        const start = Math.min(slice.range[0], slice.range[1]);
        const end = Math.max(slice.range[0], slice.range[1]);
        const startY = percentToY(start);
        const endY = percentToY(end);
        const height = Math.max(0.5, Math.abs(endY - startY));
        const centerY = (startY + endY) / 2;
        const isHovered = hoveredId === slice.id;
        const isActive = !!activeWarpId && slice.warpProfileId === activeWarpId;
        const overlaps = slices.filter((candidate) => {
          if (candidate.id === slice.id || !candidate.enabled) return false;
          const [candidateStart, candidateEnd] = [
            Math.min(candidate.range[0], candidate.range[1]),
            Math.max(candidate.range[0], candidate.range[1]),
          ];
          return start < candidateEnd && candidateStart < end;
        }).length;
        const baseColor = slice.enabled ? "#22d3ee" : "#64748b";

        return (
          <group key={slice.id} position={[0, centerY, 0]}>
            <mesh
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoveredId(slice.id);
              }}
              onPointerOut={() => setHoveredId((current) => (current === slice.id ? null : current))}
            >
              <boxGeometry args={[98, height, 98]} />
              <meshBasicMaterial
                color={isActive ? "#f59e0b" : baseColor}
                transparent
                opacity={isHovered ? 0.3 : 0.18}
                depthWrite={false}
              />
            </mesh>

            {(isHovered || isActive || overlaps > 0) && (
              <mesh>
                <boxGeometry args={[98.2, height + 0.2, 98.2]} />
                <meshBasicMaterial
                  color={isActive ? "#f59e0b" : overlaps > 0 ? "#fbbf24" : "#67e8f9"}
                  wireframe
                  transparent
                  opacity={0.65}
                  depthWrite={false}
                />
              </mesh>
            )}

            {isHovered ? (
              <Html position={[0, height / 2 + 3, 0]} center>
                <div className="rounded-md border border-cyan-300/40 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow">
                  <div className="font-medium text-cyan-200">{slice.label}</div>
                  <div className="text-[10px] text-slate-300">
                    {start.toFixed(1)}% - {end.toFixed(1)}%
                  </div>
                  {overlaps > 0 ? (
                    <div className="text-[10px] text-amber-300">Overlaps {overlaps} warp slices</div>
                  ) : null}
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
