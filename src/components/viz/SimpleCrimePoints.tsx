"use client";

import { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { getCrimeTypeId } from '@/lib/category-maps';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFilterStore } from '@/store/useFilterStore';
import { normalizedToEpochSeconds, toEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { normalizeTimeRange } from '@/lib/time-range';
import { resolveCategoryShape, type CategoryShape } from '@/lib/category-shapes';

// Full date range constants from the dataset (2001-2026)
const DATA_MIN_TIMESTAMP = 978307200;  // 2001-01-01
const DATA_MAX_TIMESTAMP = 1767571200;   // 2026-01-01

const buildSliceAuthoredWarpMap = (
  slices: Array<{ enabled: boolean; range: [number, number]; weight: number }>,
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.enabled);
  if (enabledSlices.length === 0 || sampleCount < 2) return null;

  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);
  const density = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const percent = ratio * 100;
    let boost = 0;

    for (const slice of enabledSlices) {
      const start = Math.min(slice.range[0], slice.range[1]);
      const end = Math.max(slice.range[0], slice.range[1]);
      if (percent < start || percent > end) continue;

      const center = (start + end) / 2;
      const halfWidth = Math.max(0.5, (end - start) / 2);
      const normalizedDistance = Math.abs((percent - center) / halfWidth);
      const falloff = Math.max(0, 1 - normalizedDistance);
      boost += Math.max(0, slice.weight) * (0.35 + 0.65 * falloff);
    }

    density[i] = 1 + boost;
  }

  const cumulative = new Float32Array(sampleCount);
  cumulative[0] = 0;
  for (let i = 1; i < sampleCount; i += 1) {
    const prev = density[i - 1] ?? 1;
    const curr = density[i] ?? 1;
    cumulative[i] = cumulative[i - 1] + (prev + curr) * 0.5;
  }

  const total = cumulative[sampleCount - 1] ?? 0;
  if (!Number.isFinite(total) || total <= 0) return null;

  const authoredMap = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const progress = (cumulative[i] ?? 0) / total;
    authoredMap[i] = domainStart + progress * domainSpan;
  }

  return authoredMap;
};

const normalizeStoreSlices = (slices: Array<any>): Array<{ enabled: boolean; range: [number, number]; weight: number }> =>
  slices.map((slice) => {
    const range = Array.isArray(slice.range) && slice.range.length >= 2
      ? [Number(slice.range[0]), Number(slice.range[1])] as [number, number]
      : [Number(slice.time ?? 0), Number(slice.time ?? 0)] as [number, number];

    return {
      enabled: Boolean(slice.enabled ?? slice.warpEnabled ?? slice.isVisible ?? true),
      range,
      weight: Number.isFinite(Number(slice.weight ?? slice.warpWeight ?? 1)) ? Number(slice.weight ?? slice.warpWeight ?? 1) : 1,
    };
  });

type ShapeBucket = {
  positions: number[];
  colors: number[];
  indices: number[];
};

const SHAPE_GEOMETRY_LABELS: Record<CategoryShape, 'sphereGeometry' | 'boxGeometry' | 'coneGeometry'> = {
  sphere: 'sphereGeometry',
  cube: 'boxGeometry',
  cone: 'coneGeometry',
};

