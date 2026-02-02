'use client';

import * as React from 'react';
import Map, { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
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
  onMouseDown?: (event: MapLayerMouseEvent) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onMouseUp?: (event: MapLayerMouseEvent) => void;
  onMouseLeave?: (event: MapLayerMouseEvent) => void;
  dragPan?: boolean;
  cursor?: string;
}

const MapBase = React.forwardRef<MapRef, MapBaseProps>(
  (
    {
      children,
      className,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      dragPan,
      cursor
    },
    ref
  ) => (
    <div className={`relative w-full h-full ${className || ''}`}>
      <Map
        ref={ref}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: '100%', height: '100%', cursor }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        dragPan={dragPan}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </Map>
    </div>
  )
);

MapBase.displayName = 'MapBase';

export default MapBase;
