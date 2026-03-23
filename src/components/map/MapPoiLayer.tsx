"use client";

import React, { useMemo, useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { MapPoiCategory, POI_DATA } from '@/lib/poi-data';
import { useFilterStore } from '@/store/useFilterStore';

interface MapPoiLayerProps {
  visible?: boolean;
  categories?: MapPoiCategory[];
  onPoiClick?: (poi: typeof POI_DATA[0]) => void;
}

export function MapPoiLayer({
  visible = true,
  categories = ['police', 'schools', 'transit', 'parks'],
  onPoiClick,
}: MapPoiLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);

  const filteredPois = useMemo(() => {
    return POI_DATA.filter((poi) => categories.includes(poi.category));
  }, [categories]);

  if (!visible) return null;

  return (
    <>
      {filteredPois.map((poi) => (
        <Marker
          key={poi.id}
          longitude={poi.longitude}
          latitude={poi.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onPoiClick?.(poi);
          }}
        >
          <div
            className="relative cursor-pointer transition-transform hover:scale-110"
            onMouseEnter={() => setHoveredId(poi.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
              style={{ backgroundColor: poi.color }}
            >
              {poi.icon}
            </div>
            
            {/* Hover popup */}
            {hoveredId === poi.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                <div className="bg-background/95 backdrop-blur-sm border rounded-md shadow-lg p-2 min-w-[150px]">
                  <div className="font-medium text-sm">{poi.name}</div>
                  <div className="text-xs text-muted-foreground">{poi.category}</div>
                  {poi.address && (
                    <div className="text-xs text-muted-foreground mt-1">{poi.address}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Marker>
      ))}
    </>
  );
}

/**
 * POI Legend Component
 */
export function MapPoiLegend({
  visible = true,
  categories = ['police', 'schools', 'transit', 'parks'],
}: {
  visible?: boolean;
  categories?: MapPoiCategory[];
}) {
  if (!visible) return null;

  const legendItems = POI_DATA.filter((poi) => categories.includes(poi.category))
    .reduce((acc, poi) => {
      if (!acc.find((p) => p.category === poi.category)) {
        acc.push(poi);
      }
      return acc;
    }, [] as typeof POI_DATA);

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-md border p-2 space-y-1">
      <div className="text-xs font-medium mb-2">POI Legend</div>
      {legendItems.map((poi) => (
        <div key={poi.category} className="flex items-center gap-2 text-xs">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]"
            style={{ backgroundColor: poi.color }}
          >
            {poi.icon}
          </div>
          <span className="capitalize">{poi.category}</span>
        </div>
      ))}
    </div>
  );
}