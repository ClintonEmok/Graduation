'use client';

import * as React from 'react';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CENTER } from '@/lib/projection';

// Initial view state for Chicago
const INITIAL_VIEW_STATE = {
  longitude: CENTER.longitude,
  latitude: CENTER.latitude,
  zoom: 12,
  pitch: 0,
  bearing: 0
};

// Dark Matter style
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface MapBaseProps {
  children?: React.ReactNode;
  className?: string;
}

export default function MapBase({ children, className }: MapBaseProps) {
  const mapRef = React.useRef<MapRef>(null);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false} // Clean look, or keep it true
      >
        {children}
      </Map>
    </div>
  );
}
