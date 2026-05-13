'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { KdeCell, EvolvingSlice, MockCrimeEvent } from '../lib/types';
import { StkdeSliceStack, yForIndex } from './StkdeSliceStack';
import { CHICAGO_BOUNDS, SCENE_EXTENT } from '../lib/chicago-bounds';

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
  {
    label: 'NW',
    lat: CHICAGO_BOUNDS.north,
    lon: CHICAGO_BOUNDS.west,
    x: SCENE_EXTENT.minX,
    z: SCENE_EXTENT.minZ,
  },
  {
    label: 'NE',
    lat: CHICAGO_BOUNDS.north,
    lon: CHICAGO_BOUNDS.east,
    x: SCENE_EXTENT.maxX,
    z: SCENE_EXTENT.minZ,
  },
  {
    label: 'SW',
    lat: CHICAGO_BOUNDS.south,
    lon: CHICAGO_BOUNDS.west,
    x: SCENE_EXTENT.minX,
    z: SCENE_EXTENT.maxZ,
  },
  {
    label: 'SE',
    lat: CHICAGO_BOUNDS.south,
    lon: CHICAGO_BOUNDS.east,
    x: SCENE_EXTENT.maxX,
    z: SCENE_EXTENT.maxZ,
  },
] as const;

function formatLatLon(value: number): string {
  return value.toFixed(3);
}

function CornerOverlay() {
  return (
    <div className="absolute left-3 top-3 z-20 pointer-events-none">
      <div className="rounded-lg border border-sky-700/50 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300">
          Corner Coordinates
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[10px] leading-tight text-sky-200">
          {CORNERS.map((corner) => (
            <div key={corner.label} className="contents">
              <span className="font-medium text-sky-100">{corner.label}</span>
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
      <Map
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

interface Stkde3DSceneProps {
  slices: EvolvingSlice[];
  sliceKdes: KdeCell[][];
  sliceEvents?: MockCrimeEvent[][];
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
}

function RawEventPoints({
  slices,
  sliceEvents = [],
  activeIndex,
  viewMode,
}: Pick<Stkde3DSceneProps, 'slices' | 'sliceEvents' | 'activeIndex' | 'viewMode'>) {
  const positions = useMemo(() => {
    if (sliceEvents.length === 0 || slices.length === 0) {
      return new Float32Array();
    }

    const activeSlices = viewMode === 'focus'
      ? slices[activeIndex]
        ? [slices[activeIndex]]
        : []
      : slices;

    let totalPoints = 0;
    for (const slice of activeSlices) {
      totalPoints += sliceEvents[slice.index]?.length ?? 0;
    }

    const flattened = new Float32Array(totalPoints * 3);
    let cursor = 0;

    for (const slice of activeSlices) {
      const events = sliceEvents[slice.index] ?? [];
      const y = viewMode === 'focus' ? 0.15 : yForIndex(slice.index) + 0.15;

      for (const event of events) {
        flattened[cursor] = event.x;
        flattened[cursor + 1] = y;
        flattened[cursor + 2] = event.z;
        cursor += 3;
      }
    }

    return flattened;
  }, [activeIndex, sliceEvents, slices, viewMode]);

  if (positions.length === 0) {
    return null;
  }

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.85}
        color="#f59e0b"
        transparent
        opacity={0.82}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function SceneContent({
  slices,
  sliceKdes,
  sliceEvents = [],
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
}: Stkde3DSceneProps) {
  const controlsRef = useRef<CameraControls>(null);
  const focusedSlice = slices[activeIndex]
    ? { ...slices[activeIndex], index: 0 }
    : undefined;
  const focusedSlices = focusedSlice ? [focusedSlice] : [];
  const focusedKdes = sliceKdes[activeIndex] ? [sliceKdes[activeIndex]] : [];

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.setLookAt(
      CAMERA_POSITION[0],
      CAMERA_POSITION[1],
      CAMERA_POSITION[2],
      CAMERA_TARGET[0],
      CAMERA_TARGET[1],
      CAMERA_TARGET[2],
      false,
    );
    controls.update(0);
  }, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 20]} intensity={0.7} />
      <directionalLight position={[-30, 30, -20]} intensity={0.3} />

      <StkdeSliceStack
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
      />

      {showRawEvents ? (
        <RawEventPoints
          slices={slices}
          sliceEvents={sliceEvents}
          activeIndex={activeIndex}
          viewMode={viewMode}
        />
      ) : null}

      <CameraControls
        ref={controlsRef}
        makeDefault
        smoothTime={0.3}
        minDistance={30}
        maxDistance={500}
      />
    </>
  );
}

export function Stkde3DScene({
  slices,
  sliceKdes,
  sliceEvents = [],
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-sky-800/40">
      <CornerOverlay />
      <MapTileSource onTextureReady={setMapTexture} />
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: 38 }}
          gl={{ alpha: true, antialias: true }}
        >
          <SceneContent
            slices={slices}
            sliceKdes={sliceKdes}
            sliceEvents={sliceEvents}
            activeIndex={activeIndex}
            viewMode={viewMode}
            showRawEvents={showRawEvents}
          />

          {mapTexture ? (
            <group position={[0, -38, 0]} renderOrder={-20}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[96, 96]} />
                <meshBasicMaterial
                  map={mapTexture}
                  transparent
                  opacity={0.92}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ) : null}
        </Canvas>
      </div>
    </div>
  );
}
