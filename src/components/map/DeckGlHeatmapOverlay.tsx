'use client';

import { useMemo } from 'react';
import { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { CrimeRecord } from '@/types/crime';

export type DeckGlHeatmapOverlayProps = {
  data: CrimeRecord[];
  visible?: boolean;
  radiusPixels?: number;
  intensity?: number;
  threshold?: number;
};

function DeckGlHeatmapOverlay({
  data,
  visible = true,
  radiusPixels = 30,
  intensity = 1,
  threshold = 0.05,
}: DeckGlHeatmapOverlayProps) {
  const heatmapLayer = useMemo(
    () =>
      new HeatmapLayer<CrimeRecord>({
        id: 'deckgl-heatmap',
        data: visible ? data : [],
        getPosition: (d: CrimeRecord) => [d.lon, d.lat],
        getWeight: (_d: CrimeRecord) => 1,
        radiusPixels,
        intensity,
        threshold,
        colorRange: [
          [0, 0, 255, 0],
          [0, 0, 255, 128],
          [0, 255, 255, 180],
          [0, 255, 0, 200],
          [255, 255, 0, 220],
          [255, 0, 0, 240],
        ],
      }),
    [data, visible, radiusPixels, intensity, threshold],
  );

  const overlay = useMemo(
    () => new MapboxOverlay({ layers: [heatmapLayer] }),
    [heatmapLayer],
  );

  useControl(() => overlay, { position: 'top-left' });

  return null;
}

export default DeckGlHeatmapOverlay;
