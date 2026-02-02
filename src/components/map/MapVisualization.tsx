"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import MapBase from './MapBase';
import MapEventLayer from './MapEventLayer';
import MapSelectionOverlay, { LatLonBounds } from './MapSelectionOverlay';
import MapSelectionMarker from './MapSelectionMarker';
import { Controls } from '../viz/Controls';
import { project } from '@/lib/projection';
import { findNearestIndexByScenePosition, resolvePointByIndex } from '@/lib/selection';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';

type DragPoint = {
  x: number;
  y: number;
  lat: number;
  lon: number;
};

export default function MapVisualization() {
  const mapRef = useRef<MapRef>(null);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const setSpatialBounds = useFilterStore((state) => state.setSpatialBounds);
  const clearSpatialBounds = useFilterStore((state) => state.clearSpatialBounds);
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const clearSelection = useCoordinationStore((state) => state.clearSelection);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const generateMockData = useDataStore((state) => state.generateMockData);
  const dataCount = useDataStore((state) => (state.columns ? state.columns.length : state.data.length));

  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragPoint | null>(null);
  const [dragCurrent, setDragCurrent] = useState<DragPoint | null>(null);

  useEffect(() => {
    if (columns || data.length > 0) return;
    generateMockData(1000);
  }, [columns, data.length, generateMockData]);

  const getDragPoint = (event: MapLayerMouseEvent) => {
    const map = mapRef.current;
    if (!map) return null;
    const { x, y } = event.point;
    const { lng, lat } = map.unproject([x, y]);
    return { x, y, lat, lon: lng };
  };

  const dragBounds = useMemo<LatLonBounds | null>(() => {
    if (!dragStart || !dragCurrent) return null;
    return {
      minLat: Math.min(dragStart.lat, dragCurrent.lat),
      maxLat: Math.max(dragStart.lat, dragCurrent.lat),
      minLon: Math.min(dragStart.lon, dragCurrent.lon),
      maxLon: Math.max(dragStart.lon, dragCurrent.lon)
    };
  }, [dragStart, dragCurrent]);

  const selectedBounds = useMemo<LatLonBounds | null>(() => {
    if (!selectedSpatialBounds) return null;
    return {
      minLat: selectedSpatialBounds.minLat,
      maxLat: selectedSpatialBounds.maxLat,
      minLon: selectedSpatialBounds.minLon,
      maxLon: selectedSpatialBounds.maxLon
    };
  }, [selectedSpatialBounds]);

  const resetDrag = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex, dataCount]);

  const finalizeBounds = () => {
    if (!isSelecting || !isDragging || !dragStart || !dragCurrent) {
      resetDrag();
      return;
    }

    const distance = Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
    if (distance < 4) {
      resetDrag();
      return;
    }

    const minLat = Math.min(dragStart.lat, dragCurrent.lat);
    const maxLat = Math.max(dragStart.lat, dragCurrent.lat);
    const minLon = Math.min(dragStart.lon, dragCurrent.lon);
    const maxLon = Math.max(dragStart.lon, dragCurrent.lon);

    const [x1, z1] = project(minLat, minLon);
    const [x2, z2] = project(maxLat, maxLon);

    setSpatialBounds({
      minX: Math.min(x1, x2),
      maxX: Math.max(x1, x2),
      minZ: Math.min(z1, z2),
      maxZ: Math.max(z1, z2),
      minLat,
      maxLat,
      minLon,
      maxLon
    });

    resetDrag();
    setIsSelecting(false);
  };

  const handleMouseDown = (event: MapLayerMouseEvent) => {
    if (!isSelecting) return;
    const point = getDragPoint(event);
    if (!point) return;
    setDragStart(point);
    setDragCurrent(point);
    setIsDragging(true);
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    if (!isSelecting || !isDragging || !dragStart) return;
    const point = getDragPoint(event);
    if (!point) return;
    setDragCurrent(point);
  };

  const handleMouseUp = (event: MapLayerMouseEvent) => {
    if (isSelecting) {
      finalizeBounds();
      return;
    }
    if (!event || isDragging) return;
    const point = getDragPoint(event);
    if (!point) return;
    const [x, z] = project(point.lat, point.lon);
    const nearest = findNearestIndexByScenePosition(x, z);
    if (!nearest) {
      clearSelection();
      return;
    }
    const MAX_DISTANCE = 12;
    if (nearest.distance <= MAX_DISTANCE) {
      setSelectedIndex(nearest.index, 'map');
    } else {
      clearSelection();
    }
  };

  const handleMouseLeave = () => {
    if (!isSelecting) return;
    finalizeBounds();
  };

  const toggleSelectionMode = () => {
    setIsSelecting((prev) => !prev);
    resetDrag();
  };

  const handleClearBounds = () => {
    clearSpatialBounds();
    resetDrag();
    setIsSelecting(false);
  };

  return (
    <div className="w-full h-full relative">
      <MapBase
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        dragPan={!isSelecting}
        cursor={isSelecting ? 'crosshair' : undefined}
      >
        <MapEventLayer />
        <MapSelectionOverlay selectedBounds={selectedBounds} dragBounds={dragBounds} />
        {selectionPoint && (
          <MapSelectionMarker lat={selectionPoint.lat} lon={selectionPoint.lon} />
        )}
      </MapBase>
      
      {/* Overlay UI can go here */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border shadow-sm z-10">
        <h2 className="text-sm font-semibold">Map View</h2>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectionMode}
            className={`text-xs px-2 py-1 rounded border transition ${
              isSelecting ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border'
            }`}
          >
            {isSelecting ? 'Cancel Selection' : 'Select Region'}
          </button>
          <button
            type="button"
            onClick={handleClearBounds}
            className="text-xs px-2 py-1 rounded border bg-background border-border"
            disabled={!selectedSpatialBounds}
          >
            Clear
          </button>
        </div>
      </div>
      <Controls />
    </div>
  );
}
