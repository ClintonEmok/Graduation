"use client";

import { Layer, Source } from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { StkdeHeatmapCell } from '@/lib/stkde/contracts';

interface MapStkdeHeatmapLayerProps {
  cells: StkdeHeatmapCell[];
  activeHotspotId: string | null;
  activeHotspotCentroid?: [number, number] | null;
}

export function MapStkdeHeatmapLayer({ cells, activeHotspotId, activeHotspotCentroid }: MapStkdeHeatmapLayerProps) {
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
            'heatmap-opacity': 0.85,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(30, 64, 175, 0)',
              0.2,
              'rgba(59, 130, 246, 0.35)',
              0.4,
              'rgba(16, 185, 129, 0.5)',
              0.6,
              'rgba(234, 179, 8, 0.7)',
              0.8,
              'rgba(249, 115, 22, 0.8)',
              1,
              'rgba(239, 68, 68, 0.9)',
            ],
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
