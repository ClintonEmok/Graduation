'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { KdeCell, EvolvingSlice, MockCrimeEvent } from '../lib/types';
import { AdaptiveWarpAxis } from './AdaptiveWarpAxis';
import { StkdeSliceStack, yForIndex } from './StkdeSliceStack';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import { CHICAGO_BOUNDS } from '../lib/chicago-bounds';

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
const MAP_PLANE_Y = -38;

function MapTileSource({
  onTextureReady,
}: {
  onTextureReady: (texture: THREE.CanvasTexture | null) => void;
}) {
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
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] pointer-events-none opacity-0">
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
  volumeProfile?: DurationVolumeProfileEntry[];
  sliceEvents?: MockCrimeEvent[][];
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
  sliceOpacity?: number;
}

function RawEventPoints({
  slices,
  sliceEvents = [],
  activeIndex,
}: Pick<Stkde3DSceneProps, 'slices' | 'sliceEvents' | 'activeIndex'>) {
  const positions = useMemo(() => {
    if (sliceEvents.length === 0 || slices.length === 0) {
      return new Float32Array();
    }

    const slice = slices[activeIndex];
    if (!slice) return new Float32Array();

    const events = sliceEvents[slice.index] ?? [];
    const flattened = new Float32Array(events.length * 3);
    let cursor = 0;
    const y = yForIndex(slice.index) + 0.15;

    for (const event of events) {
      flattened[cursor] = event.x;
      flattened[cursor + 1] = y;
      flattened[cursor + 2] = event.z;
      cursor += 3;
    }

    return flattened;
  }, [activeIndex, sliceEvents, slices]);

  if (positions.length === 0) return null;

  return (
    <points>
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
  volumeProfile,
  sliceEvents = [],
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
}: Stkde3DSceneProps) {
  const controlsRef = useRef<CameraControls>(null);
  const focusedSlice = slices[activeIndex]
    ? { ...slices[activeIndex], index: 0 }
    : undefined;
  const focusedSlices = focusedSlice ? [focusedSlice] : [];
  const focusedKdes = sliceKdes[activeIndex] ? [sliceKdes[activeIndex]] : [];
  const focusedVolumeProfile = volumeProfile?.[activeIndex]
    ? [{ ...volumeProfile[activeIndex]!, index: 0 }]
    : [];

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

      <AdaptiveWarpAxis />

      <StkdeSliceStack
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        volumeProfile={viewMode === 'focus' ? focusedVolumeProfile : volumeProfile}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
        sliceOpacity={sliceOpacity}
      />

      {showRawEvents ? (
        <RawEventPoints
          slices={slices}
          sliceEvents={sliceEvents}
          activeIndex={activeIndex}
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
  volumeProfile,
  sliceEvents = [],
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-sky-800/40">
      <MapTileSource onTextureReady={setMapTexture} />
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: 38 }}
          gl={{ alpha: true, antialias: true }}
        >
          <SceneContent
            slices={slices}
            sliceKdes={sliceKdes}
            volumeProfile={volumeProfile}
            sliceEvents={sliceEvents}
            activeIndex={activeIndex}
            viewMode={viewMode}
            showRawEvents={showRawEvents}
            sliceOpacity={sliceOpacity}
          />

          {mapTexture ? (
            <group position={[0, MAP_PLANE_Y, 0]} renderOrder={-20}>
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
