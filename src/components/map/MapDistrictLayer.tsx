"use client";

import React, { useMemo, useState } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useFilterStore } from '@/store/useFilterStore';
import { getDistrictDisplayName } from '@/lib/category-maps';

interface MapDistrictLayerProps {
  visible?: boolean;
  opacity?: number;
  onDistrictClick?: (districtId: string) => void;
}

/**
 * Simplified District GeoJSON for Chicago Police Districts
 * Uses approximate bounding boxes for each district
 */
const DISTRICT_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { district: '1', name: 'Central' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.65, 41.83], [-87.61, 41.83], [-87.61, 41.89], [-87.65, 41.89], [-87.65, 41.83]]] } },
    { type: 'Feature' as const, properties: { district: '2', name: 'Wentworth' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.65, 41.78], [-87.61, 41.78], [-87.61, 41.83], [-87.65, 41.83], [-87.65, 41.78]]] } },
    { type: 'Feature' as const, properties: { district: '3', name: 'Grand Crossing' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.62, 41.74], [-87.58, 41.74], [-87.58, 41.80], [-87.62, 41.80], [-87.62, 41.74]]] } },
    { type: 'Feature' as const, properties: { district: '4', name: 'South Chicago' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.58, 41.70], [-87.54, 41.70], [-87.54, 41.76], [-87.58, 41.76], [-87.58, 41.70]]] } },
    { type: 'Feature' as const, properties: { district: '5', name: 'Calumet' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.62, 41.70], [-87.58, 41.70], [-87.58, 41.76], [-87.62, 41.76], [-87.62, 41.70]]] } },
    { type: 'Feature' as const, properties: { district: '6', name: 'Gresham' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.66, 41.74], [-87.62, 41.74], [-87.62, 41.78], [-87.66, 41.78], [-87.66, 41.74]]] } },
    { type: 'Feature' as const, properties: { district: '7', name: 'Englewood' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.70, 41.76], [-87.66, 41.76], [-87.66, 41.82], [-87.70, 41.82], [-87.70, 41.76]]] } },
    { type: 'Feature' as const, properties: { district: '8', name: 'Chicago Lawn' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.76], [-87.70, 41.76], [-87.70, 41.82], [-87.74, 41.82], [-87.74, 41.76]]] } },
    { type: 'Feature' as const, properties: { district: '9', name: 'Deering' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.66, 41.82], [-87.62, 41.82], [-87.62, 41.89], [-87.66, 41.89], [-87.66, 41.82]]] } },
    { type: 'Feature' as const, properties: { district: '10', name: 'Ogden' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.83], [-87.70, 41.83], [-87.70, 41.89], [-87.74, 41.89], [-87.74, 41.83]]] } },
    { type: 'Feature' as const, properties: { district: '11', name: 'Harrison' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.86], [-87.70, 41.86], [-87.70, 41.92], [-87.74, 41.92], [-87.74, 41.86]]] } },
    { type: 'Feature' as const, properties: { district: '12', name: 'Near West' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.70, 41.86], [-87.66, 41.86], [-87.66, 41.92], [-87.70, 41.92], [-87.70, 41.86]]] } },
    { type: 'Feature' as const, properties: { district: '14', name: 'Shakespeare' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.90], [-87.70, 41.90], [-87.70, 41.96], [-87.74, 41.96], [-87.74, 41.90]]] } },
    { type: 'Feature' as const, properties: { district: '15', name: 'Austin' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.80, 41.86], [-87.76, 41.86], [-87.76, 41.92], [-87.80, 41.92], [-87.80, 41.86]]] } },
    { type: 'Feature' as const, properties: { district: '17', name: 'Albany Park' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.96], [-87.70, 41.96], [-87.70, 42.02], [-87.74, 42.02], [-87.74, 41.96]]] } },
    { type: 'Feature' as const, properties: { district: '18', name: 'Near North' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.66, 41.90], [-87.62, 41.90], [-87.62, 41.96], [-87.66, 41.96], [-87.66, 41.90]]] } },
    { type: 'Feature' as const, properties: { district: '19', name: 'Town Hall' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.70, 41.94], [-87.66, 41.94], [-87.66, 42.00], [-87.70, 42.00], [-87.70, 41.94]]] } },
    { type: 'Feature' as const, properties: { district: '20', name: 'Lincoln' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.74, 41.96], [-87.70, 41.96], [-87.70, 42.02], [-87.74, 42.02], [-87.74, 41.96]]] } },
    { type: 'Feature' as const, properties: { district: '22', name: 'Morgan Park' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.70, 41.66], [-87.66, 41.66], [-87.66, 41.72], [-87.70, 41.72], [-87.70, 41.66]]] } },
    { type: 'Feature' as const, properties: { district: '24', name: 'Rogers Park' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.70, 41.99], [-87.66, 41.99], [-87.66, 42.05], [-87.70, 42.05], [-87.70, 41.99]]] } },
    { type: 'Feature' as const, properties: { district: '25', name: 'Grand Central' }, geometry: { type: 'Polygon' as const, coordinates: [[[-87.80, 41.90], [-87.76, 41.90], [-87.76, 41.96], [-87.80, 41.96], [-87.80, 41.90]]] } },
  ],
};

export function MapDistrictLayer({
  visible = true,
  opacity = 0.3,
}: MapDistrictLayerProps) {
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const toggleDistrict = useFilterStore((state) => state.toggleDistrict);

  const layerStyle = useMemo(() => ({
    id: 'district-fill',
    type: 'fill' as const,
    paint: {
      'fill-color': '#6b7280',
      'fill-opacity': opacity,
    },
  }), [opacity]);

  const lineStyle = useMemo(() => ({
    id: 'district-line',
    type: 'line' as const,
    paint: {
      'line-color': '#9ca3af',
      'line-width': 1,
      'line-opacity': 0.8,
    },
  }), []);

  const highlightStyle = useMemo(() => ({
    id: 'district-highlight',
    type: 'line' as const,
    paint: {
      'line-color': '#3b82f6',
      'line-width': 3,
      'line-opacity': selectedDistricts.length > 0 ? 1 : 0,
    },
  }), [selectedDistricts]);

  if (!visible) return null;

  return (
    <>
      <Source id="districts" type="geojson" data={DISTRICT_GEOJSON}>
        <Layer {...layerStyle} />
        <Layer {...lineStyle} />
        {selectedDistricts.length > 0 && <Layer {...highlightStyle} />}
      </Source>
    </>
  );
}

/**
 * District Legend Component
 */
export function MapDistrictLegend({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;

  const districts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '15', '17', '18', '19', '20', '22', '24', '25'];

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-md border p-2 space-y-1">
      <div className="text-xs font-medium mb-2">Districts</div>
      <div className="grid grid-cols-3 gap-1 text-xs">
        {districts.map((id) => (
          <div key={id} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-400" />
            <span>D{id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}