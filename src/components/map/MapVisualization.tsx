"use client";

import React, { useMemo, useRef, useState } from 'react';
import { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { useStore } from 'zustand';
import MapBase from './MapBase';
import MapEventLayer from './MapEventLayer';
import MapSelectionOverlay, { LatLonBounds } from './MapSelectionOverlay';
import MapSelectionMarker from './MapSelectionMarker';
import MapDebugOverlay from './MapDebugOverlay';
import { MapClusterHighlights } from './MapClusterHighlights';
import { MapHeatmapOverlay } from './MapHeatmapOverlay';
import { MapTrajectoryLayer } from './MapTrajectoryLayer';
import { MapTypeLegend } from './MapTypeLegend';
import { MapStkdeHeatmapLayer } from './MapStkdeHeatmapLayer';
import { project } from '@/lib/projection';
import { findNearestIndexByScenePosition, resolvePointByIndex } from '@/lib/selection';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useMapLayerStore } from '@/store/useMapLayerStore';
import { useStkdeStore } from '@/store/useStkdeStore';
import { useLogger } from '@/hooks/useLogger';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

interface MapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
  stkdeVisibleOverride?: boolean;
  statsOverlay?: React.ReactNode;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  mapLayerStoreOverride?: unknown;
}

type DragPoint = {
  x: number;
  y: number;
  lat: number;
  lon: number;
};

