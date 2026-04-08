"use client";

import { useMemo } from "react";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { selectFilteredData } from "@/lib/data/selectors";
import { useTimelineDataStore } from "@/store/useTimelineDataStore";

export interface CanonicalPoint {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  type: string;
  adaptiveX?: number;
}

export interface CanonicalPointsResult {
  points: CanonicalPoint[];
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minTime: number;
    maxTime: number;
  };
}

export function useCanonicalPoints(maxPoints = 10000): CanonicalPointsResult {
  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  return useMemo(() => {
    const filteredPoints = selectFilteredData(
      {
        data,
        columns,
        minTimestampSec,
        maxTimestampSec,
      },
      {
        selectedTypes: [],
        selectedDistricts: [],
        selectedTimeRange: null,
      }
    );

    if (!filteredPoints || filteredPoints.length === 0) {
      return {
        points: [],
        bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, minTime: 0, maxTime: 0 },
      };
    }

    const hasValidAdaptiveDomain =
      mapDomain[1] > mapDomain[0] && Number.isFinite(mapDomain[0]);

    const sampledFilteredPoints =
      filteredPoints.length > maxPoints
        ? filteredPoints
            .filter((_, i) => i % Math.ceil(filteredPoints.length / maxPoints) === 0)
            .slice(0, maxPoints)
        : filteredPoints;

    const points: CanonicalPoint[] = sampledFilteredPoints.map((filteredPoint) => {
      const sourcePoint = data[filteredPoint.originalIndex];
      if (!sourcePoint) {
        return {
          id: String(filteredPoint.originalIndex),
          timestamp: filteredPoint.y,
          x: filteredPoint.x,
          y: 0,
          z: filteredPoint.z,
          type: "Unknown",
        };
      }

      const adaptiveX = hasValidAdaptiveDomain
        ? ((sourcePoint.timestamp - mapDomain[0]) / (mapDomain[1] - mapDomain[0])) * 200 - 100
        : undefined;

      return {
        id: sourcePoint.id,
        timestamp: sourcePoint.timestamp,
        x: sourcePoint.x,
        y: sourcePoint.y,
        z: sourcePoint.z,
        type: sourcePoint.type,
        adaptiveX,
      };
    });

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity,
      minTime = Infinity,
      maxTime = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
      minTime = Math.min(minTime, p.timestamp);
      maxTime = Math.max(maxTime, p.timestamp);
    }

    return {
      points,
      bounds: {
        minX: minX === Infinity ? 0 : minX,
        maxX: maxX === -Infinity ? 0 : maxX,
        minZ: minZ === Infinity ? 0 : minZ,
        maxZ: maxZ === -Infinity ? 0 : maxZ,
        minTime: minTime === Infinity ? 0 : minTime,
        maxTime: maxTime === -Infinity ? 0 : maxTime,
      },
    };
  }, [columns, data, mapDomain, maxPoints, maxTimestampSec, minTimestampSec]);
}
