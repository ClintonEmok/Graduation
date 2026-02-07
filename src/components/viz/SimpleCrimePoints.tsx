"use client";

import { useMemo, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFilterStore } from '@/store/useFilterStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds, toEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';

export function SimpleCrimePoints() {
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const minX = useDataStore((state) => state.minX);
  const maxX = useDataStore((state) => state.maxX);
  const minZ = useDataStore((state) => state.minZ);
  const maxZ = useDataStore((state) => state.maxZ);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);

  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);

  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  const { positions, colors, indices, count } = useMemo(() => {
    const positionsList: number[] = [];
    const colorsList: number[] = [];
    const indices: number[] = [];

    const resolveColor = (label: string) => {
      const key = label.toUpperCase();
      const colorHex =
        palette.categoryColors[key] ||
        palette.categoryColors[label] ||
        palette.categoryColors['OTHER'] ||
        '#FFFFFF';
      return new THREE.Color(colorHex);
    };

    let timeMin = -Infinity;
    let timeMax = Infinity;
    if (selectedTimeRange) {
      const [rangeStart, rangeEnd] = selectedTimeRange;
      if (minTimestampSec != null && maxTimestampSec != null) {
        const normalizedStart = epochSecondsToNormalized(rangeStart, minTimestampSec, maxTimestampSec);
        const normalizedEnd = epochSecondsToNormalized(rangeEnd, minTimestampSec, maxTimestampSec);
        timeMin = Math.min(normalizedStart, normalizedEnd);
        timeMax = Math.max(normalizedStart, normalizedEnd);
      } else if (rangeStart >= 0 && rangeEnd <= 100) {
        timeMin = Math.min(rangeStart, rangeEnd);
        timeMax = Math.max(rangeStart, rangeEnd);
      }
    }

    if (columns) {
      const xRange = (maxX ?? 50) - (minX ?? -50) || 1;
      const zRange = (maxZ ?? 50) - (minZ ?? -50) || 1;

      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < columns.length; i += 1) {
        const y = columns.timestamp[i];
        if (Number.isFinite(y)) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      const yRange = maxY - minY || 1;

      for (let i = 0; i < columns.length; i += 1) {
        if (selectedTypes.length > 0 && !selectedTypes.includes(columns.type[i])) continue;
        if (selectedDistricts.length > 0 && !selectedDistricts.includes(columns.district[i])) continue;
        if (columns.timestamp[i] < timeMin || columns.timestamp[i] > timeMax) continue;

        if (selectedSpatialBounds && columns.lat && columns.lon) {
          const lat = columns.lat[i];
          const lon = columns.lon[i];
          if (
            lat < selectedSpatialBounds.minLat ||
            lat > selectedSpatialBounds.maxLat ||
            lon < selectedSpatialBounds.minLon ||
            lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }

        const x = ((columns.x[i] - (minX ?? -50)) / xRange) * 100 - 50;
        const z = ((columns.z[i] - (minZ ?? -50)) / zRange) * 100 - 50;
        const yRaw = columns.timestamp[i];
        const y = ((yRaw - minY) / yRange) * 100 - 50;

        const color = resolveColor(getCrimeTypeName(columns.type[i]));

        positionsList.push(x, y, z);
        colorsList.push(color.r, color.g, color.b);

        indices.push(i);
      }

      return {
        positions: new Float32Array(positionsList),
        colors: new Float32Array(colorsList),
        indices,
        count: indices.length
      };
    }

    let minXData = Infinity;
    let maxXData = -Infinity;
    let minYData = Infinity;
    let maxYData = -Infinity;
    let minZData = Infinity;
    let maxZData = -Infinity;

    for (const point of data) {
      const x = point.x;
      const timestampValue = point.timestamp as unknown;
      const y = Number.isFinite(point.y)
        ? point.y
        : typeof point.timestamp === 'number'
        ? point.timestamp
        : timestampValue instanceof Date
        ? timestampValue.getTime()
        : 0;
      const z = point.z;

      if (Number.isFinite(x)) {
        if (x < minXData) minXData = x;
        if (x > maxXData) maxXData = x;
      }
      if (Number.isFinite(y)) {
        if (y < minYData) minYData = y;
        if (y > maxYData) maxYData = y;
      }
      if (Number.isFinite(z)) {
        if (z < minZData) minZData = z;
        if (z > maxZData) maxZData = z;
      }
    }

    const xRange = maxXData - minXData || 1;
    const yRange = maxYData - minYData || 1;
    const zRange = maxZData - minZData || 1;

    for (let i = 0; i < data.length; i += 1) {
      const point = data[i];
      const typeId = getCrimeTypeId(point.type);
      if (selectedTypes.length > 0 && !selectedTypes.includes(typeId)) continue;

      const districtId = point.districtId;
      if (selectedDistricts.length > 0 && typeof districtId === 'number' && !selectedDistricts.includes(districtId)) {
        continue;
      }

      const timestampValue = point.timestamp as unknown;
      const rawTime = Number.isFinite(point.y)
        ? point.y
        : typeof point.timestamp === 'number'
        ? point.timestamp
        : timestampValue instanceof Date
        ? timestampValue.getTime()
        : 0;
      if (rawTime < timeMin || rawTime > timeMax) continue;

      if (selectedSpatialBounds && typeof point.lat === 'number' && typeof point.lon === 'number') {
        if (
          point.lat < selectedSpatialBounds.minLat ||
          point.lat > selectedSpatialBounds.maxLat ||
          point.lon < selectedSpatialBounds.minLon ||
          point.lon > selectedSpatialBounds.maxLon
        ) {
          continue;
        }
      }

      const yRaw = rawTime;

      const x = ((point.x - minXData) / xRange) * 100 - 50;
      const y = ((yRaw - minYData) / yRange) * 100 - 50;
      const z = ((point.z - minZData) / zRange) * 100 - 50;

      const color = resolveColor(point.type);

      positionsList.push(x, y, z);
      colorsList.push(color.r, color.g, color.b);

      indices.push(i);
    }

    return {
      positions: new Float32Array(positionsList),
      colors: new Float32Array(colorsList),
      indices,
      count: indices.length
    };
  }, [
    columns,
    data,
    maxTimestampSec,
    minTimestampSec,
    minX,
    maxX,
    minZ,
    maxZ,
    palette,
    selectedDistricts,
    selectedSpatialBounds,
    selectedTimeRange,
    selectedTypes
  ]);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hovered = useMemo(() => {
    if (hoveredIndex === null) return null;
    if (hoveredIndex < 0 || hoveredIndex >= count) return null;

    const sourceIndex = indices[hoveredIndex];
    if (typeof sourceIndex !== 'number') return null;

    const base = hoveredIndex * 3;
    const position = {
      x: positions[base],
      y: positions[base + 1],
      z: positions[base + 2]
    };

    const formatEpoch = (epochSeconds: number) => {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(epochSeconds * 1000));
    };

    const resolveEpochSeconds = (rawTime: number) => {
      if (minTimestampSec != null && maxTimestampSec != null && rawTime >= 0 && rawTime <= 100) {
        return normalizedToEpochSeconds(rawTime, minTimestampSec, maxTimestampSec);
      }
      const epochSeconds = toEpochSeconds(rawTime);
      return epochSeconds > 1_000_000_000 ? epochSeconds : null;
    };

    if (columns) {
      const typeName = getCrimeTypeName(columns.type[sourceIndex]);
      const timeValue = columns.timestamp[sourceIndex];
      const epochSeconds = resolveEpochSeconds(timeValue);
      const timeLabel = epochSeconds ? formatEpoch(epochSeconds) : `t: ${Math.round(timeValue)}`;
      return { position, type: typeName, timeLabel };
    }

    const point = data[sourceIndex];
    const timestampValue = point.timestamp as unknown;
    const timeValue = Number.isFinite(point.y)
      ? point.y
      : typeof point.timestamp === 'number'
      ? point.timestamp
      : timestampValue instanceof Date
      ? timestampValue.getTime()
      : 0;
    const epochSeconds = resolveEpochSeconds(timeValue);
    const timeLabel = epochSeconds ? formatEpoch(epochSeconds) : `t: ${Math.round(timeValue)}`;
    return { position, type: point.type, timeLabel };
  }, [
    hoveredIndex,
    count,
    indices,
    positions,
    columns,
    data,
    maxTimestampSec,
    minTimestampSec
  ]);

  if (count === 0) return null;

  return (
    <points
      frustumCulled={false}
      onPointerMove={(event) => {
        event.stopPropagation();
        if (typeof event.index === 'number') {
          setHoveredIndex(event.index);
        }
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (typeof event.index !== 'number') return;
        const sourceIndex = indices[event.index];
        if (typeof sourceIndex !== 'number') return;
        setSelectedIndex(sourceIndex, 'cube');
        setDetailsOpen(true);
      }}
      onPointerOut={() => setHoveredIndex(null)}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={1.1} sizeAttenuation vertexColors depthWrite={false} />
      {hovered && (
        <Html position={[hovered.position.x, hovered.position.y, hovered.position.z]} center>
          <div className="rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm">
            <div className="font-medium">{hovered.type}</div>
            <div className="text-[10px] text-muted-foreground">{hovered.timeLabel}</div>
          </div>
        </Html>
      )}
    </points>
  );
}
