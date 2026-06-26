"use client";

import { Map, MapTileLayer } from '@/components/ui/map';
import { CENTER } from '@/lib/projection';
import type { LatLngExpression } from 'leaflet';

const CHICAGO_COORDINATES = [CENTER.latitude, CENTER.longitude] satisfies LatLngExpression;

export function OverviewMapSketch() {
  return (
    <div className="h-full min-h-0 w-full bg-neutral-100">
      <Map center={CHICAGO_COORDINATES} className="h-full min-h-0 w-full rounded-none">
        <MapTileLayer />
      </Map>
    </div>
  );
}