export default function MapVisualization({
  stkdeResponse: demoStkdeResponse = null,
  stkdeSelectedHotspotId,
  stkdeVisibleOverride,
  statsOverlay,
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  mapLayerStoreOverride,
}: MapVisualizationProps = {}) {
  const mapRef = useRef<MapRef>(null);
  const { log } = useLogger();
  const formatCount = (value: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  
  // Get viewport bounds for crime data query
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const viewportFilters = useViewportStore((state) => state.filters);
  
  // Get crime data using unified hook
  const { data: crimeRecords, meta: crimeMeta } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });
  
  const data = crimeRecords || [];
  const dataCount = data.length;
  const totalMatches = crimeMeta?.totalMatches ?? null;
  const isSampled = Boolean(crimeMeta?.sampled);
  
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const mapLayerStore = (mapLayerStoreOverride ?? useMapLayerStore) as typeof useMapLayerStore;

  const selectedSpatialBounds = useStore(filterStore, (state) => state.selectedSpatialBounds);
  const setSpatialBounds = useStore(filterStore, (state) => state.setSpatialBounds);
  const clearSpatialBounds = useStore(filterStore, (state) => state.clearSpatialBounds);
  const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
  const toggleType = useStore(filterStore, (state) => state.toggleType);
  const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const selectedIndex = useStore(coordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(coordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(coordinationStore, (state) => state.clearSelection);
  const densityMapValue = useStore(adaptiveStore, (state) => state.densityMap);
  const burstinessMapValue = useStore(adaptiveStore, (state) => state.burstinessMap);
  const burstMetricValue = useStore(adaptiveStore, (state) => state.burstMetric);
  const burstCutoffValue = useStore(adaptiveStore, (state) => state.burstCutoff);
  const mapDomainValue = useStore(adaptiveStore, (state) => state.mapDomain);
  const burstThreshold = useStore(adaptiveStore, (state) => state.burstThreshold);
  const visibility = useStore(mapLayerStore, (state) => state.visibility);
  const opacity = useStore(mapLayerStore, (state) => state.opacity);

  const stkdeStoreResponse = useStkdeStore((state) => state.response);
  const stkdeStoreSelectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const stkdeResponse = demoStkdeResponse ?? stkdeStoreResponse;
  const selectedHotspotId = stkdeSelectedHotspotId ?? stkdeStoreSelectedHotspotId;
  const isStkdeVisible = typeof stkdeVisibleOverride === 'boolean' ? stkdeVisibleOverride : visibility.stkde;
  const activeHotspotCentroid = useMemo(() => {
    if (!stkdeResponse || !selectedHotspotId) return null;
    const hotspot = stkdeResponse.hotspots.find((row) => row.id === selectedHotspotId);
    return hotspot ? ([hotspot.centroidLng, hotspot.centroidLat] as [number, number]) : null;
  }, [selectedHotspotId, stkdeResponse]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [colorMode, setColorMode] = useState<'burst' | 'type'>('burst');
  const [hoveredTypeId, setHoveredTypeId] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<DragPoint | null>(null);
  const [dragCurrent, setDragCurrent] = useState<DragPoint | null>(null);
  const [lastClick, setLastClick] = useState<{lat: number, lon: number} | null>(null);

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
  }, [selectedIndex]);

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

  const handleMouseUp = () => {
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

  const handleMoveEnd = (event: { viewState: { zoom: number; latitude: number; longitude: number } }) => {
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
        {visibility.events ? (
          <MapEventLayer
            colorMode={colorMode}
            hoveredTypeId={hoveredTypeId}
            records={data}
            selectedTimeRange={selectedTimeRange}
            selectedTypes={selectedTypes}
            selectedDistricts={selectedDistricts}
            selectedSpatialBounds={selectedSpatialBounds}
            densityMap={densityMapValue}
            burstinessMap={burstinessMapValue}
            burstMetric={burstMetricValue}
            burstCutoff={burstCutoffValue}
            mapDomain={mapDomainValue}
          />
        ) : null}
        {visibility.heatmap ? <MapHeatmapOverlay /> : null}
        {visibility.trajectories ? <MapTrajectoryLayer /> : null}
        {visibility.clusters ? <MapClusterHighlights /> : null}
        {statsOverlay ?? null}
        {isStkdeVisible && stkdeResponse?.heatmap.cells?.length ? (
          <MapStkdeHeatmapLayer
            cells={stkdeResponse.heatmap.cells}
            activeHotspotId={selectedHotspotId}
            activeHotspotCentroid={activeHotspotCentroid}
            opacity={opacity.stkde}
          />
        ) : null}
        <MapSelectionOverlay selectedBounds={selectedBounds} dragBounds={dragBounds} />
        <MapDebugOverlay clickPoint={lastClick} selectedPoint={selectionPoint} />

        {selectionPoint && (
          <MapSelectionMarker lat={selectionPoint.lat} lon={selectionPoint.lon} />
        )}
      </MapBase>
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border shadow-sm z-10">
        <h2 className="text-sm font-semibold">Overview Map</h2>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {isStkdeVisible ? 'Overview density with hotspot cues' : 'Density-first overview'}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1 text-[11px]">
            <button
              type="button"
              onClick={() => setColorMode('burst')}
              className={`rounded px-2 py-0.5 transition-colors ${
                colorMode === 'burst'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Density
            </button>
            <button
              type="button"
              onClick={() => setColorMode('type')}
              className={`rounded px-2 py-0.5 transition-colors ${
                colorMode === 'type'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Type
            </button>
          </div>
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
        {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds) && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            Filters: {[
              selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
              selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
              selectedTimeRange ? 'Time' : null,
              selectedSpatialBounds ? 'Region' : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
        <div className={`mt-2 text-[10px] ${isSampled ? 'text-amber-300' : 'text-muted-foreground'}`}>
          {formatCount(dataCount)} points in view
          {isSampled && totalMatches !== null && totalMatches > dataCount
            ? ` (sampled from ${formatCount(totalMatches)})`
            : ''}
        </div>
        {colorMode === 'burst' ? (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span>Density ≥ {Math.round(burstThreshold * 100)}%</span>
          </div>
        ) : (
          <div className="mt-2">
            <MapTypeLegend
              selectedTypes={selectedTypes}
              hoveredTypeId={hoveredTypeId}
              onHoverType={setHoveredTypeId}
              onToggleType={toggleType}
            />
          </div>
        )}
      </div>
    </div>
  );
}
