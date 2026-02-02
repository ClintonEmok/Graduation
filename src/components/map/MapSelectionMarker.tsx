import React, { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

interface MapSelectionMarkerProps {
  lat: number;
  lon: number;
}

export default function MapSelectionMarker({ lat, lon }: MapSelectionMarkerProps) {
  const geoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat]
          },
          properties: {}
        }
      ]
    }),
    [lat, lon]
  );

  return (
    <Source id="selection-marker" type="geojson" data={geoJson}>
      <Layer
        id="selection-marker-outline"
        type="circle"
        paint={{
          'circle-radius': 8,
          'circle-color': '#0ea5e9',
          'circle-opacity': 0.2
        }}
      />
      <Layer
        id="selection-marker"
        type="circle"
        paint={{
          'circle-radius': 4,
          'circle-color': '#0ea5e9',
          'circle-stroke-color': '#e0f2fe',
          'circle-stroke-width': 1.5
        }}
      />
    </Source>
  );
}
