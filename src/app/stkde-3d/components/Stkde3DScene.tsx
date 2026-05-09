'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { KdeCell, EvolvingSlice } from '../lib/types';
import { StkdeSliceStack } from './StkdeSliceStack';
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
      <div className="rounded-lg border border-slate-700/80 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Corner Coordinates
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[10px] leading-tight text-slate-300">
          {CORNERS.map((corner) => (
            <div key={corner.label} className="contents">
              <span className="font-medium text-slate-100">{corner.label}</span>
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
  activeIndex: number;
}

function SceneContent({
  slices,
  sliceKdes,
  activeIndex,
}: Stkde3DSceneProps) {
  const controlsRef = useRef<CameraControls>(null);

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

      <mesh position={[0, -38, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-20}>
        <planeGeometry args={[96, 96]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      <StkdeSliceStack
        slices={slices}
        sliceKdes={sliceKdes}
        activeIndex={activeIndex}
      />

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

export function Stkde3DScene({
  slices,
  sliceKdes,
  activeIndex,
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-slate-700/70">
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
            activeIndex={activeIndex}
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
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <planeGeometry args={[96, 96]} />
                <meshBasicMaterial
                  color="#0f172a"
                  transparent
                  opacity={0.14}
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
