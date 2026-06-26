"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
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
import { MapPoiLayer } from './MapPoiLayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { project } from '@/lib/projection';
import { findNearestIndexByScenePosition, resolvePointByIndex } from '@/lib/selection';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapLayerStore } from '@/store/useMapLayerStore';
import { useStkdeStore } from '@/store/useStkdeStore';
import { useLogger } from '@/hooks/useLogger';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { POI_DATA } from '@/lib/poi-data';
import type { StkdeResponse } from '@/lib/stkde/contracts';

interface MapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
  stkdeVisibleOverride?: boolean;
  disableHeatmapOverlay?: boolean;
  statsOverlay?: React.ReactNode;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  mapLayerStoreOverride?: unknown;
  sliceTimeRange?: [number, number] | null;
  activeSliceLabel?: string | null;
}

export default function MapVisualization({
  stkdeResponse: demoStkdeResponse = null,
  stkdeSelectedHotspotId,
  stkdeVisibleOverride,
  disableHeatmapOverlay = false,
  statsOverlay,
  filterStoreOverride,
  coordinationStoreOverride,
  mapLayerStoreOverride,
  sliceTimeRange = null,
  activeSliceLabel = null,
}: MapVisualizationProps = {}) {
  const mapRef = useRef<MapRef>(null);
  const { log } = useLogger();
  
  // Get viewport bounds for crime data query
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const viewportFilters = useViewportStore((state) => state.filters);
  
  // Get crime data using unified hook
  const { data: crimeRecords } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });
  
  const data = useMemo(() => crimeRecords || [], [crimeRecords]);
  
  const filteredData = useMemo(() => {
    if (!sliceTimeRange) return data;
    const [start, end] = sliceTimeRange;
    return data.filter((r) => r.timestamp >= start && r.timestamp <= end);
  }, [data, sliceTimeRange]);

  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
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
  // POI selection state — only the dashboard-demo coordination store defines these fields.
  // The non-demo coordination store silently lacks them; POI click is dashboard-only.
  const selectedPoiId = useStore(coordinationStore, (state) => (state as { selectedPoiId?: string | null }).selectedPoiId) as string | null | undefined;
  const setSelectedPoi = useStore(coordinationStore, (state) => (state as { setSelectedPoi?: (id: string | null) => void }).setSelectedPoi) as ((id: string | null) => void) | undefined;
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

  const handlePoiClick = (poi: { id: string }) => {
    if (typeof setSelectedPoi === 'function') {
      setSelectedPoi(poi.id);
    }
  };

  const selectedPoi = useMemo(() => {
    if (!selectedPoiId) return null;
    return POI_DATA.find((p) => p.id === selectedPoiId) ?? null;
  }, [selectedPoiId]);

  const [poiBreakdown, setPoiBreakdown] = useState<{
    total: number;
    byType: { type: string; count: number }[];
    loading: boolean;
    error: string | null;
  }>({ total: 0, byType: [], loading: false, error: null });

  useEffect(() => {
    if (!selectedPoi) {
      setPoiBreakdown({ total: 0, byType: [], loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setPoiBreakdown((prev) => ({ ...prev, loading: true, error: null }));
    const radius = 500;
    const url = `/api/crime/around?lat=${selectedPoi.latitude}&lon=${selectedPoi.longitude}&radius=${radius}`;
    fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.error === 'string') {
          throw new Error(data.error);
        }
        setPoiBreakdown({
          total: typeof data?.total === 'number' ? data.total : 0,
          byType: Array.isArray(data?.byType) ? data.byType : [],
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setPoiBreakdown({ total: 0, byType: [], loading: false, error: String(err.message ?? err) });
      });
    return () => controller.abort();
  }, [selectedPoi]);

  return (
    <div className="w-full h-full relative">
      <MapBase
        ref={mapRef}
        onClick={handleClick}
        onMoveEnd={handleMoveEnd}
      >
        {visibility.events ? (
          <MapEventLayer
            hoveredTypeId={hoveredTypeId}
            records={filteredData}
            selectedTimeRange={selectedTimeRange}
            selectedTypes={selectedTypes}
            selectedDistricts={selectedDistricts}
            selectedSpatialBounds={selectedSpatialBounds}
          />
        ) : null}
        {!disableHeatmapOverlay && visibility.heatmap ? <MapHeatmapOverlay /> : null}
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
        {visibility.poi ? (
          <div className="pointer-events-auto" style={{ opacity: opacity.poi }}>
            <MapPoiLayer
              visible
              categories={['police', 'schools', 'transit', 'parks']}
              onPoiClick={handlePoiClick}
            />
          </div>
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
                {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds || activeSliceLabel) && (
                  <div className="text-[10px] text-muted-foreground">
                    {[
                      activeSliceLabel ? `Slice: ${activeSliceLabel}` : null,
                      selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
                      selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
                      selectedTimeRange ? 'Time' : null,
                      selectedSpatialBounds ? 'Region' : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                {<MapTypeLegend
                    selectedTypes={selectedTypes}
                    hoveredTypeId={hoveredTypeId}
                    onHoverType={setHoveredTypeId}
                    onToggleType={toggleType}
                  />}
                {selectedPoi ? (
                  <PoiBreakdownCard
                    poi={selectedPoi}
                    total={poiBreakdown.total}
                    byType={poiBreakdown.byType}
                    loading={poiBreakdown.loading}
                    error={poiBreakdown.error}
                    onClose={() => setSelectedPoi?.(null)}
                  />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PoiBreakdownCardProps {
  poi: { id: string; name: string; category: string; address?: string; color: string; icon: string };
  total: number;
  byType: { type: string; count: number }[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function PoiBreakdownCard({ poi, total, byType, loading, error, onClose }: PoiBreakdownCardProps) {
  const maxCount = byType.length > 0 ? Math.max(...byType.map((b) => b.count), 1) : 1;
  return (
    <div className="mt-2 rounded-md border border-border/70 bg-background/70 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: poi.color }}
            aria-hidden="true"
          >
            {poi.icon}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-foreground">{poi.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {poi.category}
              {poi.address ? ` · ${poi.address}` : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close POI breakdown"
          title="Close"
          className="rounded-sm"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Crimes within 500m
      </div>
      {loading ? (
        <div className="mt-1 text-xs text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="mt-1 text-xs text-red-500">Failed to load: {error}</div>
      ) : (
        <>
          <div className="mt-1 text-sm font-semibold text-foreground">{total}</div>
          {byType.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {byType.slice(0, 5).map((row) => (
                <li key={row.type} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 truncate text-muted-foreground">{row.type}</span>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right font-mono text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">No crimes in window</div>
          )}
        </>
      )}
    </div>
  );
}
