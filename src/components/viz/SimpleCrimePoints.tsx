"use client";

import { useMemo, useState } from 'react';
import { useCrimeData } from '@/hooks/useCrimeData';
import { CrimeRecord } from '@/types/crime';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFilterStore } from '@/store/useFilterStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds, toEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';

// Full date range constants from the dataset (2001-2026)
const DATA_MIN_TIMESTAMP = 978307200;  // 2001-01-01
const DATA_MAX_TIMESTAMP = 1767571200;   // 2026-01-01

export function SimpleCrimePoints() {
  // Get viewport bounds from store
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  
  // Get filters from viewport store
  const viewportFilters = useViewportStore((state) => state.filters);
  
  // Also get legacy filters (selectedTimeRange, selectedSpatialBounds) from filter store
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);

  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  // Use unified useCrimeData hook with viewport bounds
  const { data: crimeRecords, isLoading } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });

  // Convert CrimeRecord[] to format needed for rendering
  const data = crimeRecords || [];

  // Get filter state
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);

  // Derive min/max from the full dataset range (not just the current viewport)
  const minTimestampSec = DATA_MIN_TIMESTAMP;
  const maxTimestampSec = DATA_MAX_TIMESTAMP;

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

    // Compute ranges from CrimeRecord data
    let minXData = Infinity;
    let maxXData = -Infinity;
    let minYData = Infinity;
    let maxYData = -Infinity;
    let minZData = Infinity;
    let maxZData = -Infinity;

    for (const record of data) {
      const x = record.x;
      const timestampValue = record.timestamp;
      const y = timestampValue; // Already in epoch seconds
      const z = record.z;

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

    // Normalize time to 0-100
    const normalizeTime = (timestamp: number) => {
      return ((timestamp - minYData) / yRange) * 100 - 50;
    };

    for (let i = 0; i < data.length; i += 1) {
      const record = data[i];
      const typeId = getCrimeTypeId(record.type);
      
      // Filter by crime type
      if (selectedTypes.length > 0 && !selectedTypes.includes(typeId)) continue;

      // Filter by district - convert district string to ID
      const districtId = getCrimeTypeId(record.district); // Reuse type mapper for district
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(districtId)) {
        continue;
      }

      // Filter by time range
      const rawTime = record.timestamp;
      if (rawTime < timeMin || rawTime > timeMax) continue;

      // Filter by spatial bounds
      if (selectedSpatialBounds && typeof record.lat === 'number' && typeof record.lon === 'number') {
        if (
          record.lat < selectedSpatialBounds.minLat ||
          record.lat > selectedSpatialBounds.maxLat ||
          record.lon < selectedSpatialBounds.minLon ||
          record.lon > selectedSpatialBounds.maxLon
        ) {
          continue;
        }
      }

      const yRaw = rawTime;

      // Use normalized x, z from record directly
      const x = ((record.x - minXData) / xRange) * 100 - 50;
      const y = ((yRaw - minYData) / yRange) * 100 - 50;
      const z = ((record.z - minZData) / zRange) * 100 - 50;

      const color = resolveColor(record.type);

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
    data,
    maxTimestampSec,
    minTimestampSec,
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

    // Get the original CrimeRecord for this index
    const record = data[sourceIndex];
    const timeValue = record.timestamp;
    const epochSeconds = resolveEpochSeconds(timeValue);
    const timeLabel = epochSeconds ? formatEpoch(epochSeconds) : `t: ${Math.round(timeValue)}`;
    return { position, type: record.type, timeLabel };
  }, [
    hoveredIndex,
    count,
    indices,
    positions,
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
