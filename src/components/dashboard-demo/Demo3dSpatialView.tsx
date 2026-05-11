'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import MapLibreMap, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { computeSliceKde } from '@/lib/kde';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { KdeCell } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import { CHICAGO_BOUNDS, SCENE_EXTENT } from '@/app/stkde-3d/lib/chicago-bounds';

const SLICE_SPACING = 7.25;
const START_Y = -32.625;
const TEXTURE_SIZE = 256;

const CAMERA_POSITION: [number, number, number] = [105, 175, 105];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0];

const MAP_VIEW_STATE = {
  longitude: -87.649,
  latitude: 41.878,
  zoom: 12.1,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const CORNERS = [
  { label: 'NW', lat: CHICAGO_BOUNDS.north, lon: CHICAGO_BOUNDS.west, x: SCENE_EXTENT.minX, z: SCENE_EXTENT.minZ },
  { label: 'NE', lat: CHICAGO_BOUNDS.north, lon: CHICAGO_BOUNDS.east, x: SCENE_EXTENT.maxX, z: SCENE_EXTENT.minZ },
  { label: 'SW', lat: CHICAGO_BOUNDS.south, lon: CHICAGO_BOUNDS.west, x: SCENE_EXTENT.minX, z: SCENE_EXTENT.maxZ },
  { label: 'SE', lat: CHICAGO_BOUNDS.south, lon: CHICAGO_BOUNDS.east, x: SCENE_EXTENT.maxX, z: SCENE_EXTENT.maxZ },
] as const;

function formatLatLon(value: number): string {
  return value.toFixed(3);
}

function CornerOverlay() {
  return (
    <div className="absolute left-3 top-3 z-20 pointer-events-none">
      <div className="rounded-lg border border-border/60 bg-card/85 px-3 py-2 shadow-lg backdrop-blur">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Corner Coordinates
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[10px] leading-tight text-foreground/80">
          {CORNERS.map((corner) => (
            <div key={corner.label} className="contents">
              <span className="font-medium text-foreground">{corner.label}</span>
              <span>
                {formatLatLon(corner.lat)}, {formatLatLon(corner.lon)} | {corner.x.toFixed(0)}, {corner.z.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapTileSource({ onTextureReady }: { onTextureReady: (texture: THREE.CanvasTexture | null) => void }) {
  const mapRef = useRef<MapRef>(null);
  const capturedRef = useRef(false);

  const captureTexture = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || capturedRef.current) return;

    capturedRef.current = true;
    const canvas = map.getCanvas();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    onTextureReady(texture);
  }, [onTextureReady]);

  const handleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.fitBounds(
      [
        [CHICAGO_BOUNDS.west, CHICAGO_BOUNDS.south],
        [CHICAGO_BOUNDS.east, CHICAGO_BOUNDS.north],
      ],
      { padding: 0, duration: 0 },
    );

    map.once('idle', captureTexture);
    window.setTimeout(captureTexture, 400);
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] opacity-0 pointer-events-none">
      <MapLibreMap
        ref={mapRef}
        initialViewState={MAP_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        cursor="default"
        onLoad={handleLoad}
      />
    </div>
  );
}

function kdeColor(t: number): string {
  const intensity = Math.min(1, Math.max(0, t));
  const value = Math.round(24 + intensity * 205);
  return `rgb(${value}, ${value}, ${value})`;
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
    const radius = Math.max(8, intensity * 40);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, kdeColor(intensity));
    gradient.addColorStop(0.6, kdeColor(intensity * 0.5));
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

interface SceneSlice {
  sourceSliceId: string;
  index: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
  crimeCount: number;
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

function buildSliceSignature(slices: SceneSlice[]): string {
  return slices
    .map((slice) => `${slice.sourceSliceId}:${slice.startEpoch}:${slice.endEpoch}:${slice.burstScore}:${slice.label}`)
    .join('|');
}

function SliceStack({ slices, sliceKdes, activeIndex }: {
  slices: SceneSlice[];
  sliceKdes: KdeCell[][];
  activeIndex: number;
}) {
  const textures = useMemo(() => {
    const newTextures = new Map<number, THREE.CanvasTexture>();
    for (let i = 0; i < sliceKdes.length; i++) {
      const tex = buildHeatmapTexture(sliceKdes[i] ?? []);
      if (tex) newTextures.set(i, tex);
    }
    return newTextures;
  }, [sliceKdes]);

  useEffect(() => {
    return () => { textures.forEach((tex) => tex.dispose()); };
  }, [textures]);

  return (
    <group>
      {slices.map((slice) => {
        const i = slice.index;
        const y = START_Y + i * SLICE_SPACING;
        const diff = Math.abs(i - activeIndex);
        const isActive = diff === 0;
        const isAdjacent = diff === 1;
        const opacityMultiplier = isActive ? 1 : isAdjacent ? 0.35 : 0.1;

        const gridOpacity = isActive ? 0.08 : isAdjacent ? 0.03 : 0.01;
        const planeOpacity = Math.min(0.4, 0.3 * opacityMultiplier);
        const texture = textures.get(i) ?? undefined;

        const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;

        return (
          <group key={slice.index} position={[0, y, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[100, 100]} />
              <meshBasicMaterial
                map={texture}
                transparent
                opacity={planeOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            <gridHelper args={[100, 10]} position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
              <meshBasicMaterial color="#94a3b8" transparent opacity={gridOpacity} />
            </gridHelper>

            {isActive && (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                  <ringGeometry args={[49.2, 50, 64]} />
                  <meshBasicMaterial color="#d4d4d8" transparent opacity={0.26} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                  <ringGeometry args={[48.5, 49.8, 64]} />
                  <meshBasicMaterial color="#f4f4f5" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}

            {isAdjacent && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
                <ringGeometry args={[49.4, 50, 64]} />
                <meshBasicMaterial color="#a1a1aa" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            )}

            <Html position={[52, 0, 0]} center className="pointer-events-none select-none">
              <div
                className={`rounded-md border px-2 py-1 text-[10px] leading-tight shadow-sm ${
                  isActive
                    ? 'border-sky-400/60 bg-card/95 text-sky-100'
                    : 'border-border/40 bg-card/80 text-muted-foreground'
                }`}
              >
                <div className="font-medium tracking-wide">{slice.label}</div>
                <div className="flex gap-2 text-[9px] uppercase tracking-[0.15em]">
                  <span className={slice.burstScore > 0.5 ? 'text-amber-300' : 'text-muted-foreground'}>
                    burst {burstLabel}
                  </span>
                  <span className="text-muted-foreground">{slice.crimeCount} ev</span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function SceneContent({ slices, sliceKdes, activeIndex, mapTexture }: {
  slices: SceneSlice[];
  sliceKdes: KdeCell[][];
  activeIndex: number;
  mapTexture: THREE.CanvasTexture | null;
}) {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.setLookAt(
      CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2],
      CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2],
      false,
    );
    controls.update(0);
  }, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 20]} intensity={0.7} />
      <directionalLight position={[-30, 30, -20]} intensity={0.3} />

      <mesh position={[0, -38, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-20}>
        <planeGeometry args={[96, 96]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      <SliceStack slices={slices} sliceKdes={sliceKdes} activeIndex={activeIndex} />

      {mapTexture && (
        <group position={[0, -38, 0]} renderOrder={-20}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[96, 96]} />
            <meshBasicMaterial map={mapTexture} transparent opacity={0.92} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <planeGeometry args={[96, 96]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      <CameraControls
        ref={controlsRef}
        makeDefault
        smoothTime={0.3}
        minDistance={90}
        maxDistance={260}
        minPolarAngle={0.12}
        maxPolarAngle={0.38}
        minAzimuthAngle={-0.4}
        maxAzimuthAngle={0.4}
      />
    </>
  );
}

export function Demo3dSpatialView() {
  const slices = useSliceDomainStore((s) => s.slices);
  const minTimestampSec = useTimelineDataStore((s) => s.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((s) => s.maxTimestampSec);
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const [allCrimes, setAllCrimes] = useState<CrimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [crimesError, setCrimesError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const orderedSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice, originalIndex) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return {
          sourceSliceId: slice.id,
          index: originalIndex,
          label: slice.name ?? '',
          startEpoch,
          endEpoch,
          burstScore: slice.burstScore ?? 0,
          crimeCount: 0,
        };
      })
      .sort((left, right) => {
        const startDelta = left.startEpoch - right.startEpoch;
        if (startDelta !== 0) return startDelta;
        const endDelta = left.endEpoch - right.endEpoch;
        if (endDelta !== 0) return endDelta;
        return left.sourceSliceId.localeCompare(right.sourceSliceId);
      })
      .map((slice, index) => ({
        ...slice,
        index,
        label: slice.label || `Slice ${index + 1}`,
      }));
  }, [slices, minTimestampSec, maxTimestampSec]);

  const orderedSliceSignature = useMemo(() => buildSliceSignature(orderedSlices), [orderedSlices]);

  const orderedSliceRange = useMemo(() => {
    if (orderedSlices.length === 0) return null;
    let start = orderedSlices[0]!.startEpoch;
    let end = orderedSlices[0]!.endEpoch;

    for (const slice of orderedSlices) {
      if (slice.startEpoch < start) start = slice.startEpoch;
      if (slice.endEpoch > end) end = slice.endEpoch;
    }

    return { start, end };
  }, [orderedSlices]);

  useEffect(() => {
    if (orderedSlices.length === 0 || orderedSliceRange === null) {
      setAllCrimes([]);
      setCrimesError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCrimesError(null);

    const params = new URLSearchParams({
      startEpoch: Math.floor(orderedSliceRange.start).toString(),
      endEpoch: Math.ceil(orderedSliceRange.end).toString(),
      bufferDays: '0',
      limit: '100000',
    });

    let cancelled = false;

    fetch(`/api/crimes/range?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data?: CrimeRecord[] }>;
      })
      .then((result) => {
        if (!cancelled) {
          setAllCrimes(result.data ?? []);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setCrimesError(err.message);
          setAllCrimes([]);
          setIsLoading(false);
        }
    });

    return () => { cancelled = true; };
  }, [orderedSliceSignature, orderedSlices.length, orderedSliceRange]);

  const { sliceKdes, countedSlices } = useMemo(() => {
    if (allCrimes.length === 0 || orderedSlices.length === 0) {
      return { sliceKdes: [] as KdeCell[][], countedSlices: orderedSlices };
    }

    const crimesBySlice = orderedSlices.map(() => [] as CrimeRecord[]);

    for (const crime of allCrimes) {
      for (let i = 0; i < orderedSlices.length; i += 1) {
        const slice = orderedSlices[i]!;
        if (crime.timestamp >= slice.startEpoch && crime.timestamp <= slice.endEpoch) {
          crimesBySlice[i]!.push(crime);
          break;
        }
      }
    }

    const updated = orderedSlices.map((slice, i) => {
      const sliceCrimes = crimesBySlice[i] ?? [];
      return {
        ...slice,
        crimeCount: sliceCrimes.length,
      };
    });

    const kdes = crimesBySlice.map((sliceCrimes) =>
      computeSliceKde(sliceCrimes.map((c) => ({ x: c.x, z: c.z }))).cells
    );

    return { sliceKdes: kdes, countedSlices: updated };
  }, [allCrimes, orderedSlices]);

  useEffect(() => {
    setActiveIndex(Math.max(0, countedSlices.length - 1));
  }, [countedSlices.length]);

  useEffect(() => {
    return () => { mapTexture?.dispose(); };
  }, [mapTexture]);

  if (orderedSlices.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Apply slice drafts to view 3D spatial distribution
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      <CornerOverlay />
      <MapTileSource onTextureReady={setMapTexture} />

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">Loading crime data…</p>
        </div>
      )}

      {crimesError && !isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
          <p className="text-xs text-destructive">Error: {crimesError}</p>
        </div>
      )}

      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: 38 }}
          gl={{ alpha: true, antialias: true }}
        >
          <SceneContent
            slices={countedSlices}
            sliceKdes={sliceKdes}
            activeIndex={activeIndex}
            mapTexture={mapTexture}
          />
        </Canvas>
      </div>
    </div>
  );
}
