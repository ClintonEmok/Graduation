'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/components/ui/button';
import { MapTypeLegend } from '@/components/map/MapTypeLegend';
import { PoiBreakdownCard } from '@/components/map/PoiBreakdownCard';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapLayerStore } from '@/store/useMapLayerStore';
import { POI_DATA } from '@/lib/poi-data';

interface MapLegendPanelProps {
  activeSliceLabel?: string | null;
}

export function MapLegendPanel({ activeSliceLabel = null }: MapLegendPanelProps) {
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const clearSpatialBounds = useFilterStore((state) => state.clearSpatialBounds);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const toggleType = useFilterStore((state) => state.toggleType);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const visibility = useMapLayerStore((state) => state.visibility);
  const isStkdeVisible = visibility.stkde;

  const hoveredTypeId = useStore(useCoordinationStore, (state) =>
    (state as { hoveredTypeId?: number | null }).hoveredTypeId
  ) as number | null | undefined;
  const setHoveredTypeId = useStore(useCoordinationStore, (state) =>
    (state as { setHoveredTypeId?: (id: number | null) => void }).setHoveredTypeId
  ) as ((id: number | null) => void) | undefined;
  const lastClick = useStore(useCoordinationStore, (state) =>
    (state as { lastClick?: { lat: number; lon: number } | null }).lastClick
  ) as { lat: number; lon: number } | null | undefined;
  const selectedPoiId = useStore(useCoordinationStore, (state) =>
    (state as { selectedPoiId?: string | null }).selectedPoiId
  ) as string | null | undefined;
  const setSelectedPoi = useStore(useCoordinationStore, (state) =>
    (state as { setSelectedPoi?: (id: string | null) => void }).setSelectedPoi
  ) as ((id: string | null) => void) | undefined;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when POI selection clears
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
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={clearSpatialBounds}
          variant="outline"
          size="sm"
          className="h-7 rounded-sm px-2 text-xs"
          disabled={!selectedSpatialBounds}
        >
          Clear
        </Button>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {isStkdeVisible ? 'Overview density with hotspot cues' : 'Density-first overview'}
      </div>

      {lastClick ? (
        <div className="text-[10px] font-mono text-muted-foreground">
          Click: {lastClick.lat.toFixed(4)}, {lastClick.lon.toFixed(4)}
        </div>
      ) : null}

      {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds || activeSliceLabel) ? (
        <div className="text-[10px] text-muted-foreground">
          {[
            activeSliceLabel ? `Slice: ${activeSliceLabel}` : null,
            selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
            selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
            selectedTimeRange ? 'Time' : null,
            selectedSpatialBounds ? 'Region' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      ) : null}

      <MapTypeLegend
        selectedTypes={selectedTypes}
        hoveredTypeId={hoveredTypeId ?? null}
        onHoverType={setHoveredTypeId}
        onToggleType={toggleType}
      />

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
  );
}
