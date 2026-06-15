'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { toLinearSeconds } from '@/components/timeline/hooks/useScaleTransforms';
import type { KdeCell, EvolvingSlice, MockCrimeEvent } from '../lib/types';
import { AdaptiveWarpAxis } from './AdaptiveWarpAxis';
import { HotspotTrajectoryOverlay } from './HotspotTrajectoryOverlay';
import { START_Y, SLICE_SPACING, StkdeSliceStack, yForIndex } from './StkdeSliceStack';
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

const MIN_DRAFT_WINDOW_SEC = 6 * 60 * 60;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const span = Math.max(1e-9, inMax - inMin);
  const t = clamp((value - inMin) / span, 0, 1);
  return outMin + t * (outMax - outMin);
};

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
  slices: Array<EvolvingSlice & { sourceSliceId?: string }>;
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  sliceEvents?: MockCrimeEvent[][];
  hotspotSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
  sliceOpacity?: number;
  onCreateDraftAtPoint?: (payload: { y: number; clientX: number; clientY: number }) => void;
  onUpdateSliceWarpWeight?: (index: number, weight: number) => void;
  onDeleteSlice?: (index: number) => void;
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
  hotspotSliceResults = null,
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
  onCreateDraftAtPoint,
  onUpdateSliceWarpWeight,
  onDeleteSlice,
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

      <mesh
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCreateDraftAtPoint?.({ y: event.point.y, clientX: event.clientX, clientY: event.clientY });
        }}
      >
        <planeGeometry args={[360, 260]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <AdaptiveWarpAxis />

      <StkdeSliceStack
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        volumeProfile={viewMode === 'focus' ? focusedVolumeProfile : volumeProfile}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
        sliceOpacity={sliceOpacity}
        onUpdateSliceWarpWeight={onUpdateSliceWarpWeight}
        onDeleteSlice={onDeleteSlice}
      />

      <HotspotTrajectoryOverlay
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceResults={hotspotSliceResults}
        viewMode={viewMode}
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
  hotspotSliceResults = null,
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const removeSlice = useSliceDomainStore((state) => state.removeSlice);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const canvasPointerRef = useRef<{ x: number; y: number } | null>(null);
  const stackEndY = useMemo(() => START_Y + SLICE_SPACING * Math.max(1, slices.length - 1), [slices.length]);

  const yToEpoch = useCallback((y: number): number => {
    const domain: [number, number] = viewportEnd > viewportStart ? [viewportStart, viewportEnd] : [0, 1];
    const displayEpoch = mapRange(y, START_Y, stackEndY, domain[0], domain[1]);
    if (timeScaleMode === 'adaptive' && warpMap && warpFactor > 0 && warpMap.length > 1) {
      return toLinearSeconds(displayEpoch, domain, warpFactor, warpMap, domain);
    }
    return displayEpoch;
  }, [stackEndY, timeScaleMode, viewportEnd, viewportStart, warpFactor, warpMap]);

  const clearActiveSlice = useCallback(() => {
    setActiveSliceIndex(-1);
    setActiveSlice(null);
  }, [setActiveSlice, setActiveSliceIndex]);

  const handleCreateDraftAtPoint = useCallback(({ y, clientX, clientY }: { y: number; clientX: number; clientY: number }) => {
    const pointer = canvasPointerRef.current;
    const movedTooFar = pointer ? Math.hypot(clientX - pointer.x, clientY - pointer.y) > 8 : false;
    if (movedTooFar) return;

    const clickEpoch = yToEpoch(y);
    const startEpoch = Math.max(viewportStart, clickEpoch - MIN_DRAFT_WINDOW_SEC);
    const endEpoch = Math.min(viewportEnd, clickEpoch + MIN_DRAFT_WINDOW_SEC);
    const draftId = addManualDraftRange({ startMs: startEpoch * 1000, endMs: endEpoch * 1000 });
    setActiveRailTab('slices');
    void computeManualDraftBin(draftId);
  }, [addManualDraftRange, computeManualDraftBin, setActiveRailTab, viewportEnd, viewportStart, yToEpoch]);

  const handleUpdateSliceWarpWeight = useCallback((sliceIndex: number, weight: number) => {
    const sourceSliceId = slices[sliceIndex]?.sourceSliceId;
    if (!sourceSliceId) return;
    updateSlice(sourceSliceId, { warpWeight: weight });
  }, [slices, updateSlice]);

  const handleDeleteSlice = useCallback((sliceIndex: number) => {
    const sourceSliceId = slices[sliceIndex]?.sourceSliceId;
    if (!sourceSliceId) return;

    removeSlice(sourceSliceId);
    if (sliceIndex === activeIndex) {
      setActiveSlice(null);
      setActiveSliceIndex(0);
    }
  }, [activeIndex, removeSlice, setActiveSlice, setActiveSliceIndex, slices]);

  const handleCanvasPointerDown = useCallback((event: { clientX: number; clientY: number }) => {
    canvasPointerRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleCanvasPointerMissed = useCallback(() => {
    clearActiveSlice();
  }, [clearActiveSlice]);

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
          onPointerDown={handleCanvasPointerDown}
          onPointerMissed={handleCanvasPointerMissed}
        >
          <SceneContent
            slices={slices}
            sliceKdes={sliceKdes}
            volumeProfile={volumeProfile}
          sliceEvents={sliceEvents}
          hotspotSliceResults={hotspotSliceResults}
          activeIndex={activeIndex}
          viewMode={viewMode}
          showRawEvents={showRawEvents}
          sliceOpacity={sliceOpacity}
            onCreateDraftAtPoint={handleCreateDraftAtPoint}
            onUpdateSliceWarpWeight={handleUpdateSliceWarpWeight}
            onDeleteSlice={handleDeleteSlice}
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
