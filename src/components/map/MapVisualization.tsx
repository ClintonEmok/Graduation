"use client";

import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  const [colorMode, setColorMode] = useState<'burst' | 'type'>('burst');
  const [hoveredTypeId, setHoveredTypeId] = useState<number | null>(null);
  const [lastClick, setLastClick] = useState<{lat: number, lon: number} | null>(null);
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  const selectedBounds = useMemo<LatLonBounds | null>(() => {
    if (!selectedSpatialBounds) return null;
    return {
      minLat: selectedSpatialBounds.minLat,
      maxLat: selectedSpatialBounds.maxLat,
      minLon: selectedSpatialBounds.minLon,
      maxLon: selectedSpatialBounds.maxLon
    };
  }, [selectedSpatialBounds]);

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex]);

  const handleClick = (event: MapLayerMouseEvent) => {
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

  const handleClearBounds = () => {
    log('map_selection_cleared');
    clearSpatialBounds();
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
        onClick={handleClick}
        onMoveEnd={handleMoveEnd}
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
        <MapSelectionOverlay selectedBounds={selectedBounds} dragBounds={null} />
        <MapDebugOverlay clickPoint={lastClick} selectedPoint={selectionPoint} />

        {selectionPoint && (
          <MapSelectionMarker lat={selectionPoint.lat} lon={selectionPoint.lon} />
        )}
      </MapBase>
      
      {/* Overlay UI */}
      <div className="absolute left-4 top-4 z-10 w-[20rem] max-w-[calc(100%-2rem)]">
        <Card className="border-border/70 bg-background/85 shadow-sm backdrop-blur-sm">
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
                <Button
                  type="button"
                  onClick={handleClearBounds}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-sm px-2 text-xs"
                  disabled={!selectedSpatialBounds}
                >
                  Clear
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => setIsControlsOpen((value) => !value)}
                variant="ghost"
                size="icon-xs"
                className="rounded-sm"
                aria-label={isControlsOpen ? 'Collapse map controls' : 'Expand map controls'}
              >
                {isControlsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {isControlsOpen ? (
              <div className="mt-2 space-y-2">
                <div className="text-[10px] text-muted-foreground">
                  {isStkdeVisible ? 'Overview density with hotspot cues' : 'Density-first overview'}
                </div>
                {/* Debug Info */}
                {lastClick && (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    Click: {lastClick.lat.toFixed(4)}, {lastClick.lon.toFixed(4)}
                  </div>
                )}
                {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds) && (
                  <div className="text-[10px] text-muted-foreground">
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
                {colorMode === 'burst' ? (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>Density ≥ {Math.round(burstThreshold * 100)}%</span>
                  </div>
                ) : (
                  <MapTypeLegend
                    selectedTypes={selectedTypes}
                    hoveredTypeId={hoveredTypeId}
                    onHoverType={setHoveredTypeId}
                    onToggleType={toggleType}
                  />
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
