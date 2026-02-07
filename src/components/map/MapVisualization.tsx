"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import MapBase from './MapBase';
import MapEventLayer from './MapEventLayer';
import MapSelectionOverlay, { LatLonBounds } from './MapSelectionOverlay';
import MapSelectionMarker from './MapSelectionMarker';
import MapDebugOverlay from './MapDebugOverlay';
import { MapClusterHighlights } from './MapClusterHighlights';
import { MapHeatmapOverlay } from './MapHeatmapOverlay';
import { MapTrajectoryLayer } from './MapTrajectoryLayer';
import { project } from '@/lib/projection';
import { findNearestIndexByScenePosition, resolvePointByIndex } from '@/lib/selection';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useLogger } from '@/hooks/useLogger';

type DragPoint = {
  x: number;
  y: number;
  lat: number;
  lon: number;
};

export default function MapVisualization() {
  const mapRef = useRef<MapRef>(null);
  const { log } = useLogger();
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const setSpatialBounds = useFilterStore((state) => state.setSpatialBounds);
  const clearSpatialBounds = useFilterStore((state) => state.clearSpatialBounds);
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const clearSelection = useCoordinationStore((state) => state.clearSelection);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const loadRealData = useDataStore((state) => state.loadRealData);
  const dataCount = useDataStore((state) => (state.columns ? state.columns.length : state.data.length));
  const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);

  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragPoint | null>(null);
  const [dragCurrent, setDragCurrent] = useState<DragPoint | null>(null);
  const [lastClick, setLastClick] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    if (columns || data.length > 0) return;
    loadRealData();
  }, [columns, data.length, loadRealData]);

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
    
    log('map_region_selected', { minLat, maxLat, minLon, maxLon });

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
    // Point selection moved to handleClick
  };

  const handleClick = (event: MapLayerMouseEvent) => {
    if (isSelecting) return;
    
    const { lng, lat } = event.lngLat;
    setLastClick({ lat, lon: lng });

    const [x, z] = project(lat, lng);
    const nearest = findNearestIndexByScenePosition(x, z);
    
    if (nearest) {
      // Check distance in projected units? 
      // findNearestIndexByScenePosition returns distance in scene units.
      // 12 units is the threshold used before.
      if (nearest.distance <= 12) {
        setSelectedIndex(nearest.index, 'map');
        log('map_point_selected', { index: nearest.index, distance: nearest.distance });
      } else {
        clearSelection();
        log('map_click_missed', { distance: nearest.distance });
      }
    } else {
      clearSelection();
    }
  };

  const handleMouseLeave = () => {
    if (!isSelecting) return;
    finalizeBounds();
  };

  const toggleSelectionMode = () => {
    const nextState = !isSelecting;
    setIsSelecting(nextState);
    log('map_selection_mode_toggled', { active: nextState });
    resetDrag();
  };

  const handleClearBounds = () => {
    log('map_selection_cleared');
    clearSpatialBounds();
    resetDrag();
    setIsSelecting(false);
  };

  const handleMoveEnd = (event: any) => {
      const { viewState } = event;
      log('map_moved', {
          zoom: viewState.zoom,
          latitude: viewState.latitude,
          longitude: viewState.longitude
      });
  };

  return (
    <div className="w-full h-full relative">
      <MapBase
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onMoveEnd={handleMoveEnd}
        dragPan={!isSelecting}
        cursor={isSelecting ? 'crosshair' : undefined}
      >
         <MapEventLayer />
        <MapHeatmapOverlay />
        <MapClusterHighlights />
        <MapTrajectoryLayer />
        <MapSelectionOverlay selectedBounds={selectedBounds} dragBounds={dragBounds} />
        <MapDebugOverlay clickPoint={lastClick} selectedPoint={selectionPoint} />

        {selectionPoint && (
          <MapSelectionMarker lat={selectionPoint.lat} lon={selectionPoint.lon} />
        )}
      </MapBase>
      
      {/* Overlay UI */}
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
        {/* Debug Info */}
        {lastClick && (
          <div className="mt-2 text-[10px] text-muted-foreground font-mono">
            Click: {lastClick.lat.toFixed(4)}, {lastClick.lon.toFixed(4)}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Burst ≥ {Math.round(burstThreshold * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
