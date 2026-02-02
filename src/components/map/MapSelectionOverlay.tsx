import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';

export type LatLonBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

interface MapSelectionOverlayProps {
  selectedBounds: LatLonBounds | null;
  dragBounds: LatLonBounds | null;
}

const buildBoundsFeature = (bounds: LatLonBounds) => ({
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [bounds.minLon, bounds.minLat],
        [bounds.maxLon, bounds.minLat],
        [bounds.maxLon, bounds.maxLat],
        [bounds.minLon, bounds.maxLat],
        [bounds.minLon, bounds.minLat]
      ]
    ]
  },
  properties: {}
});

export default function MapSelectionOverlay({ selectedBounds, dragBounds }: MapSelectionOverlayProps) {
  const selectedGeoJson = useMemo(() => {
    if (!selectedBounds) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [buildBoundsFeature(selectedBounds)]
    };
  }, [selectedBounds]);

  const dragGeoJson = useMemo(() => {
    if (!dragBounds) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [buildBoundsFeature(dragBounds)]
    };
  }, [dragBounds]);

  return (
    <>
      {selectedGeoJson && (
        <Source id="spatial-selection" type="geojson" data={selectedGeoJson}>
          <Layer
            id="spatial-selection-fill"
            type="fill"
            paint={{
              'fill-color': '#22d3ee',
              'fill-opacity': 0.12
            }}
          />
          <Layer
            id="spatial-selection-outline"
            type="line"
            paint={{
              'line-color': '#22d3ee',
              'line-width': 2
            }}
          />
        </Source>
      )}
      {dragGeoJson && (
        <Source id="spatial-drag" type="geojson" data={dragGeoJson}>
          <Layer
            id="spatial-drag-fill"
            type="fill"
            paint={{
              'fill-color': '#f59e0b',
              'fill-opacity': 0.2
            }}
          />
          <Layer
            id="spatial-drag-outline"
            type="line"
            paint={{
              'line-color': '#f59e0b',
              'line-width': 2,
              'line-dasharray': [2, 2]
            }}
          />
        </Source>
      )}
    </>
  );
}
