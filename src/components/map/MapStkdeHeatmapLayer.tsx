"use client";

import { Layer, Source } from 'react-map-gl/maplibre';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { StkdeHeatmapCell } from '@/lib/stkde/contracts';
import { buildStkdeHeatmapColorExpression } from '@/lib/stkde/heatmap-scale';

interface MapStkdeHeatmapLayerProps {
  cells: StkdeHeatmapCell[];
  activeHotspotId: string | null;
  activeHotspotCentroid?: [number, number] | null;
  opacity?: number;
}

export function MapStkdeHeatmapLayer({
  cells,
  activeHotspotId,
  activeHotspotCentroid,
  opacity = 0.85,
}: MapStkdeHeatmapLayerProps) {
  if (!cells.length) return null;

  const data: FeatureCollection<Point, { intensity: number; support: number }> = {
    type: 'FeatureCollection',
    features: cells.map(
      (cell): Feature<Point, { intensity: number; support: number }> => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [cell.lng, cell.lat],
        },
        properties: {
          intensity: cell.intensity,
          support: cell.support,
        },
      }),
    ),
  };

  const markerData: FeatureCollection<Point, { active: number }> =
    activeHotspotCentroid && activeHotspotId
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: activeHotspotCentroid,
              },
              properties: { active: 1 },
            },
          ],
        }
      : { type: 'FeatureCollection', features: [] };

  return (
    <>
      <Source id="stkde-heatmap-source" type="geojson" data={data}>
        <Layer
          id="stkde-heatmap"
          type="heatmap"
          paint={{
            'heatmap-weight': ['get', 'intensity'],
            'heatmap-intensity': 1.1,
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              10,
              12,
              20,
              15,
              35,
            ],
            'heatmap-opacity': opacity,
            'heatmap-color': buildStkdeHeatmapColorExpression() as unknown as ExpressionSpecification,
          }}
        />
      </Source>
      <Source id="stkde-active-hotspot-source" type="geojson" data={markerData}>
        <Layer
          id="stkde-active-hotspot"
          type="circle"
          paint={{
            'circle-radius': 9,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f8fafc',
            'circle-color': '#ef4444',
            'circle-opacity': 0.95,
          }}
        />
      </Source>
    </>
  );
}