function CrimeShapeLayer({
  shape,
  bucket,
}: {
  shape: CategoryShape;
  bucket: ShapeBucket;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = bucket.indices.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      dummy.position.set(bucket.positions[base] ?? 0, bucket.positions[base + 1] ?? 0, bucket.positions[base + 2] ?? 0);
      dummy.scale.setScalar(shape === 'cube' ? 0.78 : shape === 'sphere' ? 0.66 : 0.72);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.setRGB(bucket.colors[base] ?? 1, bucket.colors[base + 1] ?? 1, bucket.colors[base + 2] ?? 1);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [bucket.colors, bucket.indices.length, bucket.positions, count, shape]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      raycast={() => {}}
      frustumCulled={false}
      renderOrder={-1}
    >
      {shape === 'sphere' ? (
        <sphereGeometry args={[0.5, 8, 8]} />
      ) : shape === 'cube' ? (
        <boxGeometry args={[0.82, 0.82, 0.82]} />
      ) : (
        <coneGeometry args={[0.55, 0.95, 8]} />
      )}
      <meshStandardMaterial vertexColors transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}

interface SimpleCrimePointsProps {
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}

export function SimpleCrimePoints({
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  timeStoreOverride,
  sliceStoreOverride,
}: SimpleCrimePointsProps = {}) {
  // Get viewport bounds from store
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  
  // Get filters from viewport store
  const viewportFilters = useViewportStore((state) => state.filters);
  
  // Also get legacy filters (selectedTimeRange, selectedSpatialBounds) from filter store
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;

  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const selectedSpatialBounds = useStore(filterStore, (state) => state.selectedSpatialBounds);
  const setSelectedIndex = useStore(coordinationStore, (state) => state.setSelectedIndex);
  const setDetailsOpen = useStore(coordinationStore, (state) => state.setDetailsOpen);

  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];
  const timeScaleMode = useStore(timeStore, (state) => state.timeScaleMode);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
  const warpMap = useStore(adaptiveStore, (state) => state.warpMap);
  const mapDomain = useStore(adaptiveStore, (state) => state.mapDomain) ?? [0, 100];
  const warpSlices = useStore(sliceStore, (state) => state.slices);

  const authoredWarpMap = useMemo(
    () => buildSliceAuthoredWarpMap(normalizeStoreSlices(warpSlices as Array<any>), mapDomain, Math.max(96, warpMap?.length || 0)),
    [mapDomain, warpMap?.length, warpSlices]
  );
  const effectiveWarpMap = warpSource === 'slice-authored' ? authoredWarpMap : warpMap;

  // Use unified useCrimeData hook with viewport bounds
  const { data: crimeRecords, isLoading } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });

  console.log('[SimpleCrimePoints] viewportStart:', viewportStart, 'viewportEnd:', viewportEnd, 'crimeRecords:', crimeRecords?.length, 'isLoading:', isLoading);

  // Convert CrimeRecord[] to format needed for rendering
  const data = crimeRecords || [];

  // Get filter state
  const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
  const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);

  // Derive min/max from the full dataset range (not just the current viewport)
  const minTimestampSec = DATA_MIN_TIMESTAMP;
  const maxTimestampSec = DATA_MAX_TIMESTAMP;

  const { positions, colors, indices, count, shapeBuckets } = useMemo(() => {
    const positionsList: number[] = [];
    const colorsList: number[] = [];
    const indices: number[] = [];
    const shapeBuckets: Record<CategoryShape, ShapeBucket> = {
      sphere: { positions: [], colors: [], indices: [] },
      cube: { positions: [], colors: [], indices: [] },
      cone: { positions: [], colors: [], indices: [] },
    };

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
    const normalizedTimeRange = normalizeTimeRange(selectedTimeRange);
    if (normalizedTimeRange) {
      const [rangeStart, rangeEnd] = normalizedTimeRange;
      timeMin = Math.min(rangeStart, rangeEnd);
      timeMax = Math.max(rangeStart, rangeEnd);
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
      const y = record.timestamp;
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

    console.log('[SimpleCrimePoints] data range: minXData:', minXData, 'maxXData:', maxXData, 'xRange:', xRange, 'data.length:', data.length);

    const sampleWarp = (inputT: number) => {
      if (!effectiveWarpMap || effectiveWarpMap.length === 0) return inputT;
      const [domainMin, domainMax] = mapDomain;
      const domainSpan = domainMax - domainMin || 1;
      const normalized = (inputT - domainMin) / domainSpan;
      const clamped = Math.max(0, Math.min(1, normalized));
      const idx = clamped * (effectiveWarpMap.length - 1);
      const low = Math.floor(idx);
      const high = Math.min(low + 1, effectiveWarpMap.length - 1);
      const frac = idx - low;
      return effectiveWarpMap[low] * (1 - frac) + effectiveWarpMap[high] * frac;
    };

    const toDisplayY = (value: number, assumeNormalizedDomain: boolean) => {
      if (assumeNormalizedDomain) {
        return value - 50;
      }
      return ((value - minYData) / yRange) * 100 - 50;
    };

    // The adaptive warp map can operate on either raw epoch seconds or a normalized 0-100 percent domain.
    const usesNormalizedDomain = mapDomain[0] >= 0 && mapDomain[1] <= 100;

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
      const linearY = ((yRaw - minYData) / yRange) * 100 - 50;

      let adaptiveInput = yRaw;
      if (usesNormalizedDomain) {
        adaptiveInput = ((yRaw - minYData) / yRange) * 100;
      }
      const adaptiveSample = sampleWarp(adaptiveInput);
      const adaptiveY = toDisplayY(adaptiveSample, usesNormalizedDomain);
      const y =
        timeScaleMode === 'adaptive'
          ? linearY * (1 - warpFactor) + adaptiveY * warpFactor
          : linearY;
      const z = ((record.z - minZData) / zRange) * 100 - 50;

      const color = resolveColor(record.type);

      positionsList.push(x, y, z);
      colorsList.push(color.r, color.g, color.b);

      indices.push(i);

      const shape = resolveCategoryShape(record.type);
      const bucket = shapeBuckets[shape];
      bucket.positions.push(x, y + 0.3, z);
      bucket.colors.push(color.r, color.g, color.b);
      bucket.indices.push(i);
    }

    return {
      positions: new Float32Array(positionsList),
      colors: new Float32Array(colorsList),
      indices,
      count: indices.length,
      shapeBuckets,
    };
  }, [
    data,
    palette,
    mapDomain,
    selectedDistricts,
    selectedSpatialBounds,
    selectedTimeRange,
    selectedTypes,
    timeScaleMode,
    warpFactor,
    effectiveWarpMap
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
    <>
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

      <group renderOrder={-2}>
        <CrimeShapeLayer shape="sphere" bucket={shapeBuckets.sphere} />
        <CrimeShapeLayer shape="cube" bucket={shapeBuckets.cube} />
        <CrimeShapeLayer shape="cone" bucket={shapeBuckets.cone} />
      </group>
    </>
  );
}
